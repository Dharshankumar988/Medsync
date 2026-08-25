#!/bin/bash
set -e

CONTAINER_NAME="medsync-backend"
PORT=8000

echo -e "\033[36m=== MedSync Status ===\033[0m"

# Docker status
if ! docker info &> /dev/null; then
    echo -e "Docker:           \033[31mNOT RUNNING\033[0m"
    exit 1
else
    echo "Docker:           READY"
fi

# Container status
if ! docker inspect -f '{{.State.Status}}' $CONTAINER_NAME &> /dev/null; then
    echo -e "Container:        \033[33mNOT FOUND\033[0m"
    exit 1
else
    STATUS=$(docker inspect -f '{{.State.Status}}' $CONTAINER_NAME)
    echo "Container:        ${STATUS^^}"
fi

# Image version
IMAGE=$(docker inspect -f '{{.Config.Image}}' $CONTAINER_NAME)
echo "Image version:    $IMAGE"
echo "Port:             $PORT"

# Health status
if curl -s -f http://localhost:${PORT}/health > /dev/null; then
    echo -e "Backend:          \033[32mREADY\033[0m"
    echo "Health endpoint:  HTTP 200"
else
    echo -e "Backend:          \033[31mUNHEALTHY/UNREACHABLE\033[0m"
    echo "Health endpoint:  FAILED"
fi

echo -e "\n\033[36m--- Recent Logs ---\033[0m"
docker logs --tail 15 $CONTAINER_NAME
