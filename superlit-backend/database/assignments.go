package database

import (
	// "errors"

	"errors"
	"log"

	"github.com/anuragrao04/superlit-backend/models"
	// "github.com/anuragrao04/superlit-backend/prettyPrint"
	"gorm.io/gorm"
	// "github.com/anuragrao04/superlit-backend/prettyPrint"
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
	result := DB.Preload("Questions.ExampleCases").Preload("Classrooms.Users").Preload("BlacklistedStudents").First(&assignment, assignmentID)
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

func AddStudentToAssignmentBlacklist(userID, assignmentID uint) error {
	DBLock.Lock()
	defer DBLock.Unlock()
	var user models.User
	var assignment models.Assignment

	err := DB.First(&user, userID).Error
	if err != nil {
		return err
	}

	err = DB.First(&assignment, assignmentID).Error
	if err != nil {
		return err
	}

	err = DB.Model(&assignment).Association("BlacklistedStudents").Append(&user)
	return err
}

func ExcuseStudentFromAssignmentBlacklist(userID, assignmentID uint) error {
	DBLock.Lock()
	defer DBLock.Unlock()
	var user models.User
	var assignment models.Assignment

	err := DB.First(&user, userID).Error
	if err != nil {
		return err
	}

	err = DB.First(&assignment, assignmentID).Error
	if err != nil {
		return err
	}

	err = DB.Model(&assignment).Association("BlacklistedStudents").Delete(&user)
	return err
}

// this function returns the list of students that are blacklisted from an assignment
func GetAssignmentBlacklist(assignmentID uint) ([]models.User, error) {
	DBLock.Lock()
	defer DBLock.Unlock()
	var assignment models.Assignment
	err := DB.Preload("BlacklistedStudents").First(&assignment, assignmentID).Error
	if err != nil {
		return nil, err
	}
	return assignment.BlacklistedStudents, nil
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
		return errors.New("Answer not found")
	}

	submission.Answers[answerIndex].AIVivaScore = score
	submission.Answers[answerIndex].AIVivaTaken = true

	err = DB.Session(&gorm.Session{FullSaveAssociations: true}).Save(&submission).Error
	return err
}
