import numpy as np
import logging
from faiss_index import build_faiss_index
from embedding import get_embedding
from function_extraction import extract_functions
from preprocessing import preprocess
from submission_store import store_submission, get_all_embeddings_for_question
from config import SIMILARITY_THRESHOLD, TOP_K

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

index_cache = {}

def add_submission(user_id, question_id, code):
    logger.info(f"Adding submission - userID: {user_id}, questionID: {question_id}")
    logger.info(f"Original code: {code}")
    
    processed = preprocess(code)
    logger.info(f"Preprocessed code: {processed}")
    
    functions = extract_functions(processed)
    logger.info(f"Extracted {len(functions)} functions")

    for i, fn in enumerate(functions):
        logger.info(f"Processing function {i+1}: {fn['name']}")
        if len(fn['code'].splitlines()) < 2:
            logger.info(f"Skipping function {fn['name']} - too short ({len(fn['code'].splitlines())} lines)")
            continue
        
        logger.info(f"Getting embedding for function: {fn['code']}")
        embedding = get_embedding(fn['code'])
        logger.info(f"Embedding shape: {embedding.shape}, norm: {np.linalg.norm(embedding)}")
        
        if not np.all(np.isfinite(embedding)) or np.linalg.norm(embedding) == 0:
            logger.warning(f"Invalid embedding for function {fn['name']} - skipping")
            continue
        
        logger.info(f"Storing submission for function {fn['name']}")
        store_submission(question_id, user_id, embedding, fn['code'])

    if question_id in index_cache:
        logger.info(f"Clearing index cache for question {question_id}")
        del index_cache[question_id]

def find_similar_submissions(question_id, code, user_id):
    logger.info(f"Finding similar submissions - questionID: {question_id} for userID: {user_id}")
    logger.info(f"Query code: {code}")
    
    processed = preprocess(code)
    logger.info(f"Preprocessed query code: {processed}")
    
    functions = extract_functions(processed)
    logger.info(f"Extracted {len(functions)} functions from query")

    query_embeddings = []
    for i, fn in enumerate(functions):
        logger.info(f"Processing query function {i+1}: {fn['name']}")
        if len(fn['code'].splitlines()) < 2:
            logger.info(f"Skipping query function {fn['name']} - too short")
            continue
        
        logger.info(f"Getting embedding for query function: {fn['code']}")
        embedding = get_embedding(fn['code'])
        logger.info(f"Query embedding shape: {embedding.shape}, norm: {np.linalg.norm(embedding)}")
        
        if np.all(np.isfinite(embedding)) and np.linalg.norm(embedding) > 0:
            query_embeddings.append(embedding)
            logger.info(f"Added query embedding {i+1} to search list")
        else:
            logger.warning(f"Invalid query embedding for function {fn['name']}")

    if not query_embeddings:
        logger.warning("No valid query embeddings found")
        return []

    logger.info(f"Query embeddings count: {len(query_embeddings)}")
    
    all_stored = get_all_embeddings_for_question(question_id)
    # Exclude submissions from the current user
    stored = [s for s in all_stored if s['userID'] != user_id]
    logger.info(f"Found {len(stored)} stored submissions for question {question_id} (excluding current user)")
    
    if not stored:
        logger.warning("No stored submissions to compare against.")
        return []

    all_embeddings = np.array([s["embedding"] for s in stored]).astype('float32')
    logger.info(f"Stored embeddings shape: {all_embeddings.shape}")

    # Invalidate cache if the number of stored items has changed.
    if question_id in index_cache and len(index_cache[question_id][1]) != len(stored):
        logger.info(f"Cache invalidation for question {question_id} due to submission count change.")
        del index_cache[question_id]

    if question_id not in index_cache:
        logger.info(f"Building new FAISS index for question {question_id}")
        index, _ = build_faiss_index(all_embeddings)
        index_cache[question_id] = (index, stored)
    else:
        logger.info(f"Using cached FAISS index for question {question_id}")

    index, stored_data = index_cache[question_id]
    query = np.array(query_embeddings).astype('float32')
    logger.info(f"Query array shape: {query.shape}")
    
    logger.info(f"Searching with TOP_K={TOP_K}")
    D, I = index.search(query, k=TOP_K)
    logger.info(f"Search results - distances: {D}, indices: {I}")

    similar_submissions = []
    for i, (distances, indices) in enumerate(zip(D, I)):
        logger.info(f"Processing query function {i+1} results:")
        for j, (dist, idx) in enumerate(zip(distances, indices)):
            logger.info(f"  Result {j+1}: distance={dist:.4f}, index={idx}")
            if idx < 0: # FAISS can return -1 for no valid neighbors
                continue
            if dist >= SIMILARITY_THRESHOLD:
                logger.info(f"  Match found! Distance {dist:.4f} >= threshold {SIMILARITY_THRESHOLD}")
                match = stored_data[idx]
                similar_submissions.append({
                    "userID": match["userID"],
                    "code": match["code"],
                    "distance": float(dist)
                })
                logger.info(f"  Added match: userID={match['userID']}")
            else:
                logger.info(f"  No match: distance {dist:.4f} < threshold {SIMILARITY_THRESHOLD}")

    logger.info(f"Final result: {len(similar_submissions)} similar submissions found")
    return similar_submissions

