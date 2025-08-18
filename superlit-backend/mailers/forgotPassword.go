package mailers

import (
	"fmt"
	"log"

	"github.com/anuragrao04/superlit-backend/models"
	"gopkg.in/gomail.v2"
)

// this function takes the signed resetLink string and email.
// It is run as a go routine and does not stall the http request. Hence all errors must be handled here itself
// It sends an email to the user with the given token with a nice message
// console and all
// be emotional
// users are dum but we're here to save the day!
func SendForgotPasswordEmail(resetLink string, user *models.User) {

	message := gomail.NewMessage()
	message.SetHeader("From", OUR_EMAIL)
	message.SetHeader("To", user.Email)
	message.SetHeader("Subject", "Reset Your Password")
	message.SetBody("text/html", fmt.Sprintf(`
		<html>
		<body>
		<p>Dear %s</p>
		<p>To reset your password, please click on the link below:</p>
		<p><a href="%s">Reset Password</a></p>
		<p>This link will expire in 15 minutes, so be sure to use it soon.</p>
		<p>If you did not request a password reset, please ignore this email or contact our support team.</p>
		<p>Best regards,</p>
		<p>Superlit Team</p>
		</body>
		</html>
	`, user.Name, resetLink))

	// Send the email
	for i := 0; i < 3; i++ {
		// retry up to 3 times
		if err := DIALER.DialAndSend(message); err != nil {
			log.Println("attempt", i+1, "failed to send email: ", err)
			if i == 2 {
				// it failed on the last attempt. Try no more
				return
			}
			continue
		}
		break
	}

	log.Println("Reset password email sent successfully to", user.Email)
	return
}
