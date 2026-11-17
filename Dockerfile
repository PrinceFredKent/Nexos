# ── Stage 1: Build React Frontend ─────────────────────────
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# ── Stage 2: Python Backend & Unified App ────────────────
FROM python:3.11-slim
WORKDIR /app

# Install system utilities and dependencies required for PostgreSQL (psycopg2)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY backend/requirements-render.txt ./
RUN pip install --no-cache-dir -r requirements-render.txt

# Copy backend source code
COPY backend/ ./backend/

# Copy compiled frontend dist from Stage 1 into frontend/dist
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Set working directory to backend so relative paths and modules resolve cleanly
WORKDIR /app/backend

ENV PORT=8000
EXPOSE 8000

# Start Uvicorn bound to Render's injected $PORT
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
