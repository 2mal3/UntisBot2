FROM ubuntu:22.04 as get

RUN apt update && apt install -y unzip && apt clean && rm -rf /var/lib/apt/lists/*

WORKDIR /tmp

ADD https://github.com/oven-sh/bun/releases/latest/download/bun-linux-x64.zip bun-linux-x64.zip
RUN unzip bun-linux-x64.zip
RUN chmod +x ./bun-linux-x64/bun

FROM ubuntu:22.04 as final

COPY --from=get /tmp/bun-linux-x64/bun /usr/local/bin/bun

RUN echo '#!/bin/bash\n\
set -e\n\
if [ "${1#-}" != "${1}" ] || [ -z "$(command -v "${1}")" ]; then\n\
  set -- bun "$@"\n\
fi\n\
exec "$@"\n ' > /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT [ "/entrypoint.sh" ]


FROM final as app

WORKDIR /app

COPY package.json bun.lockb ./
RUN /usr/local/bin/bun install

RUN apt-get update && apt-get install -y cron
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

CMD ["docker/entrypoint.sh"]
