package capstoneLogi

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
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
	// New unified event format from frontend (see capstoneLogi.ts)
	Type       string `json:"type"`       // checkpoint | insert | delete | run | submission
	SRN        string `json:"srn"`        // globally unique student ID
	QuestionID int    `json:"questionID"` // global question ID
	Ts         int64  `json:"ts"`         // epoch ms
	// Optional fields depending on type
	Content       string `json:"content,omitempty"`
	Code          string `json:"code,omitempty"` // present for run and submission
	Offset        int    `json:"offset,omitempty"`
	NumCharacters int    `json:"numCharacters,omitempty"`
	IsPaste       bool   `json:"isPaste,omitempty"`
	// Fields specific to update-rji synthetic events
	RJI       float64 `json:"rji,omitempty"`
	Mu        float64 `json:"mu,omitempty"`
	RMSSD     float64 `json:"rmssd,omitempty"`
	BinSizeMs int     `json:"binSizeMs,omitempty"`
	StartTs   int64   `json:"startTs,omitempty"`
	EndTs     int64   `json:"endTs,omitempty"`
	Bins      int     `json:"bins,omitempty"`
	// Server-added deterministic identifier for idempotency in downstream sinks (e.g., Cassandra)
	EventID string `json:"eventID,omitempty"`
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

	filename := request.Logs[0].SRN // assuming this batch of logs comes from a single user

	f, err := os.OpenFile("./capstone-logi-logs/"+filename, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		log.Println(err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "error opening file",
		})
		return
	}
	defer f.Close()

	for _, ev := range request.Logs {
		// compute deterministic eventID over stable fields
		h := sha256.New()
		// include all fields that define logical equality of an event
		h.Write([]byte(ev.SRN))
		h.Write([]byte{"|"[0]})
		h.Write([]byte(strconv.Itoa(ev.QuestionID)))
		h.Write([]byte{"|"[0]})
		h.Write([]byte(strconv.FormatInt(ev.Ts, 10)))
		h.Write([]byte{"|"[0]})
		h.Write([]byte(ev.Type))
		h.Write([]byte{"|"[0]})
		h.Write([]byte(strconv.Itoa(ev.Offset)))
		h.Write([]byte{"|"[0]})
		h.Write([]byte(strconv.Itoa(ev.NumCharacters)))
		h.Write([]byte{"|"[0]})
		if ev.IsPaste {
			h.Write([]byte("1"))
		} else {
			h.Write([]byte("0"))
		}
		h.Write([]byte{"|"[0]})
		h.Write([]byte(ev.Content))
		h.Write([]byte{"|"[0]})
		h.Write([]byte(ev.Code))
		// Include update-rji fields in the deterministic hash as well (zeros for non-RJI types)
		h.Write([]byte{'|'})
		h.Write([]byte(strconv.FormatFloat(ev.RJI, 'g', -1, 64)))
		h.Write([]byte{'|'})
		h.Write([]byte(strconv.FormatFloat(ev.Mu, 'g', -1, 64)))
		h.Write([]byte{'|'})
		h.Write([]byte(strconv.FormatFloat(ev.RMSSD, 'g', -1, 64)))
		h.Write([]byte{'|'})
		h.Write([]byte(strconv.Itoa(ev.BinSizeMs)))
		h.Write([]byte{'|'})
		h.Write([]byte(strconv.FormatInt(ev.StartTs, 10)))
		h.Write([]byte{'|'})
		h.Write([]byte(strconv.FormatInt(ev.EndTs, 10)))
		h.Write([]byte{'|'})
		h.Write([]byte(strconv.Itoa(ev.Bins)))
		ev.EventID = hex.EncodeToString(h.Sum(nil))

		// CSV columns: srn,questionID,type,ts,offset,numCharacters,isPaste,content,code
		tsStr := strconv.FormatInt(ev.Ts, 10)
		offsetStr := fmt.Sprint(ev.Offset)
		numCharsStr := fmt.Sprint(ev.NumCharacters)
		isPasteStr := fmt.Sprint(ev.IsPaste)
		contentQuoted := strconv.Quote(ev.Content)
		codeQuoted := strconv.Quote(ev.Code)

		line := fmt.Sprintf("%s,%d,%s,%s,%s,%s,%s,%s,%s\n",
			ev.SRN,
			ev.QuestionID,
			ev.Type,
			tsStr,
			offsetStr,
			numCharsStr,
			isPasteStr,
			contentQuoted,
			codeQuoted,
		)

		_, err := f.WriteString(line)
		if err != nil {
			log.Println(err)
		}

		// forward to kafka too, apart from just writing to file
		payload, jerr := json.Marshal(ev)
		if jerr != nil {
			log.Println("json marshal error:", jerr)
			continue
		}
		keyStruct := struct {
			SRN        string `json:"srn"`
			QuestionID int    `json:"questionID"`
		}{
			SRN:        ev.SRN,
			QuestionID: ev.QuestionID,
		}
		keyJSON, _ := json.Marshal(keyStruct)
		key := keyJSON
		record := &kgo.Record{Topic: "capstonelogi", Key: key, Value: payload}
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
