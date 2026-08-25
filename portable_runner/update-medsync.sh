#!/bin/bash
set -e

echo -e "\033[36mUpdating MedSync backend...\033[0m"

# 1. Pull latest image
IMAGE_NAME="ghcr.io/dharshankumar988/medsync-backend:latest"
echo "Pulling latest image: $IMAGE_NAME..."
docker pull $IMAGE_NAME

# 2. Restart using start script
echo "Restarting container..."
./start-medsync.sh

echo -e "\033[32mUpdate complete!\033[0m"
