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

# Install serve globally for static file serving
RUN npm install -g serve

# Copy built static files
COPY --from=builder /app/dist/web ./dist

# Expose port (Railway sets $PORT)
EXPOSE 3000

# Start command - serve static files
# serve v14+ syntax: --listen tcp://0.0.0.0:PORT
CMD ["sh", "-c", "serve dist --listen tcp://0.0.0.0:${PORT:-3000} --single"]
