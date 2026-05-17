FROM node:22-alpine AS client-builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/client/package.json ./packages/client/
RUN pnpm install --filter @fast-ws/client --frozen-lockfile
COPY packages/client/src ./packages/client/src
COPY packages/client/index.html ./packages/client/
COPY packages/client/tsconfig.json ./packages/client/
COPY packages/client/tsconfig.node.json ./packages/client/
COPY packages/client/vite.config.ts ./packages/client/
RUN pnpm --filter @fast-ws/client build

FROM nginx:alpine
COPY --from=client-builder /app/packages/client/dist /usr/share/nginx/html
COPY infra/nginx/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
