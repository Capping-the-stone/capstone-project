package AI

import (
	"bytes"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"

	"github.com/anuragrao04/superlit-backend/database"
	"github.com/anuragrao04/superlit-backend/models"
	"github.com/anuragrao04/superlit-backend/prettyPrint"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func GetVivaQuestions(c *gin.Context) {
	var request models.AIGetVivaQuestionsRequest
	err := c.BindJSON(&request)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Request"})
		return
	}
	var question models.Question
	// TODO: Move this to database package
	database.DBLock.Lock()
	database.DB.First(&question, request.QuestionID)
	database.DBLock.Unlock()

	prompt := `
I will give you the question title, question description, a list of constraints and then the code of the student.
You have to understand the context of the question.
You have to understand the student's code.
Once you have done the above, you need to generate 4 multiple choice questions with 4 options each. You also must tell me what the correct answer is.
These questions must be based on the code and the context of the question.
The questions must be in framed in such a way that a student who has written the code himself must be able to answer them easily.
Some students try to be clever and cheat me by copying someone else's code. These students must not be able to answer your questions easily.
For example, you can ask questions like what does variable x store? etc.
You are an intelligent API so you must reply either true or false in the JSON format given.
You don't have to give any explanations/extra informations.
Do not format your answer in markdown.
Answer as if you're directly addressing the student.
Generate exactly 4 questions. No more. No less
Reply in only JSON only.
The format of the JSON will be like so:
{
  "questions": [
    {
      "question": "question 1 here", // string type
      "options": ["option1", "option2", "option3", "option4"], // these options must be an array of strings
      "correctOption": <index of the correct option in the above options array> // must be a number
    },
    {
      "question": "question 2 here", // string type
      "options": ["option1", "option2", "option3", "option4"], // these options must be an array of strings
      "correctOption": <index of the correct option in the above options array> // must be a number
    },
    {
      "question": "question 3 here", // string type
      "options": ["option1", "option2", "option3", "option4"], // these options must be an array of strings
      "correctOption": <index of the correct option in the above options array> // must be a number
    },
    {
      "question": "question 4 here", // string type
      "options": ["option1", "option2", "option3", "option4"], // these options must be an array of strings
      "correctOption": <index of the correct option in the above options array> // must be a number
    },
  ]
}

`

	prompt += `Question Title:
	`
	prompt += question.Title + "\n"

	prompt += `Question Description:
	`
	prompt += question.Question + "\n"

	prompt += `Constraints: 
	` // the new line here is important
	for _, constraint := range question.Constraints {
		prompt += "- " + constraint + "\n"
	}
	prompt += `Code:
	` // the new line here is important
	prompt += request.Code

	postBody, _ := json.Marshal(map[string]interface{}{
		"model":  "superlit-AI",
		"format": "json",
		"stream": false,
		"prompt": prompt,
	})

	responseBody := bytes.NewBuffer(postBody)

	resp, err := http.Post(os.Getenv("OLLAMA_URL")+"api/generate", "application/json", responseBody)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)

	var response ollamaVivaResponse
	err = json.Unmarshal(body, &response)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var ollamaViva ollamaVivaAnswer
	err = json.Unmarshal([]byte(response.Response), &ollamaViva)
	if err != nil {
		// TODO: write logic to retry.
		// but for now, I'm assuming that the model will return in JSON only.
		// that's what ollama's api docs say but just in case
		log.Println("LLM model returned some bullshit which could not be parsed: ", response.Response)
		log.Println(err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Server Error"})
		return
	}

	prettyPrint.PrettyPrint(ollamaViva)

	c.JSON(http.StatusOK, ollamaViva)
}

type ollamaVivaResponse struct {
	Response string `json:"response"`
}

type ollamaVivaAnswer struct {
	Questions []vivaQuestions `json:"questions"`
}

type vivaQuestions struct {
	Question      string   `json:"question"`
	Options       []string `json:"options"`
	CorrectOption uint     `json:"correctOption"`
}

// this function is for setting viva score in the database
// TODO: VULN: This function trusts the frontend to send the correct viva score. This is a vulnerability.
// A better approach would be to send the viva questions and the answers to the backend and then calculate the score on the backend
// I'm taking this shortcut to save time and ship this feature before the internship ends
func SetVivaScore(c *gin.Context) {
	var request models.SetVivaScoreRequest
	err := c.BindJSON(&request)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Request"})
		return
	}

	value, ok := c.Get("claims")
	claims, ok := value.(jwt.MapClaims)
	userIDFloat, ok := claims["userID"].(float64)
	userID := uint(userIDFloat)

	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Token"})
	}

	log.Println("Setting Viva Score", request.Score, "for User: ", userID)
	prettyPrint.PrettyPrint(request)

	err = database.SetVivaScore(request.AssignmentID, userID, request.QuestionID, request.Score)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Viva Score Set"})
}
