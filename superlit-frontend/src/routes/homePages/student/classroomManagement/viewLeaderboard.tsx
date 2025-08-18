import { useAuth } from "@/lib/authContext"
import AlertDialogWrapper from "@/components/ui/alertDialogWrapper";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import BackButton from "@/components/backButton";


interface responseFormat {
  universityID: string
  totalScore: number
}


export default function ViewLeaderboard() {
  const { token } = useAuth()
  const { classroomCode, assignmentID } = useParams()
  const [dialog, setDialog] = useState({
    title: "",
    description: "",
    onOk: () => { }
  })
  const dialogRef = useRef(null)
  const navigate = useNavigate()
  const [leaderboard, setLeaderboard] = useState<responseFormat[] | null>(null);


  async function fetchData() {
    const response = await fetch("/api/assignment/getleaderboard", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": token.toString()
      },
      body: JSON.stringify({
        assignmentID: parseInt(assignmentID)
      })
    }
    )

    let responseJSON = await response.json()
    if (responseJSON.error || !response.ok) {
      setDialog({
        title: "Error",
        description: "Failed to fetch data. Please logout and try again",
        onOk: () => navigate(-1)
      })
      dialogRef.current.click()
      return
    }

    setLeaderboard(responseJSON.leaderboard)
  }


  useEffect(() => {
    if (token == null || assignmentID == null) {
      navigate("/")
      return
    }
    fetchData()
  }, [])


  return (
    <div className="w-screen min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto py-10 px-6 space-y-6">
        <div className="flex items-center justify-between">
          <BackButton />
          <h1 className="text-2xl font-bold">Leaderboard</h1>
        </div>
        <div className="relative w-full overflow-auto">
          <Table id="leaderboard-table">
            <TableHeader>
              <TableRow>
                <TableHead className="font-mono">Position</TableHead>
                <TableHead className="font-mono">University ID</TableHead>
                <TableHead className="font-mono">Total Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {
                leaderboard?.map((student: responseFormat, index: number) => (
                  <TableRow key={index}>
                    <TableCell className="font-mono">{index + 1}</TableCell>
                    <TableCell className="font-mono">{student.universityID}</TableCell>
                    <TableCell className="font-mono">{student.totalScore}</TableCell>
                  </TableRow>
                ))
              }
            </TableBody>
          </Table>

        </div>
      </div>

      <AlertDialogWrapper dialog={dialog} dialogRef={dialogRef} />
    </div>
  )
}
