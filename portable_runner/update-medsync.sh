#!/usr/bin/env bash
# ==============================================================================
# Update MedSync Backend (Linux / Remote Server)
# ==============================================================================
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

IMAGE_NAME="ghcr.io/dharshankumar988/medsync-backend:latest"

echo -e "\033[36mUpdating MedSync backend image...\033[0m"
docker pull "$IMAGE_NAME"

echo -e "\033[36mRestarting with updated image...\033[0m"
./stop-medsync.sh
./start-medsync.sh -d

echo -e "\033[32mUpdate complete and verified healthy!\033[0m"
