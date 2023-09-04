FROM dvlprtech/bun:0.7.3-ubuntu

WORKDIR /app

RUN apt-get update && apt-get install -y cron
RUN touch /var/log/cron.log
COPY docker/task /etc/cron.d/task
RUN chmod 0644 /etc/cron.d/task && \
    crontab /etc/cron.d/task

COPY package.json bun.lockb ./
RUN bun install

COPY src/ ./src/
COPY tsconfig.json .
COPY docker/task.sh .
COPY docker/entrypoint.sh .

RUN chmod +x task.sh
RUN chmod +x entrypoint.sh

CMD ["docker/entrypoint.sh"]
