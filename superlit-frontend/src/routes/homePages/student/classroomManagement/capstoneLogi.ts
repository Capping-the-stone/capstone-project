interface LogEntry {
  userID: string;
  currentQuestionIndex: number;
  editorContentBefore: string | undefined;
  editorContentAfter: string | undefined;
  timestamp: string;
  isPaste: boolean;
  isDeletion: boolean;
  isCompilation: boolean;
  isSubmission: boolean;
}

// In-memory store for logs
const logBuffer: LogEntry[] = [];

export async function logi(
  userID: string,
  currentQuestionIndex: number,
  editorContentBefore: string | undefined,
  editorContentAfter: string | undefined,
  timestamp: number | string,
  isPaste: boolean,
  isDeletion: boolean,
  isCompilation: boolean,
  isSubmission: boolean,
) {
  timestamp = String(timestamp);
  const newLogEntry: LogEntry = {
    userID,
    currentQuestionIndex,
    editorContentBefore,
    editorContentAfter,
    timestamp,
    isPaste,
    isDeletion,
    isCompilation,
    isSubmission,
  };

  // Push the new entry into our in-memory array
  logBuffer.push(newLogEntry);

  // If log count exceeds 150, force flush
  if (logBuffer.length > 150) {
    forceFlush();
    logBuffer.length = 0;
  }
}

export async function forceFlush() {
  console.log("forceFlush called with logs:", logBuffer);

  fetch("/api/capstone-logi", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      logs: logBuffer,
    }),
  })
    .then((res) => {
      if (!res.ok) {
        throw new Error("Failed to send logs");
      }
      console.log("Logs successfully flushed to server");
      // Clear log buffer after successful flush
      logBuffer.length = 0;
    })
    .catch((err) => {
      console.error(err);
    });
}
