# ─── Stage 1: Builder ───
FROM --platform=linux/amd64 python:3.11-slim as builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY apps/backend/requirements.txt .

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

RUN pip install --upgrade pip && \
    pip install --no-cache-dir torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r requirements.txt

# ─── Stage 2: Runtime ───
FROM --platform=linux/amd64 python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive \
    HF_HOME=/models/huggingface \
    DEEPFACE_HOME=/models \
    PATH="/opt/venv/bin:$PATH" \
    TF_CPP_MIN_LOG_LEVEL=3 \
    TF_ENABLE_ONEDNN_OPTS=0 \
    CUDA_VISIBLE_DEVICES=-1 \
    MPLCONFIGDIR=/tmp/matplotlib

# Install ONLY runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    tesseract-ocr \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the virtual environment from the builder
COPY --from=builder /opt/venv /opt/venv

# Prewarm matplotlib font cache
RUN python -c "import matplotlib.pyplot"

# Copy backend files
COPY apps/backend/alembic.ini .
COPY apps/backend/alembic/ alembic/
COPY apps/backend/app/ app/
COPY apps/backend/main.py .

# Copy blockchain artifacts if they exist
# Using a wildcard copy so it doesn't fail if the folders don't exist yet
COPY apps/blockchain/deployment[s] /app/app/blockchain/artifacts/deployments
COPY apps/blockchain/abi[s] /app/app/blockchain/artifacts/abis

EXPOSE 8000

# Create a non-root user and switch to it
RUN adduser --disabled-password --gecos "" medsyncuser && \
    mkdir -p /models && chown -R medsyncuser:medsyncuser /models && \
    mkdir -p /tmp/matplotlib && chown -R medsyncuser:medsyncuser /tmp/matplotlib && \
    chown -R medsyncuser:medsyncuser /app
USER medsyncuser

# Health check (Liveness)
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/health || exit 1

# Start FastAPI
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers --forwarded-allow-ips='*'"]
