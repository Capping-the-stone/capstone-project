import { useRef, useState } from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alertDialog"

import { Input } from "@/components/ui/input"
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "@/components/ui/input-6-digit"

export default function ClassroomCard({ name, code, teacherCode }: { name: string, code: string, teacherCode: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 h-full w-full shadow-md p-5 flex flex-col items-center justify-center space-y-5 rounded-lg hover:outline transition-all cursor-pointer select-none">
      <div className="text-3xl font-bold">{name}</div>
      <div className="text-xl font-bold text-gray-700 dark:text-gray-100">Student Joining Code: <span className="font-mono">{code}</span></div>
      {teacherCode.length != 0 ? (
        <div className="text-xl font-bold text-gray-700 dark:text-gray-100">Teacher Joining Code: <span className="font-mono">{teacherCode}</span></div>
      ) : (
        <>
        </>
      )
      }
    </div >
  )
}

export function CreateClassroomCard({ token, dialogRef, setDialog, fetchUserData }: { token: string, dialogRef: any, setDialog: any, fetchUserData: () => void }) {

  const classroomNameRef = useRef(null)

  const createClassroom = async () => {
    const classroomName = classroomNameRef.current.value
    try {
      const response = await fetch("/api/classroom/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token
        },
        body: JSON.stringify({ name: classroomName }),
      })
      const data = await response.json()
      if (data.error) {
        setDialog({
          title: "Error",
          description: "Something went wrong: " + data.error,
        })
        dialogRef.current.click()
      } else {
        fetchUserData()
        setDialog({
          title: "Success",
          description: "Classroom was created successfully!"
        })
        dialogRef.current.click()
      }
    } catch (error) {
      console.log(error)
    }
  }


  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <div className="bg-white dark:bg-gray-800 h-full w-full shadow-md p-5 flex flex-col items-center justify-center space-y-5 rounded-lg hover:outline transition-all cursor-pointer select-none" onClick={createClassroom}>
          <div className="text-5xl font-bold">+</div>
          <div className="text-xl font-bold text-gray-700 dark:text-gray-100">Create New Classroom</div>
        </div>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Enter the name of your new classroom</AlertDialogTitle>
          <AlertDialogDescription>
            <Input type="text" placeholder="Enter Name Here" ref={classroomNameRef}></Input>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={createClassroom}>Create Classroom</AlertDialogAction>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>


  )
}


export function JoinClassroomCard({ token, dialogRef, setDialog, fetchUserData }: { token: string, dialogRef: any, setDialog: any, fetchUserData: () => void }) {

  const [classroomCode, setClassroomCode] = useState("")
  const joinClassroom = async () => {
    try {
      const response = await fetch("/api/classroom/adduser", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token
        },
        body: JSON.stringify({ classroomCode }),
      })
      const data = await response.json()
      if (data.error) {
        setDialog({
          title: "Error",
          description: "Something went wrong: " + data.error,
        })
        dialogRef.current.click()
      } else {
        fetchUserData()
        setDialog({
          title: "Success",
          description: "You've joined the classroom successfully!"
        })
        dialogRef.current.click()
      }
    } catch (error) {
      console.log(error)
    }
  }


  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <div className="bg-white dark:bg-gray-800 h-full w-full shadow-md p-5 flex flex-col items-center justify-center space-y-5 rounded-lg hover:outline transition-all cursor-pointer select-none">
          <div className="text-5xl font-bold">+</div>
          <div className="text-xl font-bold text-gray-700 dark:text-gray-100">Join A Classroom</div>
        </div>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Enter classroom code</AlertDialogTitle>
          <AlertDialogDescription>
            <InputOTP maxLength={6} value={classroomCode} onChange={(value) => setClassroomCode(value)}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
              </InputOTPGroup>
              <InputOTPSeparator />
              <InputOTPGroup>
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={joinClassroom}>Join Classroom</AlertDialogAction>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
