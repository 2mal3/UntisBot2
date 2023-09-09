FROM oven/bun:1.0 as app

WORKDIR /app

COPY package.json bun.lockb ./
RUN bun install

RUN apt-get update && \
    apt-get install -y cron && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*
RUN touch /var/log/cron.log
COPY docker/task /etc/cron.d/task
RUN chmod 0644 /etc/cron.d/task && \
    crontab /etc/cron.d/task

COPY src/ ./src/
COPY tsconfig.json .
COPY docker/task.sh .
COPY docker/entrypoint.sh .

RUN chmod +x task.sh
RUN chmod +x entrypoint.sh

ENTRYPOINT ["./entrypoint.sh"]
