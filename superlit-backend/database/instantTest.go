package database

import (
	"errors"
	"github.com/anuragrao04/superlit-backend/models"
	// "github.com/anuragrao04/superlit-backend/prettyPrint"
	"gorm.io/gorm"
	"log"
)

// this function is only used by CreateInstantTest()
// The database mutex is already locked in that function. We shouldn't attempt to lock it here again
func generateUniqueCodes() (privateCode, publicCode string) {
	for {
		privateCode := generateRandomCode()
		publicCode := generateRandomCode()
		var count int64
		// Check if the code already exists in the database
		// if it is , generate a new code, else return the code
		if DB == nil {
			log.Fatal("Not Connected to Database")
		}
		DB.Model(&models.InstantTest{}).Where("private_code = ? AND public_code = ?", privateCode, publicCode).Count(&count)
		if count == 0 {
			return privateCode, publicCode
		}
	}
}

func CreateInstantTest(questions []models.Question, email string) (privateCode, publicCode string, err error) {
	// we assign a private and a public key to this test
	privateCode, publicCode = generateUniqueCodes()
	var newTest models.InstantTest
	newTest.PrivateCode = privateCode
	newTest.PublicCode = publicCode
	newTest.Questions = questions
	newTest.Email = email
	newTest.IsActive = true

	DBLock.Lock()
	defer DBLock.Unlock()

	err = DB.Create(&newTest).Error
	// prettyPrint.PrettyPrint(newTest)

	if err != nil {
		log.Println("Failed to create test: ", err)
		return "", "", err
	}
	return privateCode, publicCode, err
}

func GetInstantTest(publicCode string) (questions []models.Question, isActive bool, err error) {
	var test models.InstantTest
	if DB == nil {
		log.Fatal("Not Connected to Database")
	}

	DBLock.Lock()
	defer DBLock.Unlock()

	err = DB.Preload("Questions").Preload("Questions.ExampleCases").Where("public_code = ?", publicCode).First(&test).Error
	if err != nil {
		log.Println("Failed to get test: ", err)
		return nil, false, err
	}

	if !test.IsActive {
		// test isn't active, don't allow the student to take it
		return nil, false, nil
	}

	// prettyPrint.PrettyPrint(test)
	return test.Questions, test.IsActive, nil
}

func ChangeActiveStatusInstantTest(active bool, privateCode string) (err error) {
	if DB == nil {
		log.Fatal("Not Connected to Database")
	}

	DBLock.Lock()
	defer DBLock.Unlock()
	result := DB.Model(&models.InstantTest{}).Where("private_code = ?", privateCode).Update("is_active", active)
	if result.Error != nil {
		log.Println("Failed to change active status: ", err)
		return err
	}
	if result.RowsAffected == 0 {
		return errors.New("No test with that private code")
	}
	return nil
}

// the below function is used to update the submission and answers of a student
// if the submission exists, we update it. If not, it's created
func UpsertSubmissionAndAnswers(instantTestID uint, universityID string, newAnswer models.Answer) error {
	// this creates a transaction. If any error occurs in any step, the entire transaction is rolled back
	// this ensures updating the submission and the answers is atomic
	DBLock.Lock()
	defer DBLock.Unlock()
	return DB.Transaction(func(tx *gorm.DB) error {
		// Find existing submission
		var submission models.InstantTestSubmission
		err := tx.Preload("Answers").Preload("Answers.TestCases").Where("instant_test_id = ? AND university_id = ?", instantTestID, universityID).First(&submission).Error
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return err // Error other than record not found
		}

		if errors.Is(err, gorm.ErrRecordNotFound) {
			// Submission doesn't exist, create a new one
			submission = models.InstantTestSubmission{
				InstantTestID: instantTestID,
				UniversityID:  universityID,
				Answers:       []models.Answer{newAnswer}, // Start with the new answer
				TotalScore:    newAnswer.Score,
			}
			if err := tx.Create(&submission).Error; err != nil {
				return err
			}
		} else {
			// Submission exists. Now we look if an answer already exists for this question
			answerExists := false

			for _, existingAnswer := range submission.Answers {

				if existingAnswer.QuestionID == newAnswer.QuestionID {
					log.Println("Answer exists")
					// Update existing answer

					submission.TotalScore -= existingAnswer.Score // Subtract old score
					submission.TotalScore += newAnswer.Score      // Add new score
					// update the above in the database
					tx.Model(&submission).Where("id = ?", submission.ID).Update("total_score", submission.TotalScore)

					// Replace the old answer
					tx.Model(&submission).Association("Answers").Delete(existingAnswer)
					tx.Model(&submission).Association("Answers").Append(&newAnswer)

					// prettyPrint.PrettyPrint(submission)
					answerExists = true
					// maybe in the future we'll be nice to the students and store the answer depending on which one scored higher
					// if the old score is better than new score, no updating
					break
				}
			}

			if !answerExists {
				// Answer doesn't exist, append the new answer
				submission.Answers = append(submission.Answers, newAnswer)
				submission.TotalScore += newAnswer.Score
			}

			if err := tx.Save(&submission).Error; err != nil {
				return err
			}
		}

		return nil
	})
}

// This function fetches all submissions in a given instant test and returns it as an array
// it also returns an array of questionIDs and a boolean stating if the test is active
func GetInstantTestSubmissions(privateCode string) ([]models.InstantTestSubmission, []uint, bool, error) {
	var test models.InstantTest

	DBLock.Lock()
	defer DBLock.Unlock()
	err := DB.Preload("Submissions").Preload("Questions").Preload("Submissions.Answers").Where("private_code = ?", privateCode).First(&test).Error
	if err != nil {
		log.Println("Failed to get test: ", err)
		return nil, nil, false, err
	}

	var questionIDs []uint
	for _, question := range test.Questions {
		questionIDs = append(questionIDs, question.ID)
	}

	return test.Submissions, questionIDs, test.IsActive, nil
}

func GetInstantTestByPrivateCode(privateCode string) (models.InstantTest, error) {
	var test models.InstantTest
	DBLock.Lock()
	defer DBLock.Unlock()
	err := DB.Preload("Questions").Preload("Questions").Preload("Submissions").Preload("Submissions.Answers").Where("private_code = ?", privateCode).First(&test).Error
	if err != nil {
		log.Println("Failed to get test: ", err)
		return models.InstantTest{}, err
	}
	return test, nil
}

func SaveInstantTest(instantTest models.InstantTest) error {
	err := DB.Session(&gorm.Session{FullSaveAssociations: true}).Save(&instantTest).Error
	log.Println("Saved to db")
	return err
}
