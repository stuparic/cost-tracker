# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Debug: List contents to verify build output
RUN ls -la /app && ls -la /app/dist || echo "dist folder not found"

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy startup script
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Debug: Verify dist folder was copied
RUN ls -la /app && ls -la /app/dist && cat /app/dist/main.js | head -5

# Expose port (Cloud Run will set PORT env variable)
EXPOSE 8080

# Start the application
CMD ["/bin/sh", "/app/start.sh"]
