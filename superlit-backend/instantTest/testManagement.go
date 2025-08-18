package instantTest

import (
	"github.com/anuragrao04/superlit-backend/database"
	"github.com/anuragrao04/superlit-backend/mailers"
	"github.com/anuragrao04/superlit-backend/models"

	// "github.com/anuragrao04/superlit-backend/prettyPrint"
	"github.com/gin-gonic/gin"
)

func CreateTest(c *gin.Context) {
	// create a new test
	// parse incoming JSON
	var testRequest models.CreateInstantTestRequest
	err := c.BindJSON(&testRequest)
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid Request"})
		return
	}

	// prettyPrint.PrettyPrint(testRequest.Questions)

	privateCode, publicCode, err := database.CreateInstantTest(testRequest.Questions, testRequest.Email)

	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to create test"})
		return
	}

	go mailers.SendInstantTestCodes(privateCode, publicCode, testRequest.Email)
	c.JSON(202, gin.H{"privateCode": privateCode, "publicCode": publicCode, "message": "Test Created. Email with credentials is being sent"})
}

func GetInstantTest(c *gin.Context) {
	var testRequest models.GetInstantTestRequest
	err := c.BindJSON(&testRequest)
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid Request"})
		return
	}
	questions, isActive, err := database.GetInstantTest(testRequest.PublicCode)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to get test"})
		return
	}
	if !isActive {
		c.JSON(403, gin.H{"error": "Test is not active"})
		return
	}

	c.JSON(200, gin.H{"questions": questions})
}

func ChangeActive(c *gin.Context) {
	var changeActiveRequest models.ChangeActiveStatusInstantTestRequest
	err := c.BindJSON(&changeActiveRequest)
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid Request"})
		return
	}

	err = database.ChangeActiveStatusInstantTest(changeActiveRequest.Active, changeActiveRequest.PrivateCode)

	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, gin.H{"message": "Active status changed"})
}
