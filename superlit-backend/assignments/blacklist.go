package assignments

import (
	"log"
	"net/http"

	"github.com/anuragrao04/superlit-backend/database"
	"github.com/anuragrao04/superlit-backend/models"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func AddStudentToBlackList(c *gin.Context) {
	var request models.AddStudentToBlacklistRequest

	if err := c.BindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Request"})
		return
	}

	value, ok := c.Get("claims")
	claims, ok := value.(jwt.MapClaims)
	userIDFloat, ok := claims["userID"].(float64)
	userID := uint(userIDFloat)

	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Request"})
		return
	}

	err := database.AddStudentToAssignmentBlacklist(userID, request.AssignmentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Something went wrong in inserting into the database"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Student added to blacklist"})
}

func ExcuseStudentFromBlacklist(c *gin.Context) {
	var request models.ExcuseStudentFromBlacklistRequest

	if err := c.BindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Request"})
		return
	}

	value, ok := c.Get("claims")
	claims, ok := value.(jwt.MapClaims)
	isTeacher, ok := claims["isTeacher"].(bool)

	if !isTeacher {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "You are not a teacher"})
		log.Println("Someone is tryna do something funny with our system")
		return
	}

	// TODO: Check if this teacher has access to excusing students in that particular assignment

	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Request"})
		return
	}

	err := database.ExcuseStudentFromAssignmentBlacklist(request.StudentID, request.AssignmentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Something went wrong in deleteing from the database"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Student excused from blacklist"})
}
