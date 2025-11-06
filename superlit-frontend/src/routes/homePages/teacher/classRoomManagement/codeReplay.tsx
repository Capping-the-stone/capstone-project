import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Play, Pause, RotateCcw } from "lucide-react";
import { useAuth } from "@/lib/authContext";

// --- Types ---
interface LogEntry {
  srn: string;
  question_id: number;
  ts_ms: number;
  event_id: string;
  type: string;
  content: string;
  code: string;
  offset: number;
  num_characters: number;
  is_paste: boolean;
}

interface APIResponse {
  activity_logs: Record<number, LogEntry[]>;
  question_ids_plagiarized: number[];
}

// --- Utility ---
function applyEvent(currentCode: string, event: LogEntry): string {
  switch (event.type) {
    case "checkpoint":
      return event.content || "";
    case "insert":
      return (
        currentCode.slice(0, event.offset) +
        event.content +
        currentCode.slice(event.offset)
      );
    case "delete":
      return (
        currentCode.slice(0, event.offset) +
        currentCode.slice(event.offset + event.num_characters)
      );
    case "run":
    case "submission":
      return event.code || currentCode;
    default:
      return currentCode;
  }
}

// --- Component ---
export default function CodeReplay() {
  const [allLogs, setAllLogs] = useState<Record<number, LogEntry[]>>({});
  const [plagiarizedQuestions, setPlagiarizedQuestions] = useState<number[]>([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState<number | null>(null);
  const [currentLogs, setCurrentLogs] = useState<LogEntry[]>([]);
  
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
    if (!srn || !assignmentID || !token) return;

    (async () => {
      try {
        const resp = await fetch(
          `/api/assignment/activity_logs?srn=${srn}&assignment_id=${assignmentID}`,
          {
            headers: {
              Authorization: token.toString(),
            },
          }
        );
        
        if (!resp.ok) {
          console.error("Failed to fetch logs");
          return;
        }
        
        const data: APIResponse = await resp.json();
        setAllLogs(data.activity_logs);
        setPlagiarizedQuestions(data.question_ids_plagiarized || []);
        
        // Auto-select first question if available
        const questionIds = Object.keys(data.activity_logs).map(Number).sort((a, b) => a - b);
        if (questionIds.length > 0) {
          setSelectedQuestionId(questionIds[0]);
        }
      } catch (error) {
        console.error("Error fetching logs:", error);
      }
    })();
  }, [srn, assignmentID, token]);

  // Update current logs when question selection changes
  useEffect(() => {
    if (selectedQuestionId !== null && allLogs[selectedQuestionId]) {
      const logs = [...allLogs[selectedQuestionId]].sort((a, b) => a.ts_ms - b.ts_ms);
      setCurrentLogs(logs);
      resetReplay();
    } else {
      setCurrentLogs([]);
    }
  }, [selectedQuestionId, allLogs]);

  const resetReplay = () => {
    replayController.current.stop = true;
    setIsPlaying(false);
    setCode("");
    setProgress(0);
    setCurrentIndex(0);
  };

  const speedRef = useRef(speed);
  
  // Keep speed ref in sync with speed state
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  const togglePlay = async () => {
    if (isPlaying) {
      replayController.current.stop = true;
      setIsPlaying(false);
      return;
    }

    if (currentLogs.length === 0) return;

    setIsPlaying(true);
    replayController.current.stop = false;

    let currentCode = code;
    for (let i = currentIndex; i < currentLogs.length; i++) {
      if (replayController.current.stop) break;

      const event = currentLogs[i];
      const prev = currentLogs[i - 1];
      // Use speedRef.current to get the latest speed value during playback
      const gap =
        i === 0
          ? 0
          : Math.min((event.ts_ms - prev.ts_ms) / speedRef.current, 5000); // Cap at 5 seconds

      await new Promise((resolve) => setTimeout(resolve, gap));

      if (replayController.current.stop) break;

      if (event.type === "checkpoint") {
        setCode("");
        await new Promise((resolve) => setTimeout(resolve, 50));
        currentCode = event.content || "";
      } else {
        currentCode = applyEvent(currentCode, event);
      }

      setCode(currentCode);
      setCurrentIndex(i + 1);
      setProgress(((i + 1) / currentLogs.length) * 100);
    }

    setIsPlaying(false);
  };

  const handleSliderChange = (value: number) => {
    if (currentLogs.length === 0) return;
    
    replayController.current.stop = true;
    setIsPlaying(false);
    
    const newIndex = Math.floor((value / 100) * currentLogs.length);
    setProgress(value);

    let currentCode = "";
    for (let i = 0; i < newIndex; i++) {
      const event = currentLogs[i];
      currentCode = applyEvent(currentCode, event);
    }

    setCode(currentCode);
    setCurrentIndex(newIndex);
  };

  const questionIds = Object.keys(allLogs).map(Number).sort((a, b) => a - b);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-gray-100 p-4">
      <div className="flex flex-col gap-6 p-8 bg-gray-900 rounded-2xl shadow-2xl w-full max-w-6xl border border-gray-800">
        <div>
          <h2 className="text-2xl font-semibold text-center">
            Code Replay for{" "}
            <span className="text-blue-400">{srn}</span>
          </h2>
          <p className="text-center text-gray-400 text-sm mt-2">
            Assignment ID: {assignmentID}
          </p>
        </div>

        {/* Question Selector */}
        {questionIds.length > 0 && (
          <div className="border border-gray-700 rounded-lg p-4 bg-gray-800">
            <h3 className="text-lg font-medium mb-3">Select Question</h3>
            <div className="flex flex-wrap gap-2">
              {questionIds.map((qId) => {
                const isPlagiarized = plagiarizedQuestions.includes(qId);
                const isSelected = selectedQuestionId === qId;
                const logCount = allLogs[qId]?.length || 0;
                
                return (
                  <button
                    key={qId}
                    onClick={() => {
                      setSelectedQuestionId(qId);
                    }}
                    className={`px-4 py-2 rounded-lg font-medium transition-all border-2 ${
                      isSelected
                        ? isPlagiarized
                          ? "bg-red-600 border-red-500 text-white"
                          : "bg-blue-600 border-blue-500 text-white"
                        : isPlagiarized
                        ? "bg-red-900/30 border-red-700 text-red-300 hover:bg-red-900/50"
                        : "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isPlagiarized && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                      <span>Q{qId}</span>
                      <span className="text-xs opacity-75">({logCount} events)</span>
                    </div>
                  </button>
                );
              })}
            </div>
            {plagiarizedQuestions.length > 0 && (
              <div className="mt-3 p-3 bg-red-900/20 border border-red-700/50 rounded-lg">
                <p className="text-red-300 text-sm flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Questions marked with warning icon are flagged for plagiarism
                </p>
              </div>
            )}
          </div>
        )}

        {selectedQuestionId !== null && currentLogs.length > 0 ? (
          <>
            {/* Controls */}
            <div className="flex flex-wrap justify-center gap-4 items-center">
              <button
                onClick={togglePlay}
                disabled={currentLogs.length === 0}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-medium flex items-center gap-2"
              >
                {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                {isPlaying ? "Pause" : "Play"}
              </button>

              <button
                onClick={resetReplay}
                disabled={currentLogs.length === 0}
                className="px-5 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed rounded-lg font-medium flex items-center gap-2"
              >
                <RotateCcw size={18} /> Reset
              </button>

              <label className="flex items-center gap-2 text-sm">
                <span className="text-gray-300">Speed:</span>
                <select
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                  className="bg-gray-800 border border-gray-700 p-2 rounded"
                >
                  <option value={0.25}>0.25x</option>
                  <option value={0.5}>0.5x</option>
                  <option value={1}>1x</option>
                  <option value={2}>2x</option>
                  <option value={4}>4x</option>
                  <option value={10}>10x</option>
                  <option value={50}>50x</option>
                </select>
              </label>

              <div className="text-sm text-gray-400">
                Event {currentIndex} / {currentLogs.length}
              </div>
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
            <div className="relative border border-gray-700 bg-black rounded-xl p-4 font-mono text-sm whitespace-pre-wrap overflow-y-auto h-[500px]">
              {code ? (
                <pre className="text-green-300">{code}</pre>
              ) : (
                <span className="text-gray-500 italic">
                  Press Play to start replay...
                </span>
              )}
              
              {/* Event Overlay for Run/Submission */}
              {currentIndex > 0 && currentIndex <= currentLogs.length && 
                (currentLogs[currentIndex - 1]?.type === "run" || 
                 currentLogs[currentIndex - 1]?.type === "submission") && (
                <div className="absolute top-4 right-4 animate-pulse">
                  <div className={`px-4 py-2 rounded-lg font-semibold text-sm shadow-lg ${
                    currentLogs[currentIndex - 1]?.type === "submission"
                      ? "bg-green-600 text-white border-2 border-green-400"
                      : "bg-blue-600 text-white border-2 border-blue-400"
                  }`}>
                    {currentLogs[currentIndex - 1]?.type === "submission" ? (
                      <div className="flex items-center gap-2">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span>SUBMITTED</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span>RAN CODE</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Event Info */}
            {currentIndex > 0 && currentIndex <= currentLogs.length && (
              <div className="border border-gray-700 rounded-lg p-4 bg-gray-800">
                <h3 className="text-sm font-medium mb-2 text-gray-300">Current Event</h3>
                <div className="text-xs space-y-1 text-gray-400">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Type:</span> 
                    <span className={`px-2 py-0.5 rounded ${
                      currentLogs[currentIndex - 1]?.type === "submission"
                        ? "bg-green-600 text-white"
                        : currentLogs[currentIndex - 1]?.type === "run"
                        ? "bg-blue-600 text-white"
                        : currentLogs[currentIndex - 1]?.type === "checkpoint"
                        ? "bg-purple-600 text-white"
                        : "bg-gray-600 text-white"
                    }`}>
                      {currentLogs[currentIndex - 1]?.type}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold">Timestamp:</span>{" "}
                    {new Date(currentLogs[currentIndex - 1]?.ts_ms).toLocaleString()}
                  </div>
                  {currentLogs[currentIndex - 1]?.is_paste && (
                    <div className="text-yellow-400">
                      <span className="font-semibold">⚠ Paste Event</span>
                    </div>
                  )}
                  {(currentLogs[currentIndex - 1]?.type === "run" || 
                    currentLogs[currentIndex - 1]?.type === "submission") && (
                    <div className="mt-2 pt-2 border-t border-gray-700">
                      <span className="font-semibold">
                        {currentLogs[currentIndex - 1]?.type === "submission" 
                          ? "✓ Code was submitted" 
                          : "▶ Code was compiled/run"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center text-gray-400 py-12">
            {questionIds.length === 0 ? (
              <p>No activity logs found for this student.</p>
            ) : (
              <p>Select a question to view the replay.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
