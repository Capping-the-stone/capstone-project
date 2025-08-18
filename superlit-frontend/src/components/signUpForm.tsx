import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { CardContent, CardFooter, Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useState, useRef } from "react"
import AlertDialogWrapper from "./ui/alertDialogWrapper"
import { useNavigate } from "react-router-dom"

export default function SignUpForm() {

  const [formData, setFormData] = useState({
    universityID: "",
    name: "",
    email: "",
    password: "",
    repeatPassword: "",
    isTeacher: false,
  })
  const [dialog, setDialog] = useState({
    title: "",
    description: ""
  })

  const emailRef = useRef(null)
  const dialogRef = useRef(null)

  const navigate = useNavigate()

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: type == "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault()

    if (formData.universityID === "" || formData.name === "" || formData.email === "" || formData.password === "" || formData.repeatPassword === "") {
      setDialog({
        title: "Empty Fields",
        description: "Please fill in all the fields"
      })
      dialogRef.current.click()
      return
    }


    // now we do some form validation
    const validEmail = emailRef.current.checkValidity()
    if (!validEmail) {
      setDialog({
        title: "Invalid Email",
        description: "Please enter a valid email address"
      })
      dialogRef.current.click()
      return
    }

    if (formData.password !== formData.repeatPassword) {
      setDialog({
        title: "Passwords don't match",
        description: "Please make sure your passwords match"
      })
      dialogRef.current.click()
      return
    }

    // if we reach here, we can submit the form
    // we send a post request to the backend server with the form Data.
    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(formData)
    })

    const responseJson = await response.json()
    console.log(responseJson)
    if (responseJson.error) {
      setDialog({
        title: "Error",
        description: responseJson.error
      })
    } else {
      setDialog({
        title: "Success",
        description: responseJson.message,
        onOk: () => navigate("/")
      })
    }
    dialogRef.current.click()

  }


  return (
    <div className="">
      <div className="mx-auto max-w-lg space-y-6 py-12 px-7 bg-gray-200 dark:bg-gray-800 dark:text-gray-50 rounded-md">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">Welcome to Superlit <img src="rocket.png" width="30" className="inline"></img></h1>
          <p className="text-gray-500 dark:text-gray-400">Create your account to get started.</p>
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
              <Label className="dark:text-gray-400" htmlFor="name">
                Name
              </Label>
              <Input
                className="dark:bg-gray-800 dark:text-gray-50 dark:placeholder:text-gray-400"
                id="name"
                name="name"
                onChange={handleChange}
                placeholder="Enter your name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="dark:text-gray-400" htmlFor="email">
                Email
              </Label>
              <Input
                className="dark:bg-gray-800 dark:text-gray-50 dark:placeholder:text-gray-400"
                id="email"
                placeholder="Enter your email"
                name="email"
                onChange={handleChange}
                required
                type="email"
                ref={emailRef}
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
            <div className="space-y-2">
              <Label className="dark:text-gray-400" htmlFor="repeat-password">
                Repeat Password
              </Label>
              <Input
                className="dark:bg-gray-800 dark:text-gray-50 dark:placeholder:text-gray-400"
                id="repeat-password"
                placeholder="Repeat your password"
                name="repeatPassword"
                onChange={handleChange}
                required
                type="password"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full dark:bg-gray-800 dark:text-gray-50 dark:hover:bg-gray-700" type="submit" onClick={handleSubmit}>
              Sign Up
            </Button>
          </CardFooter>
        </Card>



        {/* alert dialog */}
        <AlertDialogWrapper dialog={dialog} dialogRef={dialogRef} />
      </div>
    </div >

  )
}



export function SignUpFormTeacher() {
  const [formData, setFormData] = useState({
    universityID: "",
    name: "",
    email: "",
    password: "",
    repeatPassword: "",
    isTeacher: true,
  })
  const [dialog, setDialog] = useState({
    title: "",
    description: "",
  })

  const emailRef = useRef(null)
  const dialogRef = useRef(null)

  const navigate = useNavigate()

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: type == "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault()

    if (formData.universityID === "" || formData.name === "" || formData.email === "" || formData.password === "" || formData.repeatPassword === "") {
      setDialog({
        title: "Empty Fields",
        description: "Please fill in all the fields"
      })
      dialogRef.current.click()
      return
    }


    // now we do some form validation
    const validEmail = emailRef.current.checkValidity()
    if (!validEmail) {
      setDialog({
        title: "Invalid Email",
        description: "Please enter a valid email address"
      })
      dialogRef.current.click()
      return
    }

    if (formData.password !== formData.repeatPassword) {
      setDialog({
        title: "Passwords don't match",
        description: "Please make sure your passwords match"
      })
      dialogRef.current.click()
      return
    }

    // if we reach here, we can submit the form
    // we send a post request to the backend server with the form Data.
    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(formData)
    })

    const responseJson = await response.json()
    console.log(responseJson)
    if (responseJson.error) {
      setDialog({
        title: "Error",
        description: responseJson.error
      })
    } else {
      setDialog({
        title: "Success",
        description: responseJson.message,
        onOk: () => navigate("/")
      })
    }
    dialogRef.current.click()


  }


  return (
    <div className="">
      <div className="mx-auto max-w-lg space-y-6 py-12 px-7 bg-gray-200 dark:bg-gray-800 dark:text-gray-50 rounded-md">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">Welcome to Superlit <img src="/rocket.png" width="30" className="inline"></img></h1>
          <p className="text-gray-500 dark:text-gray-400">Create your teacher account to get started.</p>
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
              <Label className="dark:text-gray-400" htmlFor="name">
                Name
              </Label>
              <Input
                className="dark:bg-gray-800 dark:text-gray-50 dark:placeholder:text-gray-400"
                id="name"
                name="name"
                onChange={handleChange}
                placeholder="Enter your name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="dark:text-gray-400" htmlFor="email">
                Email
              </Label>
              <Input
                className="dark:bg-gray-800 dark:text-gray-50 dark:placeholder:text-gray-400"
                id="email"
                placeholder="Enter your email"
                name="email"
                onChange={handleChange}
                required
                type="email"
                ref={emailRef}
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
            <div className="space-y-2">
              <Label className="dark:text-gray-400" htmlFor="repeat-password">
                Repeat Password
              </Label>
              <Input
                className="dark:bg-gray-800 dark:text-gray-50 dark:placeholder:text-gray-400"
                id="repeat-password"
                placeholder="Repeat your password"
                name="repeatPassword"
                onChange={handleChange}
                required
                type="password"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full dark:bg-gray-800 dark:text-gray-50 dark:hover:bg-gray-700" type="submit" onClick={handleSubmit}>
              Sign Up
            </Button>
          </CardFooter>
        </Card>



        {/* alert dialog */}
        <AlertDialogWrapper dialog={dialog} dialogRef={dialogRef} />
      </div>
    </div >

  )
}
