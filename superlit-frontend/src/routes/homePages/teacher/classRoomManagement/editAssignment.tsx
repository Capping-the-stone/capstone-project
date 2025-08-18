import { useAuth } from "@/lib/authContext"
import { useEffect } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { useRef } from "react"
import { useState } from "react"
// reuse the AI button css from instant test create test page
import "@/routes/instantTest/createTest/css/aiButton.css"
import { ClassroomMultiSelect } from "@/components/ui/classroom-multi-select"
import AlertDialogWrapper from "@/components/ui/alertDialogWrapper"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { LanguageMultiSelect } from "@/components/ui/language-multi-select"
import BackButton from "@/components/backButton"

export default function EditAssignmentPage() {
  const { token, login, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { classrooms } = location.state
  useEffect(() => {
    if (token == null) {
      navigate("/")
      return
    }
    if (classrooms == null) {
      navigate("/")
      return
    }
    if (assignmentID == null) {
      console.log("Assignment ID null")
      navigate(-1)
      return
    }
    fetchData()
  }, [])


  const dialogRef = useRef(null)
  const formRef = useRef(null)
  const fileUploadRef = useRef(null)
  const { classroomCode, assignmentID } = useParams()

  async function fetchData() {
    console.log("sending: ", { assignmentID: parseInt(assignmentID) })
    const response = await fetch("/api/assignment/getforedit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": token.toString()
      },
      body: JSON.stringify({
        assignmentID: parseInt(assignmentID)
      })

    })

    if (!response.ok) {
      setDialog({
        title: "Error",
        description: "Something went wrong. Try again later",
        onOk: () => navigate(-1)
      })

      dialogRef.current.click()
      return
    }

    const responseJSON = await response.json()

    if (responseJSON.error) {
      setDialog({
        title: "Error",
        description: "Failed to fetch assignment. Please try again."
      })
      dialogRef.current.click()
      return
    }

    // unformat the start end end dates
    // the format the server sends is this:
    // 2024-06-05T13:12:03.863679+05:30
    // Gotta convert this to this:
    // 2024-06-05T13:12
    // because the input type datetime-local expects the latter format
    function formatDateForDatetimeLocal(date: Date) {
      let year = date.getFullYear();
      let month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based
      let day = String(date.getDate()).padStart(2, '0');
      let hours = String(date.getHours()).padStart(2, '0');
      let minutes = String(date.getMinutes()).padStart(2, '0');

      // Format the date and time
      let formattedDate = `${year}-${month}-${day}T${hours}:${minutes}`;

      return formattedDate;
    }

    responseJSON.assignment.startTime = formatDateForDatetimeLocal(new Date(responseJSON.assignment.startTime))
    responseJSON.assignment.endTime = formatDateForDatetimeLocal(new Date(responseJSON.assignment.endTime))
    setFormData(responseJSON.assignment)
  }


  const [dialog, setDialog] = useState({
    title: "",
    description: "",
  })

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    startTime: "",
    endTime: "",
    enableAIViva: true,
    enableAIHint: true,
    enableLeaderboard: false,
    classroomIDs: [],
    questions: [
      {
        title: "",
        question: "",
        preWrittenCode: "",
        languages: [],
        constraints: [],
        exampleCases: [
          {
            input: "",
            expectedOutput: "",
            score: 0,
            explanation: "",
          },
        ],
        testCases: [
          {
            input: "",
            expectedOutput: "",
            score: 0,
          },
        ],
      },
    ],
    maxWindowChangeAttempts: 3,
  })


  const handleInputChange = (e: any) => {
    const { name, value } = e.target
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }))
  }

  const formatDate = (dateString: string) => {
    dateString += ":00.00"
    const now = new Date();
    const timezoneOffset = now.getTimezoneOffset();
    console.log(timezoneOffset)
    let sign = timezoneOffset > 0 ? '-' : '+';
    let offsetHours = Math.floor(Math.abs(timezoneOffset) / 60);
    let offsetMinutes = Math.abs(timezoneOffset) % 60;
    const formattedTimezoneOffset = `${sign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`
    console.log(formattedTimezoneOffset)
    dateString += formattedTimezoneOffset
    return dateString
  }

  const handleLanguageSelect = (index: number, language: any) => {
    setFormData((prevData) => {
      const updatedQuestions = [...prevData.questions];
      updatedQuestions[index].languages.push(language);
      return {
        ...prevData,
        questions: updatedQuestions,
      };
    });
  };

  const handleLanguageUnselect = (index: number, language: any) => {
    setFormData((prevData) => {
      const updatedQuestions = [...prevData.questions];
      updatedQuestions[index].languages = updatedQuestions[index].languages.filter(
        (lang) => lang !== language
      );
      return {
        ...prevData,
        questions: updatedQuestions,
      };
    });
  };

  const handleQuestionChange = (index: any, field: any, value: any) => {
    setFormData((prevData) => {
      const updatedQuestions = [...prevData.questions]
      updatedQuestions[index][field] = value
      return {
        ...prevData,
        questions: updatedQuestions,
      }
    })
  }
  const handleExampleCaseChange = (questionIndex: any, exampleIndex: any, field: any, value: any) => {
    setFormData((prevData) => {
      const updatedQuestions = [...prevData.questions]
      updatedQuestions[questionIndex].exampleCases[exampleIndex][field] = value
      return {
        ...prevData,
        questions: updatedQuestions,
      }
    })
  }
  const handleTestCaseChange = (questionIndex: any, testIndex: any, field: any, value: any) => {
    setFormData((prevData) => {
      const updatedQuestions = [...prevData.questions]
      updatedQuestions[questionIndex].testCases[testIndex][field] = value
      return {
        ...prevData,
        questions: updatedQuestions,
      }
    })
  }

  const handleConstraintsChange = (questionIndex: any, constraintIndex: any, value: any) => {
    setFormData((prevData) => {
      const updatedQuestions = [...prevData.questions]
      updatedQuestions[questionIndex].constraints[constraintIndex] = value
      return {
        ...prevData,
        questions: updatedQuestions,
      }
    })
  }


  const addQuestion = () => {
    setFormData((prevData) => ({
      ...prevData,
      questions: [
        ...prevData.questions,
        {
          title: "",
          question: "",
          preWrittenCode: "",
          languages: [],
          constraints: [],
          exampleCases: [
            {
              input: "",
              output: "",
              score: 0,
              explanation: "",
            },
          ],
          testCases: [
            {
              input: "",
              output: "",
              score: 0,
            },
          ],
        },
      ],
    }))
  }

  const deleteQuestion = (index: number) => {
    setFormData((prevData) => {
      const updatedQuestions = [...prevData.questions]
      updatedQuestions.splice(index, 1)
      return {
        ...prevData,
        questions: updatedQuestions,
      }
    })
  }
  const addExampleCase = (questionIndex: number) => {
    setFormData((prevData) => {
      const updatedQuestions = [...prevData.questions]
      updatedQuestions[questionIndex].exampleCases.push({
        input: "",
        expectedOutput: "",
        score: 0,
        explanation: "",
      })
      return {
        ...prevData,
        questions: updatedQuestions,
      }
    })
  }
  const addTestCase = (questionIndex: number) => {
    setFormData((prevData) => {
      const updatedQuestions = [...prevData.questions]
      updatedQuestions[questionIndex].testCases.push({
        input: "",
        expectedOutput: "",
        score: 0,
      })
      return {
        ...prevData,
        questions: updatedQuestions,
      }
    })
  }


  const addConstraint = (questionIndex: number) => {
    setFormData((prevData) => {
      const updatedQuestions = [...prevData.questions]
      updatedQuestions[questionIndex].constraints.push("")
      return {
        ...prevData,
        questions: updatedQuestions,
      }
    })
  }


  const downloadTestData = async () => {

    // validate the form:
    if (!formRef.current.reportValidity()) {
      return
    }

    let isValid = validateTimes(formData.startTime, formData.endTime)
    if (!isValid) {
      setDialog({
        title: "Error",
        description: "End time should be after start time"
      })
      dialogRef.current.click()
      return
    }

    const blob = new Blob([JSON.stringify(formData)], { type: 'application/json' });

    // Create an anchor element and trigger a download
    const a = document.createElement('a');
    a.download = 'test.json'; // Name of the downloaded file
    a.href = window.URL.createObjectURL(blob);
    const clickEvt = new MouseEvent('click', {
      view: window,
      bubbles: true,
      cancelable: true,
    });
    a.dispatchEvent(clickEvt);
    a.remove();

  }


  const handleFileUpload = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        console.log(e.target.result)
        const fileData = JSON.parse(e.target.result);
        setFormData(fileData);
      } catch (error) {
        console.error("Error parsing JSON:", error);
      }
    };
    reader.readAsText(file);
  }

  const validateTimes = (startTimeString: string, endTimeString: string) => {
    const startTime = new Date(startTimeString)
    const endTime = new Date(endTimeString)
    return startTime < endTime
  }


  const handleSubmit = async (e: any) => {

    if (!formRef.current.reportValidity()) {
      return
    }
    e.preventDefault()
    // convert every score to a Number type
    formData.questions.map((question: any) => {
      question.exampleCases.map((example: any) => {
        example.score = Number(example.score)
      })
      question.testCases.map((test: any) => {
        test.score = Number(test.score)
      })
    })

    // convert maxWindowChangeAttempts to a Number type
    formData.maxWindowChangeAttempts = Number(formData.maxWindowChangeAttempts)

    let isValid = validateTimes(formData.startTime, formData.endTime)
    if (!isValid) {
      setDialog({
        title: "Error",
        description: "End time should be greater than start time"
      })
      dialogRef.current.click()
      return
    }
    const formattedFormData = { ...formData }

    formattedFormData.startTime = formatDate(formData.startTime)
    formattedFormData.endTime = formatDate(formData.endTime)

    console.log(formattedFormData)

    const response = await fetch("/api/assignment/saveedited", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": token.toString(),
      },
      body: JSON.stringify({ editedAssignment: formattedFormData }),
    })
    if (response.status == 401) {
      setDialog({
        title: "Error",
        description: "You are not authorized to create an assignment. Please login again"
      })
      dialogRef.current.click()

      return
    }
    const responseJSON = await response.json()
    if (responseJSON.error) {
      setDialog({
        title: "Error",
        description: "Failed to update assignment. Please try again."
      })
      dialogRef.current.click()
    } else {
      setDialog({
        title: "Success",
        description: "Assignments updated successfully"
      })
      dialogRef.current.click()
    }
  }



  return (
    <div className="max-w-2xl mx-auto p-6 sm:p-8">
      <div className="flex justify-between">

        <div className="flex items-center justify-center mb-5">
          <BackButton />
          <h1 className="text-3xl font-bold ml-3">Create Test</h1>
        </div>

        <Button variant="outline" onClick={() => fileUploadRef.current.click()}>
          <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" ref={fileUploadRef}>
          </input>
          Upload Test Data
        </Button>
      </div>
      <form onSubmit={handleSubmit} ref={formRef}>
        <div className="mb-6">
          <Label htmlFor="name">Name</Label>
          <Input type="text" id="name" name="name" value={formData.name} onChange={handleInputChange} required />
        </div>
        <div className="mb-6">
          <Label htmlFor="description">Description</Label>
          <Input type="text" id="description" name="description" value={formData.description} onChange={handleInputChange} required />
        </div>

        <div className="mb-6">
          <Label htmlFor="startTime">Start Time</Label>
          <Input type="datetime-local" id="startTime" name="startTime" value={formData.startTime} onChange={handleInputChange} required />
        </div>


        <div className="mb-6">
          <Label htmlFor="endTime">End Time</Label>
          <Input type="datetime-local" id="endTime" name="endTime" value={formData.endTime} onChange={handleInputChange} required />
        </div>
        <div className="mb-6 space-y-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="enableAIViva"
              name="enableAIViva"
              checked={formData.enableAIViva}
              onChange={(e) => handleInputChange({ target: { name: 'enableAIViva', value: e.target.checked } })}
            />
            <Label htmlFor="enableAIViva">Enable AI Viva</Label>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="enableAIHint"
              name="enableAIHint"
              checked={formData.enableAIHint}
              onChange={(e) => handleInputChange({ target: { name: 'enableAIHint', value: e.target.checked } })}
            />
            <Label htmlFor="enableAIHint">Enable AI Hint</Label>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="enableLeaderboard"
              name="enableLeaderboard"
              checked={formData.enableLeaderboard}
              onChange={(e) => handleInputChange({ target: { name: 'enableLeaderboard', value: e.target.checked } })}
            />
            <Label htmlFor="enableLeaderboard">Enable Leaderboard</Label>
          </div>
        </div>


        <div className="mb-6">
          <Label htmlFor="maxWindowChangeAttempts">Max Window Change Attempts</Label>
          <Input
            type="number"
            id="maxWindowChangeAttempts"
            name="maxWindowChangeAttempts"
            value={formData.maxWindowChangeAttempts}
            onChange={handleInputChange}
            min="1"
            required
          />
        </div>

        {formData.questions.map((question, index) => (
          <div key={index} className="mb-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold mb-4">Question {index + 1}</h2>
              <Button type="button" variant="destructive" onClick={() => deleteQuestion(index)} className="ml-4">
                Delete
              </Button>
            </div>
            <div className="mb-4">
              <Label htmlFor={`question-title-${index}`}>Question Title</Label>
              <Input
                type="text"
                id={`question-title-${index}`}
                value={question.title}
                onChange={(e) => handleQuestionChange(index, "title", e.target.value)}
                required
              />
            </div>
            <div className="mb-4">
              <Label htmlFor={`question-question-${index}`}>Question Description</Label>
              <Textarea
                id={`question-question-${index}`}
                value={question.question}
                onChange={(e) => handleQuestionChange(index, "question", e.target.value)}
                rows={4}
                required
              />
            </div>
            <div className="mb-4">
              <Label htmlFor={`question-prewritten-code-${index}`}>Pre-Written Code</Label>
              <Textarea
                id={`question-prewritten-code-${index}`}
                value={question.preWrittenCode}
                onChange={(e) => handleQuestionChange(index, "preWrittenCode", e.target.value)}
                rows={4}
                className="font-mono"
              />
            </div>


            <div className="mb-4">
              <Label htmlFor={`question-languages-${index}`}>Languages Allowed</Label>
              <LanguageMultiSelect
                languagesSelected={question.languages}
                onSelect={(language) => handleLanguageSelect(index, language)}
                onUnselect={(language) => handleLanguageUnselect(index, language)}
              />
            </div>

            <div className="mb-4">
              <h3 className="text-lg font-bold mb-4">AI Constraints</h3>
              {
                question.constraints.map((constraint, constraintIndex) => (
                  <div key={constraintIndex} className="mb-4">
                    <div>
                      <Label htmlFor={`constraint-${index}-${constraintIndex}`}>Constraint {constraintIndex + 1}</Label>
                      <Textarea
                        id={`constraint-${index}-${constraintIndex}`}
                        value={constraint}
                        onChange={(e) => handleConstraintsChange(index, constraintIndex, e.target.value)}
                        required
                      />
                    </div>
                  </div>
                ))
              }
              <button type="button" onClick={() => addConstraint(index)} className="ai-btn">
                + Add Constraint
              </button>
            </div>

            <div className="mb-4">
              <h3 className="text-lg font-bold mb-4">Example Cases</h3>
              {question.exampleCases.map((example, exampleIndex) => (
                <div key={exampleIndex} className="mb-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`example-input-${index}-${exampleIndex}`}>Input</Label>
                      <Textarea
                        id={`example-input-${index}-${exampleIndex}`}
                        value={example.input}
                        onChange={(e) => handleExampleCaseChange(index, exampleIndex, "input", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`example-expectedOutput-${index}-${exampleIndex}`}>Expected Output</Label>
                      <Textarea
                        id={`example-expectedOutput-${index}-${exampleIndex}`}
                        value={example.expectedOutput}
                        onChange={(e) => handleExampleCaseChange(index, exampleIndex, "expectedOutput", e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <Label htmlFor={`example-score-${index}-${exampleIndex}`}>Score</Label>
                      <Input
                        type="number"
                        id={`example-score-${index}-${exampleIndex}`}
                        value={example.score}
                        onChange={(e) => handleExampleCaseChange(index, exampleIndex, "score", e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor={`example-explanation-${index}-${exampleIndex}`}>Explanation</Label>
                      <Textarea
                        id={`example-explanation-${index}-${exampleIndex}`}
                        value={example.explanation}
                        onChange={(e) => handleExampleCaseChange(index, exampleIndex, "explanation", e.target.value)}
                        rows={2}
                      />
                    </div>
                  </div>
                </div>
              ))}
              <Button type="button" onClick={() => addExampleCase(index)} className="mb-4">
                + Add Example Case
              </Button>
            </div>
            <div className="mb-4">
              <h3 className="text-lg font-bold mb-4">Test Cases</h3>
              {question.testCases.map((testCase, testIndex) => (
                <div key={testIndex} className="mb-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`test-input-${index}-${testIndex}`}>Input</Label>
                      <Textarea
                        id={`test-input-${index}-${testIndex}`}
                        value={testCase.input}
                        onChange={(e) => handleTestCaseChange(index, testIndex, "input", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`test-expectedOutput-${index}-${testIndex}`}>Expected Output</Label>
                      <Textarea
                        id={`test-expectedOutput-${index}-${testIndex}`}
                        value={testCase.expectedOutput}
                        onChange={(e) => handleTestCaseChange(index, testIndex, "expectedOutput", e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <Label htmlFor={`test-score-${index}-${testIndex}`}>Score</Label>
                      <Input
                        type="number"
                        id={`test-score-${index}-${testIndex}`}
                        value={testCase.score}
                        onChange={(e) => handleTestCaseChange(index, testIndex, "score", e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}
              <Button type="button" onClick={() => addTestCase(index)} className="mb-4">
                + Add Test Case
              </Button>
            </div>
          </div>
        ))}

        <Button type="button" onClick={addQuestion} className="">
          + Add Question
        </Button>
        <div className="mt-8 flex flex-col justify-start items-start space-y-3">
          <Button type="submit">Submit</Button>
          <Button type="button" variant="secondary" onClick={downloadTestData} className="">Download Test Data</Button>
          <Button type="button" variant="outline" onClick={() => navigate(-1)} className="">Go Back</Button>
        </div>
      </form>

      <AlertDialogWrapper dialog={dialog} dialogRef={dialogRef} />
    </div>
  )
}
