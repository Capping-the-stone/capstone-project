package models

import (
	"time"

	"github.com/lib/pq"
	"gorm.io/gorm"
)

type User struct {
	gorm.Model
	UniversityID string                 `json:"universityID"` // this may be employee ID or student ID (EMP ID and SRN in terms of PES)
	Name         string                 `json:"name"`
	Email        string                 `json:"email"`
	Password     string                 `json:"password"`
	IsTeacher    bool                   `json:"isTeacher"`
	Classrooms   []Classroom            `gorm:"many2many:user_classroom;" json:"classrooms"`
	Submissions  []AssignmentSubmission `json:"submissions"`
	// all the submissions that this dude has made
}

// aka class
type Classroom struct {
	gorm.Model
	Name        string       `json:"name"`
	Code        string       `json:"code"`        // this is the code that students will use to join the classroom
	TeacherCode string       `json:"teacherCode"` // this is the code that teachers will use to join the classroom
	Users       []User       `json:"users" gorm:"many2many:user_classroom;"`
	Assignments []Assignment `json:"assignments" gorm:"many2many:assignment_classroom;"`
}

// aka test
type Assignment struct {
	gorm.Model
	Name                    string                 `json:"name"`
	Description             string                 `json:"description"`
	StartTime               time.Time              `json:"startTime"`
	EndTime                 time.Time              `json:"endTime"`
	EnableAIViva            bool                   `json:"enableAIViva"`
	EnableAIHint            bool                   `json:"enableAIHint"`
	EnableLeaderboard       bool                   `json:"enableLeaderboard"`
	MaxWindowChangeAttempts int                    `json:"maxWindowChangeAttempts"`
	Classrooms              []Classroom            `gorm:"many2many:assignment_classroom;" json:"classrooms"`
	Questions               []Question             `gorm:"polymorphic:Parent;" json:"questions"`
	BlacklistedStudents     []User                 `gorm:"many2many:assignment_user_blacklist;" json:"blacklistedStudents"` // students who've been caught cheating
	Submissions             []AssignmentSubmission `gorm:"foreignKey:AssignmentID" json:"submissions"`
	// this is the classrooms in which the assignment is assigned.
	// Since every classroom can have multiple assignments, and one assignment may be assigned to multiple classrooms, we have a many to many relationship
}

// Instant tests are tests that are created on the fly by teachers.
// Private code is not shared. This code is used to edit the test
// Public code is shared with students. This code is used to attempt the test
type InstantTest struct {
	gorm.Model
	Email                    string                  `json:"email"`
	PrivateCode              string                  `json:"privateCode"`
	PublicCode               string                  `json:"publicCode"`
	IsActive                 bool                    `json:"isActive"`
	Questions                []Question              `gorm:"polymorphic:Parent;" json:"questions"`
	Submissions              []InstantTestSubmission `gorm:"foreignKey:InstantTestID" json:"submissions"`
	BlacklistedUniversityIDs pq.StringArray          `json:"blacklistedUniversityIDs" gorm:"type:text[]"` // students who've been caught cheatingy
}

type InstantTestSubmission struct {
	gorm.Model
	InstantTestID uint     `json:"instantTestID"`
	UniversityID  string   `json:"universityID"`
	Answers       []Answer `gorm:"polymorphic:Parent;" json:"answers"`
	TotalScore    int      `json:"totalScore"`
}

type AssignmentSubmission struct {
	gorm.Model
	AssignmentID uint     `json:"assignmentID"`
	UserID       uint     `json:"userID"`
	UniversityID string   `json:"universityID"`
	Answers      []Answer `gorm:"polymorphic:Parent;" json:"answers"`
	TotalScore   int      `json:"totalScore"`
}

type Answer struct {
	gorm.Model
	ParentID            uint               `json:"parentID"`
	ParentType          string             `json:"parentType"`
	QuestionID          uint               `json:"questionID"`
	Code                string             `json:"code"`
	TestCases           []VerifiedTestCase `gorm:"constraint:OnDelete:CASCADE;" json:"testCases"`
	Score               int                `json:"score"`               // total score for this particular question
	AIVerified          bool               `json:"AIVerified"`          // if AI has verified the code
	AIVerdict           bool               `json:"AIVerdict"`           // if AI has verified the code, this is the verdict. If true, it means it's aproved. else something is fishy
	AIVerdictFailReason string             `json:"AIVerdictFailReason"` // if AI has flagged this answer, the reason why
	AIVivaScore         int                `json:"AIVivaScore"`         // how many viva questions did the student answer correctly
	AIVivaTaken         bool               `json:"AIVivaTaken"`         // if the student has taken the viva, or somehow hit back and not answered
}

type Question struct {
	gorm.Model
	ParentID       uint              `json:"parentID"`
	ParentType     string            `json:"parentType"`
	Title          string            `json:"title"`
	Question       string            `json:"question"`
	ExampleCases   []ExampleTestCase `json:"exampleCases"`
	PreWrittenCode string            `json:"preWrittenCode"`
	TestCases      []TestCase        `json:"testCases"`
	Constraints    pq.StringArray    `json:"constraints" gorm:"type:text[]"` // list of constraints that the code must satisfy. Used for AI Verification
	Languages      pq.StringArray    `json:"languages" gorm:"type:text[]"`   // languages the student is allowed to submit in
}

type ExampleTestCase struct {
	gorm.Model
	QuestionID     uint   `json:"questionID"`
	Input          string `json:"input"`
	ExpectedOutput string `json:"expectedOutput"`
	Score          int    `json:"score"`
	Explanation    string `json:"explanation"`
}

type TestCase struct {
	gorm.Model
	QuestionID     uint   `json:"questionID"`
	Input          string `json:"input"`
	ExpectedOutput string `json:"expectedOutput"`
	Score          int    `json:"score"`
}

type VerifiedTestCase struct {
	gorm.Model
	AnswerID       uint   `json:"answerID"`
	Passed         bool   `json:"passed"`
	Input          string `json:"input"`
	ExpectedOutput string `json:"expectedOutput"`
	ProducedOutput string `json:"producedOutput"`
}
