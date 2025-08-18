package auth

import (
	"log"

	"github.com/anuragrao04/superlit-backend/mailers"
	"github.com/anuragrao04/superlit-backend/models"
	"github.com/anuragrao04/superlit-backend/tokens"
	"github.com/gin-gonic/gin"
)

func ForgotPassword(c *gin.Context) {
	var forgotPasswordRequest models.ForgotPasswordRequest

	err := c.BindJSON(&forgotPasswordRequest)
	if err != nil {
		log.Println(err)
		c.JSON(400, gin.H{"error": "Invalid Request"})
		return
	}

	link, user, err := tokens.CreateForgotLink(forgotPasswordRequest.UniversityID)
	if err != nil {
		log.Println(err)
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	// now we send the email
	go mailers.SendForgotPasswordEmail(link, user) // we trust you will send email. Errrors must be handled inside this function

	// if everything went well, we send a success response
	// 202 means that the request has been accepted for processing, but the processing has not been completed. (cases where the email sending screws up)
	c.JSON(202, gin.H{"message": "Reset link is being sent"})
}

func ResetPassword(c *gin.Context) {
	var resetPasswordRequest models.ResetPasswordRequest
	err := c.BindJSON(&resetPasswordRequest)
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid Request"})
	}

	err = tokens.ResetPassword(resetPasswordRequest.Token, resetPasswordRequest.NewPassword)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, gin.H{"message": "Password reset successfully"})
}
