import asyncio
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../apps/backend')))
from app.ai.services.groq_client import groq_client

async def test_it():
    try:
        groq_client._active_model = 'qwen-2.5-32b'
        res = await groq_client.chat_completion([{'role':'user', 'content':'hello'}])
        print("RESULT:", res)
    except Exception as e:
        print("ERROR:", e)

if __name__ == "__main__":
    asyncio.run(test_it())
