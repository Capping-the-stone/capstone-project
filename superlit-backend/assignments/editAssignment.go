package assignments

import (
	"log"
	"net/http"

	"github.com/anuragrao04/superlit-backend/database"
	"github.com/anuragrao04/superlit-backend/models"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func GetAssignmentForEdit(c *gin.Context) {
	var request models.GetAssignmentForEditRequest
	err := c.BindJSON(&request)

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Request"})
		log.Println(err)
		return
	}

	// verify this user is a teacher
	value, ok := c.Get("claims")
	claims, ok := value.(jwt.MapClaims)

	isTeacher, ok := claims["isTeacher"].(bool)

	if !ok || !isTeacher {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "You are not authorized to do this"})
		log.Println("Someone is tryna do something funny")
		return
	}

	// now we fetch the assignment
	assignment, err := database.GetAssignmentForEdit(request.AssignmentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch assignment"})
		log.Println(err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"assignment": assignment})
}

func SaveEditedAssignment(c *gin.Context) {
	var request models.SaveEditedAssignmentRequest
	err := c.BindJSON(&request)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Request"})
		log.Println(err)
		return
	}
	// next we must make sure that this edited assignment has an ID.
	// If not, it'll create a whole new assignment
	if request.EditedAssignment.ID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Assignment ID Not Incuded"})
		log.Println("Assignment ID not included")
		return
	}

	// next we save this assignment
	err = database.SaveAssignment(request.EditedAssignment)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save assignment"})
		log.Println(err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Assignment Saved"})
}
