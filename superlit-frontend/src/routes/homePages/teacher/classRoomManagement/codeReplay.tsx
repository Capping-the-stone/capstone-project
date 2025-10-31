import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Play, Pause, RotateCcw } from "lucide-react";
import { useAuth } from "@/lib/authContext";

// --- Types ---
type LogEventType =
  | "checkpoint"
  | "insert"
  | "delete"
  | "run"
  | "submission"
  | "update-rji";

interface BaseLogEvent {
  type: LogEventType;
  srn: string;
  questionID: number;
  ts_ms: number;
}

interface CheckpointEvent extends BaseLogEvent {
  type: "checkpoint";
  content: string;
}

interface InsertEvent extends BaseLogEvent {
  type: "insert";
  offset: number;
  content: string;
  isPaste: boolean;
}

interface DeleteEvent extends BaseLogEvent {
  type: "delete";
  offset: number;
  numCharacters: number;
  isPaste: boolean;
}

interface RunEvent extends BaseLogEvent {
  type: "run";
  code: string;
}

interface SubmissionEvent extends BaseLogEvent {
  type: "submission";
  code: string;
}

type LogEvent =
  | CheckpointEvent
  | InsertEvent
  | DeleteEvent
  | RunEvent
  | SubmissionEvent;

// --- Utility ---
function applyEvent(currentCode: string, event: LogEvent): string {
  switch (event.type) {
    case "checkpoint":
      return event.content;
    case "insert":
      return (
        currentCode.slice(0, event.offset) +
        event.content +
        currentCode.slice(event.offset)
      );
    case "delete":
      return (
        currentCode.slice(0, event.offset) +
        currentCode.slice(event.offset + event.numCharacters)
      );
    default:
      return currentCode;
  }
}

// --- Component ---
export default function CodeReplay() {
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [code, setCode] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1);
  const [progress, setProgress] = useState<number>(0);

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const replayController = useRef<{ stop: boolean }>({ stop: false });

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const srn = queryParams.get("studentID");
  const assignmentID = queryParams.get("assignmentID");
  const { token } = useAuth();

  // Fetch logs
  useEffect(() => {
    if (!srn || !assignmentID) return;

    (async () => {
      const resp = await fetch(
        `/api/assignment/activity_logs?srn=${srn}&assignment_id=${assignmentID}`,
        {
          headers: {
            Authorization: token.toString(),
          },
        }
      );
      const data = await resp.json();

      const allLogs = Object.values(data.activity_logs).flat() as LogEvent[];
      setLogs(allLogs);
    })();
  }, [srn, assignmentID]);

  const resetReplay = () => {
    replayController.current.stop = true;
    setIsPlaying(false);
    setCode("");
    setProgress(0);
    setCurrentIndex(0);
  };

  const togglePlay = async () => {
    if (isPlaying) {
      replayController.current.stop = true;
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);
    replayController.current.stop = false;

    let currentCode = code;
    for (let i = currentIndex; i < logs.length; i++) {
      if (replayController.current.stop) break;

      const event = logs[i];
      const prev = logs[i - 1];
      const gap =
        i === 0
          ? 0
          : (event.ts_ms - prev.ts_ms) / speed;

      await new Promise((resolve) => setTimeout(resolve, gap));

      if (replayController.current.stop) break;

      if (event.type === "checkpoint") {
        currentCode = event.content || "";
      } else {
        currentCode = applyEvent(currentCode, event);
      }

      setCode(currentCode);
      setCurrentIndex(i + 1);
      setProgress(((i + 1) / logs.length) * 100);
    }

    setIsPlaying(false);
  };

  const handleSliderChange = (value: number) => {
    const newIndex = Math.floor((value / 100) * logs.length);
    setProgress(value);

    let currentCode = "";
    for (let i = 0; i < newIndex; i++) {
      const event = logs[i];
      if (event.type === "checkpoint") {
        currentCode = event.content || "";
      } else {
        currentCode = applyEvent(currentCode, event);
      }
    }

    setCode(currentCode);
    setCurrentIndex(newIndex);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-gray-100">
      <div className="flex flex-col gap-6 p-8 bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl border border-gray-800">
        <h2 className="text-2xl font-semibold text-center">
          Code Replay for{" "}
          <span className="text-blue-400">{srn}</span>
        </h2>

        {/* Controls */}
        <div className="flex flex-wrap justify-center gap-4 items-center">
          <button
            onClick={togglePlay}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium flex items-center gap-2"
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            {isPlaying ? "Pause" : "Play"}
          </button>

          <button
            onClick={resetReplay}
            className="px-5 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium flex items-center gap-2"
          >
            <RotateCcw size={18} /> Reset
          </button>

          <label className="flex items-center gap-2 text-sm">
            <span className="text-gray-300">Speed:</span>
            <select
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="bg-gray-800 border border-gray-700 p-1 rounded"
            >
              <option value={0.25}>0.25x</option>
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={2}>2x</option>
              <option value={4}>4x</option>
            </select>
          </label>
        </div>

        {/* Slider */}
        <div className="w-full flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={100}
            value={progress}
            onChange={(e) => handleSliderChange(Number(e.target.value))}
            className="w-full accent-blue-500"
          />
          <span className="text-sm text-gray-400 w-12 text-right">
            {Math.round(progress)}%
          </span>
        </div>

        {/* Replay Display */}
        <div className="relative border border-gray-700 bg-black rounded-xl p-4 font-mono text-sm whitespace-pre-wrap overflow-y-auto h-[400px]">
          {code ? (
            <pre className="text-green-300">{code}</pre>
          ) : (
            <span className="text-gray-500 italic">
              Waiting to start replay...
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
