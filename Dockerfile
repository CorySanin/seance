FROM oven/bun:alpine AS baseimg

FROM baseimg AS dependencies
WORKDIR /build

COPY ./package*json ./
COPY ./bun.lockb ./
RUN bun install --production --no-progress && \
  chown -R bun .


FROM dependencies as build-env
WORKDIR /build

RUN apk add --no-cache libwebp libwebp-tools

RUN bun install --no-progress

COPY . .

RUN bun run build.ts && \
  chown -R bun .


FROM baseimg as deploy
WORKDIR /usr/src/seance
HEALTHCHECK  --timeout=3s \
  CMD curl --fail http://localhost:8080/healthcheck || exit 1
RUN apk add --no-cache curl
COPY --from=dependencies /build .
COPY --from=build-env /build/assets ./assets
COPY . .
USER bun

EXPOSE 8080
CMD [ "bun", "run", "index.ts"]