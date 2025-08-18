package models

import "time"

// INCOMING REQUEST MODELS

// this is the request for /run. It only runs the given code and sends the output back
type RunRequest struct {
	Code     string `json:"code"`
	Language string `json:"language"` // this will be the extension of the file. Example: "py" for python, "c" for C, "cpp" for C++, "java" for Java
	Input    string `json:"input"`
}

type AssignmentSubmitRequest struct {
	Code         string `json:"code"`
	Language     string `json:"language"`
	AssignmentID uint   `json:"assignmentID"` // this will be the test ID of the test stored in the database
	QuestionID   uint   `json:"questionID"`
}

type InstantTestSubmitRequest struct {
	Code         string `json:"code"`
	Language     string `json:"language"`
	PublicCode   string `json:"publicCode"` // this will be the public code of the test stored in the database
	UniversityID string `json:"universityID"`
	QuestionID   uint   `json:"questionID"`
}

type InstantTestGetSubmissionsRequest struct {
	PrivateCode string `json:"privateCode"`
}

type GetAssignmentSubmissionsRequest struct {
	AssignmentID uint `json:"assignmentID"`
}

type GetAssignmentLeaderboardRequest struct {
	AssignmentID uint `json:"assignmentID"`
}

type CreateInstantTestRequest struct {
	Questions []Question `json:"questions"`
	Email     string     `json:"email"`
}

type GetInstantTestRequest struct {
	PublicCode string `json:"publicCode"`
}

type ChangeActiveStatusInstantTestRequest struct {
	PrivateCode string `json:"privateCode"`
	Active      bool   `json:"active"`
}

type SignUpRequest struct {
	UniversityID string `json:"universityID"`
	Name         string `json:"name"`
	Email        string `json:"email"`
	Password     string `json:"password"`
	IsTeacher    bool   `json:"isTeacher"` // true if the registering user is a teacher. Else, they are a student
}

type SignInRequestUniversityID struct {
	UniversityID string `json:"universityID"`
	Password     string `json:"password"`
}

type IsTeacherFromTokenRequest struct {
	Token string `json:"token"`
}

type SignInRequestEmail struct {
	Email     string `json:"email"`
	Password  string `json:"password"`
	IsTeacher bool   `json:"isTeacher"` // true if the user is a teacher. Else, they are a student
}

type ForgotPasswordRequest struct {
	UniversityID string `json:"universityID"`
}

type ResetPasswordRequest struct {
	Token       string `json:"token"`
	NewPassword string `json:"newPassword"`
}

type AddUserToClassroomRequest struct {
	ClassroomCode string `json:"classroomCode"`
}

type CreateClassroomRequest struct {
	Name string `json:"name"`
}

type ListAssignmentsRequest struct {
	ClassroomCode string `json:"classroomCode"`
}

type CreateAssignmentRequest struct {
	Name                    string     `json:"name"`
	Description             string     `json:"description"`
	Questions               []Question `json:"questions"`
	ClassroomIDs            []uint     `json:"classroomIDs"` // IDs of the classroom the assignment is to be assigned to
	StartTime               time.Time  `json:"startTime"`    // start time of the assignment
	EndTime                 time.Time  `json:"endTime"`      // end time of the assignment
	EnableAIViva            bool       `json:"enableAIViva"`
	EnableAIHint            bool       `json:"enableAIHint"`
	EnableLeaderboard       bool       `json:"enableLeaderboard"`
	MaxWindowChangeAttempts int        `json:"maxWindowChangeAttempts"`
}

type GetAssignmentRequest struct {
	ClassroomCode string `json:"classroomCode"`
	AssignmentID  uint   `json:"assignmentID"`
}

type GetAssignmentForEditRequest struct {
	AssignmentID uint `json:"assignmentID"`
}

type SaveEditedAssignmentRequest struct {
	EditedAssignment Assignment `json:"editedAssignment"`
}

type GetStudentSubmissionRequest struct {
	AssignmentID uint `json:"assignmentID"`
}

type AddStudentToBlacklistRequest struct {
	AssignmentID uint `json:"assignmentID"`
}

type ExcuseStudentFromBlacklistRequest struct {
	AssignmentID uint `json:"assignmentID"`
	StudentID    uint `json:"studentID"`
}

// AI Stuff
type AIVerifyConstraintsInstantTestRequest struct {
	PrivateCode string `json:"privateCode"`
}

type AIVerifyConstraintsAssignmentRequest struct {
	AssignmentID uint `json:"assignmentID"`
}

type AIGiveHintRequest struct {
	Code       string `json:"code"`
	Language   string `json:"language"`
	QuestionID uint   `json:"questionID"`
}

type AIGetVivaQuestionsRequest struct {
	Code       string `json:"code"`
	QuestionID uint   `json:"questionID"`
}

type SetVivaScoreRequest struct {
	QuestionID   uint `json:"questionID"`
	AssignmentID uint `json:"assignmentID"`
	Score        int  `json:"score"`
}

// Google Sheets Stuff

type PopulateGoogleSheetInstantTestSubmissionsRequest struct {
	PrivateCode     string `json:"privateCode"`
	GoogleSheetLink string `json:"googleSheetLink"`
}

type PopulateGoogleSheetAssignmentSubmissionsRequest struct {
	AssignmentID    uint   `json:"assignmentID"`
	GoogleSheetLink string `json:"googleSheetLink"`
}
