import { Boxes } from "@/components/ui/background-boxes";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import SuperlitLogo from "@/components/superlitLogo";
import { Button } from "@/components/ui/button";
import ClassroomCard, {
  JoinClassroomCard,
} from "./../components/classroomCard";
import { useAuth } from "@/lib/authContext";
import AlertDialogWrapper from "@/components/ui/alertDialogWrapper";
import BottomBar from "@/components/bottomBar.tsx";

export default function StudentHomePage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const { token, logout } = useAuth();
  const dialogRef = useRef(null);
  const [dialog, setDialog] = useState({
    title: "",
    description: "",
  });

  function fetchUserData() {
    fetch("/api/auth/getuser", {
      headers: {
        Authorization: token.toString(),
      },
    })
      .then((response: any) => {
        if (response.status == 401) {
          logout();
          navigate("/");
          return;
        }
        return response.json();
      })
      .then((data: any) => {
        setUserData(data);
        if (data.isTeacher) {
          navigate("/home/teacher");
        }
      });
  }

  useEffect(() => {
    if (token == null) {
      navigate("/");
      return;
    }
    fetchUserData();
  }, []);

  if (userData == null)
    return (
      <div className="flex h-screen w-screen justify-center items-center">
        loading...
      </div>
    );

  return (
    <div className="h-screen w-screen overflow-hidden">
      <div className="h-[5vh] w-full bg-gray-200 dark:bg-gray-900 flex justify-between">
        <SuperlitLogo />
        <div className="flex items-center justify-center space-x-2 mr-5">
          <div>{userData.name + " [" + userData.universityID + "]"}</div>
          <Button
            variant="outline"
            onClick={() => {
              logout();
              navigate("/");
            }}
          >
            Logout
          </Button>
        </div>
      </div>

      <div className="h-[92vh] flex justify-center items-center bg-gray-100 dark:bg-gray-900">
        <div
          className="grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gridGap: "28px",
          }}
        >
          {userData == null
            ? "loading..."
            : userData.classrooms.map((classroom: any, index: number) => (
                <div
                  key={index}
                  onClick={() =>
                    navigate("/home/student/classroom/" + classroom.code)
                  }
                >
                  <ClassroomCard
                    name={classroom.name}
                    code={classroom.code}
                    teacherCode=""
                  />
                </div>
              ))}

          <JoinClassroomCard
            token={token}
            setDialog={setDialog}
            dialogRef={dialogRef}
            fetchUserData={fetchUserData}
          />
        </div>
      </div>

      <BottomBar />

      <AlertDialogWrapper dialog={dialog} dialogRef={dialogRef} />
    </div>
  );
}
