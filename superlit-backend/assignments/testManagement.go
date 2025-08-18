package assignments

import (
	"log"
	"net/http"

	"github.com/anuragrao04/superlit-backend/database"
	"github.com/anuragrao04/superlit-backend/models"
	"github.com/anuragrao04/superlit-backend/prettyPrint"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func CreateAssignment(c *gin.Context) {
	var request models.CreateAssignmentRequest
	err := c.BindJSON(&request)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Request"})
		log.Println(err.Error())
		return
	}
	value, ok := c.Get("claims")
	claims, ok := value.(jwt.MapClaims)
	userIDFloat, ok := claims["userID"].(float64)
	userID := uint(userIDFloat)
	isTeacher, ok := claims["isTeacher"].(bool)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Request"})
		return
	}
	if !isTeacher {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Aye catch that fellow. Tryna create a test being a student"})
		log.Println("Someone is trying to do something funny with our system. Catch that fellow, tryna create a test being a student")
		return
	}

	// first we make sure that the user belongs to all of the classrooms
	// they want to add the assignment to
	user, err := database.GetUserByID(userID)

	allClassroomsAuthorized := true
	log.Println("Checking for: ", request.ClassroomIDs)
	for _, classroomID := range request.ClassroomIDs {
		classroomAuthorized := false
		// look for this ID in user.Classrooms
		log.Println("Checking if user is authorized to create assignment in classroom ", classroomID)
		for _, classroom := range user.Classrooms {
			log.Println("iterated through classroom ID: ", classroom.ID, "user: ", user.Name)
			if classroom.ID == classroomID {
				log.Println("User is authorized to create assignment in classroom", classroomID)
				classroomAuthorized = true
				break
			}
		}
		if !classroomAuthorized {
			allClassroomsAuthorized = false
			break
		}
	}

	if !allClassroomsAuthorized {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "You are not authorized to create assignments in one or more of the classrooms"})
		log.Println("Someone is trying to do something funny with our system. Catch that fellow, tryna create a test in a classroom they aren't a teacher in")
		return
	}

	// now that the teacher is authorized to create the assignment
	// we'll create the assignment

	var newAssignment models.Assignment
	newAssignment.Name = request.Name
	newAssignment.Description = request.Description
	newAssignment.StartTime = request.StartTime
	newAssignment.EndTime = request.EndTime
	newAssignment.EnableAIViva = request.EnableAIViva
	newAssignment.EnableAIHint = request.EnableAIHint
	newAssignment.EnableLeaderboard = request.EnableLeaderboard
	newAssignment.MaxWindowChangeAttempts = request.MaxWindowChangeAttempts

	newAssignment.Questions = request.Questions

	// TODO: Move this to database package
	database.DBLock.Lock()
	err = database.DB.Create(&newAssignment).Error
	database.DBLock.Unlock()

	prettyPrint.PrettyPrint(newAssignment)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error creating assignment"})
		return
	}

	// now we need to iterate over the classroom IDs and add this assignment to each classroom
	for _, classroomID := range request.ClassroomIDs {
		classroom, err := database.GetClassroomByID(classroomID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Classroom not found"})
			return
		}

		err = database.AddAssignmentToClassroom(&newAssignment, classroom)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error adding assignment to classroom"})
			return
		}
	}

	// everything went well
	c.JSON(http.StatusCreated, gin.H{"message": "Assignment created successfully"})
}
