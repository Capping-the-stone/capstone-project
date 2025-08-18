package assignments

import (
	"log"
	"net/http"
	"time"

	"github.com/anuragrao04/superlit-backend/database"
	"github.com/anuragrao04/superlit-backend/models"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func GetAssignment(c *gin.Context) {

	var testRequest models.GetAssignmentRequest
	err := c.BindJSON(&testRequest)
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid Request"})
		log.Println(err.Error())
		return
	}

	// first we need to do a couple of checks
	// 1. User belongs to the classroom
	// 2. Assignment is active (the time of the request is between start time and end time)
	// 3. User does not belong to the blacklist

	value, ok := c.Get("claims")
	claims, ok := value.(jwt.MapClaims)
	userIDFloat, ok := claims["userID"].(float64)
	userID := uint(userIDFloat)
	if !ok {
		c.JSON(400, gin.H{"error": "Invalid Request"})
		return
	}

	assignment, err := database.GetAssignment(testRequest.AssignmentID)

	// check if the user belongs to the classroom

	userBelongsToClassroom := false
	for _, classroom := range assignment.Classrooms {
		if userBelongsToClassroom {
			break
		}
		for _, user := range classroom.Users {
			if user.ID == userID {
				userBelongsToClassroom = true
				break
			}
		}
	}

	if !userBelongsToClassroom {
		c.JSON(403, gin.H{"error": "You are not part of this classroom"})
		return
	}

	// next we see if our assignment is active
	// to do that, we check the time now, and see if it's between the start time and end time

	timeNow := time.Now()
	if timeNow.Before(assignment.StartTime) || timeNow.After(assignment.EndTime) {
		// if the time is not between the start and end time, we return an error
		c.JSON(403, gin.H{"error": "Assignment is not active"})
		return
	}

	// now we see that our user does not belong to the blacklist
	userBelongsToBlacklist := false
	for _, user := range assignment.BlacklistedStudents {
		if user.ID == userID {
			userBelongsToBlacklist = true
			break
		}
	}

	if userBelongsToBlacklist {
		c.JSON(http.StatusForbidden, gin.H{"error": "You are blacklisted from this assignment"})
		return
	}

	// now that we have done our checks, we can return the assignment
	// prettyPrint.PrettyPrint(assignment)
	c.JSON(200, gin.H{
		"questions":               assignment.Questions,
		"startTime":               assignment.StartTime,
		"endTime":                 assignment.EndTime,
		"enableAIViva":            assignment.EnableAIViva,
		"enableAIHint":            assignment.EnableAIHint,
		"enableLeaderboard":       assignment.EnableLeaderboard,
		"maxWindowChangeAttempts": assignment.MaxWindowChangeAttempts,
	})
}
