package assignments

import (
	"cmp"
	"log"
	"net/http"
	"slices"

	"github.com/anuragrao04/superlit-backend/database"
	"github.com/anuragrao04/superlit-backend/models"
	"github.com/gin-gonic/gin"
)

func GetAssignmentLeaderboard(c *gin.Context) {
	var getSubmissionsRequest models.GetAssignmentLeaderboardRequest
	err := c.BindJSON(&getSubmissionsRequest)

	// TODO: We do not perform authentication that the student has
	// access to this assignment. We must figure out a way to do this

	// now we fetch all the submissions from the test with the given assigmment ID
	submissions, _, err := database.GetAssignmentSubmissions(getSubmissionsRequest.AssignmentID)
	if err != nil {
		if err.Error() == "No Such Assignment" {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Wrong Assignment ID. No such assignment exists"})
			return
		}

		log.Println(err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	type studentSubmission struct {
		UniversityID      string `json:"universityID"`
		TotalScore        uint   `json:"totalScore"`
		AvgSubmissionTime uint   `json:"avgSubmissionTime"`
	}

	var formattedReturn = make([]studentSubmission, 0)

	for _, submission := range submissions {
		var formattedSubmission studentSubmission
		formattedSubmission.UniversityID = submission.UniversityID
		formattedSubmission.TotalScore = uint(submission.TotalScore)
		for _, answer := range submission.Answers {
			formattedSubmission.AvgSubmissionTime += uint(answer.UpdatedAt.Unix())
		}
		formattedSubmission.AvgSubmissionTime = formattedSubmission.AvgSubmissionTime / uint(len(submission.Answers))
		formattedReturn = append(formattedReturn, formattedSubmission)
	}

	// sort formattedReturn by totalScore
	slices.SortFunc(formattedReturn, func(a, b studentSubmission) int {
		return cmp.Or(
			cmp.Compare(b.TotalScore, a.TotalScore),
			cmp.Compare(a.AvgSubmissionTime, b.AvgSubmissionTime),
		)
	})

	c.JSON(http.StatusOK, gin.H{"leaderboard": formattedReturn})
}
