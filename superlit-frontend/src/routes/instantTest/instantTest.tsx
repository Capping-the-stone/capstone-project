import Editor, { MonacoDiffEditor, loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import SuperlitLogo from "@/components/superlitLogo";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import AlertDialogWrapper from "@/components/ui/alertDialogWrapper";
import QuestionsPanel from "./components/questionsPanel";
import TestCasePanel from "./components/testCasePanel";

import { useNavigate, useParams } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useTheme } from "@/components/theme-provider";

loader.config({
  monaco,
});
// This enables monaco editor to use node_modules instead of a CDN. 
// This enables our app to be fully offline and hosted on a local network

loader.init()

const languageToEditorLanguageMapping = {
  "c": "c",
  "py": "python"
}

export default function InstantTest() {
  let { publicCode, universityID } = useParams();
  const [testData, setTestData] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [editorData, setEditorData] = useState([])
  const dialogRef = useRef(null)
  let cheatingCount = 0
  const [dialog, setDialog] = useState({
  })
  const [currentLanguage, setCurrentLanguage] = useState([])
  const themeInfo = useTheme()
  console.log({ themeInfo })

  const navigate = useNavigate()


  async function fetchTestData() {
    console.log("Fetching test data")
    const response = await fetch("/api/instanttest/get", {
      method: "POST",
      headers: {
        "content": "application/json"
      },
      body: JSON.stringify({
        publicCode
      }),
    })
    console.log("Fetch over")

    const responseJSON = await response.json()

    if (responseJSON.error) {
      setDialog({
        title: "Wrong Test Code",
        description: "The Test Code Is Incorrect Or The Test Is Over. Please Try Again Or Contact Your Teacher.",
        onOk: () => navigate("/")
      })
      dialogRef.current.click()
      return
    }

    setTestData(responseJSON)
    console.log(responseJSON)

    const tempEditorData = responseJSON.questions.map((question: any) => {
      return question.preWrittenCode
    })


    setEditorData(tempEditorData)
    setCurrentLanguage(responseJSON.questions.map((question) => {
      return question.languages[0]
    }))
    console.log(responseJSON)
  }



  useEffect(() => {
    fetchTestData()
  }, [])


  useEffect(() => {
    const handleBeforeUnload = (event: any) => {
      event.preventDefault()
      event.returnValue = ''
      setDialog({
        title: "Are You Sure?",
        description: "You Are About To Leave The Test. Make sure you have hit submit on *every* attempted question. Your answer won't be evaluated if you don't submit. Are you sure you want to leave?",
        cancelText: "Yes, I want to leave",
        okText: "Take me back",
        onCancel: () => navigate("/"),
        onOk: () => event.preventDefault()
        // on ok and on cancel are flipped to make the primary button be cancel and secondary button be stay
      })

      dialogRef.current.click()
    };

    const handleCheater = () => {

      if (cheatingCount >= 3) {
        setDialog({
          title: "You have been disqualified",
          description: "You have been disqualified from the test for cheating. Please contact your teacher if you think this is a mistake.",
          onOk: () => navigate("/")
        })
        dialogRef.current.click()
        return
      }

      cheatingCount += 1
      setDialog({
        title: "No cheating!",
        description: `You are not allowed to cheat. Please stay on the test page. If you leave, your test will be submitted and you will get 0 points. You have ${3 - cheatingCount} chance(s) left. If you think this is a mistake, please contact your teacher.`,
      })
      dialogRef.current.click()

    }


    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('blur', handleCheater);


    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('blur', handleCheater);
    };
  }, []);



  if (testData == null) return <div>Loading...</div>

  return (
    <div>
      <div className="min-w-screen min-h-[5vh] flex justify-between items-center">
        <SuperlitLogo />
        <Select value={currentLanguage[currentQuestionIndex]} onValueChange={(value: string) => {
          const tempCurrentLanguage = currentLanguage
          tempCurrentLanguage[currentQuestionIndex] = value
          setCurrentLanguage([...tempCurrentLanguage])
        }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select a language" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Language</SelectLabel>
              {testData.questions[currentQuestionIndex].languages.map((language: string, index: number) => (
                <SelectItem value={language} key={index}>{language.toUpperCase()}</SelectItem>
              )
              )
              }
            </SelectGroup>
          </SelectContent>
        </Select>



      </div>

      <ResizablePanelGroup
        direction="horizontal"
        className="min-w-screen min-h-[95vh] rounded-lg border"
      >
        <ResizablePanel defaultSize={25}>
          <QuestionsPanel testData={testData} currentQuestionIndex={currentQuestionIndex} setCurrentQuestionIndex={setCurrentQuestionIndex} />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={75}>
          <ResizablePanelGroup direction="vertical">
            <ResizablePanel defaultSize={75}>
              <div className="flex flex-col items-center justify-center h-full">
                <Editor
                  language={languageToEditorLanguageMapping[currentLanguage[currentQuestionIndex]]}
                  value={testData == null ? "Loading..." : editorData[currentQuestionIndex]}
                  theme={themeInfo.theme == "dark" ? "vs-dark" : "vs-light"}
                  className="resize-y overflow-auto"
                  onChange={(value: any) => {
                    const tempEditorData: any = editorData
                    tempEditorData[currentQuestionIndex] = value
                    setEditorData([...tempEditorData])
                  }}
                />
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={25}>
              <TestCasePanel testData={testData} setTestData={setTestData} currentQuestionIndex={currentQuestionIndex} editorData={editorData} publicCode={publicCode} universityID={universityID} languages={currentLanguage} />
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>


      {/* alert dialog */}
      <AlertDialogWrapper dialog={dialog} dialogRef={dialogRef} />


    </div>

  );
}
