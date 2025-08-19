package capstoneLogi

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/twmb/franz-go/pkg/kgo"
)

type LogFormat struct {
	UserID               string `json:"userID"`
	CurrentQuestionIndex int    `json:"currentQuestionIndex"`
	EditorContentBefore  string `json:"editorContentBefore"`
	EditorContentAfter   string `json:"editorContentAfter"`
	Timestamp            string `json:"timestamp"`
	IsPaste              bool   `json:"isPaste"`
	IsDeletion           bool   `json:"isDeletion"`
	IsCompilation        bool   `json:"isCompilation"`
	IsSubmission         bool   `json:"isSubmission"`
}

type LogiRequest struct {
	Logs []LogFormat `json:"logs" binding:"required"`
}

var kafkaClient *kgo.Client
var kafkaCtx context.Context

func InitProducer() error {
	brokersEnv := os.Getenv("KAFKA_BROKERS")
	var seeds []string
	if brokersEnv == "" {
		seeds = []string{"kafka-pubsub:9092"}
	} else {
		seeds = strings.Split(brokersEnv, ",")
	}
	var err error
	kafkaClient, err = kgo.NewClient(
		kgo.SeedBrokers(seeds...),
		kgo.AllowAutoTopicCreation(),
		kgo.WithLogger(kgo.BasicLogger(os.Stdout, kgo.LogLevelDebug, nil)),
	)
	if err != nil {
		return err
	}

	kafkaCtx = context.Background()
	go func() {
		record := &kgo.Record{Topic: "capstone-logi", Value: []byte("hello")}
		err := kafkaClient.ProduceSync(kafkaCtx, record).FirstErr()
		if err != nil {
			log.Println("Kafka test produce failed:", err)
		} else {
			log.Println("Kafka test produce succeeded")
		}
	}()
	return nil
}

func HandleLogi(c *gin.Context) {
	var request LogiRequest
	err := c.BindJSON(&request)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "yeverything galat",
		})
		return
	}

	filename := request.Logs[0].UserID // assuming this batch of logs comes from a single user

	f, err := os.OpenFile("./capstone-logi-logs/"+filename, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		log.Println(err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "error opening file",
		})
		return
	}
	defer f.Close()

	for _, logLine := range request.Logs {
		text :=
			logLine.UserID +
				"," +
				fmt.Sprint(logLine.CurrentQuestionIndex) +
				"," +
				strconv.Quote(logLine.EditorContentBefore) +
				"," +
				strconv.Quote(logLine.EditorContentAfter) +
				"," +
				logLine.Timestamp +
				"," +
				fmt.Sprint(logLine.IsPaste) +
				"," +
				fmt.Sprint(logLine.IsDeletion) +
				"," +
				fmt.Sprint(logLine.IsCompilation) +
				"," +
				fmt.Sprint(logLine.IsSubmission) + "\n"

		_, err := f.WriteString(text)
		if err != nil {
			log.Println(err)
		}

		// forward to kafka too, apart from just writing to file
		record := &kgo.Record{Topic: "capstone-logi", Value: []byte(text)}
		// kafkaClient.Produce(kafkaCtx, record, func(_ *kgo.Record, err error) {
		// 	log.Println("Kafka publishing done")
		// 	if err != nil {
		// 		fmt.Printf("Kafka publishing screwed up")
		// 		fmt.Printf("record had a produce error: %v\n", err)
		// 	}
		// })
		fmt.Println("Going to start kafka publishing")
		if err := kafkaClient.ProduceSync(kafkaCtx, record).FirstErr(); err != nil {
			fmt.Printf("record had a produce error while synchronously producing: %v\n", err)
		}

	}

}
