FROM oven/bun:1.2 AS run

LABEL author="2mal3"
LABEL github="https://github.com/2mal3/UntisBot2"

WORKDIR /app

COPY package.json bun.lockb ./
RUN bun install --production

COPY tsconfig.json ./
COPY src/ src/

VOLUME "/app/database"

ENTRYPOINT bun serve
