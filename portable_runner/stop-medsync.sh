#!/usr/bin/env bash
# ==============================================================================
# Stop MedSync Backend (Linux / Remote Server)
# ==============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTAINER_NAME="medsync-backend"

echo -e "\033[36mStopping MedSync services...\033[0m"

if [ -n "$(docker ps -a -q -f "name=^/${CONTAINER_NAME}$")" ]; then
    docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
    echo -e "\033[32mContainer $CONTAINER_NAME stopped and removed.\033[0m"
else
    echo "Container $CONTAINER_NAME was not running."
fi

CONTAINERS_FILE="$SCRIPT_DIR/.runner_containers.txt"
if [ -f "$CONTAINERS_FILE" ]; then
    rm -f "$CONTAINERS_FILE"
fi

echo -e "\033[32mMedSync shutdown complete.\033[0m"
