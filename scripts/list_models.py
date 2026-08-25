import asyncio
import os
import sys

# Adjust python path to allow importing app modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../apps/backend')))

from app.ai.services.groq_client import groq_client

async def list_models():
    models = await groq_client.client.models.list()
    print([m.id for m in models.data])

if __name__ == "__main__":
    asyncio.run(list_models())
