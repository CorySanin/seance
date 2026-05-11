FROM node:lts-alpine AS baseimg

FROM baseimg AS build-env
WORKDIR /build
RUN apk add --no-cache pnpm
RUN --mount=target=/build/package.json,source=package.json --mount=target=/build/pnpm-lock.yaml,source=pnpm-lock.yaml \
    pnpm install
COPY --link . .
RUN pnpm run build && \
  pnpm install --prod


FROM baseimg AS deploy
WORKDIR /usr/src/seance
HEALTHCHECK  --timeout=3s \
  CMD curl --fail http://localhost:8080/healthcheck || exit 1
RUN apk add --no-cache curl
COPY --link --from=build-env /build .
USER node

EXPOSE 8080
CMD [ "npm", "run", "start"]
