FROM node:20-alpine

WORKDIR /app

# Copy all files
COPY . .

# Install backend deps
RUN npm install --prefix backend

# Build frontend
RUN npm install --prefix frontend && npm run build --prefix frontend

# Create persistent data directory (Railway mounts volume here)
RUN mkdir -p /data

EXPOSE 10000
ENV PORT=10000

CMD ["node", "backend/index.js"]
