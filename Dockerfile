FROM oven/bun:1.0 AS run

LABEL author="2mal3"
LABEL github="https://github.com/2mal3/UntisBot2"

WORKDIR /app

RUN mkdir database

COPY package.json bun.lockb ./
RUN bun install --production

COPY tsconfig.json docker-entrypoint.sh ./

COPY tests/ tests/
COPY src/ src/

RUN chmod +x docker-entrypoint.sh

ENTRYPOINT ./docker-entrypoint.sh
