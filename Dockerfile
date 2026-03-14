# Epstein Files Downloader - Dockerfile
# Multi-stage build for smaller image

# Stage 1: Build
FROM node:16-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript code
RUN npm run build

# Stage 2: Production
FROM node:16-alpine AS production

# Set working directory
WORKDIR /app

# Copy built files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
USER nextjs

# Create necessary directories
RUN mkdir -p downloads logs

# Expose ports (if needed for future web interface)
# EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('./dist/index.js')" || exit 1

# Start the application
CMD ["npm", "start"]