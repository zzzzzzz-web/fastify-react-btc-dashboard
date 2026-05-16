FROM node:22-alpine
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/server/package.json ./packages/server/
RUN pnpm install --filter @fast-ws/server --frozen-lockfile
COPY packages/server/src ./packages/server/src
COPY packages/server/tsconfig.json ./packages/server/
RUN pnpm --filter @fast-ws/server build
EXPOSE 3000
CMD ["pnpm", "--filter", "@fast-ws/server", "start"]
