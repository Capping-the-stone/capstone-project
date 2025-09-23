#!/usr/bin/env bash
set -euo pipefail

echo "[cassandra-init-prod] Starting Cassandra init script"
echo "[cassandra-init-prod] Waiting for cassandra-1-prod:9042 to become ready..."

attempt=0
max_attempts=300
while [ $attempt -lt $max_attempts ]; do
  if cqlsh cassandra-1-prod 9042 -e 'DESCRIBE CLUSTER;' >/dev/null 2>&1; then
    echo "[cassandra-init-prod] Cassandra is ready"
    break
  fi
  attempt=$((attempt + 1))
  echo "[cassandra-init-prod] Not ready yet (attempt ${attempt}/${max_attempts}); sleeping 2s"
  sleep 2
done

if [ $attempt -ge $max_attempts ]; then
  echo "[cassandra-init-prod] ERROR: Timed out waiting for Cassandra"
  exit 1
fi

echo "[cassandra-init-prod] Applying schema from /schema/schema-prod.cql"
cqlsh cassandra-1-prod 9042 -f /schema/schema-prod.cql
echo "[cassandra-init-prod] Schema applied successfully"


