import asyncio
import time
import httpx
import argparse
import sys

async def measure_request(client, method, url, **kwargs):
    start = time.perf_counter()
    try:
        response = await client.request(method, url, timeout=10.0, **kwargs)
        duration = time.perf_counter() - start
        return response, duration, None
    except Exception as e:
        duration = time.perf_counter() - start
        return None, duration, str(e)

async def benchmark(backend_url: str):
    print("=======================================")
    print(f" MedSync Backend Benchmark Utility")
    print(f" Target: {backend_url}")
    print("=======================================")
    
    results = {}
    
    async with httpx.AsyncClient() as client:
        # 1. Local Health Check
        print("\n--- 1. Local Health Check ---")
        health_url = f"{backend_url}/health"
        res, duration, err = await measure_request(client, "GET", health_url)
        if err:
            print(f"[FAIL] Health check failed: {err}")
            results['health'] = {'status': 'FAIL', 'latency': duration}
        elif res.status_code == 200:
            print(f"[PASS] Health check latency: {duration*1000:.2f} ms")
            results['health'] = {'status': 'PASS', 'latency': duration}
        else:
            print(f"[FAIL] Health check returned {res.status_code}")
            results['health'] = {'status': f'FAIL ({res.status_code})', 'latency': duration}

        # 2. Basic Backend API Latency (Root)
        print("\n--- 2. Basic Backend API (Root) ---")
        root_url = f"{backend_url}/"
        res, duration, err = await measure_request(client, "GET", root_url)
        if err or res.status_code != 200:
            print(f"[FAIL] Root check failed: {err or res.status_code}")
            results['root'] = {'status': 'FAIL', 'latency': duration}
        else:
            print(f"[PASS] Root check latency: {duration*1000:.2f} ms")
            results['root'] = {'status': 'PASS', 'latency': duration}

    print("\n=======================================")
    print(" Benchmark Summary")
    print("=======================================")
    for key, val in results.items():
        status = val['status']
        lat = val['latency'] * 1000
        print(f"{key.capitalize():<15}: {status:<6} | {lat:.2f} ms")
    
    print("\nNote: Groq, Supabase, and HF Space #2 latency testing requires ")
    print("authenticated test accounts/API endpoints. For full diagnostic flow latency,")
    print("please trigger a diagnostic test from the Doctor UI and observe Network tab.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="MedSync Backend Benchmark Tool")
    parser.add_argument("--url", default="http://localhost:8000", help="Backend base URL")
    args = parser.parse_args()
    
    try:
        asyncio.run(benchmark(args.url))
    except KeyboardInterrupt:
        print("\nBenchmark cancelled.")
        sys.exit(0)
