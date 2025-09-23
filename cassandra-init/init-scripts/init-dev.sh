#!/usr/bin/env bash
set -euo pipefail

echo "[cassandra-init-dev] Starting Cassandra init script"
echo "[cassandra-init-dev] Waiting for cassandra-dev:9042 to become ready..."

attempt=0
max_attempts=300
while [ $attempt -lt $max_attempts ]; do
  if cqlsh cassandra-dev 9042 -e 'DESCRIBE CLUSTER;' >/dev/null 2>&1; then
    echo "[cassandra-init-dev] Cassandra is ready"
    break
  fi
  attempt=$((attempt + 1))
  echo "[cassandra-init-dev] Not ready yet (attempt ${attempt}/${max_attempts}); sleeping 2s"
  sleep 2
done

if [ $attempt -ge $max_attempts ]; then
  echo "[cassandra-init-dev] ERROR: Timed out waiting for Cassandra"
  exit 1
fi

echo "[cassandra-init-dev] Applying schema from /schema/schema-dev.cql"
cqlsh cassandra-dev 9042 -f /schema/schema-dev.cql
echo "[cassandra-init-dev] Schema applied successfully"


