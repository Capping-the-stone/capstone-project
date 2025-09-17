import os
import json
import logging
from typing import Optional

import requests
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel


logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI()


class CheckPayload(BaseModel):
    srn: str
    questionID: int


def _get_redis_client():
    try:
        import redis
    except Exception as exc:
        raise RuntimeError("redis package not installed") from exc

    cluster_nodes = os.getenv("REDIS_CLUSTER_NODES", "").strip()
    if cluster_nodes:
        startup_nodes = []
        for node in cluster_nodes.split():
            host, _, port = node.partition(":")
            startup_nodes.append({"host": host, "port": int(port or 6379)})
        return redis.cluster.RedisCluster(startup_nodes=startup_nodes, decode_responses=True)
    host = os.getenv("REDIS_HOST", "redis-dev")
    port = int(os.getenv("REDIS_PORT", "6379"))
    return redis.Redis(host=host, port=port, decode_responses=True)


def _fetch_state_from_redis(srn: str, question_id: int) -> Optional[dict]:
    client = _get_redis_client()
    try:
        client.ping()
    except Exception as exc:
        logger.error("Redis not reachable: %s", exc)
        raise HTTPException(status_code=500, detail="Redis not reachable")

    key = f"{srn}|{question_id}"
    try:
        raw = client.get(key)
    except Exception as exc:
        logger.error("Redis GET failed: %s", exc)
        raise HTTPException(status_code=500, detail="Redis error")

    if not raw:
        return None
    try:
        return json.loads(raw)
    except Exception:
        return None


def _call_ml_api(srn: str, question_id: int, state: dict) -> dict:
    api_url = os.getenv("ML_API_URL")
    if not api_url:
        raise HTTPException(status_code=500, detail="ML_API_URL not configured")

    payload = {
        "instances": [
            {
                "srn": srn,
                "questionID": question_id,
                "features": {
                    "total_actions": int(state.get("total_actions", 0) or 0),
                    "paste_count": int(state.get("paste_count", 0) or 0),
                    "deletion_count": int(state.get("deletion_count", 0) or 0),
                    "compilation_count": int(state.get("compilation_count", 0) or 0),
                    "submission_count": int(state.get("submission_count", 0) or 0),
                    "latest_log_ts": int(state.get("latest_log_ts", 0) or 0),
                },
            }
        ]
    }
    try:
        resp = requests.post(api_url, json=payload, timeout=20)
        resp.raise_for_status()
        data = resp.json() or {}
    except Exception as exc:
        logger.error("ML API call failed: %s", exc)
        raise HTTPException(status_code=502, detail="ML API failure")

    preds = data.get("predictions", [])
    return preds[0] if preds else {}


def _notify_backend_cheating(srn: str, question_id: int) -> None:
    # backend_url = os.getenv("BACKEND_URL")
    # if not backend_url:
    #     logger.warning("BACKEND_URL not set; skipping backend notify")
    #     return
    # url = backend_url.rstrip("/") + "/this-guy-is-cheating"
    body = {"detectionMethod": "ML", "srn": srn, "questionID": question_id}
    # try:
    #     resp = requests.post(url, json=body, timeout=10)
    #     resp.raise_for_status()
    # except Exception as exc:
    #     logger.error("Backend notify failed: %s", exc)
    print("Would notify backend:", body)


@app.post("/check-this-guy")
def check_this_guy(payload: CheckPayload):
    logger.info("POST /check-this-guy srn=%s qid=%s", payload.srn, payload.questionID)

    state = _fetch_state_from_redis(payload.srn, payload.questionID)
    if state is None:
        raise HTTPException(status_code=404, detail="No state for srn|questionID")

    pred = _call_ml_api(payload.srn, payload.questionID, state)
    is_cheating = bool(pred.get("is_suspected_cheating", False))

    if is_cheating:
        _notify_backend_cheating(payload.srn, payload.questionID)

    return {
        "srn": payload.srn,
        "questionID": payload.questionID,
        "isCheating": is_cheating,
        "prediction": pred,
    }
