# Web Push Notification Implementation Plan

This document outlines the steps to implement web push notifications for teacher alerts when a student is blacklisted.

### 1. Directory and Package Structure

-   Create a new directory: `notifications/`
-   Inside this directory, create a new file `webpush.go`. This will define the `notifications` package, responsible for all push notification logic, similar to the existing `database` or `mailers` packages.

### 2. Configuration

-   Modify `.env.example` to include placeholders for VAPID keys:
    ```
    VAPID_PUBLIC_KEY=
    VAPID_PRIVATE_KEY=
    ```
-   Implement an `Init()` function in the `notifications` package. This function will read the VAPID keys from the environment variables.
-   Call `notifications.Init()` from `main.go` during application startup to load and validate the keys.

### 3. Database Schema Update

-   Modify the `User` struct in `models/databaseModels.go`.
-   Add a new field to store the web push subscription as a JSON string:
    ```go
    WebPushSubscription string `gorm:"type:jsonb;default:NULL" json:"-"`
    ```
    *(We use the `jsonb` type in Postgres for data validation and future query flexibility, while handling it as a simple `string` in Go.)*
-   GORM's `AutoMigrate` in `database/connect.go` will automatically add this new column to the `users` table.

### 4. Subscription API Endpoint

-   Create a new API handler: `notifications.Subscribe(c *gin.Context)`.
-   This handler will perform the following actions:
    1.  Get the authenticated user's ID from the JWT claims.
    2.  Bind the request body to a `webpush.Subscription` struct.
    3.  Marshal the struct into a JSON string.
    4.  Create and use a new database function, `database.UpdateUserSubscription(userID uint, subscription string)`, to save the JSON string into the user's `WebPushSubscription` field.
-   Register this new handler in `main.go` with the following route:
    ```go
    router.POST("/notifications/subscribe", tokens.VerifyToken, notifications.Subscribe)
    ```

### 5. Notification Trigger and Execution

-   Modify the `ReportCheater` and `AddStudentToBlackList` functions in `assignments/blacklist.go`.
-   After a student is successfully added to the blacklist, call a new function in a goroutine:
    ```go
    go notifications.SendBlacklistNotification(assignment.ID, user, request.Reason, request.DetectionMethod)
    ```
-   This `SendBlacklistNotification` function within the `notifications` package will:
    1.  Accept parameters like assignment ID, student details, reason, and detection method.
    2.  Fetch the assignment name from the database.
    3.  Fetch all classrooms for the assignment, then all users in those classrooms, and filter to get a list of teachers.
    4.  For each teacher, retrieve their `WebPushSubscription` string from the database.
    5.  Construct the notification title and body as specified.
    6.  For each valid subscription, unmarshal the subscription string and send the push notification.
    7.  If sending a notification fails with a "gone" status (HTTP 410), it means the subscription is expired. The function will then clear the `WebPushSubscription` field for that teacher in the database.