package classroom

import (
	"log"
	"net/http"

	"github.com/anuragrao04/superlit-backend/database"
	"github.com/anuragrao04/superlit-backend/models"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

// this function is responsible for listing all the assignments in a classroom
// it makes sure that the requesting user is part of the classroom
// Then it provides the list of assignments in that classroom
func ListAssignments(c *gin.Context) {
	var request models.ListAssignmentsRequest
	err := c.BindJSON(&request)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Request"})
		log.Println(err.Error())
		return
	}

	// get the userID from the claims
	value, ok := c.Get("claims")
	claims, ok := value.(jwt.MapClaims)
	userIDFloat, ok := claims["userID"].(float64)
	userID := uint(userIDFloat)

	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Request"})
		return
	}

	classroom, err := database.GetClassroom(request.ClassroomCode)
	userBelongs := false
	// now we see if the user belongs to this classroom
	for _, user := range classroom.Users {
		if user.ID == userID {
			userBelongs = true
		}
	}
	if !userBelongs {
		c.JSON(http.StatusForbidden, gin.H{"error": "You are not part of this classroom"})
		return
	}

	// now we send the list of assignments
	c.JSON(http.StatusOK, gin.H{"assignments": classroom.Assignments, "name": classroom.Name})
}
