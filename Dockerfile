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

RUN apt-get update \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true
ENV PUPPETEER_EXECUTABLE_PATH /usr/bin/google-chrome

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
