package assignments

import (
	"time"

	"github.com/anuragrao04/superlit-backend/AI"
	"github.com/anuragrao04/superlit-backend/database"
	"github.com/anuragrao04/superlit-backend/instantTest"
	"github.com/anuragrao04/superlit-backend/models"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func Submit(c *gin.Context) {
	var submitRequest models.AssignmentSubmitRequest
	err := c.BindJSON(&submitRequest)
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid Request"})
		return
	}

	value, ok := c.Get("claims")
	claims, ok := value.(jwt.MapClaims)
	userIDFloat, ok := claims["userID"].(float64)
	userID := uint(userIDFloat)
	universityID, ok := claims["universityID"].(string)

	if !ok {
		c.JSON(400, gin.H{"error": "Invalid Request"})
		return
	}

	// now we fetch the Test from the database
	assignment := models.Assignment{}
	// TODO: Move this to database package
	database.DBLock.Lock()
	database.DB.Preload("Questions").Preload("Questions.ExampleCases").Preload("Questions.TestCases").First(&assignment, submitRequest.AssignmentID)
	database.DBLock.Unlock()

	// Check if the assignment is active
	if assignment.StartTime.After(time.Now()) || assignment.EndTime.Before(time.Now()) {
		c.JSON(400, gin.H{"error": "Assignment is not active"})
		return
	}

	// now we test the submission against both exampleCases and testCases
	for _, question := range assignment.Questions {
		if question.ID == submitRequest.QuestionID {
			// we found the question
			// now we need to test the submission against the example cases
			// resuse the CalculateScore function from instantTest package
			score, testCasesPassed, testCasesFailed, err := instantTest.CalculateScore(question, submitRequest.Code, submitRequest.Language)
			if err != nil {
				c.JSON(500, gin.H{"error": err.Error()})
				return
			}

			var answer models.Answer
			answer.QuestionID = question.ID
			answer.Code = submitRequest.Code
			answer.TestCases = testCasesPassed
			answer.TestCases = append(answer.TestCases, testCasesFailed...)
			answer.Score = score

			answerID, err := database.UpsertAssignmentSubmissionAndAnswers(assignment.ID, userID, universityID, answer)

			go AI.VerifyConstrainstInBackgroundAnswer(question, answerID)

			if err != nil {
				c.JSON(500, gin.H{"error": err.Error()})
				return
			}

			c.JSON(200, gin.H{"score": score, "testCasesPassed": testCasesPassed, "testCasesFailed": testCasesFailed})
			return
		}
	}

	// if we reach here, it means that the question was not found
	// this is unlikely unless the frontend screws up
	c.JSON(400, gin.H{"error": "Question not found"})
}
