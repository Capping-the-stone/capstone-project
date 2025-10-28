import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import SuperlitLogo from "@/components/superlitLogo";
import { Button } from "@/components/ui/button";
import ClassroomCard, {
  CreateClassroomCard,
  JoinClassroomCard,
} from "./../components/classroomCard";
import { useAuth } from "@/lib/authContext";
import AlertDialogWrapper from "@/components/ui/alertDialogWrapper";
import BottomBar from "@/components/bottomBar.tsx";

export default function TeacherHomePage() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const { token, logout } = useAuth();
  const dialogRef = useRef(null);
  const [dialog, setDialog] = useState({
    title: "",
    description: "",
  });

  function urlBase64ToUint8Array(base64String: string) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  async function initNotifications() {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    const registration = await navigator.serviceWorker.register("/sw.js");
    console.log("Service worker registered");

    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
    if (Notification.permission !== "granted") return;

    const existing = await registration.pushManager.getSubscription();
    if (!existing) {
      // Fetch VAPID key from backend
      const keyResp = await fetch("/api/push/public-key", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!keyResp.ok) return;
      const { publicKey } = await keyResp.json();
      if (!publicKey) return;

      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // POST subscription directly
      await fetch("/notifications/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(sub),
      });
      console.log("Subscription sent to backend:", sub);
    } else {
      // Update backend with existing subscription if needed
      await fetch("/notifications/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(existing),
      });
      console.log("Existing subscription sent to backend:", existing);
    }
  } catch (e) {
    console.error("Error initializing notifications:", e);
  }
}

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
        if (!data.isTeacher) {
          navigate("/home/student");
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

  useEffect(() => {
    // Initialize notifications on load; includes JWT-authenticated subscription.
    initNotifications();
  }, []);

  if (userData == null)
    return (
      <div className="flex h-screen w-screen justify-center items-center">
        loading...
      </div>
    );

  return (
    <div className="h-screen w-screen overflow-hidden">
      <div className="h-[5vh] w-full bg-gray-100 dark:bg-gray-900 flex justify-between">
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

      <div className="h-[92vh] flex flex-col justify-between items-center p-5 bg-gray-100 dark:bg-gray-900">
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
                  onClick={() =>
                    navigate("/home/teacher/classroom/" + classroom.code, {
                      state: {
                        classrooms: userData.classrooms,
                      },
                    })
                  }
                  key={index}
                >
                  <ClassroomCard
                    name={classroom.name}
                    code={classroom.code}
                    teacherCode={classroom.teacherCode}
                  />
                </div>
              ))}

          <JoinClassroomCard
            token={token}
            setDialog={setDialog}
            dialogRef={dialogRef}
            fetchUserData={fetchUserData}
          />
          <CreateClassroomCard
            token={token}
            setDialog={setDialog}
            dialogRef={dialogRef}
            fetchUserData={fetchUserData}
          />
        </div>

        <div className="w-full flex justify-end items-center">
          <Button
            className="text-xl"
            onClick={() =>
              navigate(`/home/teacher/classroom/assignment/newassignment`, {
                state: {
                  classrooms: userData.classrooms,
                },
              })
            }
          >
            + New Assignment
          </Button>
        </div>
      </div>
      <BottomBar />
      <AlertDialogWrapper dialog={dialog} dialogRef={dialogRef} />
    </div>
  );
}
