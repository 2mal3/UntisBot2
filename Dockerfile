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

RUN apt-get update && \
    apt-get install chromium -y --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true
ENV PUPPETEER_EXECUTABLE_PATH /usr/bin/chromium

COPY package.json bun.lockb tsconfig.json ./
COPY --from=build /app/node_modules/  node_modules/
COPY --from=build /app/prisma prisma/
COPY src/ src/

# TODO: properly set up own user
# RUN useradd -m -U appuser && \
#     # && adduser pptruser -D -G pptruser \
#     # && mkdir -p /home/pptruser/Downloads \
#     chown -R appuser:appuser /app
# USER appuser

ENTRYPOINT ["bun", "serve"]
