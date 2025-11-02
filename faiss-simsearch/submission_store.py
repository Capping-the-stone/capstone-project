import os
import pickle
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

SAVE_DIR = "./saved_data"
SAVE_PATH = os.path.join(SAVE_DIR, "submissions.pkl")

if os.path.exists(SAVE_PATH):
    logger.info(f"Loading existing submission database from {SAVE_PATH}")
    with open(SAVE_PATH, "rb") as f:
        submission_db = pickle.load(f)
    logger.info(f"Loaded {len(submission_db)} questions with submissions")
else:
    logger.info("No existing submission database found, starting fresh")
    submission_db = {}

def persist():
    logger.info(f"Persisting submission database to {SAVE_PATH}")
    os.makedirs(SAVE_DIR, exist_ok=True)
    with open(SAVE_PATH, "wb") as f:
        pickle.dump(submission_db, f)
    logger.info("Database persisted successfully")

def store_submission(question_id, user_id, embedding, code):
    logger.info(f"Storing submission - questionID: {question_id}, userID: {user_id}")
    
    if question_id not in submission_db:
        logger.info(f"Creating new question entry for {question_id}")
        submission_db[question_id] = []
    
    # Remove any existing submission from the same user for the same question
    submission_db[question_id] = [s for s in submission_db[question_id] if s['userID'] != user_id]
    
    submission_db[question_id].append({
        "userID": user_id,
        "embedding": embedding,
        "code": code
    })
    
    logger.info(f"Question {question_id} now has {len(submission_db[question_id])} submissions")
    persist()

def get_all_embeddings_for_question(question_id):
    logger.info(f"Retrieving all embeddings for question {question_id}")
    submissions = submission_db.get(question_id, [])
    logger.info(f"Found {len(submissions)} submissions for question {question_id}")
    
    for i, sub in enumerate(submissions):
        logger.info(f"  Submission {i+1}: userID={sub['userID']}, embedding_shape={sub['embedding'].shape}")
    
    return submissions

