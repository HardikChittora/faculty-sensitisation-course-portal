# Multi-stage Dockerfile for Faculty Sensitisation Portal
# Stage 1: Build the React frontend
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production runner
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY server ./server
COPY scripts/seed-admin.js ./scripts/seed-admin.js

EXPOSE 9501
CMD ["node", "server/server.js"]
