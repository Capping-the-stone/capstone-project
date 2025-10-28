package assignments

import (
	"log"
	"net/http"

	"github.com/anuragrao04/superlit-backend/database"
	"github.com/anuragrao04/superlit-backend/models"
	"github.com/anuragrao04/superlit-backend/notifications"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

// legacy function. The new one is ReportCheater()
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

	err := database.AddStudentToAssignmentBlacklist(userID, request.AssignmentID, "Tried to switch windows more than permitted limits", "System", []int{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Something went wrong in inserting into the database"})
		return
	}

	// Send notification to teachers
	user, err := database.GetUserByID(userID)
	if err != nil {
		log.Printf("Could not get user for notification: %v", err)
	} else {
		go notifications.SendBlacklistNotification(request.AssignmentID, user, "Tried to switch windows more than permitted limits", "System")
	}

	c.JSON(http.StatusOK, gin.H{"message": "Student added to blacklist"})
}

func ReportCheater(c *gin.Context) {
	var request models.ReportCheaterRequest

	if err := c.BindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Request"})
		return
	}

	user, err := database.GetUserByUniversityID(request.UniversityID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	assignment, err := database.GetAssignmentFromQuestionID(request.QuestionID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Assignment not found for the given question"})
		return
	}

	err = database.AddStudentToAssignmentBlacklist(user.ID, assignment.ID, request.Reason, request.DetectionMethod, []int{int(request.QuestionID)})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to report cheater"})
		return
	}

	// Send notification to teachers
	go notifications.SendBlacklistNotification(assignment.ID, *user, request.Reason, request.DetectionMethod)

	c.JSON(http.StatusOK, gin.H{"message": "Cheater reported successfully"})
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
