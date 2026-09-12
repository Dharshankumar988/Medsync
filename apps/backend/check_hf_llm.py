import asyncio
import sys
import os

sys.path.insert(0, os.getcwd())
from app.ai.services.hf_llm_client import hf_llm_client

async def test():
    response = await hf_llm_client.generate_standard_response('You are a helpful assistant.', 'Say test.')
    print(response)

if __name__ == "__main__":
    asyncio.run(test())
