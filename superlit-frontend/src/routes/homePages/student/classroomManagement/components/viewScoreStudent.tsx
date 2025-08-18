import BackButton from "@/components/backButton";
import AlertDialogWrapper from "@/components/ui/alertDialogWrapper";
import CodeBlock from "@/components/ui/codeBlock";
import { useAuth } from "@/lib/authContext";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface testCase {
  passed: boolean
}
interface Answer {
  questionNumber: number
  questionTitle: string
  questionDescription: string
  attempted: boolean
  code: string
  AIVerified: boolean
  AIVerdict: boolean
  AIVerdictFailReason: string
  AIVivaTaken: boolean
  AIVivaScore: number
  score: number
  testCases: testCase[]
}

interface apiResponse {
  answers: Answer[]
  totalScore: number
}


export default function ViewScoreStudent() {
  const { classroomID, assignmentID } = useParams()
  const [submissionData, setSubmissionData] = useState<apiResponse | null>(null)
  const [dialog, setDialog] = useState({
    title: "",
    description: "",
    onOk: () => { }
  })
  const dialogRef = useRef()
  const navigate = useNavigate()
  const { token } = useAuth()
  async function fetchData() {
    const response = await fetch("/api/assignment/getsubmissionforstudent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": token.toString()
      },
      body: JSON.stringify({
        assignmentID: parseInt(assignmentID)
      })
    })

    let responseJSON
    try {
      responseJSON = await response.json()
    } catch (e) {
      setDialog({
        title: "Error",
        description: "Something went wrong: " + e,
        onOk: () => navigate(-1),
      })
      dialogRef.current.click()
    }
    if (responseJSON.error != null) {
      if (responseJSON.error == "record not found") {
        setDialog({
          title: "Not Attempted",
          description: "You have not attempted any question on this assignment yet",
          onOk: () => navigate(-1),
        })

        dialogRef.current.click()
        return
      }
      setDialog({
        title: "Error",
        description: "Something went wrong: " + responseJSON.error,
        onOk: () => navigate(-1),
      })
      dialogRef.current.click()
      return
    }

    setSubmissionData(responseJSON)
  }

  useEffect(() => {
    if (token == null || assignmentID == null) {
      navigate("/")
      return
    }
    fetchData()
  }, [])

  if (submissionData == null) {
    return <div className="flex items-center justify-center h-screen w-screen">loading...
      <AlertDialogWrapper dialog={dialog} dialogRef={dialogRef} />
    </div>
  }

  return (
    <div className="flex flex-col w-full min-h-screen bg-gray-100 dark:bg-gray-900 p-5 px-32">

      <div className="flex items-center justify-between">
        <BackButton />
        <h1 className="text-3xl font-bold">Your Scores</h1>
      </div>
      {submissionData.answers.map((submission: Answer, index: number) => {
        if (!submission.attempted) return (
          <div key={index} className="shadow-sm bg-gray-200 dark:bg-gray-800 p-5 rounded-md my-5">
            <div className="flex justify-between items-center">
              <div className="text-2xl pb-2 font-bold">{submission.questionNumber + ". " + submission.questionTitle}</div>
            </div>
            <div className="text-gray-500 dark:text-gray-300 py-2">{submission.questionDescription}</div>
            <div className="text-xl font-bold text-red-500">Not Attempted</div>
          </div>

        )

        return (
          <div key={index} className="shadow-sm bg-gray-200 dark:bg-gray-800 p-5 rounded-md my-5">
            <div className="flex justify-between items-center">
              <div className="text-2xl pb-2 font-bold">{submission.questionNumber + ". " + submission.questionTitle}</div>
              <div className="flex space-x-2 items-center justify-center">
                {submission.AIVerified ?
                  submission.AIVerdict ? (
                    <div className="bg-green-500 text-green-50 px-2 py-1 rounded-md text-sm font-medium">
                      AI Verified - Correct
                    </div>
                  ) : (
                    <div className="bg-red-500 text-red-50 px-2 py-1 rounded-md text-sm font-medium">
                      AI Verified - Incorrect
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-blue-300 cursor-pointer"> | Why?</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{submission.AIVerdictFailReason}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  )
                  : (
                    <div className="bg-yellow-500 text-yellow-50 px-2 py-1 rounded-md text-sm font-medium text-center">
                      Not AI Verified
                    </div>
                  )}

                <div className="text-2xl font-bold flex flex-col">
                  <div>{submission.score}</div>
                  <div className={submission.AIVivaScore > 2 ? "text-green-500" : "text-red-500"}>{submission.AIVivaTaken ? (
                    "Viva: " + submission.AIVivaScore + "/4"
                  ) : (
                    <></>
                  )}</div>
                </div>

              </div>
            </div>
            <div className="text-gray-500 dark:text-gray-300 py-2">{submission.questionDescription}</div>

            <div className="text-xl py-2">Your Code</div>
            <CodeBlock code={submission.code} className="" />

            <div>
              <div className="text-xl py-2">Test Cases</div>

              <div className="flex justify-start items-center">
                {submission.testCases.map((testCase: testCase, index: number) => (
                  <div key={index} className="">
                    {testCase.passed ? (
                      <span className="bg-green-500 text-green-50 px-2 py-1 rounded-md text-sm font-medium m-2 inline">
                        {"Case " + (index + 1) + " "}Passed
                      </span>
                    ) : (
                      <div className="bg-red-500 text-red-50 px-2 py-1 rounded-md text-sm font-medium m-2">
                        {"Case " + (index + 1) + " "}Failed
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      })}


      <div className="shadow-sm bg-gray-200 dark:bg-gray-800 p-5 rounded-md flex justify-between items-center my-5">
        <span className="text-2xl pb-2 font-bold">Total Score</span>
        <span className="text-2xl font-bold">{submissionData.totalScore}</span>
      </div>

      <AlertDialogWrapper dialog={dialog} dialogRef={dialogRef} />
    </div>
  )
}
