package instantTest

import (
	"log"
	"net/http"

	"github.com/anuragrao04/superlit-backend/database"
	"github.com/anuragrao04/superlit-backend/models"
	"github.com/gin-gonic/gin"
)

func GetSubmissions(c *gin.Context) {
	var getSubmissionsRequest models.InstantTestGetSubmissionsRequest
	err := c.BindJSON(&getSubmissionsRequest)

	if err != nil {
		log.Println(err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Request"})
		return
	}

	// now we fetch all the submissions from the instant test with the given private code
	submissions, questionIDs, isActive, err := database.GetInstantTestSubmissions(getSubmissionsRequest.PrivateCode)
	if err != nil {
		if err.Error() == "No Such Instant Test" {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Wrong Master Code"})
			return
		}

		log.Println(err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	// TODO: The frontend parses these questionIDs
	// and maps them to question numbers. This should not be the case.
	// We have to do data manipulations on backend only.
	// Refer the implementation on assignment.GetAssignmentSubmissions()

	c.JSON(http.StatusOK, gin.H{"submissions": submissions, "questionIDs": questionIDs, "isActive": isActive})
}
