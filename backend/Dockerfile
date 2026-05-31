# ============================================
# CryptoInvestor Backend — Dockerfile
# ============================================

# ---- Build Stage ----
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/

RUN npx tsc

# ---- Production Stage ----
FROM node:20-alpine AS production
WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist/ ./dist/

# mTLS certs (mount at runtime, but create dir)
RUN mkdir -p /app/certs && chown appuser:appgroup /app/certs

USER appuser

EXPOSE 3000
EXPOSE 3001

CMD ["node", "dist/index.js"]
