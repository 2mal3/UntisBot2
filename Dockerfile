FROM oven/bun:1.0 AS app

WORKDIR /app

COPY package.json bun.lockb ./
RUN bun install

COPY prisma/ prisma/
RUN bun migrate

COPY src/ src/
COPY tsconfig.json .

ENTRYPOINT ["/usr/local/bin/bun", "serve"]
