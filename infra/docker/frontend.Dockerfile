# NowPass frontend — Vite build + OpenResty static serving
FROM node:22-alpine AS build
WORKDIR /repo

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY frontend/package.json ./frontend/
COPY packages/api-contracts/package.json ./packages/api-contracts/
RUN pnpm install --frozen-lockfile

COPY frontend ./frontend
COPY packages/api-contracts ./packages/api-contracts
RUN pnpm --filter @nowpass/web build

FROM openresty/openresty:1.27.1.2-alpine
COPY infra/openresty/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/frontend/dist /usr/local/openresty/nginx/html
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
