#!/usr/bin/env bash
set -e

echo "Starting MedSync Backend..."

# Check if DATABASE_URL starts with postgresql (or postgres)
if [[ "${DATABASE_URL}" == postgresql* ]] || [[ "${DATABASE_URL}" == postgres* ]]; then
    echo "PostgreSQL DATABASE_URL detected. Running Alembic migrations..."
    # We navigate to /app just to be sure we are in the right directory where alembic.ini is
    cd /app
    
    # Try running alembic upgrade head
    if alembic upgrade head; then
        echo "Alembic migrations completed successfully."
    else
        echo "Alembic migrations failed! Exiting."
        exit 1
    fi
else
    echo "No PostgreSQL DATABASE_URL detected (or using SQLite/mock). Skipping migrations."
fi

echo "Starting Uvicorn..."
exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers --forwarded-allow-ips="*"
