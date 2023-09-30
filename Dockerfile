FROM oven/bun:1.0 AS run

WORKDIR /app

RUN mkdir database

COPY package.json bun.lockb ./
RUN bun install --production

COPY tsconfig.json docker-entrypoint.sh ./

COPY tests/ tests/
COPY src/ src/

RUN chmod +x docker-entrypoint.sh

ENTRYPOINT ./docker-entrypoint.sh
