import asyncio
import httpx
import time
import sys

BASE_URL = "http://localhost:8000/api/v1"
CONCURRENCY = 100
TOTAL_REQUESTS = 500

async def fetch(client, i):
    try:
        response = await client.get(f"http://localhost:8000/health")
        return response.status_code
    except Exception as e:
        return str(e)

async def run_load_test():
    print(f"Starting Load Test with {CONCURRENCY} concurrent users, {TOTAL_REQUESTS} total requests...")
    
    async with httpx.AsyncClient() as client:
        start_time = time.time()
        
        tasks = []
        for i in range(TOTAL_REQUESTS):
            tasks.append(fetch(client, i))
            
            # Simple concurrency control
            if len(tasks) >= CONCURRENCY:
                results = await asyncio.gather(*tasks)
                tasks = []
                
        if tasks:
            await asyncio.gather(*tasks)
            
        end_time = time.time()
        
        duration = end_time - start_time
        print(f"Load Test Completed in {duration:.2f} seconds.")
        print(f"Requests per second: {TOTAL_REQUESTS / duration:.2f}")

if __name__ == "__main__":
    asyncio.run(run_load_test())
