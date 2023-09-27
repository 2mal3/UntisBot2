FROM node:18-alpine AS build

WORKDIR /app

COPY package.json .
RUN npm install --production
COPY prisma/ prisma/
RUN npx prisma generate && npx prisma migrate deploy


FROM oven/bun:1.0 AS run

WORKDIR /app

COPY package.json bun.lockb tsconfig.json docker-entrypoint.sh ./
COPY --from=build /app/node_modules/  node_modules/
COPY --from=build /app/prisma prisma/
COPY src/ src/
COPY tests/ tests/

RUN chmod +x docker-entrypoint.sh

ENTRYPOINT ./docker-entrypoint.sh
