import ReactDOM from "react-dom/client";
import Root from "./routes/root.tsx";
import Test from "./routes/test/test.tsx";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import "./main.css";
import InstantTest from "./routes/instantTest/instantTest.tsx";
import InputPrivateCode from "./routes/instantTest/teacherPanel/inputPrivateCode.tsx";
import TeacherDashboard from "./routes/instantTest/teacherPanel/slug/teacherDashboard.tsx";
import CreateTest from "./routes/instantTest/createTest/createTest.tsx";
import TeacherHomePage from "./routes/homePages/teacher/teacherHomePage.tsx";
import StudentHomePage from "./routes/homePages/student/studentHomePage.tsx";

import { AuthProvider } from "@/lib/authContext"
import ClassRoomManagement from "./routes/homePages/teacher/classRoomManagement/classroomManagement.tsx";
import NewAssignmentPage from "./routes/homePages/teacher/classRoomManagement/newassignment.tsx";
import StudentClassroomManagement from "./routes/homePages/student/classroomManagement/classroomManagement.tsx";
import AttemptAssignment from "./routes/homePages/student/classroomManagement/attemptAssignment.tsx";
import ViewScore from "./routes/homePages/teacher/classRoomManagement/viewScore.tsx";
import EditAssignmentPage from "./routes/homePages/teacher/classRoomManagement/editAssignment.tsx";
import ViewScoreStudent from "./routes/homePages/student/classroomManagement/components/viewScoreStudent.tsx";
import EnterUniIDForgotPassword from "./routes/forgotPassword/enterUniID.tsx";
import ResetPassword from "./routes/forgotPassword/resetPassword.tsx";
import AIViva from "./routes/homePages/student/classroomManagement/components/AIViva.tsx";
import TeacherSignUp from "./routes/teacherSignUp/teacherSignUp.tsx";
import ViewLeaderboard from "./routes/homePages/student/classroomManagement/viewLeaderboard.tsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
  },
  {
    path: "/test/:testID",
    element: <Test />,
  },
  {
    path: "/instantTest/:universityID/:publicCode",
    element: <InstantTest />
  },
  {
    path: "/instantTest/teacherDashboard/",
    element: <InputPrivateCode />
  },
  {
    path: "/instantTest/teacherDashboard/:privateCode",
    element: <TeacherDashboard />
  }, {
    path: "/instantTest/create",
    element: <CreateTest />
  },

  // reset passwords
  {
    path: "/forgotpassword",
    element: <EnterUniIDForgotPassword />
  },

  {
    path: "/resetpassword/:jwtToken",
    element: <ResetPassword />
  },

  // teacher sign up (hidden)

  {
    path: "/signup/teacher",
    element: <TeacherSignUp />
  },


  // home page
  {
    path: "/home/teacher",
    element: <TeacherHomePage />
  },
  {
    path: "/home/teacher/classroom/assignment/newassignment",
    element: <NewAssignmentPage />
  },

  {
    path: "/home/teacher/classroom/:classRoomCode",
    element: <ClassRoomManagement />
  },
  {
    path: "/home/teacher/classroom/:classroomCode/assignment/:assignmentID/scores",
    element: <ViewScore />
  },
  {
    path: "/home/teacher/classroom/:classroomCode/assignment/:assignmentID/edit",
    element: <EditAssignmentPage />
  },

  {
    path: "/home/student",
    element: <StudentHomePage />
  },
  {
    path: "/home/student/classroom/:classroomCode",
    element: <StudentClassroomManagement />
  },
  {
    path: "/home/student/classroom/:classroomCode/assignment/:assignmentID/attempt",
    element: <AttemptAssignment />
  },
  {
    path: "/home/student/classroom/:classroomCode/assignment/:assignmentID/scores",
    element: <ViewScoreStudent />
  },
  {
    path: "/home/student/classroom/:classroomCode/assignment/:assignmentID/leaderboard",
    element: <ViewLeaderboard />
  },


  // 404 path
  {
    path: "*",
    element: (
      <div className="bg-black">
        <div className="text-2xl text-center font-mono p-10 text-white">
          404 Not Found
        </div>
      </div>
    ),
  },
]);




ReactDOM.createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <RouterProvider router={router} />
    </ThemeProvider>
  </AuthProvider>
);
