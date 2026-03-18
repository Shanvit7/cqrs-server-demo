# CQRS OMS Demo - Backend API (Railway / Docker)
FROM oven/bun:1-alpine

WORKDIR /app

# Defaults (Railway overrides PORT at runtime)
ENV PORT=3000
ENV NODE_ENV=production

# Install dependencies (cache layer)
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# Copy source code
COPY . .

EXPOSE 3000

# Health check for Railway/container orchestration
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD sh -c 'wget -qO- "http://127.0.0.1:${PORT:-3000}/" > /dev/null || exit 1'

CMD ["bun", "run", "src/index.ts"]
