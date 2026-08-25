#!/bin/bash
set -e

CONTAINER_NAME="medsync-backend"

echo -e "\033[36mStopping MedSync backend...\033[0m"

if [ "$(docker ps -a -q -f name=^/${CONTAINER_NAME}$)" ]; then
    docker stop $CONTAINER_NAME > /dev/null
    echo -e "\033[32mContainer stopped successfully.\033[0m"
    echo "Note: Your environment configuration and persistent data have not been deleted."
else
    echo -e "\033[33mNo MedSync backend container is currently running.\033[0m"
fi
