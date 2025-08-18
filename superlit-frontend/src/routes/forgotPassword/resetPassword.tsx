import AlertDialogWrapper from "@/components/ui/alertDialogWrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@radix-ui/react-label";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

export default function ResetPassword() {
  const [password, setPassword] = useState("")
  const [passwordRepeat, setPasswordRepeat] = useState("")
  const [dialog, setDialog] = useState({
    title: "",
    description: "",
    onOk: () => { }
  })
  const dialogRef = useRef(null)
  const navigate = useNavigate()

  const { jwtToken } = useParams()
  useEffect(() => {
    if (jwtToken == undefined) {
      setDialog({
        title: "Invalid Reset Link",
        description: "This reset link is invalid. Please go to the sign in page and hit forgot password again to obtain a new link",
        onOk: () => navigate("/")
      })
      dialogRef.current.click()
    }
  }, [])

  const onSubmit = async () => {

    // some validation
    if (password == "") {
      setDialog({
        title: "Fill Password",
        description: "Please fill the password field",
        onOk: () => { }
      })
      dialogRef.current.click()
      return
    }
    if (password != passwordRepeat) {
      setDialog({
        title: "Passwords don't match",
        description: "Please make sure the passwords match",
        onOk: () => { }

      })
      dialogRef.current.click()
      return
    }

    const response = await fetch("/api/auth/resetpassword", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        token: jwtToken,
        newPassword: password
      })
    })
    let responseJSON
    try {
      responseJSON = await response.json()
    } catch (e) {
      setDialog({
        title: "An error occured",
        description: "Please try again later",
        onOk: () => navigate("/")
      })
      dialogRef.current.click()
      return
    }

    if (responseJSON.error) {
      if (responseJSON.error == "token signature is invalid: signature is invalid") {
        setDialog({
          title: "Reset Link Expired",
          description: "This reset link has expired. Please go to the sign in page and hit forgot password again to obtain a new link. Reset links are valid for 15 mins only and can only be used once",
          onOk: () => navigate("/")
        })
        dialogRef.current.click()
        return
      }
      setDialog({
        title: "An error occured",
        description: responseJSON.error,
        onOk: () => navigate("/")
      })
      dialogRef.current.click()
      return
    }

    setDialog({
      title: "Success",
      description: "Password has been successfully reset, you can now go back and sign in with your new password",
      onOk: () => navigate("/")
    })
    dialogRef.current.click()
  }


  return (
    <div className="h-screen w-screen flex items-center justify-center bg-black">
      <div className="">
        <div className="mx-auto max-w-lg space-y-6 py-12 px-7 bg-gray-200 dark:bg-gray-800 dark:text-gray-50 rounded-md">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold">Welcome to Superlit <img src="/rocket.png" width="30" className="inline"></img></h1>
            <p className="text-gray-500 dark:text-gray-400">Reset Your Password</p>
          </div>
          <Card className="dark:bg-gray-850 dark:text-gray-50 py-2">
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="dark:text-gray-400" htmlFor="university-id">
                  New Password
                </Label>
                <Input
                  className="dark:bg-gray-800 dark:text-gray-50 dark:placeholder:text-gray-400"
                  id="password"
                  placeholder="Enter new password"
                  onChange={(event) => setPassword(event.target.value)}
                  name="password"
                  type="password"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="dark:text-gray-400" htmlFor="university-id">
                  Repeat Password
                </Label>
                <Input
                  className="dark:bg-gray-800 dark:text-gray-50 dark:placeholder:text-gray-400"
                  id="repeat-password"
                  placeholder="Repeat new password"
                  onChange={(event) => setPasswordRepeat(event.target.value)}
                  name="passwordRepeat"
                  type="password"
                  required
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full dark:bg-gray-800 dark:text-gray-50 dark:hover:bg-gray-700" type="submit" onClick={onSubmit}>
                Reset Password
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
