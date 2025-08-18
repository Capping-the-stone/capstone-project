import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import AlertDialogWrapper from "@/components/ui/alertDialogWrapper";

import { useRef, useState } from "react";
import { useAuth } from "@/lib/authContext";
import { useNavigate } from "react-router-dom";

export default function AssignmentTestCasePanel({
  assignmentData,
  setAssignmentData,
  currentQuestionIndex,
  editorData,
  assignmentID,
  languages,
  AIVivaTriggerRef,
  logi,
  forceFlush,
  userID,
}: {
  assignmentData: any;
  setAssignmentData: any;
  editorData: any;
  currentQuestionIndex: any;
  assignmentID: number;
  languages: string[];
  AIVivaTriggerRef: RefObject<HTMLElement>;
  logi: (
    userID: string,
    editorContentBefore: string | undefined,
    editorContentAfter: string | undefined,
    timestamp: number,
    isPaste: boolean,
    isDeletion: boolean,
    isCompilation: boolean,
    isSubmission: boolean,
  ) => void;
  forceFlush: () => void;
  userID: string;
}) {
  const dialogRef = useRef(null);
  const [dialog, setDialog] = useState({});
  const { token } = useAuth();
  const navigate = useNavigate();
  const handleRun = async () => {
    logi(
      userID,
      currentQuestionIndex,
      editorData[currentQuestionIndex],
      editorData[currentQuestionIndex],
      Date.now(),
      false,
      false,
      true,
      false,
    );

    const tempOutputs: string[] = [];
    await Promise.all(
      assignmentData.questions[currentQuestionIndex].exampleCases.map(
        async (testCase: any, index: any) => {
          const payload = {
            code: editorData[currentQuestionIndex],
            language: languages[currentQuestionIndex],
            input: testCase["input"],
          };

          const response = await fetch("/api/run", {
            method: "POST",
            headers: {
              content: "application/json",
            },
            body: JSON.stringify(payload),
          });

          const responseJSON = await response.json();

          if (responseJSON.error) {
            alert("An error occured");
            return;
          }

          tempOutputs[index] = responseJSON.output;
          outputRef.current.scrollIntoView({ behavior: "smooth" });
        },
      ),
    );

    // update assignmentData state
    setAssignmentData((oldAssignmentData: any) => {
      const newAssignmentData = { ...oldAssignmentData };
      newAssignmentData.questions[currentQuestionIndex].exampleCases.map(
        (testCase: any, index: any) => {
          testCase.userOutput = tempOutputs[index];
          console.log("assigning", index, tempOutputs[index]);
        },
      );
      console.log(newAssignmentData);
      return newAssignmentData;
    });
  };

  async function getHint() {
    const response = await fetch("/api/aihint", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code: editorData[currentQuestionIndex],
        language: languages[currentQuestionIndex],
        questionID: assignmentData.questions[currentQuestionIndex].ID,
      }),
    });

    let responseJSON;
    try {
      responseJSON = await response.json();
    } catch {
      setDialog({
        title: "An error occured",
        description:
          "Please try again. If this problem persists, please contact your teacher.",
      });
      dialogRef.current.click();
      return;
    }

    if (responseJSON.error) {
      setDialog({
        title: "An error occured",
        description: "Error: " + responseJSON.error,
      });
      dialogRef.current.click();
      return;
    }

    setDialog({
      title: "Your Hint",
      description: responseJSON.hint,
    });
    dialogRef.current.click();
  }

  const handleEndTest = () => {
    // add other logic in the future
    forceFlush();
    setDialog({
      title: "Are you sure?",
      description:
        "Are you sure you want to end the test? You can attempt again later BEFORE the deadline. You won't be able to attempt the test after the deadline",
      okText: "No, Go Back",
      cancelText: "Yes, End Test",
      onCancel: () => {
        navigate(-1);
        document.exitFullscreen();
      },
    });
    dialogRef.current.click();
  };

  const handleSubmit = async () => {
    logi(
      userID,
      currentQuestionIndex,
      editorData[currentQuestionIndex],
      editorData[currentQuestionIndex],
      Date.now(),
      false,
      false,
      false,
      true,
    );
    const payload = {
      code: editorData[currentQuestionIndex],
      language: languages[currentQuestionIndex],
      assignmentID: assignmentID,
      questionID: assignmentData.questions[currentQuestionIndex].ID,
    };

    const response = await fetch("/api/assignment/submit", {
      method: "POST",
      headers: {
        content: "Assignmentication/json",
        Authorization: token.toString(),
      },
      body: JSON.stringify(payload),
    });

    const responseJSON = await response.json();

    if (!response.ok) {
      setDialog({
        title: "Error",
        description: "An error occured: " + responseJSON.error,
      });
      dialogRef.current.click();
      return;
    }

    if (responseJSON.error) {
      if ((responseJSON.error = "Assignment is not active")) {
        setDialog({
          title: "Times Up",
          description:
            "You can't make this submission since it's past the deadline. Contact your teacher if you think this is an error",
        });
        dialogRef.current.click();
        return;
      }

      setDialog({
        title: "Error",
        description: "An error occured: " + responseJSON.error,
      });
      dialogRef.current.click();
      return;
    }

    let numberTestCasesPassed,
      numberTotalTestCases = 0;
    if (responseJSON.testCasesFailed != null) {
      numberTotalTestCases += responseJSON.testCasesFailed.length;
    }
    if (responseJSON.testCasesPassed != null) {
      numberTestCasesPassed = responseJSON.testCasesPassed.length;
      numberTotalTestCases += numberTestCasesPassed;
    }

    setDialog({
      title: "Success",
      description: `Your code has been submitted successfully. You scored ${responseJSON.score} points on this question while passing ${numberTestCasesPassed} out of ${numberTotalTestCases} test cases. Submit the other questions if you haven't already.`,
    });
    dialogRef.current.click();
    if (assignmentData.enableAIViva) {
      AIVivaTriggerRef.current.click();
    }
  };

  const outputRef = useRef(null);
  return (
    <ScrollArea className="h-full w-full">
      <Tabs className="h-full" defaultValue="case1">
        <div className="m-1">
          {assignmentData == null ? (
            "Loading..."
          ) : (
            <div>
              <div className="flex h-full w-full items-start justify-between">
                <TabsList>
                  {assignmentData["questions"][currentQuestionIndex][
                    "exampleCases"
                  ].map((testCase: any, index: any) => (
                    <TabsTrigger
                      key={index}
                      value={`case${index + 1}`}
                      className={
                        testCase.userOutput == null
                          ? "text-black dark:text-white"
                          : testCase.userOutput.trim() ==
                              testCase.expectedOutput.trim()
                            ? "text-green-500"
                            : "text-red-800"
                      }
                    >
                      Case {index + 1}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <div className="flex justify-end items-end m-1">
                  <Button
                    className="mx-2"
                    variant="destructive"
                    onClick={handleEndTest}
                  >
                    End Test
                  </Button>
                  {assignmentData.enableAIHint ? (
                    <Button
                      className="mx-2"
                      variant="default"
                      onClick={getHint}
                    >
                      AI Hint & Verify
                    </Button>
                  ) : (
                    <></>
                  )}

                  <Button
                    className="mx-2"
                    variant="secondary"
                    onClick={handleRun}
                  >
                    Run
                  </Button>
                  <Button className="mx-2" onClick={handleSubmit}>
                    Submit
                  </Button>
                </div>
              </div>
              <div>
                {assignmentData["questions"][currentQuestionIndex][
                  "exampleCases"
                ].map((testCase: any, index: any) => (
                  <TabsContent
                    key={index}
                    value={`case${index + 1}`}
                    className="flex flex-col items-center justify-left w-full"
                  >
                    <div className="w-full">
                      <div>Input</div>
                      <Textarea value={testCase["input"]} readOnly></Textarea>
                    </div>

                    <div className="w-full">
                      <div>Expected Output</div>
                      <Textarea
                        value={testCase["expectedOutput"]}
                        readOnly
                      ></Textarea>
                    </div>

                    <div className="w-full">
                      <div>Your Output</div>
                      <Textarea
                        ref={outputRef}
                        value={testCase["userOutput"]}
                        readOnly
                        rows={20}
                      ></Textarea>
                    </div>
                  </TabsContent>
                ))}
              </div>
            </div>
          )}
        </div>
      </Tabs>
      <AlertDialogWrapper dialog={dialog} dialogRef={dialogRef} />
    </ScrollArea>
  );
}
