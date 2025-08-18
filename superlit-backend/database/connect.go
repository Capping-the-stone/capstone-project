package database

import (
	"github.com/anuragrao04/superlit-backend/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"sync"
)

var DB *gorm.DB // other packages can access this variable
var DBLock sync.Mutex

func Connect(dsn string) (*gorm.DB, error) {
	var err error

	DBLock.Lock()
	defer DBLock.Unlock()
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		panic("failed to connect database")
	}

	err = DB.AutoMigrate(&models.User{}, &models.Classroom{}, &models.Assignment{}, &models.AssignmentSubmission{}, &models.TestCase{}, &models.InstantTest{}, &models.Question{}, &models.InstantTestSubmission{}, &models.Answer{}, &models.ExampleTestCase{}, &models.VerifiedTestCase{})

	return DB, err
}
