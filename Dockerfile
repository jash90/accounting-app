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

# Install http-server globally (simpler port configuration)
RUN npm install -g http-server

# Copy built static files
COPY --from=builder /app/dist/apps/web ./dist

# Expose port (Railway sets $PORT)
EXPOSE 3000

# Start command - serve static files with SPA mode
# http-server uses -p for port, --spa for single page app mode
CMD ["sh", "-c", "http-server dist -p ${PORT:-3000} --spa"]
