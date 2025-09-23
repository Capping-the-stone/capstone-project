FROM cassandra:4.1

RUN mkdir /schema

RUN chmod 777 /schema

COPY init-scripts/ /schema/

# entry point and cmd is defined in docker-compose.yml. It's different for prod and dev