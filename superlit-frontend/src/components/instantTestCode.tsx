import { CardContent, CardFooter, Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-6-digit"
import { Input } from "./ui/input"
import { useRef, useState } from "react"

import { useNavigate } from "react-router-dom";
import AlertDialogWrapper from "./ui/alertDialogWrapper"
import InstantTestCodeTeacherLinks from "./instantTestCodeFooter"
export default function InstantTestCode() {


  const [testCode, setTestCode] = useState("")
  const [universityID, setUniversityID] = useState("")
  const [dialog, setDialog] = useState({
    title: "",
    description: "",
  })

  const dialogRef = useRef(null)

  const navigate = useNavigate()
  const handleSubmit = () => {
    if (universityID == "" || testCode.length != 6) {
      setDialog({
        title: "Empty Fields",
        description: "Please fill in all the fields"
      })
      dialogRef.current.click()
      return
    }
    document.body.requestFullscreen()
    navigate(`/instantTest/${universityID}/${testCode}`)
  }


  return (
    <div>
      <div className="mx-auto min-w-lg space-y-6 py-12 bg-gray-200 dark:bg-gray-800 dark:text-gray-50 rounded-md">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">Welcome to Superlit <img src="rocket.png" width="30" className="inline"></img></h1>
          <p className="text-gray-500 dark:text-gray-400">Input the 6 digit test code to get started</p>
        </div>
        <Card className="dark:bg-gray-850 dark:text-gray-50 mx-5 py-2">
          <CardContent className="space-y-4">
            <InputOTP maxLength={6} value={testCode} onChange={(value) => setTestCode(value)}>
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
            <Input type="text" onChange={(event) => setUniversityID(event.target.value)} placeholder="University ID" />
          </CardContent>
          <CardFooter>
            <Button className="w-full dark:bg-gray-800 dark:text-gray-50 dark:hover:bg-gray-700" type="submit" onClick={handleSubmit}>
              Begin Test
            </Button>
          </CardFooter>

          <InstantTestCodeTeacherLinks />

        </Card>
      </div>

      <AlertDialogWrapper dialog={dialog} dialogRef={dialogRef} />
    </div >
  )
}
