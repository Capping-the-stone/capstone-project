import os
import json
import pandas as pd


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
        return redis.cluster.RedisCluster(startup_nodes=startup_nodes, decode_responses=True)
    host = os.getenv("REDIS_HOST", "redis-dev")
    port = int(os.getenv("REDIS_PORT", "6379"))
    return redis.Redis(host=host, port=port, decode_responses=True)


def export_features_from_redis() -> pd.DataFrame:
    client = _get_redis_client()
    try:
        client.ping()
    except Exception as exc:
        raise RuntimeError(f"Cannot reach Redis: {exc}")

    features_by_srn = {}

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

    rows = []
    for srn, feats in features_by_srn.items():
        row = {"SRN": srn}
        row.update(feats)
        rows.append(row)
    df = pd.DataFrame(rows)

    output = os.getenv("EXTRACTED_FEATURES_PATH", "extracted_features.csv")
    df.to_csv(output, index=False)
    print(f"Features saved to {output}")
    return df


if __name__ == "__main__":
    df = export_features_from_redis()
    print(df.head())
    print(f"Exported {len(df)} student aggregates from Redis.")

