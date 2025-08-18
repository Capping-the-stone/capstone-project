package AI

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
	"os"

	"github.com/anuragrao04/superlit-backend/database"
	"github.com/anuragrao04/superlit-backend/models"
	"github.com/gin-gonic/gin"
)

// this file contains the code to verify a particular constraint for
// all submissions from a particular test.

func AIVerifyConstraintsInstantTest(c *gin.Context) {
	// this function will verify the constraints for all submissions of a particular instant test
	var request models.AIVerifyConstraintsInstantTestRequest
	err := c.BindJSON(&request)
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid Request"})
		return
	}

	// now we find the instant test with the given request.PrivateCode
	var instantTest models.InstantTest
	instantTest, err = database.GetInstantTestByPrivateCode(request.PrivateCode)
	if err != nil {
		c.JSON(400, gin.H{"error": "Something went wrong in fetching the test record from database: " + err.Error()})
		return
	}

	go verifyConstraintsInBackground(instantTest) // this will happen in the background
	c.JSON(200, gin.H{"message": "Verification started in the background. An email will be sent when finished"})

}

func AIVerifyConstraintsAssignment(c *gin.Context) {
	// this function will verify the constraints for all submissions of a particular instant test
	var request models.AIVerifyConstraintsAssignmentRequest
	err := c.BindJSON(&request)
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid Request"})
		return
	}

	// now we find the assignment test with the given assignmentID
	var assignment models.Assignment
	assignment, err = database.GetAssignmentForAIVerification(request.AssignmentID)
	if err != nil {
		c.JSON(400, gin.H{"error": "Something went wrong in fetching the test record from database: " + err.Error()})
		return
	}

	go verifyConstraintsInBackgroundAssignment(assignment) // this will happen in the background
	c.JSON(200, gin.H{"message": "Verification started in the background. An email will be sent when finished"})

}

func verifyConstraintsInBackground(instantTest models.InstantTest) {
	for submissionIndex, submission := range instantTest.Submissions {
		for answerIndex, answer := range submission.Answers {
			// now we need to find the list of constraints for this answer
			question, err := getQuestion(instantTest.Questions, answer.QuestionID)
			constraints := question.Constraints
			if err != nil {
				// TODO: Send sad email
				return
			}

			prompt := `
I am a teacher and you are helping me in verifying if the code written by my students follows the constraints set by me.
I will give you the question title, question description, a list of constraints and then the code of the student.
You have to understand the context of the question and tell me if the code follows the given constraints or not.
For example, the constraint might be to use 'OOPS' concepts in the code, you must reply with true if the code contains OOPS concepts and false if it doesn't.
You have to meticolously check that every constraint in the list is satisfied. 
Some students try to cheat by satisfying only some constraints, or satisfying them in a way they are not intended to be used.
Some constraints are to verify wether a specific language construct is used. For example, a constraint may be 'must use an array of structures'. In these cases, some students might just declare the structure, but not use them in the code.
This is against the spirit of the question.
You are to lookout for these malicious compliance cases and reply false if you find any.
You must also check for any other constraints that might be present in the question description.
You must also check if the code follows the spirit of the question or not. If it doesn't follow the spirit of the question, treat it as if it doesn't follow the constraints
If you reply false, you must explain why you're flagging the answer in the 'reason' field in under 3 sentences
Do not format your answer in markdown.
Reply in only JSON only.
The format of the JSON will be like so:
{
  "answer": true
}
or
{
  "answer": false
  "reason": "<your reason here>"
}

			`

			// now we send a request to the server running ollama
			prompt += `Question Title:
			`

			prompt += question.Title + "\n"

			prompt += `Question Description:
			`
			prompt += question.Question + "\n"

			prompt += `Constraints: 
			` // the new line here is important
			for _, constraint := range constraints {
				prompt += "- " + constraint + "\n"
			}
			prompt += `Code:
			` // the new line here is important
			prompt += answer.Code

			postBody, _ := json.Marshal(map[string]interface{}{
				"model":  "superlit-AI",
				"format": "json",
				"stream": false,
				"prompt": prompt,
			})
			responseBody := bytes.NewBuffer(postBody)
			resp, err := http.Post(os.Getenv("OLLAMA_URL")+"api/generate", "application/json", responseBody)
			if err != nil {
				// TODO: Send sad email
				log.Println("Failed to send request to ollama: ", err)
				continue
			}
			defer resp.Body.Close()
			body, err := io.ReadAll(resp.Body)
			var response ollamaVerifyResponse
			err = json.Unmarshal(body, &response)

			if err != nil {
				// TODO: Send sad email
				log.Println("Failed to read response from ollama: ", err)
				continue
			}

			var ollamaVerdict ollamaVerifyAnswer
			err = json.Unmarshal([]byte(response.Response), &ollamaVerdict)
			log.Println("Verdict from LLM model: ", ollamaVerdict.Answer)
			if err != nil {
				// TODO: Send sad email, or write logic to retry.
				// but for now, I'm assuming that the model will return in JSON only.
				// that's what ollama's api docs say but just in case
				log.Println("LLM model returned some bullshit which could not be parsed: ", response.Response)
				continue
			}

			// now we have the verdict from ollama
			instantTest.Submissions[submissionIndex].Answers[answerIndex].AIVerified = true
			instantTest.Submissions[submissionIndex].Answers[answerIndex].AIVerdict = ollamaVerdict.Answer

		}
	}

	// after all of that is done, we save it to the database
	err := database.SaveInstantTest(instantTest)
	if err != nil {
		log.Println("Failed to save the instant test after AI verification: ", err)
		// TODO: try again or send sad email
	}

	// TODO: Send happy email!
}

func verifyConstraintsInBackgroundAssignment(assignment models.Assignment) {
	for submissionIndex, submission := range assignment.Submissions {
		for answerIndex, answer := range submission.Answers {
			// now we need to find the list of constraints for this answer
			question, err := getQuestion(assignment.Questions, answer.QuestionID)
			constraints := question.Constraints
			if err != nil {
				// TODO: Send sad email
				return
			}
			prompt := `
I am a teacher and you are helping me in verifying if the code written by my students follows the constraints set by me.
I will give you the question title, question description, a list of constraints and then the code of the student.
You have to understand the context of the question and tell me if the code follows the given constraints or not.
For example, the constraint might be to use 'OOPS' concepts in the code, you must reply with true if the code contains OOPS concepts and false if it doesn't.
You have to meticolously check that every constraint in the list is satisfied. 
Some students try to cheat by satisfying only some constraints, or satisfying them in a way they are not intended to be used.
Some constraints are to verify wether a specific language construct is used. For example, a constraint may be 'must use an array of structures'. In these cases, some students might just declare the structure, but not use them in the code.
This is against the spirit of the question.
You are to lookout for these malicious compliance cases and reply false if you find any.
You must also check for any other constraints that might be present in the question description.
You must also check if the code follows the spirit of the question or not. If it doesn't follow the spirit of the question, treat it as if it doesn't follow the constraints
If you reply false, you must explain why you're flagging the answer in the 'reason' field in under 3 sentences
Do not format your answer in markdown.
Reply in only JSON only.
The format of the JSON will be like so:
{
  "answer": true
}
or
{
  "answer": false
  "reason": "<your reason here>"
}

			`
			// now we send a request to the server running ollama
			prompt += `Question Title:
			`

			prompt += question.Title + "\n"

			prompt += `Question Description:
			`
			prompt += question.Question + "\n"

			prompt += `Constraints: 
			` // the new line here is important
			for _, constraint := range constraints {
				prompt += "- " + constraint + "\n"
			}
			prompt += `Code:
			` // the new line here is important
			prompt += answer.Code

			postBody, _ := json.Marshal(map[string]interface{}{
				"model":  "superlit-AI",
				"format": "json",
				"stream": false,
				"prompt": prompt,
			})
			responseBody := bytes.NewBuffer(postBody)
			resp, err := http.Post(os.Getenv("OLLAMA_URL")+"api/generate", "application/json", responseBody)
			if err != nil {
				// TODO: Send sad email
				log.Println("Failed to send request to ollama: ", err)
				continue
			}
			defer resp.Body.Close()
			body, err := io.ReadAll(resp.Body)
			var response ollamaVerifyResponse
			err = json.Unmarshal(body, &response)

			if err != nil {
				// TODO: Send sad email
				log.Println("Failed to read response from ollama: ", err)
				continue
			}

			var ollamaVerdict ollamaVerifyAnswer
			err = json.Unmarshal([]byte(response.Response), &ollamaVerdict)
			log.Println("Verdict from LLM model: ", ollamaVerdict.Answer)
			if err != nil {
				// TODO: Send sad email, or write logic to retry.
				// but for now, I'm assuming that the model will return in JSON only.
				// that's what ollama's api docs say but just in case
				log.Println("LLM model returned some bullshit which could not be parsed: ", response.Response)
				continue
			}

			// now we have the verdict from ollama
			assignment.Submissions[submissionIndex].Answers[answerIndex].AIVerified = true
			assignment.Submissions[submissionIndex].Answers[answerIndex].AIVerdict = ollamaVerdict.Answer
			if ollamaVerdict.Answer == false {
				assignment.Submissions[submissionIndex].Answers[answerIndex].AIVerdictFailReason = ollamaVerdict.Reason
			}
		}
	}

	// after all of that is done, we save it to the database
	err := database.SaveAssignment(assignment)
	if err != nil {
		log.Println("Failed to save the instant test after AI verification: ", err)
		// TODO: try again or send sad email
	}

	// TODO: Send happy email!
}

type ollamaVerifyResponse struct {
	Response string `json:"response"`
}
type ollamaVerifyAnswer struct {
	Answer bool   `json:"answer"`
	Reason string `json:"reason"`
}

func VerifyConstrainstInBackgroundAnswer(question models.Question, answerID uint) {
	log.Println("Verifying constraints for answer: ", answerID)
	var answer models.Answer
	database.DBLock.Lock()
	err := database.DB.First(&answer, answerID).Error
	database.DBLock.Unlock()

	if err != nil {
		log.Println("Failed to fetch the answer from the database: ", err)
		// Silently fail, can't do anything about this
		return
	}

	constraints := question.Constraints

	// now we send a request to the server running ollama
	prompt := `
I am a teacher and you are helping me in verifying if the code written by my students follows the constraints set by me.
I will give you the question title, question description, a list of constraints and then the code of the student.
You have to understand the context of the question and tell me if the code follows the given constraints or not.
For example, the constraint might be to use 'OOPS' concepts in the code, you must reply with true if the code contains OOPS concepts and false if it doesn't.
You have to meticolously check that every constraint in the list is satisfied. 
Some students try to cheat by satisfying only some constraints, or satisfying them in a way they are not intended to be used.
Some constraints are to verify wether a specific language construct is used. For example, a constraint may be 'must use an array of structures'. In these cases, some students might just declare the structure, but not use them in the code.
This is against the spirit of the question.
You are to lookout for these malicious compliance cases and reply false if you find any.
You must also check for any other constraints that might be present in the question description.
You must also check if the code follows the spirit of the question or not. If it doesn't follow the spirit of the question, treat it as if it doesn't follow the constraints
You are an intelligent API so you must reply either true or false in the JSON format given.
If you reply false, you must explain why you're flagging the answer in the 'reason' field in under 3 sentences
Do not format your answer in markdown.
Reply in only JSON only.
The format of the JSON will be like so:
{
  "answer": true
}
or
{
  "answer": false
  "reason": "<your reason here>"
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
	for _, constraint := range constraints {
		prompt += "- " + constraint + "\n"
	}
	prompt += `Code:
			` // the new line here is important
	prompt += answer.Code

	postBody, _ := json.Marshal(map[string]interface{}{
		"model":  "superlit-AI",
		"format": "json",
		"stream": false,
		"prompt": prompt,
	})
	responseBody := bytes.NewBuffer(postBody)
	resp, err := http.Post(os.Getenv("OLLAMA_URL")+"api/generate", "application/json", responseBody)
	if err != nil {
		// TODO: Send sad email
		log.Println("Failed to send request to ollama: ", err)
		return
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	var response ollamaVerifyResponse
	err = json.Unmarshal(body, &response)

	if err != nil {
		// TODO: Send sad email
		log.Println("Failed to read response from ollama: ", err)
		return
	}

	var ollamaVerdict ollamaVerifyAnswer
	err = json.Unmarshal([]byte(response.Response), &ollamaVerdict)
	log.Println("Verdict from LLM model: ", ollamaVerdict.Answer)
	if err != nil {
		// TODO: write logic to retry.
		// but for now, I'm assuming that the model will return in JSON only.
		// that's what ollama's api docs say but just in case
		log.Println("LLM model returned some bullshit which could not be parsed: ", response.Response)
		return
	}

	// now we have the verdict from ollama
	answer.AIVerified = true
	answer.AIVerdict = ollamaVerdict.Answer

	if ollamaVerdict.Answer == false {
		answer.AIVerdictFailReason = ollamaVerdict.Reason
	}

	// save this answer
	database.DBLock.Lock()
	database.DB.Save(&answer)
	database.DBLock.Unlock()
}

// takes in the questions array, and a question ID and returns the question struct
func getQuestion(questions []models.Question, questionID uint) (models.Question, error) {
	for _, question := range questions {
		if question.ID == questionID {
			return question, nil
		}
	}
	log.Println("Someone is probably tryna raw dog the API. Question not found")
	return models.Question{}, errors.New("Question not found")
}
