# ==========================================
# Multi-stage Dockerfile for NADI
# ==========================================

# Stage 1: Builder
FROM node:22-alpine AS builder
WORKDIR /app

# Install build tools for native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++

COPY package.json ./
RUN npm install

COPY . .

# Build frontend and server
RUN npm run build

# Stage 2: Production Runner
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3100
ENV HOST=0.0.0.0

# Install runtime dependencies for better-sqlite3 if needed
RUN apk add --no-cache python3 make g++

COPY package.json ./
RUN npm install --omit=dev && npm cache clean --force

# Copy built artifacts
COPY --from=builder /app/dist ./dist

# Create data directory
RUN mkdir -p ./data

EXPOSE 3100

CMD ["node", "dist/server/index.js"]
