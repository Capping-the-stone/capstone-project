import { useRef, useState, useEffect } from "react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { useNavigate, useParams } from "react-router-dom"
import AlertDialogWrapper from "@/components/ui/alertDialogWrapper"
import { Fragment } from "react"
import PopulateSheet from "@/routes/instantTest/teacherPanel/slug/populateGoogleSheet"

export default function TeacherDashboard() {
  const { privateCode } = useParams()
  const [viewToggle, setViewToggle] = useState(true)
  const [dialog, setDialog] = useState({})
  const dialogRef = useRef(null)
  const [studentScores, setStudentScores] = useState(null)
  const navigate = useNavigate()


  async function fetchStudentScores() {
    try {
      const response = await fetch("/api/instanttest/getsubmissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ privateCode: privateCode }),
      })
      const data = await response.json()

      // some sorting logic
      // sort data.submissions by universityID
      data.submissions.sort((a: string, b: string) => a.universityID - b.universityID)

      // pad the answer array where values are not available for that question
      const minQuestionIndex = Math.min(...(data.questionIDs))
      data.submissions.forEach((submission: any) => {
        const answerArray = new Array(data.questionIDs.length).fill(null)
        submission.answers.forEach((answer: any) => {
          console.log(answer)
          answerArray[answer.questionID - minQuestionIndex] = {
            score: answer.score,
            AIVerified: answer.AIVerified,
            AIVerdict: answer.AIVerdict,
            studentCode: answer.code
          }
        })
        submission.answersPadded = answerArray
      })



      setStudentScores(data)
      setViewToggle(data.isActive)
    } catch (error) {
      console.log(error)
      setDialog({
        title: "Error",
        description: "Failed to fetch student scores or wrong test code. Please try again."
      })
      dialogRef.current.click()
      setTimeout(() => {
        navigate("/instantTest/teacherDashboard")
      }, 5000)
    }
  }
  useEffect(() => {
    fetchStudentScores()
  }, [])


  async function handleViewToggleChange(newViewToggle: boolean) {
    const response = await fetch("/api/instanttest/changeactive", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ privateCode: privateCode, active: newViewToggle }),
    })

    const data = await response.json()

    if (data.error) {
      setDialog({
        title: "Error",
        description: "Failed to change test status. Please try again."
      })
      setViewToggle(!newViewToggle)
    }
    else {
      setViewToggle(newViewToggle)
    }
  }

  function handleAIVerify() {
    const response = fetch("/api/instanttest/aiverify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ privateCode: privateCode }),
    })
    response.then((res) => {
      if (res.status === 200) {
        setDialog({
          title: "Success",
          description: "AI Verification started successfully. Check back here in a few minutes"
        })
      } else {
        setDialog({
          title: "Error",
          description: "Failed to start AI Verification. Please try again."
        })
      }
      dialogRef.current.click()
    })
  }

  function downloadStudentCode(code: string, studentUniversityID: string,) {
    let filename = studentUniversityID + "_" + new Date().toLocaleDateString() + ".txt";
    let link = document.createElement("a");
    link.style.display = "none";
    link.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(code));
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function downloadCSV() {
    const tableId = "scores-table"
    const separator = ","; // Column separator
    const rows = document.querySelectorAll(`#${tableId} tr`);

    // Construct CSV
    let csv = [];
    rows.forEach((row) => {
      let cols = row.querySelectorAll("td, th");
      let rowArray = Array.from(cols).map(col => col.innerText.replace(/(\r\n|\n|\r)/gm, "").replace(/(\s\s)/gm, " "));
      csv.push(rowArray.join(separator));
    });

    // Create CSV string
    let csvString = csv.join("\n");

    // Trigger download
    let filename = "export_" + tableId + "_" + new Date().toLocaleDateString() + ".csv";
    let link = document.createElement("a");
    link.style.display = "none";
    link.setAttribute("href", "data:text/csv;charset=utf-8," + encodeURIComponent(csvString));
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  if (!studentScores) return (<div className="bg-gray-100 flex justify-center items-center min-h-screen w-screen">Loading...</div>)

  return (
    <div className="w-screen min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto py-10 px-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Student Scores</h1>
          <div className="flex items-center space-x-2">
            <span className="text-gray-500 dark:text-gray-400">Test status:</span>
            <Switch
              id="view-toggle"
              aria-label="Toggle view"
              checked={viewToggle}
              onCheckedChange={handleViewToggleChange}
              className={`${viewToggle ? "dark:bg-green-500" : "dark:bg-red-500"} focus:ring-green-500 dark:focus:ring-red-500`}
            />
            <Label
              htmlFor="view-toggle"
              className={`font-medium ${viewToggle ? "dark:text-green-500" : "text-gray-500 dark:text-gray-400"
                }`}
            >
              {viewToggle ? "Active" : "Closed"}
            </Label>
          </div>
        </div>
        <div className="relative w-full overflow-auto">
          <Table id="scores-table">
            <TableHeader>
              <TableRow>
                <TableHead className="font-mono">University ID</TableHead>
                {
                  studentScores?.questionIDs.map((questionID: number, index: number) => (
                    <Fragment key={index}>
                      <TableHead className="font-mono" >Question {index + 1}</TableHead>
                      <TableHead className="font-mono" >Question {index + 1} AI Verify</TableHead>
                      <TableHead className="font-mono" >Question {index + 1} Student's Code</TableHead>
                    </Fragment>
                  )
                  )
                }
                <TableHead className="font-mono">Total Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {
                studentScores?.submissions.map((submission: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell className="font-mono">{submission.universityID}</TableCell>
                    {
                      submission.answersPadded.map((answer: any, answerIndex: number) => (
                        <Fragment key={answerIndex}>
                          <TableCell className="font-mono" >{answer != null ? answer.score : "Didn't Submit"}</TableCell>
                          {
                            answer != null && answer.AIVerified ? (
                              answer.AIVerdict ? (
                                <TableCell className="font-mono text-green-500" >Verified Genuine</TableCell>
                              ) : (
                                <TableCell className="font-mono text-red-500" >Check Student's Code!</TableCell>
                              )
                            ) : (
                              <TableCell className="font-mono" >Not Verified</TableCell>
                            )
                          }


                          {
                            answer != null ? (
                              <TableCell className="font-mono">
                                <Button onClick={() => downloadStudentCode(answer.studentCode, submission.universityID)}>Download</Button>
                              </TableCell>
                            ) : (
                              <TableCell className="font-mono" >Didn't Submit</TableCell>
                            )
                          }
                        </Fragment>
                      ))
                    }
                    <TableCell className="font-mono">{submission.totalScore}</TableCell>
                  </TableRow>
                ))
              }
            </TableBody>
          </Table>

          <Button onClick={downloadCSV} className="m-2">Download as CSV</Button>
          <PopulateSheet privateCode={privateCode} setDialog={setDialog} dialogRef={dialogRef} />
          <Button onClick={handleAIVerify} className="m-2">Verify With AI</Button>
        </div>
      </div>

      <AlertDialogWrapper dialog={dialog} dialogRef={dialogRef} />
    </div >
  )
}
