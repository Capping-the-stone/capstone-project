package notifications

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/anuragrao04/superlit-backend/database"
	"github.com/anuragrao04/superlit-backend/models"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"

	webpush "github.com/SherClockHolmes/webpush-go"
)

var (
	vapidPublicKey       = ""
	vapidPrivateKey      = ""
	vapidSubscriberEmail = ""
)

func Init() {
	vapidPublicKey = os.Getenv("VAPID_PUBLIC_KEY")
	vapidPrivateKey = os.Getenv("VAPID_PRIVATE_KEY")
	vapidSubscriberEmail = os.Getenv("VAPID_SUBSCRIBER_EMAIL")

	if vapidPublicKey == "" || vapidPrivateKey == "" || vapidSubscriberEmail == "" {
		log.Fatal("VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, or VAPID_SUBSCRIBER_EMAIL not set")
	}

	log.Println("Loaded VAPID keys for web push notifications.")
}

func Subscribe(c *gin.Context) {
	// Decode the subscription from the request body
	var subscription webpush.Subscription
	if err := c.ShouldBindJSON(&subscription); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// Get user ID from the JWT token
	value, ok := c.Get("claims")
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user claims"})
		return
	}
	claims, ok := value.(jwt.MapClaims)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse user claims"})
		return
	}
	userIDFloat, ok := claims["userID"].(float64)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID in claims"})
		return
	}
	userID := uint(userIDFloat)

	// Marshal the subscription to a JSON string
	subscriptionJSON, err := json.Marshal(subscription)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to marshal subscription"})
		return
	}

	// Save to the database
	err = database.UpdateUserSubscription(userID, string(subscriptionJSON))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save subscription"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Subscription saved successfully"})
}

// NotificationPayload defines the structure of the push notification.

type NotificationPayload struct {
	Title string `json:"title"`
	Body  string `json:"body"`
}

func SendBlacklistNotification(assignmentID uint, student models.User, reason string, detectionMethod string) {
	assignment, teachers, err := database.GetTeachersForAssignment(assignmentID)
	if err != nil {
		log.Printf("Error getting teachers for notification: %v", err)
		return
	}

	// Construct the notification payload
	payload, err := json.Marshal(NotificationPayload{
		Title: fmt.Sprintf("Cheating Detected in %s", assignment.Name),
		Body:  fmt.Sprintf("Student %s (%s) was flagged. Reason: %s. Method: %s.", student.Name, student.UniversityID, reason, detectionMethod),
	})

	if err != nil {
		log.Printf("Error marshalling notification payload: %v", err)
		return
	}

	for _, teacher := range teachers {
		if teacher.WebPushSubscription == "" {
			continue // No subscription for this teacher
		}

		// Decode subscription
		sub := &webpush.Subscription{}
		if err := json.Unmarshal([]byte(teacher.WebPushSubscription), sub); err != nil {
			log.Printf("Error unmarshalling subscription for user %d: %v", teacher.ID, err)
			continue
		}

		// Send Notification
		resp, err := webpush.SendNotification(payload, sub, &webpush.Options{
			Subscriber:      fmt.Sprintf("mailto:%s", vapidSubscriberEmail),
			VAPIDPublicKey:  vapidPublicKey,
			VAPIDPrivateKey: vapidPrivateKey,
			TTL:             30,
		})
		if err != nil {
			log.Printf("Error sending push notification to user %d: %v", teacher.ID, err)
			continue
		}

		// If the subscription is no longer valid, the push service will return a 410 Gone status.
		if resp.StatusCode == http.StatusGone {
			log.Printf("Subscription for user %d is expired/invalid. Deleting.", teacher.ID)
			// Clear the expired subscription from the database
			if err := database.UpdateUserSubscription(teacher.ID, ""); err != nil {
				log.Printf("Failed to clear expired subscription for user %d: %v", teacher.ID, err)
			}
		}

		defer resp.Body.Close()
	}
}