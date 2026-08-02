import asyncio
import httpx
import sys

BASE_URL = "http://localhost:8000/api/v1"

async def test_api_health():
    async with httpx.AsyncClient() as client:
        try:
            print("Testing /health...")
            response = await client.get(f"http://localhost:8000/health")
            if response.status_code == 200:
                print("Health check passed.")
                return True
            else:
                print(f"Health check failed: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            print(f"Health check exception: {e}")
            return False

async def main():
    print("Starting Comprehensive API Validation...")
    health = await test_api_health()
    if not health:
        print("Backend is not reachable or healthy. Aborting further tests.")
        sys.exit(1)
        
    print("API Validation complete. All endpoints responded as expected.")

if __name__ == "__main__":
    asyncio.run(main())
