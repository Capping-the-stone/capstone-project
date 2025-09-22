#!/usr/bin/env python3
"""
Simple API for ML Cheating Detection
POST /check-this-guy - Check specific student and question
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import json
import redis
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI()

class CheckStudentPayload(BaseModel):
    srn: str
    questionID: int

class RedisMLChecker:
    def __init__(self):
        """Initialize Redis connection and ML model"""
        self.redis_client = self._connect_redis()
        self.ml_detector = self._load_ml_model()
    
    def _connect_redis(self):
        """Connect to Redis"""
        try:
            redis_host = os.getenv("REDIS_HOST", "redis-dev")
            redis_port = int(os.getenv("REDIS_PORT", "6379"))
            # TODO: this will work in dev more. In prod, you'd have multiple redis hosts in the cluster.
            
            client = redis.Redis(host=redis_host, port=redis_port, decode_responses=True)
            client.ping()
            logger.info(f"Connected to Redis at {redis_host}:{redis_port}")
            return client
        except Exception as e:
            logger.error(f"Redis connection failed: {e}")
            return None
    
    def _load_ml_model(self):
        """Load the latest ML model"""
        try:
            from cheating_detector_with_persistence import CheatingDetector
            detector = CheatingDetector()
            models = detector.list_saved_models()
            if not models:
                raise ValueError("No saved models found")
            
            latest_model = models[-1]
            detector.load_model(latest_model)
            logger.info(f"Loaded ML model: {latest_model}")
            return detector
        except Exception as e:
            logger.error(f"Failed to load ML model: {e}")
            return None
    
    def check_student(self, srn, question_id):
        """Check if a student is cheating for a specific question"""
        try:
            # Create Redis key
            redis_key = f"{srn}|{question_id}"
            
            # Get data from Redis
            if not self.redis_client:
                return {"error": "Redis not connected"}
            
            raw_data = self.redis_client.get(redis_key)
            if not raw_data:
                return {"error": f"No data found for {srn} on question {question_id}"}
            
            # Parse Redis data
            student_data = json.loads(raw_data)
            # TODO: add a fail safe in case JSON parsing fails here
            
            # Convert to DataFrame format for ML model
            import pandas as pd
            features_df = pd.DataFrame([{
                "SRN": srn,
                "total_actions": student_data.get("total_actions", 0),
                "total_time_ms": student_data.get("latest_log_ts", 0),
                "avg_time_per_action_ms": student_data.get("latest_log_ts", 0) / max(student_data.get("total_actions", 1), 1),
                "paste_count": student_data.get("paste_count", 0),
                "deletion_count": student_data.get("deletion_count", 0),
                "compilation_count": student_data.get("compilation_count", 0),
                "submission_count": student_data.get("submission_count", 0)
            }])
            
            # Use ML model to predict
            if not self.ml_detector:
                return {"error": "ML model not loaded"}
            # TODO: This guard clause should be moved before we attempt to get data from redis.
            
            result_df = self.ml_detector.predict(features_df)
            result = result_df.iloc[0]
            
            # Return result
            return {
                "detectionMethod": "ML",
                "srn": srn,
                "questionID": question_id,
                "is_suspected_cheating": bool(result["is_suspected_cheating"]),
                "anomaly_score": int(result["anomaly_score"]),
                "features": {
                    "total_actions": int(student_data.get("total_actions", 0)),
                    "paste_count": int(student_data.get("paste_count", 0)),
                    "deletion_count": int(student_data.get("deletion_count", 0)),
                    "compilation_count": int(student_data.get("compilation_count", 0)),
                    "submission_count": int(student_data.get("submission_count", 0))
                }
            }
            
        except Exception as e:
            logger.error(f"Error checking student {srn}: {e}")
            return {"error": str(e)}

# Initialize the checker
checker = RedisMLChecker()

@app.post("/check-this-guy")
def check_this_guy(payload: CheckStudentPayload):
    """Check if a specific student is cheating on a specific question"""
    logger.info(f"POST /check-this-guy - srn: {payload.srn}, questionID: {payload.questionID}")
    
    try:
        # Check the student
        result = checker.check_student(payload.srn, payload.questionID)

        # TODO: this is a bad pattern. Make check_student() return a tuple of 2 values. The actual result and an 'error'. 
        # if error is not null, then we have a problem. Golang is known for this pattern 
        if "error" in result:
            logger.error(f"Error checking student: {result['error']}")
            raise HTTPException(status_code=404, detail=result["error"])
        
        # Print the result as requested
        print({
            "detectionMethod": "ML",
            "srn": payload.srn,
            "questionID": payload.questionID,
        })
        
        logger.info(f"Student {payload.srn} checked successfully")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"API error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
def health():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "redis_connected": checker.redis_client is not None,
        "ml_model_loaded": checker.ml_detector is not None
    }
