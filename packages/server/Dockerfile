FROM node:22-alpine
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/server/package.json ./packages/server/
RUN pnpm install --filter @fast-ws/server --frozen-lockfile
COPY packages/server/src ./packages/server/src
EXPOSE 3000
CMD ["node", "packages/server/src/index.js"]
