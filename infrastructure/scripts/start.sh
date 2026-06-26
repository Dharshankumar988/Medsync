#!/bin/bash
echo "Starting MedSync Infrastructure..."
docker-compose up -d --build
echo "Infrastructure running on http://localhost"
