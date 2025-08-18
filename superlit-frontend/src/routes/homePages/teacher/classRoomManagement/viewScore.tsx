import AlertDialogWrapper from "@/components/ui/alertDialogWrapper";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/lib/authContext";
import PopulateSheet from "./populateSheet";
import { Fragment, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import BackButton from "@/components/backButton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function downloadStudentCode(code: string, studentUniversityID: string) {
  const filename =
    studentUniversityID + "_" + new Date().toLocaleDateString() + ".txt";
  const link = document.createElement("a");
  link.style.display = "none";
  link.setAttribute(
    "href",
    "data:text/plain;charset=utf-8," + encodeURIComponent(code),
  );
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function downloadCSV() {
  const tableId = "scores-table";
  const separator = ","; // Column separator
  const rows = document.querySelectorAll(`#${tableId} tr`);

  // Construct CSV
  const csv = [];
  rows.forEach((row) => {
    const cols = row.querySelectorAll("td, th");
    const rowArray = Array.from(cols).map((col) =>
      col.innerText.replace(/(\r\n|\n|\r)/gm, "").replace(/(\s\s)/gm, " "),
    );
    csv.push(rowArray.join(separator));
  });

  // Create CSV string
  const csvString = csv.join("\n");

  // Trigger download
  const filename =
    "export_" + tableId + "_" + new Date().toLocaleDateString() + ".csv";
  const link = document.createElement("a");
  link.style.display = "none";
  link.setAttribute(
    "href",
    "data:text/csv;charset=utf-8," + encodeURIComponent(csvString),
  );
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

interface answerSubmission {
  questionNumber: number;
  score: number;
  AIVerdict: boolean;
  AIVerdictFailReason: string;
  AIVerified: boolean;
  AIVivaTaken: boolean;
  AIVivaScore: number;
  studentsCode: string;
}

interface student {
  universityID: string;
  name: string;
  ID: number;
}

interface responseFormat {
  submissions: {
    universityID: string;
    submissionsAnswer: answerSubmission[];
    totalScore: number;
  }[];
  maxNumberOfQuestions: number;
  questionNumberArray: number[];
  blacklistedStudents: student[];
}

export default function ViewScore() {
  const { token } = useAuth();
  const { classroomCode, assignmentID } = useParams();
  const [dialog, setDialog] = useState({
    title: "",
    description: "",
  });
  const dialogRef = useRef(null);
  const navigate = useNavigate();

  const [scores, setScores] = useState<responseFormat | null>(null);
  async function fetchData() {
    const response = await fetch("/api/assignment/getsubmissions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token.toString(),
      },
      body: JSON.stringify({
        assignmentID: parseInt(assignmentID),
      }),
    });

    const responseJSON = await response.json();
    if (responseJSON.error || !response.ok) {
      setDialog({
        title: "Error",
        description: "Failed to fetch data. Please logout and try again",
      });
      dialogRef.current.click();
      return;
    }

    const quesNumArray: number[] = [];

    for (let i = 1; i <= responseJSON.maxNumberOfQuestions; i++) {
      quesNumArray.push(i);
    }
    responseJSON.questionNumberArray = quesNumArray;
    setScores(responseJSON);
    console.log(responseJSON);
  }

  useEffect(() => {
    if (token == null || assignmentID == null) {
      navigate("/");
      return;
    }
    fetchData();
  }, []);

  async function excuseStudent(studentID: number) {
    const response = await fetch("/api/assignment/excusestudent", {
      method: "POST",
      headers: {
        "Content-Type": "application",
        Authorization: token.toString(),
      },
      body: JSON.stringify({
        studentID: studentID,
        assignmentID: parseInt(assignmentID),
      }),
    });
    let responseJSON;

    try {
      responseJSON = await response.json();
    } catch {
      setDialog({
        title: "Error",
        description: "Failed to excuse student. Please try again.",
      });
      dialogRef.current.click();
      return;
    }

    if (responseJSON.error) {
      setDialog({
        title: "Error",
        description:
          "Failed to excuse student. Please try again. Error: " +
          responseJSON.error,
      });
      dialogRef.current.click();
      return;
    }

    setDialog({
      title: "Success",
      description: "Student excused successfully",
    });
    dialogRef.current.click();

    // delete the student from the list
    // This is done so that the student is removed from the list without having to refetch the data
    setScores((prev) => {
      if (prev == null) return prev;
      prev.blacklistedStudents = prev.blacklistedStudents.filter(
        (student) => student.ID !== studentID,
      );
      return prev;
    });
  }

  function handleAIVerify() {
    const response = fetch("/api/assignment/aiverify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token.toString(),
      },
      body: JSON.stringify({ assignmentID: parseInt(assignmentID) }),
    });
    response.then((res) => {
      if (res.status === 200) {
        setDialog({
          title: "Success",
          description:
            "AI Verification started successfully. Check back here in a few minutes",
        });
      } else {
        setDialog({
          title: "Error",
          description: "Failed to start AI Verification. Please try again.",
        });
      }
      dialogRef.current.click();
    });
  }

  if (scores == null)
    return <div className="h-screen w-screen text-center">loading...</div>;

  return (
    <div className="w-screen min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto py-10 px-6 space-y-6">
        <div className="flex items-center justify-between">
          <BackButton />
          <h1 className="text-2xl font-bold">Student Scores</h1>
        </div>
        <div className="relative w-full overflow-auto">
          <Table id="scores-table">
            <TableHeader>
              <TableRow>
                <TableHead className="font-mono">Sl. No.</TableHead>
                <TableHead className="font-mono">University ID</TableHead>
                {scores?.questionNumberArray.map((index: number) => (
                  <Fragment key={index}>
                    <TableHead className="font-mono">
                      Question {index}
                    </TableHead>
                    <TableHead className="font-mono">
                      Question {index} AI Verify
                    </TableHead>
                    <TableHead className="font-mono">
                      Question {index} AI Viva Score
                    </TableHead>
                    <TableHead className="font-mono">
                      Question {index} Student's Code
                    </TableHead>
                  </Fragment>
                ))}
                <TableHead className="font-mono">Total Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scores?.submissions.map(
                (
                  submission: {
                    universityID: string;
                    submissionsAnswer: answerSubmission[];
                    totalScore: number;
                  },
                  index: number,
                ) => (
                  <TableRow key={index}>
                    <TableCell className="font-mono">{index + 1}</TableCell>
                    <TableCell className="font-mono">
                      {submission.universityID}
                    </TableCell>
                    {submission.submissionsAnswer.map(
                      (answer: answerSubmission, answerIndex: number) => (
                        <Fragment key={answerIndex}>
                          <TableCell className="font-mono">
                            {answer != null ? answer.score : "Didn't Submit"}
                          </TableCell>
                          {answer != null && answer.AIVerified ? (
                            answer.AIVerdict ? (
                              <TableCell className="font-mono text-green-500">
                                Verified Genuine
                              </TableCell>
                            ) : (
                              <TableCell className="font-mono text-red-500">
                                Check Student's Code!
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="text-blue-400 cursor-pointer">
                                        {" "}
                                        Why?
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{answer.AIVerdictFailReason}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </TableCell>
                            )
                          ) : (
                            <TableCell className="font-mono">
                              Not Verified
                            </TableCell>
                          )}

                          {answer != null && answer.AIVivaTaken ? (
                            answer.AIVivaScore > 2 ? (
                              <TableCell className="font-mono text-green-500">
                                {answer.AIVivaScore}/4
                              </TableCell>
                            ) : (
                              <TableCell className="font-mono text-red-500">
                                {answer.AIVivaScore}/4
                              </TableCell>
                            )
                          ) : (
                            <TableCell className="font-mono">
                              Not Taken
                            </TableCell>
                          )}

                          {answer != null ? (
                            <TableCell className="font-mono">
                              <Button
                                onClick={() =>
                                  downloadStudentCode(
                                    answer.studentsCode,
                                    submission.universityID,
                                  )
                                }
                              >
                                Download
                              </Button>
                            </TableCell>
                          ) : (
                            <TableCell className="font-mono">
                              Didn't Submit
                            </TableCell>
                          )}
                        </Fragment>
                      ),
                    )}
                    <TableCell className="font-mono">
                      {submission.totalScore}
                    </TableCell>
                  </TableRow>
                ),
              )}
            </TableBody>
          </Table>

          <Button onClick={downloadCSV} className="m-2">
            Download as CSV
          </Button>
          <PopulateSheet
            assignmentID={assignmentID}
            token={token.toString()}
            setDialog={setDialog}
            dialogRef={dialogRef}
          />
          <Button onClick={handleAIVerify} className="m-2">
            Verify With AI
          </Button>

          {scores?.blacklistedStudents.length === 0 ? (
            <></>
          ) : (
            <div>
              <h1 className="text-2xl font-bold my-5 text-red-500">
                Cheating Students
              </h1>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>University ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Excuse</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {scores?.blacklistedStudents.map(
                    (student: student, index: number) => (
                      <TableRow key={index}>
                        <TableCell>{student.universityID}</TableCell>
                        <TableCell>{student.name}</TableCell>
                        <TableCell>
                          <Button onClick={() => excuseStudent(student.ID)}>
                            Excuse
                          </Button>
                        </TableCell>
                      </TableRow>
                    ),
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      <AlertDialogWrapper dialog={dialog} dialogRef={dialogRef} />
    </div>
  );
}
