package activitylogs

import (
	"log"
	"net/http"
	"strconv"

	"github.com/anuragrao04/superlit-backend/database"
	"github.com/gin-gonic/gin"
)

func GetActivityLogs(c *gin.Context) {
	srn := c.Query("srn")
	assignmentIDStr := c.Query("assignment_id")

	if srn == "" || assignmentIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "srn and assignment_id are required"})
		return
	}

	assignmentID, err := strconv.ParseUint(assignmentIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid assignment_id"})
		return
	}

	// Get the student's user from their university ID (srn)
	student, err := database.GetUserByUniversityID(srn)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Student not found"})
		return
	}

	// get blacklisted questions
	blacklistedQuestionIDs, err := database.GetBlacklistedQuestionIDs(student.ID, uint(assignmentID))
	if err != nil {
		log.Printf("Error getting blacklisted questions: %v", err)
		// we don't want to fail the request if this fails, so we'll just return an empty array
		blacklistedQuestionIDs = []int64{}
	}

	// get all questions for the assignment
	assignment, err := database.GetAssignmentByID(uint(assignmentID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get assignment"})
		return
	}

	activityLogs := make(map[int][]LogEntry)

	for _, question := range assignment.Questions {
		iter := CqlSession.Query(`SELECT srn, question_id, ts_ms, event_id, type, content, code, offset, num_characters, is_paste FROM capstone.logs_by_student_question WHERE srn = ? AND question_id = ?`, srn, question.ID).Iter()
		var logEntry LogEntry
		for iter.Scan(&logEntry.Srn, &logEntry.QuestionID, &logEntry.TsMs, &logEntry.EventID, &logEntry.Type, &logEntry.Content, &logEntry.Code, &logEntry.Offset, &logEntry.NumCharacters, &logEntry.IsPaste) {
			activityLogs[int(question.ID)] = append(activityLogs[int(question.ID)], logEntry)
		}
		if err := iter.Close(); err != nil {
			log.Printf("Error closing iterator: %v", err)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"activity_logs":            activityLogs,
		"question_ids_plagiarized": blacklistedQuestionIDs,
	})

}
