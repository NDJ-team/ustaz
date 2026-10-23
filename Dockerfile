# syntax=docker/dockerfile:1

FROM node:24-slim AS build
WORKDIR /app

COPY server/package.json server/package-lock.json server/
COPY client/package.json client/package-lock.json client/

RUN npm --prefix server ci --no-audit --no-fund \
  && npm --prefix client ci --no-audit --no-fund

COPY server server
COPY client client

RUN npm --prefix server run build \
  && npm --prefix client run build \
  && npm --prefix server prune --omit=dev

FROM node:24-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/server/dist server/dist
COPY --from=build /app/server/migrations server/migrations
COPY --from=build /app/server/package.json server/package.json
COPY --from=build /app/server/node_modules server/node_modules
COPY --from=build /app/client/dist client/dist
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

RUN chmod +x /usr/local/bin/docker-entrypoint.sh \
  && mkdir -p /app/server/data

EXPOSE 4000
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
