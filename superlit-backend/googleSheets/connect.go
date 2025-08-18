package googleSheets

import (
	"context"
	"fmt"
	"golang.org/x/oauth2/google"
	"google.golang.org/api/option"
	"google.golang.org/api/sheets/v4"
)

var SRV *sheets.Service
var CTX = context.Background()

func Connect() error {
	client, err := google.FindDefaultCredentials(CTX, "https://www.googleapis.com/auth/spreadsheets")
	if err != nil {
		return fmt.Errorf("Unable to find default credentials: %v", err)
	}

	SRV, err = sheets.NewService(CTX, option.WithCredentials(client))
	if err != nil {
		return fmt.Errorf("Unable to retrieve Sheets client: %v", err)
	}
	return nil
}
