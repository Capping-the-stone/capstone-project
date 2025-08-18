import { CardContent, CardFooter, Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-6-digit"
import { useRef, useState } from "react"

import { useNavigate } from "react-router-dom";
import AlertDialogWrapper from "@/components/ui/alertDialogWrapper"

export default function InputPrivateCode() {
  const [masterCode, setMasterCode] = useState("")
  const [dialog, setDialog] = useState({
    title: "",
    description: "",
  })

  const dialogRef = useRef(null)

  const navigate = useNavigate()
  const handleSubmit = () => {
    if (masterCode.length != 6) {
      setDialog({
        title: "Empty Fields",
        description: "Please fill in all the fields"
      })
      dialogRef.current.click()
      return
    }
    navigate(`/instantTest/teacherDashboard/${masterCode}`)
  }


  return (
    <div className="h-screen w-screen flex justify-center items-center">
      <div className="mx-auto max-w-lg space-y-6 py-12 dark:bg-gray-800 dark:text-gray-50 rounded-md">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">Welcome to Superlit <img src="/rocket.png" width="30" className="inline"></img></h1>
          <p className="text-gray-500 dark:text-gray-400">Input the 6 digit master code to manage your test</p>
        </div>
        <Card className="dark:bg-gray-850 dark:text-gray-50 mx-5 py-2">
          <CardContent className="space-y-4">
            <InputOTP maxLength={6} value={masterCode} onChange={(value) => setMasterCode(value)}>
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
          </CardContent>
          <CardFooter>
            <Button className="w-full dark:bg-gray-800 dark:text-gray-50 dark:hover:bg-gray-700" type="submit" onClick={handleSubmit}>
              Submit
            </Button>
          </CardFooter>
        </Card>
      </div>

      <AlertDialogWrapper dialog={dialog} dialogRef={dialogRef} />
    </div >
  )
}
