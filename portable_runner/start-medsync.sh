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

# Parse flags
MODE=""
DAEMON=false
FOLLOW_LOGS=false
CUSTOM_PORT=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        -m|--mode)
            MODE="$2"
            shift 2
            ;;
        -d|--daemon)
            DAEMON=true
            shift
            ;;
        -f|--logs)
            FOLLOW_LOGS=true
            shift
            ;;
        -p|--port)
            CUSTOM_PORT="$2"
            shift 2
            ;;
        *)
            shift
            ;;
    esac
done

# Interactive choice if not specified in TTY
if [ -z "$MODE" ]; then
    if [ -t 0 ]; then
        echo -e "\033[33mChoose what you would like to run:\033[0m"
        echo -e "  \033[36m[1] Option A: Full Backend (Runs complete API & Database locally)\033[0m"
        echo -e "  \033[32m[2] Option B: AI & RAG Worker Only (Runs heavy AI models & embeddings locally)\033[0m"
        read -p "Enter choice [1 or 2] (Default: 2): " choice
        if [ "$choice" = "1" ] || [ "$choice" = "A" ] || [ "$choice" = "a" ]; then
            MODE="full"
        else
            MODE="worker"
        fi
    else
        MODE="full"
    fi
fi

if [ "$MODE" = "worker" ] || [ "$MODE" = "2" ]; then
    WORKER_REGISTRY_IMAGE="ghcr.io/dharshankumar988/medsync-ai:latest"
    WORKER_LOCAL_IMAGE="medsync-ai:local"
    WORKER_CONTAINER="medsync-ai-worker"
    WORKER_PORT="${CUSTOM_PORT:-7860}"

    echo -e "\033[36m--- Starting AI & RAG Worker on port $WORKER_PORT ---\033[0m"

    WORKER_IMAGE=""
    if docker images -q "$WORKER_REGISTRY_IMAGE" >/dev/null 2>&1 && [ -n "$(docker images -q "$WORKER_REGISTRY_IMAGE")" ]; then
        WORKER_IMAGE="$WORKER_REGISTRY_IMAGE"
    elif docker images -q "$WORKER_LOCAL_IMAGE" >/dev/null 2>&1 && [ -n "$(docker images -q "$WORKER_LOCAL_IMAGE")" ]; then
        WORKER_IMAGE="$WORKER_LOCAL_IMAGE"
    else
        echo -e "\033[36mPulling AI Worker image from registry: $WORKER_REGISTRY_IMAGE...\033[0m"
        if docker pull "$WORKER_REGISTRY_IMAGE"; then
            WORKER_IMAGE="$WORKER_REGISTRY_IMAGE"
        else
            echo -e "\033[33mRegistry pull failed. Building from local source...\033[0m"
            REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
            if [ -f "$REPO_ROOT/medsync-ai/Dockerfile" ]; then
                docker build -t "$WORKER_LOCAL_IMAGE" -f "$REPO_ROOT/medsync-ai/Dockerfile" "$REPO_ROOT/medsync-ai"
                WORKER_IMAGE="$WORKER_LOCAL_IMAGE"
            else
                echo -e "\033[31mERROR: Cannot pull image and medsync-ai/Dockerfile not found.\033[0m"
                exit 1
            fi
        fi
    fi

    if [ -n "$(docker ps -a -q -f "name=^/${WORKER_CONTAINER}$")" ]; then
        docker rm -f "$WORKER_CONTAINER" >/dev/null 2>&1 || true
    fi

    docker volume create medsync-ai-model-cache >/dev/null 2>&1 || true

    echo "Launching container: $WORKER_CONTAINER..."
    docker run -d \
        --name "$WORKER_CONTAINER" \
        -p "${WORKER_PORT}:7860" \
        -v medsync-ai-model-cache:/home/user/app/models/cache \
        --env-file "$ENV_FILE" \
        --restart unless-stopped \
        "$WORKER_IMAGE"

    echo "$WORKER_CONTAINER" >> "$CONTAINERS_FILE"

    echo "Waiting for AI worker health check (http://127.0.0.1:${WORKER_PORT}/health)..."
    healthy=false
    for i in {1..30}; do
        if curl -s -f "http://127.0.0.1:${WORKER_PORT}/health" >/dev/null 2>&1; then
            healthy=true
            break
        fi
        sleep 2
    done

    if [ "$healthy" = true ]; then
        echo -e "\033[32mAI & RAG Worker is operational on http://127.0.0.1:${WORKER_PORT}\033[0m"
        echo -e "\033[36mEndpoints:\033[0m"
        echo -e "  • Diagnostics: http://127.0.0.1:${WORKER_PORT}/predict"
        echo -e "  • Embeddings:  http://127.0.0.1:${WORKER_PORT}/embed"
        echo ""
        echo -e "\033[33mIn your online Render backend environment settings, set:\033[0m"
        echo -e "  \033[36mRAG_WORKER_URL=https://<your-tunnel-url>\033[0m"
    else
        echo -e "\033[31mWARNING: Healthcheck did not pass within 60s. Inspect logs with: docker logs $WORKER_CONTAINER\033[0m"
    fi

    if [ "$FOLLOW_LOGS" = true ]; then
        docker logs -f "$WORKER_CONTAINER"
    fi

else
    BACKEND_REGISTRY_IMAGE="ghcr.io/dharshankumar988/medsync-backend:latest"
    BACKEND_LOCAL_IMAGE="medsync-backend:local"
    BACKEND_CONTAINER="medsync-backend"
    BACKEND_PORT="${CUSTOM_PORT:-8000}"

    echo -e "\033[36m--- Starting Full Backend on port $BACKEND_PORT ---\033[0m"

    BACKEND_IMAGE=""
    if docker images -q "$BACKEND_REGISTRY_IMAGE" >/dev/null 2>&1 && [ -n "$(docker images -q "$BACKEND_REGISTRY_IMAGE")" ]; then
        BACKEND_IMAGE="$BACKEND_REGISTRY_IMAGE"
    elif docker images -q "$BACKEND_LOCAL_IMAGE" >/dev/null 2>&1 && [ -n "$(docker images -q "$BACKEND_LOCAL_IMAGE")" ]; then
        BACKEND_IMAGE="$BACKEND_LOCAL_IMAGE"
    else
        echo -e "\033[36mPulling Backend image from registry: $BACKEND_REGISTRY_IMAGE...\033[0m"
        if docker pull "$BACKEND_REGISTRY_IMAGE"; then
            BACKEND_IMAGE="$BACKEND_REGISTRY_IMAGE"
        else
            echo -e "\033[33mRegistry pull failed. Attempting local build...\033[0m"
            REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
            DF="$REPO_ROOT/apps/backend/Dockerfile.full"
            [ ! -f "$DF" ] && DF="$REPO_ROOT/apps/backend/Dockerfile"
            if [ -f "$DF" ]; then
                docker build -t "$BACKEND_LOCAL_IMAGE" -f "$DF" "$REPO_ROOT"
                BACKEND_IMAGE="$BACKEND_LOCAL_IMAGE"
            else
                echo -e "\033[31mERROR: Cannot pull image and source Dockerfile not found.\033[0m"
                exit 1
            fi
        fi
    fi

    if [ -n "$(docker ps -a -q -f "name=^/${BACKEND_CONTAINER}$")" ]; then
        docker rm -f "$BACKEND_CONTAINER" >/dev/null 2>&1 || true
    fi

    docker volume create medsync-model-cache >/dev/null 2>&1 || true

    echo "Launching container: $BACKEND_CONTAINER..."
    docker run -d \
        --name "$BACKEND_CONTAINER" \
        -p "${BACKEND_PORT}:8000" \
        -v medsync-model-cache:/models \
        --env-file "$ENV_FILE" \
        --restart unless-stopped \
        "$BACKEND_IMAGE"

    echo "$BACKEND_CONTAINER" >> "$CONTAINERS_FILE"

    echo "Waiting for backend health check (http://127.0.0.1:${BACKEND_PORT}/health)..."
    healthy=false
    for i in {1..30}; do
        if curl -s -f "http://127.0.0.1:${BACKEND_PORT}/health" >/dev/null 2>&1; then
            healthy=true
            break
        fi
        sleep 2
    done

    if [ "$healthy" = true ]; then
        echo -e "\033[32mBackend is healthy on http://127.0.0.1:${BACKEND_PORT}\033[0m"
    else
        echo -e "\033[31mWARNING: Backend healthcheck did not pass within 60s. Inspect logs with: docker logs $BACKEND_CONTAINER\033[0m"
    fi

    if [ "$FOLLOW_LOGS" = true ]; then
        docker logs -f "$BACKEND_CONTAINER"
    fi
fi
