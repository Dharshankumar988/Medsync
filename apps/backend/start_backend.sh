#!/bin/bash
cd "/mnt/c/IMP PROJECTS/Medsync/apps/backend"
source venv_wsl/bin/activate
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
