#!/bin/bash
set -e

echo -e "\033[36mMedSync backend starting...\033[0m"

# 1. Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "\033[31mERROR: Docker is not installed or not in your PATH.\033[0m"
    echo "Please install Docker from https://docs.docker.com/get-docker/"
    exit 1
fi

# 2. Check if Docker is running
if ! docker info &> /dev/null; then
    echo -e "\033[31mERROR: Docker daemon is not running.\033[0m"
    echo "Please start Docker and try again."
    exit 1
fi

# 3. Check for medsync.env
if [ ! -f "medsync.env" ]; then
    echo -e "\033[31mERROR: medsync.env file not found in the current directory.\033[0m"
    echo "Please copy medsync.env.example to medsync.env and fill in your credentials."
    exit 1
fi

IMAGE_NAME="ghcr.io/dharshankumar988/medsync-backend:latest"
CONTAINER_NAME="medsync-backend"
PORT=8000

# 5. Pull image
echo "Pulling latest image: $IMAGE_NAME..."
docker pull $IMAGE_NAME

# 6. Stop existing container if running
if [ "$(docker ps -a -q -f name=^/${CONTAINER_NAME}$)" ]; then
    echo "Stopping existing container..."
    docker rm -f $CONTAINER_NAME > /dev/null
fi

# 7. Start container
echo "Starting container $CONTAINER_NAME on port $PORT..."
docker run -d --name $CONTAINER_NAME -p ${PORT}:8000 --env-file medsync.env $IMAGE_NAME

# 8. Wait for health check
echo "Waiting for backend to become healthy..."
healthy=false
for i in {1..30}; do
    sleep 2
    if curl -s -f http://localhost:${PORT}/health > /dev/null; then
        healthy=true
        break
    fi
done

if [ "$healthy" = true ]; then
    echo -e "\n\033[32m=== STATUS ===\033[0m"
    echo "Container:  $CONTAINER_NAME"
    echo "Local API:  http://localhost:${PORT}"
    echo "Health:     http://localhost:${PORT}/health"
    echo -e "Status:     \033[32mREADY\033[0m"
    echo -e "================\n"
else
    echo -e "\n\033[33mWARNING: Backend did not report healthy within 60 seconds.\033[0m"
    echo "Check logs with: docker logs $CONTAINER_NAME"
fi
