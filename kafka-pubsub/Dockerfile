FROM bitnami/kafka:3.6

# Common Kafka configuration for both dev and prod.
# Per-environment differences (node id, advertised listeners, quorum voters,
# and any dev-only EXTERNAL listener) are set in docker-compose.yml.
ENV ALLOW_PLAINTEXT_LISTENER=yes \
    KAFKA_CFG_PROCESS_ROLES=controller,broker \
    KAFKA_CFG_CONTROLLER_LISTENER_NAMES=CONTROLLER \
    KAFKA_CFG_LISTENERS=PLAINTEXT://:9092,CONTROLLER://:9093 \
    KAFKA_CFG_LISTENER_SECURITY_PROTOCOL_MAP=CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT \
    KAFKA_CFG_INTER_BROKER_LISTENER_NAME=PLAINTEXT \
    KAFKA_CFG_AUTO_CREATE_TOPICS_ENABLE=true \
    KAFKA_CFG_DEFAULT_REPLICATION_FACTOR=3 \
    KAFKA_CFG_NUM_PARTITIONS=1 \
    KAFKA_CFG_OFFSETS_TOPIC_REPLICATION_FACTOR=3 \
    KAFKA_CFG_TRANSACTION_STATE_LOG_REPLICATION_FACTOR=3 \
    KAFKA_CFG_TRANSACTION_STATE_LOG_MIN_ISR=2

# Bake a quieter log4j configuration into the image
COPY log4j.properties /opt/bitnami/kafka/config/log4j.properties


