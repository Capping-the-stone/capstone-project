package database

import (
	// "errors"

	"errors"
	"log"

	"github.com/anuragrao04/superlit-backend/models"
	"github.com/lib/pq"
	"gorm.io/gorm"
)

func AddAssignmentToClassroom(assignment *models.Assignment, classroom *models.Classroom) error {
	DBLock.Lock()
	defer DBLock.Unlock()
	// result := DB.Model(classroom).Association("Assignments").Append(assignment)
	_ = DB.Model(classroom).Association("Assignments").Append(assignment)

	// FIXME: this result becomes null. I HAVE NO IDEA WHY.
	// Find out why
	// it always returns null. Even if it appends successfully.
	// Since result is null, I can't do a result.Error != nil. That would lead to a nil pointer dereference
	// So, I can't check for errors.
	// I have to assume that it worked.

	// prettyPrint.PrettyPrint(result)
	return nil
}

func GetAssignment(assignmentID uint) (*models.Assignment, error) {
	DBLock.Lock()
	defer DBLock.Unlock()
	var assignment models.Assignment
	result := DB.Preload("Questions.ExampleCases").Preload("Classrooms.Users").Preload("BlacklistEntries.User").First(&assignment, assignmentID)
	if result.Error != nil {
		return nil, result.Error
	}
	return &assignment, nil
}

// The difference between this function and
// GetAssignment is that this also fetches test cases, submissions, etc
func GetAssignmentForAIVerification(assignmentID uint) (models.Assignment, error) {
	var test models.Assignment
	DBLock.Lock()
	defer DBLock.Unlock()
	err := DB.Preload("Questions").Preload("Submissions").Preload("Submissions.Answers").First(&test, assignmentID).Error
	if err != nil {
		log.Println("Failed to get test: ", err)
		return models.Assignment{}, err
	}
	return test, nil
}

func GetAssignmentForEdit(assignmentID uint) (models.Assignment, error) {
	var test models.Assignment
	DBLock.Lock()
	defer DBLock.Unlock()
	err := DB.Preload("Questions").Preload("Questions.ExampleCases").Preload("Classrooms").Preload("Questions.TestCases").First(&test, assignmentID).Error
	if err != nil {
		log.Println("Failed to get test: ", err)
		return models.Assignment{}, err
	}
	return test, nil
}

// the below function is used to update the submission and answers of a student
// if the submission exists, we update it. If not, it's created
func UpsertAssignmentSubmissionAndAnswers(assignmentID uint, userID uint, universityID string, newAnswer models.Answer) (uint, error) {
	// this creates a transaction. If any error occurs in any step, the entire transaction is rolled back
	// this ensures updating the submission and the answers is atomic
	DBLock.Lock()
	defer DBLock.Unlock()
	err := DB.Transaction(func(tx *gorm.DB) error {
		// Find existing submission
		var submission models.AssignmentSubmission
		err := tx.Preload("Answers").Preload("Answers.TestCases").Where("assignment_id = ? AND user_id = ?", assignmentID, userID).First(&submission).Error
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			log.Println("Failed to load answers location 1")
			return err // Error other than record not found
		}

		if errors.Is(err, gorm.ErrRecordNotFound) {
			// Submission doesn't exist, create a new one
			log.Println("Submission doesn't exist. Creating")
			submission = models.AssignmentSubmission{
				AssignmentID: assignmentID,
				UserID:       userID,
				UniversityID: universityID,
				Answers:      []models.Answer{newAnswer}, // Start with the new answer
				TotalScore:   newAnswer.Score,
			}
			if err := tx.Create(&submission).Error; err != nil {
				log.Println("Failed to create submission")
				return err
			}
		} else {
			// Submission exists. Now we look if an answer already exists for this question
			answerExists := false

			for _, existingAnswer := range submission.Answers {
				if existingAnswer.QuestionID == newAnswer.QuestionID {
					log.Println("Answer exists")
					// Update existing answer
					// prettyPrint.PrettyPrint(existingAnswer)

					tx.Delete(&existingAnswer.TestCases)
					tx.Model(&existingAnswer).Updates(newAnswer)
					tx.Session(&gorm.Session{FullSaveAssociations: true}).Model(&existingAnswer).Association("TestCases").Append(newAnswer.TestCases)
					submission.TotalScore -= existingAnswer.Score // Subtract old score
					submission.TotalScore += newAnswer.Score      // Add new score
					tx.Model(&submission).Where("id = ?", submission.ID).Update("total_score", submission.TotalScore)
					// prettyPrint.PrettyPrint(newAnswer)

					// prettyPrint.PrettyPrint(submission)
					answerExists = true
					// maybe in the future we'll be nice to the students and store the answer depending on which one scored higher
					// if the old score is better than new score, no updating
					break
				}
			}

			if !answerExists {
				log.Println("Answer doesn't exist")
				// Answer doesn't exist, append the new answer
				submission.TotalScore += newAnswer.Score
				tx.Model(&submission).Where("id = ?", submission.ID).Update("total_score", submission.TotalScore)
				tx.Session(&gorm.Session{FullSaveAssociations: true}).Model(&submission).Association("Answers").Append(&newAnswer)
			}
		}

		return nil
	})

	return newAnswer.ID, err
}

func GetAssignmentSubmissions(assignmentID uint) (submissions []models.AssignmentSubmission, questionIDs []uint, err error) {
	var assignment models.Assignment

	DBLock.Lock()
	defer DBLock.Unlock()
	err = DB.Preload("Submissions").Preload("Questions").Preload("Submissions.Answers").First(&assignment, assignmentID).Error
	if err != nil {
		log.Println("Failed to get test: ", err)
		return nil, nil, err
	}

	for _, question := range assignment.Questions {
		questionIDs = append(questionIDs, question.ID)
	}

	return assignment.Submissions, questionIDs, nil
}

func GetAssignmentSubmissionPerStudent(assignmentID, userID uint) (submission models.AssignmentSubmission, questionIDs []uint, questions []models.Question, err error) {
	DBLock.Lock()
	defer DBLock.Unlock()

	err = DB.Preload("Answers.TestCases").Where("assignment_id = ? AND user_id = ?", assignmentID, userID).First(&submission).Error

	if err != nil {
		log.Println(err)
		return // submission, questionIDs, err are auto returned.
		// we only care about the value of err
		// submission and questionIDs take their zero values
	}

	var assignment models.Assignment

	err = DB.Preload("Questions").First(&assignment, assignmentID).Error
	if err != nil {
		log.Println(err)
		return
	}

	for _, question := range assignment.Questions {
		questionIDs = append(questionIDs, question.ID)
	}

	return submission, questionIDs, assignment.Questions, nil
}

func SaveAssignment(assignment models.Assignment) error {
	err := DB.Session(&gorm.Session{FullSaveAssociations: true}).Save(&assignment).Error
	if err != nil {
		return err
	}

	err = DB.Model(&assignment).Association("Questions").Unscoped().Replace(assignment.Questions)
	log.Println("Saved to db")
	return err
}

func GetBlacklistedQuestionIDs(userID uint, assignmentID uint) ([]int64, error) {
	DBLock.Lock()
	defer DBLock.Unlock()
	var blacklistEntry models.AssignmentUserBlacklist
	result := DB.Where("assignment_id = ? AND user_id = ?", assignmentID, userID).First(&blacklistEntry)
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			return []int64{}, nil
		}
		return nil, result.Error
	}
	return blacklistEntry.QuestionIDsPlagiarized, nil
}

func GetAssignmentByID(assignmentID uint) (*models.Assignment, error) {
	var assignment models.Assignment
	result := DB.Preload("Questions").First(&assignment, assignmentID)
	if result.Error != nil {
		return nil, result.Error
	}
	return &assignment, nil
}

// legacy function. The new one is ReportCheater()
func AddStudentToAssignmentBlacklist(userID uint, assignmentID uint, reason string, detectionMethod string, questionIDs []int) error {
	// HACK: If the length of questionIDs is 0, it means that this was detected via window switching, which is legacy
	// so we assume all questions are involved

	DBLock.Lock()
	defer DBLock.Unlock()

	// Convert questionIDs to pq.Int64Array for compatibility with the database
	questionIDsArray := pq.Int64Array{}
	for _, id := range questionIDs {
		questionIDsArray = append(questionIDsArray, int64(id))
	}

	// Check if an entry already exists
	var existingEntry models.AssignmentUserBlacklist
	result := DB.Where("assignment_id = ? AND user_id = ?", assignmentID, userID).First(&existingEntry)

	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			// No existing entry, create a new one
			blacklistEntry := models.AssignmentUserBlacklist{
				AssignmentID:           assignmentID,
				UserID:                 userID,
				Reason:                 reason,
				DetectionMethod:        detectionMethod,
				QuestionIDsPlagiarized: questionIDsArray,
			}

			if err := DB.Create(&blacklistEntry).Error; err != nil {
				return err
			}
		} else {
			return result.Error
		}
	} else {
		// Entry exists, append to existing reason and detection method
		updatedReason := existingEntry.Reason + " | " + reason
		updatedDetectionMethod := existingEntry.DetectionMethod + " | " + detectionMethod

		// Merge question IDs (avoid duplicates)
		questionIDMap := make(map[int64]bool)
		for _, qid := range existingEntry.QuestionIDsPlagiarized {
			questionIDMap[qid] = true
		}
		for _, qid := range questionIDsArray {
			questionIDMap[qid] = true
		}

		mergedQuestionIDs := pq.Int64Array{}
		for qid := range questionIDMap {
			mergedQuestionIDs = append(mergedQuestionIDs, qid)
		}

		if err := DB.Model(&models.AssignmentUserBlacklist{}).
			Where("assignment_id = ? AND user_id = ?", assignmentID, userID).
			Updates(map[string]interface{}{
				"reason":                   updatedReason,
				"detection_method":         updatedDetectionMethod,
				"question_ids_plagiarized": mergedQuestionIDs,
			}).Error; err != nil {
			return err
		}
	}

	return nil
}

func ExcuseStudentFromAssignmentBlacklist(userID, assignmentID uint) error {
	DBLock.Lock()
	defer DBLock.Unlock()
	err := DB.Unscoped().Where("assignment_id = ? AND user_id = ?", assignmentID, userID).Delete(&models.AssignmentUserBlacklist{}).Error
	return err
}

// this function returns the list of students that are blacklisted from an assignment
func GetAssignmentBlacklist(assignmentID uint) ([]models.AssignmentUserBlacklist, error) {
	DBLock.Lock()
	defer DBLock.Unlock()
	var blacklistEntries []models.AssignmentUserBlacklist
	err := DB.Preload("User").Where("assignment_id = ?", assignmentID).Find(&blacklistEntries).Error
	if err != nil {
		return nil, err
	}
	return blacklistEntries, nil
}

func SetVivaScore(assignmentID, userID, questionID uint, score int) error {
	DBLock.Lock()
	defer DBLock.Unlock()
	var submission models.AssignmentSubmission
	err := DB.Preload("Answers").Where("assignment_id = ? AND user_id = ?", assignmentID, userID).First(&submission).Error
	if err != nil {
		return err
	}

	var answerIndex int
	var answerFound bool
	for i, a := range submission.Answers {
		if a.QuestionID == questionID {
			answerIndex = i
			answerFound = true
			break
		}
	}

	if !answerFound {
		return errors.New("answer not found")
	}

	submission.Answers[answerIndex].AIVivaScore = score
	submission.Answers[answerIndex].AIVivaTaken = true

	err = DB.Session(&gorm.Session{FullSaveAssociations: true}).Save(&submission).Error
	return err
}

func GetUserByUniversityID(universityID string) (*models.User, error) {
	DBLock.Lock()
	defer DBLock.Unlock()
	var user models.User
	if err := DB.Where("university_id = ?", universityID).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func GetAssignmentFromQuestionID(questionID uint) (*models.Assignment, error) {
	DBLock.Lock()
	defer DBLock.Unlock()
	var question models.Question
	if err := DB.First(&question, questionID).Error; err != nil {
		return nil, err
	}

	if question.ParentType != "assignments" {
		return nil, errors.New("question does not belong to an assignment")
	}

	var assignment models.Assignment
	if err := DB.First(&assignment, question.ParentID).Error; err != nil {
		return nil, err
	}

	return &assignment, nil
}
