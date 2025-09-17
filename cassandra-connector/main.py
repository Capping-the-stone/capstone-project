#!/usr/bin/env python3
"""
Kafka to Cassandra Consumer
Consumes from capstonelogi topic and writes to Cassandra logs_by_student_question table
"""

import json
import logging
import os
import sys
import time
from datetime import datetime
from typing import List, Dict, Any
from threading import Thread

from kafka import KafkaConsumer
from cassandra.cluster import Cluster
from cassandra.auth import PlainTextAuthProvider
from cassandra.policies import DCAwareRoundRobinPolicy
from cassandra import ConsistencyLevel
from flask import Flask, jsonify

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configuration from environment variables
KAFKA_BROKERS = os.getenv('KAFKA_BROKERS', 'kafka-1-dev:9092').split(',')
KAFKA_TOPIC = os.getenv('KAFKA_TOPIC', 'capstonelogi')
KAFKA_GROUP_ID = os.getenv('KAFKA_GROUP_ID', 'cassandra-logs-consumer')
CASSANDRA_HOSTS = os.getenv('CASSANDRA_HOSTS', 'cassandra-dev').split(',')
CASSANDRA_KEYSPACE = os.getenv('CASSANDRA_KEYSPACE', 'capstone')
CASSANDRA_PORT = int(os.getenv('CASSANDRA_PORT', '9042'))
BATCH_SIZE = int(os.getenv('BATCH_SIZE', '100'))
HEALTH_PORT = int(os.getenv('HEALTH_PORT', '8080'))

class CassandraConnector:
    def __init__(self):
        self.cluster = None
        self.session = None
        self.prepared_stmt = None
        self.connect()
    
    def connect(self):
        """Connect to Cassandra cluster"""
        max_retries = 10
        retry_delay = 5
        
        for attempt in range(max_retries):
            try:
                logger.info(f"Connecting to Cassandra cluster: {CASSANDRA_HOSTS}")
                
                self.cluster = Cluster(
                    CASSANDRA_HOSTS,
                    port=CASSANDRA_PORT,
                    load_balancing_policy=DCAwareRoundRobinPolicy(local_dc='datacenter1'),
                    protocol_version=4
                )
                
                self.session = self.cluster.connect()
                self.session.set_keyspace(CASSANDRA_KEYSPACE)
                
                # Prepare the insert statement
                insert_cql = """
                INSERT INTO logs_by_student_question 
                (srn, question_id, ts_ms, event_id, type, content, code, offset, num_characters, is_paste)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """
                self.prepared_stmt = self.session.prepare(insert_cql)
                self.prepared_stmt.consistency_level = ConsistencyLevel.ONE
                
                logger.info("Successfully connected to Cassandra")
                return
                
            except Exception as e:
                logger.error(f"Failed to connect to Cassandra (attempt {attempt + 1}/{max_retries}): {e}")
                if attempt < max_retries - 1:
                    time.sleep(retry_delay)
                else:
                    logger.error("Max retries reached. Exiting.")
                    sys.exit(1)
    
    def write_batch(self, records: List[Dict[str, Any]]) -> int:
        """Write a batch of records to Cassandra"""
        if not records:
            return 0
            
        success_count = 0
        
        for record in records:
            try:
                # Extract fields from the record
                srn = record.get('srn')
                question_id = record.get('questionID')  # Note: frontend uses questionID
                ts_ms = record.get('ts')
                event_id = record.get('eventID')  # Note: frontend uses eventID
                record_type = record.get('type', '')
                content = record.get('content', '')
                code = record.get('code', '')
                offset = record.get('offset', 0)
                num_characters = record.get('numCharacters', 0)
                is_paste = record.get('isPaste', False)
                
                # Validate required fields
                if not all([srn, question_id is not None, ts_ms, event_id]):
                    logger.error(f"Missing required fields in record: {record}")
                    continue
                
                # Execute the prepared statement
                self.session.execute(
                    self.prepared_stmt,
                    (srn, question_id, ts_ms, event_id, record_type, content, code, offset, num_characters, is_paste)
                )
                success_count += 1
                
            except Exception as e:
                logger.error(f"Failed to write record to Cassandra: {record}. Error: {e}")
                # Continue processing other records
                continue
        
        return success_count
    
    def close(self):
        """Close Cassandra connection"""
        if self.session:
            self.session.shutdown()
        if self.cluster:
            self.cluster.shutdown()

class KafkaCassandraConsumer:
    def __init__(self):
        self.consumer = None
        self.cassandra = CassandraConnector()
        self.running = False
        self.last_processed = datetime.now()
        self.total_processed = 0
        self.total_errors = 0
        
    def create_consumer(self):
        """Create Kafka consumer with retry logic"""
        max_retries = 10
        retry_delay = 5
        
        for attempt in range(max_retries):
            try:
                logger.info(f"Creating Kafka consumer for topic: {KAFKA_TOPIC}")
                
                self.consumer = KafkaConsumer(
                    KAFKA_TOPIC,
                    bootstrap_servers=KAFKA_BROKERS,
                    group_id=KAFKA_GROUP_ID,
                    value_deserializer=lambda m: json.loads(m.decode('utf-8')),
                    key_deserializer=lambda m: json.loads(m.decode('utf-8')) if m else None,
                    auto_offset_reset='latest',  # Start from latest to avoid old test data
                    enable_auto_commit=True,
                    auto_commit_interval_ms=5000,
                    max_poll_records=BATCH_SIZE,
                    session_timeout_ms=30000,
                    heartbeat_interval_ms=10000
                )
                
                logger.info("Successfully created Kafka consumer")
                return
                
            except Exception as e:
                logger.error(f"Failed to create Kafka consumer (attempt {attempt + 1}/{max_retries}): {e}")
                if attempt < max_retries - 1:
                    time.sleep(retry_delay)
                else:
                    logger.error("Max retries reached. Exiting.")
                    sys.exit(1)
    
    def start_consuming(self):
        """Start consuming messages from Kafka"""
        self.create_consumer()
        self.running = True
        
        logger.info("Starting to consume messages...")
        
        try:
            while self.running:
                try:
                    # Poll for messages
                    message_batch = self.consumer.poll(timeout_ms=1000)
                    
                    if not message_batch:
                        continue
                    
                    # Collect all records from all partitions
                    records = []
                    for topic_partition, messages in message_batch.items():
                        for message in messages:
                            try:
                                record = message.value
                                if record:
                                    records.append(record)
                            except Exception as e:
                                logger.error(f"Failed to deserialize message: {e}")
                                self.total_errors += 1
                    
                    if records:
                        # Write batch to Cassandra
                        success_count = self.cassandra.write_batch(records)
                        self.total_processed += success_count
                        self.total_errors += len(records) - success_count
                        self.last_processed = datetime.now()
                        
                        logger.info(f"Processed batch: {success_count}/{len(records)} records successful")
                
                except Exception as e:
                    logger.error(f"Error in consumer loop: {e}")
                    time.sleep(5)  # Brief pause before retrying
                    
        except KeyboardInterrupt:
            logger.info("Received interrupt signal")
        finally:
            self.stop()
    
    def stop(self):
        """Stop the consumer"""
        self.running = False
        if self.consumer:
            self.consumer.close()
        if self.cassandra:
            self.cassandra.close()
        logger.info("Consumer stopped")
    
    def get_health_status(self):
        """Get health status for health endpoint"""
        return {
            'status': 'healthy' if self.running else 'stopped',
            'last_processed': self.last_processed.isoformat(),
            'total_processed': self.total_processed,
            'total_errors': self.total_errors,
            'kafka_topic': KAFKA_TOPIC,
            'cassandra_keyspace': CASSANDRA_KEYSPACE
        }

# Global consumer instance
consumer_instance = None

# Health check Flask app
app = Flask(__name__)

@app.route('/health')
def health_check():
    """Health check endpoint"""
    if consumer_instance:
        return jsonify(consumer_instance.get_health_status())
    else:
        return jsonify({'status': 'not_started'}), 503

@app.route('/metrics')
def metrics():
    """Metrics endpoint"""
    if consumer_instance:
        status = consumer_instance.get_health_status()
        return jsonify({
            'processed_total': status['total_processed'],
            'errors_total': status['total_errors'],
            'last_processed_timestamp': status['last_processed']
        })
    else:
        return jsonify({'error': 'consumer not started'}), 503

def run_health_server():
    """Run health check server in background"""
    app.run(host='0.0.0.0', port=HEALTH_PORT, debug=False, use_reloader=False)

def main():
    """Main function"""
    global consumer_instance
    
    logger.info("Starting Kafka to Cassandra Consumer")
    logger.info(f"Config: Kafka={KAFKA_BROKERS}, Topic={KAFKA_TOPIC}, Cassandra={CASSANDRA_HOSTS}")
    
    # Create consumer instance
    consumer_instance = KafkaCassandraConsumer()
    
    # Start health server in background thread
    health_thread = Thread(target=run_health_server, daemon=True)
    health_thread.start()
    logger.info(f"Health server started on port {HEALTH_PORT}")
    
    # Start consuming (this blocks)
    try:
        consumer_instance.start_consuming()
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
