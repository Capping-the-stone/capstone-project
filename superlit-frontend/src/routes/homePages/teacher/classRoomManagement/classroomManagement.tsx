import { useAuth } from "@/lib/authContext"
import { useState } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { useEffect } from "react"

import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import BackButton from "@/components/backButton"

export default function ClassRoomManagement() {
  let { classRoomCode } = useParams()
  const location = useLocation()
  const { classrooms } = location.state
  // this is the list of classrooms the teacher is part of
  // it is used to pass information to the edit page
  const [classroomData, setClassroomData] = useState(null)
  const { token, logout } = useAuth()
  const navigate = useNavigate()

  const fetchAssignmentList = async () => {
    const response = await fetch("/api/assignment/listassignments", {
      method: "POST",
      headers: {
        "Authorization": token.toString(),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        classroomCode: classRoomCode.toString()
      })
    })

    if (response.status === 401) {
      // how did this guy come here, log him out
      // too much cock. typing in codes in the url and all
      logout()
      return
    }

    const responseJson = await response.json()

    setClassroomData(responseJson)
  }



  useEffect(() => {
    if (token == null) {
      navigate("/")
    }
    fetchAssignmentList()
  }, [])

  if (classroomData == null) {
    return <div className="flex items-center justify-center h-screen w-screen">loading...</div>
  }

  return (
    <div className="w-screen min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto py-10 px-6 space-y-6">
        <div className="flex items-center justify-between">
          <BackButton />
          <h1 className="text-3xl font-bold">{classroomData.name}</h1>
        </div>
        <div className="text-2xl font-bold">Assignments</div>
        <div className="relative w-full overflow-auto">
          {
            classroomData.assignments.length == 0 ? "No Assignments Yet!" : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-mono">Name</TableHead>
                    <TableHead className="font-mono">Description</TableHead>
                    <TableHead className="font-mono">Start Time</TableHead>
                    <TableHead className="font-mono">End Time</TableHead>
                    <TableHead className="font-mono">View Scores</TableHead>
                    <TableHead className="font-mono">Edit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {
                    classroomData?.assignments.map((assignment: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono">{assignment.name}</TableCell>
                        <TableCell className="font-mono">{assignment.description}</TableCell>
                        <TableCell className="font-mono">{new Date(assignment.startTime).toLocaleString('en-IN', { hour12: true })}</TableCell>
                        <TableCell className="font-mono">{new Date(assignment.endTime).toLocaleString('en-IN', { hour12: true })}</TableCell>
                        <TableCell className="font-mono">
                          <Button onClick={() => {
                            navigate(`/home/teacher/classroom/${classRoomCode}/assignment/${assignment.ID}/scores`)
                          }}>View Scores</Button>
                        </TableCell>
                        <TableCell>
                          <Button onClick={() => {
                            navigate(`/home/teacher/classroom/${classRoomCode}/assignment/${assignment.ID}/edit`, {
                              state: {
                                classrooms
                              }
                            })
                          }}>
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  }
                </TableBody>
              </Table>
            )
          }
        </div>
      </div>
    </div >
  )
}
