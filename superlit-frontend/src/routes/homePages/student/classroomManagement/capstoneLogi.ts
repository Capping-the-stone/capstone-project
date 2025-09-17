export type LogEventType =
  | "checkpoint"
  | "insert"
  | "delete"
  | "run"
  | "submission";

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
}

export interface SubmissionEvent extends BaseLogEvent {
  type: "submission";
  code: string; // full editor text at submission time
}

export type LogEvent =
  | CheckpointEvent
  | InsertEvent
  | DeleteEvent
  | RunEvent
  | SubmissionEvent;

// Explicit singleton logger with HMR-safe instance
class CapstoneLogger {
  private logBuffer: LogEvent[] = [];

  addLog(event: LogEvent) {
    this.logBuffer.push(event);
    if (this.logBuffer.length > 150) { // TODO: temporarily a small number, set to higher in prod later
      void this.flushLogs();
    }
  }

  async flushLogs() {
    if (this.logBuffer.length === 0) return;
    const payload = { logs: this.logBuffer.slice() };

    try {
      const res = await fetch("/api/capstone-logi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error("Failed to send logs");
      }
      this.logBuffer.length = 0;
    } catch (err) {
      console.error(err);
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