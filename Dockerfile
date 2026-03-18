
FROM oven/bun:1-alpine AS base

WORKDIR /app

# Install dependencies (cache layer)
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# Copy source code
COPY . .

# Expose port (Railway injects PORT at runtime)
EXPOSE 3000

# Run migrations on startup, then start the server
CMD ["bun", "run", "src/index.ts"]
