#!/usr/bin/env bash
# ==============================================================================
# MedSync Portable Runner (Linux / Remote Server)
# ==============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Tracking files
CONTAINERS_FILE="$SCRIPT_DIR/.runner_containers.txt"
touch "$CONTAINERS_FILE"

VERSION="1.0.0"
if [ -f "$SCRIPT_DIR/VERSION" ]; then
    VERSION="$(cat "$SCRIPT_DIR/VERSION" | tr -d '\r\n')"
fi

echo -e "\033[36m========================================\033[0m"
echo -e "\033[36m       MEDSYNC PORTABLE RUNNER (v$VERSION)       \033[0m"
echo -e "\033[36m========================================\033[0m"
echo -e "\033[32mTarget: Remote / Linux Server Backend\033[0m"
echo ""

# 1. Docker check
if ! command -v docker >/dev/null 2>&1; then
    echo -e "\033[31mERROR: Docker is not installed or not in PATH.\033[0m"
    exit 1
fi

if ! docker info >/dev/null 2>&1; then
    echo -e "\033[31mERROR: Docker daemon is not running. Please start Docker.\033[0m"
    exit 1
fi

# 2. .env check
ENV_FILE="$SCRIPT_DIR/.env"
if [ ! -f "$ENV_FILE" ]; then
    if [ -f "$SCRIPT_DIR/medsync.env" ]; then
        ENV_FILE="$SCRIPT_DIR/medsync.env"
    elif [ -f "$SCRIPT_DIR/.env.example" ]; then
        cp "$SCRIPT_DIR/.env.example" "$ENV_FILE"
        echo -e "\033[33mNOTICE: Created .env from .env.example. Please configure before production use.\033[0m"
    else
        echo -e "\033[31mERROR: .env file not found.\033[0m"
        exit 1
    fi
fi

BACKEND_REGISTRY_IMAGE="ghcr.io/dharshankumar988/medsync-backend:latest"
BACKEND_LOCAL_IMAGE="medsync-backend:local"
BACKEND_CONTAINER="medsync-backend"
BACKEND_PORT="${PORT:-8000}"

# Parse flags
DAEMON=false
FOLLOW_LOGS=false
while [[ $# -gt 0 ]]; do
    case "$1" in
        -d|--daemon)
            DAEMON=true
            shift
            ;;
        -f|--logs)
            FOLLOW_LOGS=true
            shift
            ;;
        -p|--port)
            BACKEND_PORT="$2"
            shift 2
            ;;
        *)
            shift
            ;;
    esac
done

echo -e "\033[36m--- Starting Backend on port $BACKEND_PORT ---\033[0m"

# Check image
BACKEND_IMAGE=""
if docker images -q "$BACKEND_REGISTRY_IMAGE" >/dev/null 2>&1 && [ -n "$(docker images -q "$BACKEND_REGISTRY_IMAGE")" ]; then
    BACKEND_IMAGE="$BACKEND_REGISTRY_IMAGE"
    echo -e "\033[32mUsing cached registry image: $BACKEND_IMAGE\033[0m"
elif docker images -q "$BACKEND_LOCAL_IMAGE" >/dev/null 2>&1 && [ -n "$(docker images -q "$BACKEND_LOCAL_IMAGE")" ]; then
    BACKEND_IMAGE="$BACKEND_LOCAL_IMAGE"
    echo -e "\033[32mUsing locally built image: $BACKEND_IMAGE\033[0m"
else
    echo -e "\033[36mPulling Backend image from registry: $BACKEND_REGISTRY_IMAGE...\033[0m"
    if docker pull "$BACKEND_REGISTRY_IMAGE"; then
        BACKEND_IMAGE="$BACKEND_REGISTRY_IMAGE"
    else
        echo -e "\033[33mRegistry pull failed. Attempting local build...\033[0m"
        REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
        if [ -f "$REPO_ROOT/apps/backend/Dockerfile" ]; then
            docker build -t "$BACKEND_LOCAL_IMAGE" -f "$REPO_ROOT/apps/backend/Dockerfile" "$REPO_ROOT"
            BACKEND_IMAGE="$BACKEND_LOCAL_IMAGE"
        else
            echo -e "\033[31mERROR: Cannot pull image and source Dockerfile not found.\033[0m"
            exit 1
        fi
    fi
fi

# Clean existing container
if [ -n "$(docker ps -a -q -f "name=^/${BACKEND_CONTAINER}$")" ]; then
    echo "Stopping existing $BACKEND_CONTAINER..."
    docker rm -f "$BACKEND_CONTAINER" >/dev/null 2>&1 || true
fi

# Model cache volume
docker volume create medsync-model-cache >/dev/null 2>&1 || true

echo "Starting container $BACKEND_CONTAINER..."
docker run -d \
    --name "$BACKEND_CONTAINER" \
    -p "${BACKEND_PORT}:8000" \
    -v medsync-model-cache:/models \
    --env-file "$ENV_FILE" \
    --restart unless-stopped \
    "$BACKEND_IMAGE" >/dev/null

echo "$BACKEND_CONTAINER" >> "$CONTAINERS_FILE"

# Health check
echo "Waiting for backend to become healthy (HTTP 200)..."
HEALTHY=false
for i in $(seq 1 60); do
    sleep 2
    if curl -s -f "http://127.0.0.1:${BACKEND_PORT}/health" >/dev/null 2>&1; then
        HEALTHY=true
        break
    fi
done

if [ "$HEALTHY" = false ]; then
    echo -e "\033[31mERROR: Backend failed health check. Recent logs:\033[0m"
    docker logs --tail 30 "$BACKEND_CONTAINER"
    exit 1
fi

echo -e "\033[32mBackend is HEALTHY on port $BACKEND_PORT\033[0m"
echo -e "\033[35mURL: http://127.0.0.1:${BACKEND_PORT}\033[0m"

if [ "$DAEMON" = true ]; then
    echo -e "\033[32mRunning in daemon mode. Exiting launcher.\033[0m"
    exit 0
fi

if [ "$FOLLOW_LOGS" = true ]; then
    echo -e "\033[36mStreaming live container logs (Ctrl+C to exit log stream)...\033[0m"
    docker logs -f "$BACKEND_CONTAINER"
else
    echo -e "\033[33mTo view logs: docker logs -f $BACKEND_CONTAINER\033[0m"
    echo -e "\033[33mTo stop backend: ./stop-medsync.sh\033[0m"
fi
