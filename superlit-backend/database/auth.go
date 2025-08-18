package database

import (
	"log"

	"github.com/anuragrao04/superlit-backend/models"
	"golang.org/x/crypto/bcrypt"
)

func CreateNewUser(UniversityID string, Name string, Email string, Password string, IsTeacher bool) (err error) {
	bytePassword := []byte(Password)
	hashedPassword, err := bcrypt.GenerateFromPassword(bytePassword, bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	log.Println("Created new user. Storing password: ", string(hashedPassword))

	user := models.User{
		UniversityID: UniversityID,
		Name:         Name,
		Email:        Email,
		Password:     string(hashedPassword),
		IsTeacher:    IsTeacher,
		Classrooms:   []models.Classroom{},
	}
	DBLock.Lock()
	defer DBLock.Unlock()
	err = DB.Create(&user).Error
	return err
}

func GetUserByUniversityIDPassword(UniversityID string, Password string) (user models.User, err error) {
	if DB == nil {
		log.Println("DB is nil. Not connected to database")
	}

	DBLock.Lock()
	defer DBLock.Unlock()

	err = DB.Preload("Classrooms").Preload("Classrooms.Assignments").Where("university_id = ?", UniversityID).First(&user).Error
	if err != nil {
		log.Println(err)
	}

	err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(Password))

	// if err is not nil, it's a match
	return user, err
}

func GetUserByID(userID uint) (user models.User, err error) {
	DBLock.Lock()
	defer DBLock.Unlock()
	err = DB.Preload("Classrooms").Where("id = ?", userID).First(&user).Error
	if err != nil {
		log.Println(err)
	}
	return user, err
}
