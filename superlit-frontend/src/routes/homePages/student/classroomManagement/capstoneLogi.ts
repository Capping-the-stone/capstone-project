export type LogEventType =
  | "checkpoint"
  | "insert"
  | "delete"
  | "run"
  | "submission"
  | "update-rji";

export interface BaseLogEvent {
  type: LogEventType;
  srn: string; // globally unique student ID
  questionID: number; // global question ID
  ts: number; // epoch ms (UTC)
}

export interface CheckpointEvent extends BaseLogEvent {
  type: "checkpoint";
  content: string; // full editor text, normalized to \n EOL by caller
}

export interface InsertEvent extends BaseLogEvent {
  type: "insert";
  offset: number; // UTF-16 code unit index
  content: string; // inserted text
  isPaste: boolean;
  numCharacters: number; // UTF-16 code units inserted
}

export interface DeleteEvent extends BaseLogEvent {
  type: "delete";
  offset: number; // UTF-16 code unit index (start of deletion)
  numCharacters: number; // UTF-16 code units removed
  isPaste: boolean;
}

export interface RunEvent extends BaseLogEvent {
  type: "run";
  code: string; // full editor text at run time
  errorCount: number; // number of errors reported in output
}

export interface SubmissionEvent extends BaseLogEvent {
  type: "submission";
  code: string; // full editor text at submission time
}

export interface UpdateRjiEvent extends BaseLogEvent {
  type: "update-rji";
  rji: number;
  // Optional diagnostics for analysis/debugging
  mu?: number;
  rmssd?: number;
  binSizeMs?: number;
  startTs?: number;
  endTs?: number;
  bins?: number;
}

export type LogEvent =
  | CheckpointEvent
  | InsertEvent
  | DeleteEvent
  | RunEvent
  | SubmissionEvent
  | UpdateRjiEvent;

// Explicit singleton logger with HMR-safe instance
class CapstoneLogger {
  private logBuffer: LogEvent[] = [];
  private flushOffset = 0; // index of first unsent log in buffer
  private isFlushing = false; // single-flight lock to prevent overlapping flushes

  private static readonly FLUSH_THRESHOLD = 150; // number of unsent logs before auto-flush

  addLog(event: LogEvent) {
    this.logBuffer.push(event);
    const unsentCount = this.logBuffer.length - this.flushOffset;
    if (unsentCount > CapstoneLogger.FLUSH_THRESHOLD && !this.isFlushing) {
      // TODO: temporarily a small number, set to higher in prod later
      void this.flushLogs();
    }
  }

  async flushLogs() {
    // Single-flight guard
    if (this.isFlushing) return;
    this.isFlushing = true;

    // Snapshot boundary: process and send only up to this index
    const flushEnd = this.logBuffer.length;
    if (flushEnd === this.flushOffset) {
      this.isFlushing = false;
      return;
    }

    try {
      // Compute per-question RJI across logs up to the snapshot boundary (excluding synthetic events from counts)
      const binSizeMs = 1000; // 1 second bins

      // Map: questionID -> array of timestamps for activity events (insert, delete, run, submission)
      const activityMap = new Map<number, number[]>();
      let srn: string | null = null; // All logs share the same SRN

      for (let i = 0; i < flushEnd; i++) {
        const ev = this.logBuffer[i];
        // Capture SRN from any non-synthetic event (guaranteed to be the same for all)
        if (ev.type !== "update-rji" && !srn) {
          srn = ev.srn;
        }

        // Count only activity events: insert, delete, run, submission
        if (
          ev.type === "insert" ||
          ev.type === "delete" ||
          ev.type === "run" ||
          ev.type === "submission"
        ) {
          let timestamps = activityMap.get(ev.questionID);
          if (!timestamps) {
            timestamps = [];
            activityMap.set(ev.questionID, timestamps);
          }
          timestamps.push(ev.ts);
        }
      }

      // Compute RJI for each question
      for (const [qid, timestamps] of activityMap) {
        let rji = 0;
        let mu: number | undefined;
        let rmssd: number | undefined;
        let startTs: number | undefined;
        let endTs: number | undefined;
        let bins: number | undefined;

        if (timestamps.length > 0) {
          // Find min and max timestamps in a single pass
          let minTs = timestamps[0];
          let maxTs = timestamps[0];
          for (let i = 1; i < timestamps.length; i++) {
            const ts = timestamps[i];
            if (ts < minTs) minTs = ts;
            if (ts > maxTs) maxTs = ts;
          }
          startTs = minTs;
          endTs = maxTs;

          const nBins = Math.floor((endTs - startTs) / binSizeMs) + 1;
          bins = nBins;

          const counts = new Array<number>(nBins).fill(0);
          for (const ts of timestamps) {
            const idx = Math.floor((ts - startTs) / binSizeMs);
            if (idx >= 0 && idx < nBins) counts[idx] += 1;
          }

          // Compute mu
          let total = 0;
          for (let i = 0; i < nBins; i++) {
            total += counts[i];
          }
          mu = total / nBins;

          if (nBins >= 2) {
            let sumsq = 0;
            for (let i = 0; i < nBins - 1; i++) {
              const d = counts[i + 1] - counts[i];
              sumsq += d * d;
            }
            rmssd = Math.sqrt(sumsq / (nBins - 1));
          } else {
            rmssd = 0;
          }

          rji = mu > 0 ? rmssd / mu : 0;
        } else {
          // No activity logs to count for this question
          rji = 0;
        }

        const synthetic: UpdateRjiEvent = {
          type: "update-rji",
          srn: srn!,
          questionID: qid,
          ts: Date.now(),
          rji,
          mu,
          rmssd,
          binSizeMs,
          startTs,
          endTs,
          bins,
        };
        console.log(synthetic);
        this.logBuffer.push(synthetic);
      }

      // Send only the unsent portion up to the snapshot boundary (exclude newly appended synthetic events)
      const payload = { logs: this.logBuffer.slice(this.flushOffset, flushEnd) };

      const res = await fetch("/api/capstone-logi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error("Failed to send logs");
      }
      // Advance the offset exactly to the snapshot boundary
      this.flushOffset = flushEnd;
    } catch (err) {
      console.error(err);
    } finally {
      this.isFlushing = false;
    }
  }
}

// Ensure single instance even during HMR: stash on globalThis
const __GLOBAL_KEY__ = "__CAPSTONE_LOGGER_SINGLETON__";
type GlobalWithLogger = typeof globalThis & {
  __CAPSTONE_LOGGER_SINGLETON__?: CapstoneLogger;
};
const g = globalThis as GlobalWithLogger;
export const capstoneLogger: CapstoneLogger =
  g[__GLOBAL_KEY__] ?? (g[__GLOBAL_KEY__] = new CapstoneLogger());

// Named helpers that proxy to the singleton instance
export function addLog(event: LogEvent) {
  capstoneLogger.addLog(event);
}

export async function flushLogs() {
  return capstoneLogger.flushLogs();
}