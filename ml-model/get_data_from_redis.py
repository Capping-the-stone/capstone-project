import os
import json
import pandas as pd
import redis
from typing import Dict, List, Any
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class RedisDataRetriever:
    def __init__(self, redis_host: str = None, redis_port: int = None, use_cluster: bool = False):
        """
        Initialize Redis connection for containerized environment
        
        Args:
            redis_host: Redis host (defaults to environment variable or redis-dev for container)
            redis_port: Redis port (defaults to environment variable or 6379)
            use_cluster: Whether to use Redis cluster mode
        """
        self.redis_host = redis_host or os.getenv("REDIS_HOST", "redis-dev")
        self.redis_port = redis_port or int(os.getenv("REDIS_PORT", "6379"))
        self.use_cluster = use_cluster
        
        # Initialize Redis client
        self.client = self._connect_to_redis()
    
    def _connect_to_redis(self):
        """Connect to Redis (single instance or cluster)"""
        try:
            if self.use_cluster:
                # For cluster mode (production)
                cluster_nodes = os.getenv("REDIS_CLUSTER_NODES", "").strip()
                if cluster_nodes:
                    startup_nodes = []
                    for node in cluster_nodes.split():
                        host, _, port = node.partition(":")
                        startup_nodes.append({"host": host, "port": int(port or 6379)})
                    client = redis.cluster.RedisCluster(
                        startup_nodes=startup_nodes, 
                        decode_responses=True
                    )
                else:
                    raise ValueError("REDIS_CLUSTER_NODES environment variable not set for cluster mode")
            else:
                # For single instance (development)
                client = redis.Redis(
                    host=self.redis_host, 
                    port=self.redis_port, 
                    decode_responses=True
                )
            
            # Test connection
            client.ping()
            logger.info(f"Successfully connected to Redis at {self.redis_host}:{self.redis_port}")
            return client
            
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            raise
    
    def get_all_keys(self, pattern: str = "*") -> List[str]:
        """Get all keys matching the pattern"""
        try:
            if self.use_cluster:
                keys = []
                for node in self.client.get_nodes():
                    keys.extend(node.keys(pattern))
                return list(set(keys))  # Remove duplicates
            else:
                return self.client.keys(pattern)
        except Exception as e:
            logger.error(f"Failed to get keys: {e}")
            return []
    
    def get_student_data(self, srn: str) -> Dict[str, Any]:
        """Get all data for a specific student (all question IDs)"""
        pattern = f"{srn}|*"
        keys = self.get_all_keys(pattern)
        
        student_data = {}
        for key in keys:
            try:
                raw_data = self.client.get(key)
                if raw_data:
                    data = json.loads(raw_data)
                    # Extract question ID from key
                    question_id = key.split("|")[1] if "|" in key else "unknown"
                    student_data[question_id] = data
            except Exception as e:
                logger.warning(f"Failed to parse data for key {key}: {e}")
                continue
        
        return student_data
    
    def get_all_students_data(self) -> pd.DataFrame:
        """Get aggregated data for all students across all questions"""
        # Get all keys that match the pattern {srn}|{questionID}
        pattern = "*|*"
        keys = self.get_all_keys(pattern)
        
        all_features = []
        processed_srns = set()
        
        for key in keys:
            try:
                srn, question_id = key.split("|", 1)
                
                # Skip if we've already processed this SRN
                if srn in processed_srns:
                    continue
                
                # Get all data for this student
                student_data = self.get_student_data(srn)
                
                if not student_data:
                    continue
                
                # Aggregate features across all questions for this student
                aggregated_features = self._aggregate_student_features(srn, student_data)
                all_features.append(aggregated_features)
                processed_srns.add(srn)
                
            except Exception as e:
                logger.warning(f"Failed to process key {key}: {e}")
                continue
        
        logger.info(f"Retrieved data for {len(all_features)} students from Redis")
        return pd.DataFrame(all_features)
    
    def _aggregate_student_features(self, srn: str, student_data: Dict[str, Any]) -> Dict[str, Any]:
        """Aggregate features across all questions for a single student"""
        total_actions = 0
        total_paste_count = 0
        total_deletion_count = 0
        total_compilation_count = 0
        total_submission_count = 0
        latest_timestamp = 0
        question_count = len(student_data)
        
        for question_id, data in student_data.items():
            total_actions += data.get("total_actions", 0)
            total_paste_count += data.get("paste_count", 0)
            total_deletion_count += data.get("deletion_count", 0)
            total_compilation_count += data.get("compilation_count", 0)
            total_submission_count += data.get("submission_count", 0)
            
            # Track the latest timestamp across all questions
            question_latest_ts = data.get("latest_log_ts", 0)
            if question_latest_ts > latest_timestamp:
                latest_timestamp = question_latest_ts
        
        # Calculate derived features
        total_time_ms = latest_timestamp if latest_timestamp > 0 else 0
        avg_time_per_action_ms = total_time_ms / total_actions if total_actions > 0 else 0

        # Fetch RJI score from Redis
        rji_score =0.9
        try:
            rji_value = self.client.get(f"rji:{srn}")
            if rji_value is not None:
                rji_score = float(rji_value)
            else:
                logger.warning(f"RJI score not found for SRN: {srn}. Defaulting to 0.")
        except Exception as e:
            logger.error(f"Error fetching RJI for SRN {srn}: {e}")
        
        return {
            "SRN": srn,
            "total_actions": total_actions,
            "total_time_ms": total_time_ms,
            "avg_time_per_action_ms": avg_time_per_action_ms,
            "paste_count": total_paste_count,
            "deletion_count": total_deletion_count,
            "compilation_count": total_compilation_count,
            "submission_count": total_submission_count,
            "question_count": question_count,
            "rji": rji_score
        }
    
    def get_features_dataframe(self) -> pd.DataFrame:
        """Get features data in the same format as the original CSV"""
        return self.get_all_students_data()
    
    def get_student_features(self, srn: str) -> Dict[str, Any]:
        """Get aggregated features for a specific student"""
        student_data = self.get_student_data(srn)
        if not student_data:
            return None
        return self._aggregate_student_features(srn, student_data)
    
    def close(self):
        """Close Redis connection"""
        if hasattr(self, 'client'):
            try:
                self.client.close()
                logger.info("Redis connection closed")
            except Exception as e:
                logger.warning(f"Error closing Redis connection: {e}")

def main():
    """Main function to test Redis data retrieval in containerized environment"""
    # Determine if we should use cluster mode based on environment
    use_cluster = bool(os.getenv("REDIS_CLUSTER_NODES", "").strip())
    
    logger.info(f"Connecting to Redis (cluster mode: {use_cluster})")
    
    try:
        # Initialize Redis data retriever
        retriever = RedisDataRetriever(use_cluster=use_cluster)
        
        # Test connection first
        retriever.client.ping()
        logger.info("Successfully connected to Redis")
        
        # Get all students data
        features_df = retriever.get_features_dataframe()
        
        if features_df.empty:
            logger.warning("No data found in Redis")
            print("No student data found in Redis. Make sure PySpark stream processor is running and has processed some data.")
            return
        
        # Display basic info
        print(f"Retrieved data for {len(features_df)} students from Redis")
        print("\nFirst 5 rows:")
        print(features_df.head())
        print(f"\nColumns: {list(features_df.columns)}")
        
        # Display some statistics
        print(f"\nStatistics:")
        print(f"Total students: {len(features_df)}")
        print(f"Average actions per student: {features_df['total_actions'].mean():.2f}")
        print(f"Average time per student: {features_df['total_time_ms'].mean():.2f} ms")
        print(f"Students with paste operations: {(features_df['paste_count'] > 0).sum()}")
        print(f"Students with deletions: {(features_df['deletion_count'] > 0).sum()}")
        
    except redis.ConnectionError as e:
        logger.error(f"Failed to connect to Redis: {e}")
        print(f"Redis connection failed. Make sure Redis is running and accessible at {os.getenv('REDIS_HOST', 'redis-dev')}:{os.getenv('REDIS_PORT', '6379')}")
    except Exception as e:
        logger.error(f"Error retrieving data from Redis: {e}")
        print(f"Error: {e}")
    finally:
        if 'retriever' in locals():
            retriever.close()

def get_features_from_redis(redis_host: str = None, redis_port: int = None, use_cluster: bool = None) -> pd.DataFrame:
    """
    Convenience function to get features from Redis
    
    Args:
        redis_host: Redis host (optional)
        redis_port: Redis port (optional)
        use_cluster: Whether to use cluster mode (optional, auto-detected if not provided)
    
    Returns:
        DataFrame with student features
    """
    if use_cluster is None:
        use_cluster = bool(os.getenv("REDIS_CLUSTER_NODES", "").strip())
    
    retriever = RedisDataRetriever(redis_host, redis_port, use_cluster)
    try:
        return retriever.get_features_dataframe()
    finally:
        retriever.close()

if __name__ == "__main__":
    main()
