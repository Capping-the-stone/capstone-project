import SignUpForm from "@/components/signUpForm";
import SignInForm from "@/components/signInForm"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import InstantTestCode from "@/components/instantTestCode"
import { useAuth } from "@/lib/authContext";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";


export default function Root() {
  const { token, logout } = useAuth()
  const navigate = useNavigate()

  async function redirectIfLoggedIn() {
    if (token) {
      const response = await fetch("/api/auth/isteacher", {
        method: "GET",
        headers: {
          "Authorization": token.toString()
        }
      })
      if (response.ok) {
        let responseJSON = await response.json()
        if (responseJSON.isTeacher) {
          navigate("/home/teacher")
        } else {
          navigate("/home/student")
        }
      } else {
        logout()
      }
    }
  }

  useEffect(() => {
    redirectIfLoggedIn()
  })

  if (token) return <div className="w-screen h-screen">Redirecting...</div>

  return (
    <div className="flex justify-center items-start min-h-screen dark:bg-black pt-10">
      <Tabs defaultValue="signin" className="w-fit">
        <TabsList className="grid w-full grid-cols-3 bg-gray-200 dark:bg-gray-800">
          <TabsTrigger value="signin">Sign In</TabsTrigger>
          <TabsTrigger value="signup">Sign Up</TabsTrigger>
          <TabsTrigger value="instanttest">Instant Test</TabsTrigger>
        </TabsList>
        <TabsContent value="signin" className="w-full bg-gray-100 dark:bg-gray-800">
          <SignInForm />
        </TabsContent>
        <TabsContent value="signup" className="w-full bg-gray-100 dark:bg-gray-800">
          <SignUpForm />
        </TabsContent>
        <TabsContent value="instanttest" className="w-full bg-gray-100 dark:bg-gray-800">
          <InstantTestCode />
        </TabsContent>
      </Tabs>
    </div>
  );
}
