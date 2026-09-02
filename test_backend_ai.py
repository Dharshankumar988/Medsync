import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'apps', 'backend'))

import asyncio
from app.ai.client import ai_client
from app.core.config import settings
import httpx
from dotenv import load_dotenv

load_dotenv('apps/backend/.env')

async def main():
    hf_token = os.getenv("HF_TOKEN")
    print(f"Trying HF_TOKEN as AI_SERVICE_TOKEN: {hf_token[:10]}...")
    
    ai_client.headers["Authorization"] = f"Bearer {hf_token}"
    
    with open(os.path.join('apps', 'backend', 'test_face.jpg'), 'rb') as f:
        img_bytes = f.read()

    print("\n--- Testing Backend AI Client Inference (bone) ---")
    try:
        res = await ai_client.predict("bone", img_bytes)
        print("Inference response:", res)
    except httpx.HTTPStatusError as e:
        print(f"HTTPStatusError: {e.response.status_code} - {e.response.text}")
    except Exception as e:
        print("Error:", e)
        
    print("\n--- Testing Backend AI Client Inference (skin) ---")
    try:
        res = await ai_client.predict("skin", img_bytes)
        print("Inference response:", res)
    except httpx.HTTPStatusError as e:
        print(f"HTTPStatusError: {e.response.status_code} - {e.response.text}")

if __name__ == "__main__":
    asyncio.run(main())
