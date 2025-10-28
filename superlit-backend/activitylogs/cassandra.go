package activitylogs

import (
	"log"
	"os"
	"strings"

	"github.com/gocql/gocql"
)

var CqlSession *gocql.Session

type LogEntry struct {
	Srn           string `json:"srn"`
	QuestionID    int    `json:"question_id"`
	TsMs          int64  `json:"ts_ms"`
	EventID       string `json:"event_id"`
	Type          string `json:"type"`
	Content       string `json:"content"`
	Code          string `json:"code"`
	Offset        int    `json:"offset"`
	NumCharacters int    `json:"num_characters"`
	IsPaste       bool   `json:"is_paste"`
}

func Init() {
	cluster := gocql.NewCluster(strings.Split(os.Getenv("CASSANDRA_HOSTS"), ",")...)
	cluster.Keyspace = "capstone"
	cluster.Consistency = gocql.Quorum

	var err error
	CqlSession, err = cluster.CreateSession()
	if err != nil {
		log.Fatalf("Failed to connect to Cassandra: %v", err)
	}
	log.Println("Connected to Cassandra")
}
