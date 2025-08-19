FROM bitnami/kafka:3.6

# Defaults; override via compose
ENV TOPIC=capstone-logi \
    GROUP_ID=dummy-consumer \
    BOOTSTRAP=

CMD ["bash", "-lc", "\
  if [ -z \"$BOOTSTRAP\" ]; then echo 'BOOTSTRAP is required'; exit 1; fi; \
  echo Running consumer against $BOOTSTRAP, topic=$TOPIC, group=$GROUP_ID; \
  /opt/bitnami/kafka/bin/kafka-console-consumer.sh --bootstrap-server $BOOTSTRAP --topic $TOPIC --group $GROUP_ID --from-beginning \
"]


