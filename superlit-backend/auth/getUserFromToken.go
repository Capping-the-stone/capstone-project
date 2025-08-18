package auth

import (
	"log"
	"net/http"

	"github.com/anuragrao04/superlit-backend/database"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func GetUserFromToken(c *gin.Context) {
	value, ok := c.Get("claims")
	claims, ok := value.(jwt.MapClaims)
	userIDFloat, ok := claims["userID"].(float64)
	userID := uint(userIDFloat)
	isTeacher, ok := claims["isTeacher"].(bool)

	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Request"})
		return
	}

	user, err := database.GetUserByID(userID)

	if err != nil {
		log.Println(err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "User does not exist"})
		return
	}

	user.Password = "" // don't send the password back

	if !isTeacher {
		for _, classroom := range user.Classrooms {
			classroom.TeacherCode = "" // don't send the teacher code back
		}
	}

	c.JSON(http.StatusOK, user)
}
