import AlertDialogWrapper from "@/components/ui/alertDialogWrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@radix-ui/react-label";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function EnterUniIDForgotPassword() {
  const [uniID, setUniID] = useState("")
  const [dialog, setDialog] = useState({
    title: "",
    description: "",
  })
  const dialogRef = useRef(null)
  const navigate = useNavigate()
  const onSubmit = async () => {

    // some validation
    if (uniID == "") {
      setDialog({
        title: "Fill University ID",
        description: "Please fill the university ID"
      })
      dialogRef.current.click()
      return
    }

    const response = await fetch("/api/auth/forgotpassword", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        universityID: uniID
      })
    })
    let responseJSON
    try {
      responseJSON = await response.json()
    } catch (e) {
      setDialog({
        title: "An error occured",
        description: "Please try again later"
      })
      dialogRef.current.click()
      return
    }

    if (responseJSON.error) {
      if (responseJSON.error == "User doesn't exist") {
        setDialog({
          title: "Wrong University ID",
          description: "Entered university ID is not found"
        })
        dialogRef.current.click()
        return
      }
      setDialog({
        title: "An error occured",
        description: responseJSON.error
      })
      dialogRef.current.click()
      return
    }

    setDialog({
      title: "Check Your Email",
      description: "Please check your email for the reset link",
      onOk: () => navigate("/")
    })
    dialogRef.current.click()
  }


  return (
    <div className="h-screen w-screen flex items-center justify-center bg-black">
      <div className="">
        <div className="mx-auto max-w-lg space-y-6 py-12 px-7 bg-gray-200 dark:bg-gray-800 dark:text-gray-50 rounded-md">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold">Welcome to Superlit <img src="rocket.png" width="30" className="inline"></img></h1>
            <p className="text-gray-500 dark:text-gray-400">Enter your university ID to reset password</p>
          </div>
          <Card className="dark:bg-gray-850 dark:text-gray-50 py-2">
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="dark:text-gray-400" htmlFor="university-id">
                  University ID
                </Label>
                <Input
                  className="dark:bg-gray-800 dark:text-gray-50 dark:placeholder:text-gray-400"
                  id="university-id"
                  placeholder="Enter your university ID"
                  onChange={(event) => setUniID(event.target.value)}
                  name="universityID"
                  required
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full dark:bg-gray-800 dark:text-gray-50 dark:hover:bg-gray-700" type="submit" onClick={onSubmit}>
                Send Reset Link
              </Button>
            </CardFooter>
          </Card>



          {/* alert dialog */}
          <AlertDialogWrapper dialog={dialog} dialogRef={dialogRef} />
        </div>
      </div >
    </div>
  )


}
