import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app.services.seed import seed_database

if __name__ == "__main__":
    asyncio.run(seed_database())
