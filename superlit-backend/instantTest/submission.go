package instantTest

import (
	"strings"

	"github.com/anuragrao04/superlit-backend/compile"
	"github.com/anuragrao04/superlit-backend/database"
	"github.com/anuragrao04/superlit-backend/models"
	"github.com/gin-gonic/gin"
)

func Submit(c *gin.Context) {
	var submitRequest models.InstantTestSubmitRequest
	err := c.BindJSON(&submitRequest)
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid Request"})
		return
	}

	// now we fetch the Test from the database
	test := models.InstantTest{}
	// TODO: Move this to database package
	database.DBLock.Lock()
	database.DB.Preload("Questions").Preload("Questions.ExampleCases").Preload("Questions.TestCases").Where("public_code = ?", submitRequest.PublicCode).First(&test)
	database.DBLock.Unlock()

	// now we test the submission against both exampleCases and testCases
	for _, question := range test.Questions {
		if question.ID == submitRequest.QuestionID {
			// we found the question
			// now we need to test the submission against the example cases

			score, testCasesPassed, testCasesFailed, err := CalculateScore(question, submitRequest.Code, submitRequest.Language)
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

			err = database.UpsertSubmissionAndAnswers(test.ID, submitRequest.UniversityID, answer)

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

// This function calculates the score for a question
// returns the score, test cases passed, test cases failed and error if any
func CalculateScore(question models.Question, code, language string) (int, []models.VerifiedTestCase, []models.VerifiedTestCase, error) {
	score := 0
	var testCasesPassed []models.VerifiedTestCase
	var testCasesFailed []models.VerifiedTestCase
	for _, exampleCase := range question.ExampleCases {
		output, err := compile.GetOutput(code, exampleCase.Input, language)
		if err != nil {
			return 0, nil, nil, err
		}
		// strings.TrimSpace removes leading and trailing spaces and new lines
		if strings.TrimSpace(output) == strings.TrimSpace(exampleCase.ExpectedOutput) {
			score += exampleCase.Score
			testCasesPassed = append(testCasesPassed, models.VerifiedTestCase{

				Passed:         true,
				Input:          exampleCase.Input,
				ExpectedOutput: exampleCase.ExpectedOutput,
				ProducedOutput: output,
			})
		} else {
			testCasesFailed = append(testCasesFailed, models.VerifiedTestCase{
				Passed:         false,
				Input:          exampleCase.Input,
				ExpectedOutput: exampleCase.ExpectedOutput,
				ProducedOutput: output,
			})
		}
	}

	// now we need to test the submission against the test cases
	for _, testCase := range question.TestCases {
		output, err := compile.GetOutput(code, testCase.Input, language)
		if err != nil {
			return 0, nil, nil, err
		}
		if strings.TrimSpace(output) == strings.TrimSpace(testCase.ExpectedOutput) {
			score += testCase.Score
			testCasesPassed = append(testCasesPassed, models.VerifiedTestCase{
				Passed:         true,
				Input:          testCase.Input,
				ExpectedOutput: testCase.ExpectedOutput,
				ProducedOutput: output,
			})
		} else {
			testCasesFailed = append(testCasesFailed, models.VerifiedTestCase{
				Passed:         false,
				Input:          testCase.Input,
				ExpectedOutput: testCase.ExpectedOutput,
				ProducedOutput: output,
			})
		}
	}

	return score, testCasesPassed, testCasesFailed, nil
}
