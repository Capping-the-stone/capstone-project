FROM bitnamilegacy/spark:3.5.1

USER root
ENV DEBIAN_FRONTEND=noninteractive

# Python dependencies for the stream processor (add more as needed)
COPY requirements.txt /tmp/requirements.txt
RUN install_packages python3-pip python3-venv \
  && python3 -m venv /opt/venv \
  && /opt/venv/bin/pip install --no-cache-dir --upgrade pip \
  && /opt/venv/bin/pip install --no-cache-dir -r /tmp/requirements.txt \
  && mkdir -p /app \
  && chown -R 1001:1001 /app \
  && mkdir -p /checkpoints \
  && chown -R 1001:1001 /checkpoints

# Ensure venv python is used for PySpark driver/executors by default
ENV PATH="/opt/venv/bin:${PATH}"
ENV PYSPARK_PYTHON=/opt/venv/bin/python
ENV PYSPARK_DRIVER_PYTHON=/opt/venv/bin/python

WORKDIR /app

COPY app/ /app/

# Switch back to the non-root spark user per Bitnami recommendations
USER 1001

# Default to an idle container; docker-compose will override with spark-submit
CMD ["bash", "-lc", "sleep infinity"]
