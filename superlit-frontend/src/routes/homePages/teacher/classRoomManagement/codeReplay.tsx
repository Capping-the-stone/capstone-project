import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Play, Pause, RotateCcw } from "lucide-react";

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
    ts: number;
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
        case "run":
        case "submission":
            return currentCode;
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

    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const srn = queryParams.get("studentID");
    const assignmentID = queryParams.get("assignmentID");

    const replayTimeouts = useRef<NodeJS.Timeout[]>([]);
    const baseTime = useRef<number>(0);

    // Fetch logs
    useEffect(() => {
        if (!srn || !assignmentID) return;

        (async () => {
            const resp = await fetch(
                `/api/assignments/activity_logs?srn=${srn}&assignment_id=${assignmentID}`
            );
            const data = await resp.json();

            const allLogs = Object.values(data.activity_logs)
                .flat()
                .sort((a: LogEvent, b: LogEvent) => a.ts - b.ts);

            setLogs(allLogs);
        })();
    }, [srn, assignmentID]);

    // Cleanup on unmount
    useEffect(() => {
        return () => replayTimeouts.current.forEach(clearTimeout);
    }, []);

    const startReplay = () => {
        if (!logs.length) return;
        setCode("");
        setIsPlaying(true);
        replayTimeouts.current.forEach(clearTimeout);
        replayTimeouts.current = [];

        let currentCode = "";
        baseTime.current = logs[0].ts;

        logs.forEach((event, index) => {
            const delay = (event.ts - baseTime.current) / speed;
            const timeout = setTimeout(() => {
                currentCode = applyEvent(currentCode, event);
                setCode(currentCode);

                if (index === logs.length - 1) setIsPlaying(false);
            }, delay);
            replayTimeouts.current.push(timeout);
        });
    };

    const stopReplay = () => {
        replayTimeouts.current.forEach(clearTimeout);
        setIsPlaying(false);
    };

    const resetReplay = () => {
        stopReplay();
        setCode("");
    };
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-950 text-gray-100">
            <div className="flex flex-col gap-6 p-8 bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl border border-gray-800 transition-all">
                <h2 className="text-2xl font-semibold text-center">
                    Code Replay for{" "}
                    <span className="text-blue-400">{srn}</span>
                </h2>

                {/* Controls */}
                <div className="flex flex-wrap justify-center gap-3 items-center">
                    <button
                        onClick={isPlaying ? stopReplay : startReplay}
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition-all"
                    >
                        {isPlaying ? "Pause" : "Play"}
                    </button>

                    <button
                        onClick={resetReplay}
                        className="px-5 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-all"
                    >
                        Reset
                    </button>

                    <label className="flex items-center gap-2 text-sm">
                        <span className="text-gray-300">Speed:</span>
                        <select
                            value={speed}
                            onChange={(e) => setSpeed(Number(e.target.value))}
                            className="bg-gray-800 border border-gray-700 p-1 rounded focus:ring-2 focus:ring-blue-400"
                        >
                            <option value={0.5}>0.5x</option>
                            <option value={1}>1x</option>
                            <option value={2}>2x</option>
                            <option value={4}>4x</option>
                        </select>
                    </label>
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
