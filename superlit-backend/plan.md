### Plan to Implement Cheater Reporting and Update Blacklist Functionality

1.  **`models/requestModels.go`**:
    *   Define a new struct `ReportCheaterRequest` for the new `/assignment/report_cheater` API endpoint. This struct will model the incoming JSON payload.
    ```go
    type ReportCheaterRequest struct {
        QuestionID      uint   `json:"questionID"`
        UniversityID    string `json:"universityID"`
        Reason          string `json:"reason"`
        DetectionMethod string `json:"detectionMethod"`
    }
    ```

2.  **`database/assignments.go`**:
    *   **Modify `AddStudentToAssignmentBlacklist`**:
        *   Change the function signature to `func AddStudentToAssignmentBlacklist(userID, assignmentID uint, reason, detectionMethod string) error`.
        *   The function's implementation will be updated to directly insert a record into the `assignment_user_blacklists` join table using `DB.Create()`. This allows the `reason` and `detectionMethod` to be saved.
    *   **Add Helper Functions**:
        *   Create `GetUserByUniversityID(universityID string) (*models.User, error)` to retrieve a user from the database using their university ID.
        *   Create `GetAssignmentFromQuestionID(questionID uint) (*models.Assignment, error)` to find the parent assignment associated with a given question ID.

3.  **`assignments/blacklist.go`**:
    *   **Modify `AddStudentToBlackList` Handler**:
        *   Update the existing `AddStudentToBlackList` function, which handles the legacy blacklist endpoint.
        *   Modify its call to the database function to `database.AddStudentToAssignmentBlacklist(userID, request.AssignmentID, "Tried to switch windows more than permitted limits", "System")`, passing the specified hardcoded values.
    *   **Create `ReportCheater` Handler**:
        *   Implement a new handler function `ReportCheater(c *gin.Context)` for the new API.
        *   This handler will parse the `ReportCheaterRequest`, use the new database helper functions to resolve `universityID` and `questionID` to their respective database IDs, and then call the modified `database.AddStudentToAssignmentBlacklist` with the details from the request.

4.  **`main.go`**:
    *   Register the new API route by adding `router.POST("/assignment/report_cheater", assignments.ReportCheater)` to the router setup.
