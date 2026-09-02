import sys
import os
import asyncio
import time
import httpx
from dotenv import load_dotenv

# Load dotenv FIRST
env_path = os.path.join(os.path.dirname(__file__), 'apps', 'backend', '.env')
load_dotenv(env_path)

sys.path.append(os.path.join(os.path.dirname(__file__), 'apps', 'backend'))

from app.ai.client import ai_client
from app.core.config import settings

# Force UTF-8 stdout
import codecs
sys.stdout = codecs.getwriter('utf8')(sys.stdout.detach())

async def test_inference(scan_type, img_bytes):
    print(f"\n--- Testing {scan_type} ---")
    start = time.time()
    try:
        res = await ai_client.predict(scan_type, img_bytes)
        elapsed = time.time() - start
        print(f"Status: PASS ({elapsed:.2f}s)")
        print(f"Response keys: {list(res.keys())}")
        return {"status": "✅ VERIFIED", "response": res, "time": elapsed}
    except httpx.HTTPStatusError as e:
        elapsed = time.time() - start
        print(f"HTTPStatusError: {e.response.status_code} - {e.response.text}")
        return {"status": "❌ FAILED", "response": f"{e.response.status_code} {e.response.text}", "time": elapsed}
    except Exception as e:
        elapsed = time.time() - start
        print("Error:", e)
        return {"status": "❌ FAILED", "response": str(e), "time": elapsed}

async def main():
    print(f"Backend configured AI Token: '{settings.MEDSYNC_AI_TOKEN[:10]}...'")
    print(f"Client headers: {ai_client.headers.keys()}")
    
    with open(os.path.join('apps', 'backend', 'test_face.jpg'), 'rb') as f:
        img_bytes = f.read()
    
    # Test all 4 models
    results = {}
    for model in ["bone", "brain", "kidney", "skin"]:
        results[model] = await test_inference(model, img_bytes)
        
    print("\n\n=== FINAL RESULTS ===")
    for model, res in results.items():
        print(f"{model.capitalize()}: {res['status']} ({res['time']:.2f}s)")

if __name__ == "__main__":
    asyncio.run(main())
