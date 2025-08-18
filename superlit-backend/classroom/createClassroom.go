package classroom

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"

	"github.com/anuragrao04/superlit-backend/database"
	"github.com/anuragrao04/superlit-backend/models"
)

func CreateClassroom(c *gin.Context) {
	var createClassroomRequest models.CreateClassroomRequest
	err := c.BindJSON(&createClassroomRequest)
	value, ok := c.Get("claims")
	if !ok {
		log.Println("Claims not found")
	}
	claims, ok := value.(jwt.MapClaims)
	if !ok {
		log.Println("Claims not found here")
	}
	userIDFloat, ok := claims["userID"].(float64) // json stores number as float64. We can't directly convert to uint
	userID := uint(userIDFloat)
	if !ok {
		log.Println("User ID not found")
	}

	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Request"})
		return
	}

	if err != nil {
		log.Println(err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Request"})
		return
	}

	classroom, err := database.CreateClassroom(createClassroomRequest.Name, userID)

	if err != nil {
		log.Println(err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Something went wrong in creating the classroom: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, classroom)
}
