package mailers

import (
	"fmt"
	"gopkg.in/gomail.v2"
	"log"
)

func SendInstantTestCodes(privateCode, publicCode, email string) {
	message := gomail.NewMessage()
	message.SetHeader("From", OUR_EMAIL)
	message.SetHeader("To", email)
	message.SetHeader("Subject", "Your Instant Test Credentials")
	message.SetBody("text/html", fmt.Sprintf(`
		<html>
		<body>
		<p>Dear Teacher</p>
		<p>Your instant test has been created successfully. Here are your test credentials:</p>
<br />
		<p>Master Code: %s</p>
		<p>Test Code: %s</p>
		<br />
		<p>Share the <b>TEST CODE</b> with your students to take the test.</p>
		<p><b>DO NOT SHARE THE MASTER CODE WITH ANYONE. THIS CODE IS FOR YOU TO EDIT & MANAGE THE TEST.</b></p>
		<p>Best regards,</p>
		<p>Superlit Team</p>
		</body>
		</html>
	`, privateCode, publicCode))

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

	log.Println("Instant test codes sent successfully to", email)
	return
}
