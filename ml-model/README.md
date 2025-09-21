# ML Cheating Detection API

FastAPI service for detecting cheating students using Redis data and ML models.

## API Endpoints

### POST /check-this-guy
Check if a specific student is cheating on a specific question.

**Request Body:**
```json
{
    "srn": "PES2UG24CS001",
    "questionID": 1
}
```

**Response:**
```json
{
    "detectionMethod": "ML",
    "srn": "PES2UG24CS001",
    "questionID": 1,
    "is_suspected_cheating": false,
    "anomaly_score": 1,
    "features": {
        "total_actions": 800,
        "paste_count": 5,
        "deletion_count": 20,
        "compilation_count": 10,
        "submission_count": 3
    }
}
```

### GET /health
Health check endpoint.

## Usage

### 1. Start the API server
```bash
uvicorn api:app --host 0.0.0.0 --port 8001
```

### 2. Test the API
```bash
python test_api.py
```

### 3. Make API calls
```bash
curl -X POST "http://localhost:8001/check-this-guy" \
     -H "Content-Type: application/json" \
     -d '{"srn": "PES2UG24CS001", "questionID": 1}'
```

## How it works

1. Receives SRN and questionID
2. Creates Redis key: `{srn}|{questionID}`
3. Gets student data from Redis
4. Uses saved ML model to predict cheating
5. Prints and returns the result

## Requirements

- Redis running with student data
- Trained ML model in `models/` directory
- Python dependencies from `requirements.txt`
