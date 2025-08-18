import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { CardContent, CardFooter, Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useState, useRef } from "react"
import AlertDialogWrapper from "./ui/alertDialogWrapper"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/lib/authContext"
import { Link } from "react-router-dom"
import { Separator } from "./ui/separator"

export default function SignInForm() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    universityID: "",
    password: "",
  })
  const [dialog, setDialog] = useState({
    title: "",
    description: "",
  })

  const { login } = useAuth()

  const dialogRef = useRef(null)

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: type == "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    if (formData.universityID === "" || formData.password === "") {
      setDialog({
        title: "Empty Fields",
        description: "Please fill in all the fields"
      })
      dialogRef.current.click()
      return
    }



    // we send a post request to the backend server with the form Data.
    const response = await fetch("/api/auth/signinwithuniversityid", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(formData)
    })

    let responseJson
    try {
      responseJson = await response.json()
    } catch (e) {
      setDialog({
        title: "An error occured",
        description: "Please try again later"
      })
      dialogRef.current.click()
      return
    }
    if (responseJson.error == "User does not exist") {
      setDialog({
        title: "Wrong Credentials",
        description: "Please verify that the university ID and password is correct. If you're sure, you can try the forgot password option"
      })
      dialogRef.current.click()
      return
    }
    // redirect to /home with props 'userData' being the response we just received
    login(responseJson.token)
    if (responseJson.isTeacher) {
      navigate("/home/teacher")
    } else {
      navigate("/home/student")
    }
    dialogRef.current.click()
  }


  return (
    <div className="">
      <div className="mx-auto max-w-lg space-y-6 py-12 px-7 bg-gray-200 dark:bg-gray-800 dark:text-gray-50 rounded-md">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">Welcome to Superlit <img src="rocket.png" width="30" className="inline"></img></h1>
          <p className="text-gray-500 dark:text-gray-400">Enter your credentials to sign in</p>
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
                name="universityID"
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="dark:text-gray-400" htmlFor="password">
                Password
              </Label>
              <Input
                className="dark:bg-gray-800 dark:text-gray-50 dark:placeholder:text-gray-400"
                id="password"
                placeholder="Enter your password"
                name="password"
                onChange={handleChange}
                required
                type="password"
              />
            </div>

            <Link to="/forgotpassword">Forgot Password?</Link>
          </CardContent>
          <CardFooter>
            <Button className="w-full dark:bg-gray-800 dark:text-gray-50 dark:hover:bg-gray-700" type="submit" onClick={handleSubmit}>
              Sign In
            </Button>
          </CardFooter>


          <div className="mx-5">
            <h3 className="text-sm font-medium text-center">Confused Where To Start?</h3>
            <Separator className="my-1" />
            <div className="flex items-center justify-around">
              <a
                href="teachers-manual.pdf"
                target="_blank"
                className="text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Teacher Manual
              </a>
              <Separator orientation="vertical" className="h-4" />
              <a
                href="students-manual.pdf"
                target="_blank"
                className="text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Student Manual
              </a>
            </div>
          </div>
        </Card>



        {/* alert dialog */}
        <AlertDialogWrapper dialog={dialog} dialogRef={dialogRef} />
      </div>
    </div >
  )
}
