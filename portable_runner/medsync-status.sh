#!/usr/bin/env bash
# ==============================================================================
# MedSync Status Script (Linux / Remote Server)
# ==============================================================================
CONTAINER_NAME="medsync-backend"
PORT="${PORT:-8000}"

echo -e "\033[36m=============================\033[0m"
echo -e "\033[36mMedSync Backend Status\033[0m"
echo -e "\033[36m=============================\033[0m"

# Docker status
if docker info >/dev/null 2>&1; then
    echo -e "Docker: \033[32mREADY\033[0m"
else
    echo -e "Docker: \033[31mNOT RUNNING\033[0m"
    exit 1
fi

# Container status
STATUS=$(docker ps -a --format "{{.Status}}" -f "name=^/${CONTAINER_NAME}$")
if [ -z "$STATUS" ]; then
    echo -e "Container: \033[31mNOT FOUND\033[0m"
elif [[ "$STATUS" == *"Up"* ]]; then
    echo -e "Container: \033[32mRUNNING ($STATUS)\033[0m"
else
    echo -e "Container: \033[33mSTOPPED ($STATUS)\033[0m"
fi

# API health
if curl -s -f "http://127.0.0.1:${PORT}/health" >/dev/null 2>&1; then
    echo -e "Local API: \033[32mHEALTHY (HTTP 200)\033[0m"
else
    echo -e "Local API: \033[31mUNREACHABLE / UNHEALTHY\033[0m"
fi

echo -e "\033[36m=============================\033[0m"
