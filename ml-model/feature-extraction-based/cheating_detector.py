import os
import json
import pandas as pd
import requests


def _get_redis_client():
    try:
        import redis
    except Exception as exc:
        raise RuntimeError("redis package not installed: pip install redis") from exc

    cluster_nodes = os.getenv("REDIS_CLUSTER_NODES", "").strip()
    if cluster_nodes:
        startup_nodes = []
        for node in cluster_nodes.split():
            host, _, port = node.partition(":")
            startup_nodes.append({"host": host, "port": int(port or 6379)})
        try:
            return redis.cluster.RedisCluster(startup_nodes=startup_nodes, decode_responses=True)
        except Exception as exc:
            raise RuntimeError(f"Failed to connect to Redis cluster: {exc}")
    host = os.getenv("REDIS_HOST", "redis-dev")
    port = int(os.getenv("REDIS_PORT", "6379"))
    return redis.Redis(host=host, port=port, decode_responses=True)


def _aggregate_features_from_redis():
    client = _get_redis_client()
    try:
        client.ping()
    except Exception as exc:
        raise RuntimeError(f"Cannot reach Redis: {exc}")

    # Keys produced by Spark are of the form SRN|questionID, value is a JSON state
    # with counters: total_actions, latest_log_ts, paste_count, deletion_count,
    # compilation_count, submission_count
    features_by_srn = {}

    # Use SCAN to iterate keys without blocking Redis
    cursor = 0
    pattern = os.getenv("REDIS_FEATURE_KEYS_PATTERN", "*|*")
    while True:
        cursor, keys = client.scan(cursor=cursor, match=pattern, count=1000)
        if keys:
            values = client.mget(keys)
            for key, raw in zip(keys, values):
                if not raw:
                    continue
                try:
                    state = json.loads(raw)
                except Exception:
                    continue
                srn, _, _qid = key.partition("|")
                agg = features_by_srn.setdefault(srn, {
                    "total_actions": 0,
                    "paste_count": 0,
                    "deletion_count": 0,
                    "compilation_count": 0,
                    "submission_count": 0,
                    # Time features are partial because only latest timestamp is available
                    "latest_log_ts": 0,
                })
                agg["total_actions"] += int(state.get("total_actions", 0) or 0)
                agg["paste_count"] += int(state.get("paste_count", 0) or 0)
                agg["deletion_count"] += int(state.get("deletion_count", 0) or 0)
                agg["compilation_count"] += int(state.get("compilation_count", 0) or 0)
                agg["submission_count"] += int(state.get("submission_count", 0) or 0)
                latest = int(state.get("latest_log_ts", 0) or 0)
                if latest > agg.get("latest_log_ts", 0):
                    agg["latest_log_ts"] = latest
        if cursor == 0:
            break

    if not features_by_srn:
        return pd.DataFrame(columns=[
            "SRN",
            "total_actions",
            "paste_count",
            "deletion_count",
            "compilation_count",
            "submission_count",
            "latest_log_ts",
        ])

    rows = []
    for srn, feats in features_by_srn.items():
        row = {"SRN": srn}
        row.update(feats)
        rows.append(row)
    return pd.DataFrame(rows)


def _call_ml_api(features_df: pd.DataFrame) -> pd.DataFrame:
    api_url = os.getenv("ML_API_URL")
    if not api_url:
        raise RuntimeError("ML_API_URL not set. Set it to the inference endpoint URL.")

    # Build payload: list of records with SRN and feature dict
    records = []
    for _, r in features_df.iterrows():
        rec = {
            "srn": r["SRN"],
            "features": {
                "total_actions": int(r.get("total_actions", 0) or 0),
                "paste_count": int(r.get("paste_count", 0) or 0),
                "deletion_count": int(r.get("deletion_count", 0) or 0),
                "compilation_count": int(r.get("compilation_count", 0) or 0),
                "submission_count": int(r.get("submission_count", 0) or 0),
                "latest_log_ts": int(r.get("latest_log_ts", 0) or 0),
            },
        }
        records.append(rec)

    headers = {"Content-Type": "application/json"}
    resp = requests.post(api_url, headers=headers, json={"instances": records}, timeout=30)
    resp.raise_for_status()
    data = resp.json() or {}

    # Expected response structure:
    # {
    #   "predictions": [
    #       {"srn": "PES...", "label": -1 or 1, "is_suspected_cheating": true/false, "score": <optional>},
    #       ...
    #   ]
    # }
    preds = data.get("predictions", [])
    by_srn = {p.get("srn"): p for p in preds}

    out = features_df.copy()
    out["anomaly_score"] = out["SRN"].map(lambda s: by_srn.get(s, {}).get("label"))
    out["is_suspected_cheating"] = out["SRN"].map(lambda s: by_srn.get(s, {}).get("is_suspected_cheating"))
    if "score" in (preds[0].keys() if preds else {}):
        out["score"] = out["SRN"].map(lambda s: by_srn.get(s, {}).get("score"))
    return out


def main() -> None:
    features_df = _aggregate_features_from_redis()
    if features_df.empty:
        print("No features found in Redis. Is the stream processor running and Redis populated?")
        return

    results_df = _call_ml_api(features_df)

    print("\nSuspected Cheating:")
    flagged = results_df[results_df["is_suspected_cheating"] == True][["SRN"]]  # noqa: E712
    print(flagged)

    results_path = os.getenv("CHEATING_PREDICTIONS_PATH", "cheating_predictions.csv")
    results_df.to_csv(results_path, index=False)
    print(f"\nCheating results saved to {results_path}")


if __name__ == "__main__":
    main()
