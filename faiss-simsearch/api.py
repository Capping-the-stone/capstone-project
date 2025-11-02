from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import os
import logging
import requests
from index_manager import add_submission, find_similar_submissions

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI()

SUPERLIT_BACKEND_URL = os.getenv("SUPERLIT_BACKEND_URL", "http://superlit-backend-dev:6969/assignment/report_cheater")

class SubmissionPayload(BaseModel):
    userID: str
    questionID: str
    code: str

@app.put("/submission")
def put_submission(payload: SubmissionPayload):
    logger.info(f"PUT /submission - userID: {payload.userID}, questionID: {payload.questionID}")
    logger.info(f"Code length: {len(payload.code)}")
    
    try:
        # First, add/update the submission in our database
        add_submission(payload.userID, payload.questionID, payload.code)
        logger.info("Submission added/updated successfully")

        # Now, find similar submissions, excluding the current user's
        similar = find_similar_submissions(payload.questionID, payload.code, payload.userID)
        
        if similar:
            logger.info(f"Found {len(similar)} similar submissions. Reporting to superlit-backend.")
            
            # Prepare reason with confidence scores
            reasons = [f"{s['userID']} (confidence: {s['distance']:.2f})" for s in similar]
            reason_str = f"Similar code found by FAISS. Matched with user(s): {', '.join(reasons)}"

            # Report cheater to superlit-backend
            report_payload = {
                "questionID": int(payload.questionID),
                "universityID": payload.userID,
                "reason": reason_str,
                "detectionMethod": "FAISS"
            }
            
            try:
                response = requests.post(SUPERLIT_BACKEND_URL, json=report_payload)
                response.raise_for_status()
                logger.info("Successfully reported cheater to superlit-backend.")
            except requests.exceptions.RequestException as e:
                logger.error(f"Failed to report cheater to superlit-backend: {e}")

            return {"status": "ok", "cheater_reported": True, "matches": similar}

        else:
            logger.info("No similar submissions found.")
            return {"status": "ok", "cheater_reported": False}

    except Exception as e:
        logger.error(f"Error processing submission: {e}")
        raise HTTPException(status_code=500, detail=str(e))

