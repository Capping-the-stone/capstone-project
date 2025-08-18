package auth

import (
	"log"
	"net/http"

	"github.com/anuragrao04/superlit-backend/database"
	"github.com/anuragrao04/superlit-backend/models"
	"github.com/gin-gonic/gin"
)

// creating new user, aka signup
func SignUp(c *gin.Context) {
	var signUpRequest models.SignUpRequest
	err := c.BindJSON(&signUpRequest)
	if err != nil {
		log.Println(err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Request"})
		return
	}

	log.Println("Checking if user already exists")

	// check if the user already exists
	_, err = database.GetUserByUniversityIDPassword(signUpRequest.UniversityID, signUpRequest.Password)

	if err == nil {
		// means user already exists
		c.JSON(http.StatusBadRequest, gin.H{"error": "User already exists"})
		return
	}

	log.Println("Creating new user")

	// create the user
	err = database.CreateNewUser(signUpRequest.UniversityID, signUpRequest.Name, signUpRequest.Email, signUpRequest.Password, signUpRequest.IsTeacher)

	if err != nil {
		log.Println(err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Server Error. Something went wrong in creating the new user"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "User created successfully"})
}
