#!/bin/bash
cd "/mnt/c/IMP PROJECTS/Medsync/apps/backend"
set -a
source .env
set +a
source ~/medsync_venv/bin/activate
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
