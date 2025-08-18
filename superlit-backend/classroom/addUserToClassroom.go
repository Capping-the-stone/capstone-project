package classroom

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"

	"github.com/anuragrao04/superlit-backend/database"
	"github.com/anuragrao04/superlit-backend/models"
)

func AddUserToClassroom(c *gin.Context) {
	var addUserToClassroomRequest models.AddUserToClassroomRequest
	// see this structure in models/models.go for request structure
	err := c.BindJSON(&addUserToClassroomRequest)

	value, ok := c.Get("claims")
	claims, ok := value.(jwt.MapClaims)
	userIDFloat, ok := claims["userID"].(float64)
	userID := uint(userIDFloat)
	isTeacher, ok := claims["isTeacher"].(bool)

	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Request"})
		return
	}
	if err != nil {
		log.Println(err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Request"})
		return
	}

	err = database.AddUserToClassroom(userID, addUserToClassroomRequest.ClassroomCode, isTeacher)

	if err != nil {
		log.Println(err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Something went wrong in adding the user to the classroom: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "User added to classroom successfully"})
}
