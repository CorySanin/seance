FROM node:23-alpine AS baseimg

FROM baseimg AS build-env
WORKDIR /build

COPY ./package*json ./
RUN npm ci
COPY . .
RUN npm run build && \
  npm exec tsc && \
  npm ci --only=production --omit=dev


FROM baseimg AS deploy
WORKDIR /usr/src/seance
HEALTHCHECK  --timeout=3s \
  CMD curl --fail http://localhost:8080/healthcheck || exit 1
RUN apk add --no-cache curl
COPY --from=build-env /build .
USER node

EXPOSE 8080
CMD [ "npm", "run", "start"]
