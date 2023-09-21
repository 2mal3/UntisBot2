FROM oven/bun:1.0 AS install

WORKDIR /app

COPY package.json bun.lockb ./
RUN bun install --production


FROM node:18-alpine AS build

WORKDIR /app

COPY --from=install /app/node_modules/ node_modules/
COPY prisma/ prisma/
RUN npx prisma generate && npx prisma migrate deploy


FROM oven/bun:1.0 AS run

WORKDIR /app

COPY package.json bun.lockb tsconfig.json ./
COPY --from=build /app/node_modules/  node_modules/
COPY --from=build /app/prisma prisma/
COPY src/ src/

ENTRYPOINT ["bun", "serve"]
