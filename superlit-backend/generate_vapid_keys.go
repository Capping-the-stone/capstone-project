//go:build tools

package main

// run this file with go run -tags tools generate_vapid_keys.go
import (
	"fmt"
	"log"
	"os"

	webpush "github.com/SherClockHolmes/webpush-go"
)

func main() {
	// Generate VAPID keys
	privateKey, publicKey, err := webpush.GenerateVAPIDKeys()
	if err != nil {
		log.Fatalf("Failed to generate VAPID keys: %v", err)
	}

	fmt.Println("Successfully generated VAPID keys.")
	fmt.Printf("Public Key: %s\n", publicKey)
	fmt.Printf("Private Key: %s\n", privateKey)

	// Open .env file in append mode, or create it if it doesn't exist
	f, err := os.OpenFile(".env", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		log.Fatalf("Failed to open .env file: %v", err)
	}
	defer f.Close()

	// Append the keys to the .env file
	// Note: This will add the keys even if they already exist.
	// It's recommended to check your .env file for duplicates.
	if _, err := f.WriteString(fmt.Sprintf("\nVAPID_PUBLIC_KEY=\" %s \"\nVAPID_PRIVATE_KEY=\" %s \"\n", publicKey, privateKey)); err != nil {
		log.Fatalf("Failed to write keys to .env file: %v", err)
	}

	fmt.Println("\nAppended VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY to your .env file.")
	fmt.Println("Please also set VAPID_SUBSCRIBER_EMAIL in the .env file (e.g., VAPID_SUBSCRIBER_EMAIL=\"mailto:admin@yourdomain.com\").")
}
