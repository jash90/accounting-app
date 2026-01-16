# Build stage for web frontend
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (with legacy-peer-deps for zod version conflict)
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Build the web frontend
RUN npm run build:web

# Production stage - serve static files
FROM node:22-alpine AS production

WORKDIR /app

# Install serve@13 (older version with simpler -l PORT syntax)
RUN npm install -g serve@13

# Copy built static files
COPY --from=builder /app/dist/web ./dist

# Expose port (Railway sets $PORT)
EXPOSE 3000

# Start command - serve static files with SPA mode
CMD ["sh", "-c", "serve dist -s -p ${PORT:-3000}"]
