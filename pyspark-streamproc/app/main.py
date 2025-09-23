import os
import json
import logging
from pyspark.sql import SparkSession
from pyspark.sql.functions import col, from_json
from pyspark.sql.types import (
    StructType,
    StructField,
    StringType,
    IntegerType,
    LongType,
    BooleanType,
)


def main() -> None:
    bootstrap = os.getenv("KAFKA_BOOTSTRAP", "kafka-1-dev:9092")
    topic = os.getenv("KAFKA_TOPIC", "capstonelogi")
    logging.basicConfig(level=os.getenv("PY_LOG_LEVEL", "INFO"))
    demo_logger = logging.getLogger("capstonelogi_stream")
    demo_logger.info("Starting capstonelogi_stream app")
    demo_logger.info("Kafka bootstrap: %s", bootstrap)
    demo_logger.info("Kafka topic: %s", topic)

    spark = (
        SparkSession.builder
        .appName("capstonelogi_stream")
        .config("spark.sql.shuffle.partitions", "2")
        .getOrCreate()
    )

    # Reduce Spark log verbosity
    try:
        spark.sparkContext.setLogLevel("WARN")
        demo_logger.info("Spark session created; log level set to WARN")
    except Exception:
        pass

    # Read raw Kafka records
    raw = (
        spark.readStream
        .format("kafka")
        .option("kafka.bootstrap.servers", bootstrap)
        .option("subscribe", topic)
        .option("startingOffsets", "latest")
        .option("failOnDataLoss", "false")
        .load()
    )
    demo_logger.info("Kafka source ready; streaming from topic '%s'", topic)

    # JSON schema matching handleLogi.go and capstoneLogi.ts (eventID is optional)
    event_schema = StructType([
        StructField("type", StringType(), True),
        StructField("srn", StringType(), True),
        StructField("questionID", IntegerType(), True),
        StructField("ts", LongType(), True),
        StructField("content", StringType(), True),
        StructField("code", StringType(), True),
        StructField("offset", IntegerType(), True),
        StructField("numCharacters", IntegerType(), True),
        StructField("isPaste", BooleanType(), True),
        StructField("eventID", StringType(), True),
    ])

    # Parse JSON payload into typed columns and include basic metadata
    events = (
        raw.select(
            from_json(col("value").cast("string"), event_schema).alias("event"),
            col("topic"),
            col("partition"),
            col("offset"),
            col("timestamp"),
        )
        .select("event.*", "topic", "partition", "offset", "timestamp")
    )
    demo_logger.info("Event schema applied; parsing fields type,srn,questionID,ts,isPaste, ...")

    logger = logging.getLogger("capstonelogi_stream")

    def write_batch(batch_df, batch_id: int) -> None:
        # Basic batch diagnostics (driver only)
        try:
            count = batch_df.count()
        except Exception as exc:
            logger.error("[batch %s] count failed: %s", batch_id, exc)
            return
        logger.info("[batch %s] starting; rows=%s", batch_id, count)
        if count == 0:
            return

        # Execute updates on executors, one task per input partition
        def process_partition(rows_iter):
            try:
                import os as _os
                import json as _json
                import redis as _redis
                import logging as _logging
                import urllib.request as _urllib_request
                import urllib.error as _urllib_error
            except Exception:
                return

            cluster_nodes = _os.getenv("REDIS_CLUSTER_NODES", "").strip()
            client = None
            if cluster_nodes:
                startup_nodes = []
                for node in cluster_nodes.split():
                    host, _, port = node.partition(":")
                    startup_nodes.append({"host": host, "port": int(port or 6379)})
                try:
                    client = _redis.cluster.RedisCluster(startup_nodes=startup_nodes, decode_responses=True)
                except Exception:
                    return
                try:
                    _logging.getLogger("capstonelogi_stream").info("Using Redis Cluster: %s", cluster_nodes)
                except Exception:
                    pass
            else:
                host = _os.getenv("REDIS_HOST", "redis-dev")
                port = int(_os.getenv("REDIS_PORT", "6379"))
                try:
                    client = _redis.Redis(host=host, port=port, decode_responses=True)
                except Exception:
                    return
                try:
                    _logging.getLogger("capstonelogi_stream").info("Using Redis (single node): %s:%s", host, port)
                except Exception:
                    pass

            try:
                client.ping()
            except Exception:
                return

            _logger = _logging.getLogger("capstonelogi_stream")
            faiss_base_url = _os.getenv("FAISS_URL", "http://faiss-simsearch:8000").rstrip("/")
            ml_model_base_url = _os.getenv("ML_MODEL_URL", "http://ml-model-dev:8001").rstrip("/")
            try:
                request_timeout = float(_os.getenv("REQUEST_TIMEOUT_SECONDS", "1.5"))
            except Exception:
                request_timeout = 1.5
            try:
                _logger.info("External services: FAISS=%s ML=%s timeout=%.1fs", faiss_base_url, ml_model_base_url, request_timeout)
            except Exception:
                pass

            for row in rows_iter:
                ev = row.asDict(recursive=True)
                srn = ev.get("srn")
                qid = ev.get("questionID")
                if srn is None or qid is None:
                    continue
                key = f"{srn}|{qid}"

                try:
                    current_raw = client.get(key)
                except Exception:
                    current_raw = None

                if current_raw:
                    try:
                        state = _json.loads(current_raw)
                    except Exception:
                        state = {}
                else:
                    state = {}

                state.setdefault("total_actions", 0)
                state.setdefault("latest_log_ts", 0)
                state.setdefault("paste_count", 0)
                state.setdefault("deletion_count", 0)
                state.setdefault("compilation_count", 0)
                state.setdefault("submission_count", 0)

                state["total_actions"] += 1

                ts = ev.get("ts") or 0
                if isinstance(ts, (int, float)) and ts > (state.get("latest_log_ts") or 0):
                    state["latest_log_ts"] = int(ts)

                if ev.get("isPaste"):
                    state["paste_count"] += 1
                    try:
                        _logger.info("Paste detected for key=%s (srn=%s, qid=%s)", key, srn, qid)
                    except Exception:
                        pass
                    url = f"{ml_model_base_url}/check-this-guy"
                    payload = {
                        "srn": str(srn or ""),
                        "questionID": int(qid or 0),  # should never default to 0
                    }

                    data = _json.dumps(payload).encode("utf-8")
                    req = _urllib_request.Request(
                        url,
                        data=data,
                        headers={"Content-Type": "application/json"},
                        method="POST",
                    )
                    # Do not block on body; short timeout, ignore response
                    try:
                        with _urllib_request.urlopen(req, timeout=request_timeout):
                            pass
                    except Exception as exc:
                        try:
                            _logger.error("ML Model POST /check-this-guy failed for key=%s: %s", key, exc)
                        except Exception:
                            pass


                etype = (ev.get("type") or "").lower()
                if etype == "delete":
                    num_chars = ev.get("numCharacters", 1)
                    if isinstance(num_chars, int) and num_chars > 0: # this is in case numCharacters is not integer
                        state["deletion_count"] += num_chars
                    else:
                        state["deletion_count"] += 1
                elif etype == "run":
                    state["compilation_count"] += 1
                elif etype == "submission":
                    state["submission_count"] += 1
                    try:
                        _logger.info("Submission detected for key=%s; sending to FAISS", key)
                    except Exception:
                        pass
                    # Fire-and-forget PUT to FAISS /submission
                    try:
                        url = f"{faiss_base_url}/submission"
                        payload = {
                            "userID": str(srn or ""),
                            "questionID": str(qid or ""),
                            "code": ev.get("code") or "",
                        }
                        data = _json.dumps(payload).encode("utf-8")
                        req = _urllib_request.Request(
                            url,
                            data=data,
                            headers={"Content-Type": "application/json"},
                            method="PUT",
                        )
                        # Do not block on body; short timeout, ignore response
                        try:
                            with _urllib_request.urlopen(req, timeout=request_timeout):
                                pass
                        except Exception as exc:
                            try:
                                _logger.error("FAISS PUT /submission failed for key=%s: %s", key, exc)
                            except Exception:
                                pass
                    except Exception as exc:
                        try:
                            _logger.error("FAISS submit request build error for key=%s: %s", key, exc)
                        except Exception:
                            pass

                try:
                    client.set(key, _json.dumps(state, separators=(",", ":")))
                    try:
                        _logger.info(
                            "State updated for key=%s: actions=%s paste=%s delete=%s run=%s submit=%s",
                            key,
                            state.get("total_actions"),
                            state.get("paste_count"),
                            state.get("deletion_count"),
                            state.get("compilation_count"),
                            state.get("submission_count"),
                        )
                    except Exception:
                        pass
                except Exception:
                    pass

        (batch_df
            .select("srn", "questionID", "ts", "isPaste", "type")
            .rdd
            .foreachPartition(process_partition)
        )

    # Persist Kafka offsets/state so we don't re-read on restart
    checkpoint_dir = os.getenv("CHECKPOINT_DIR", "")
    writer = events.writeStream.foreachBatch(write_batch)
    if checkpoint_dir:
        writer = writer.option("checkpointLocation", checkpoint_dir)
    demo_logger.info("Starting streaming query ...")
    query = writer.start()

    query.awaitTermination()


if __name__ == "__main__":
    main()