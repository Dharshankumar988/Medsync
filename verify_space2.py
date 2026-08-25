import httpx
import asyncio
import sys
import os
import re
try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None

async def test_health(base_url, token):
    print(f"\n--- Testing Health at {base_url} ---")
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(f"{base_url}/health", headers=headers)
            print(f"Status: {resp.status_code}")
            if resp.status_code != 200:
                print(f"Response: {resp.text[:500]}...") # truncated for readability
            else:
                print(f"Response: {resp.text}")
            return resp.status_code == 200
    except Exception as e:
        print(f"Health test failed: {e}")
        return False

async def test_inference(base_url, token, scan_type, image_path):
    print(f"\n--- Testing {scan_type.upper()} ---")
    if not os.path.exists(image_path):
        print(f"BLOCKED: Image file not found: {image_path}")
        return "BLOCKED"
        
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    url = f"{base_url}/predict"
    
    try:
        with open(image_path, "rb") as f:
            image_bytes = f.read()
            
        files = {"file": ("test_image.jpg", image_bytes, "image/jpeg")}
        data = {"scan_type": scan_type}
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, files=files, data=data, headers=headers)
            print(f"Status: {resp.status_code}")
            
            if resp.status_code == 200:
                print(f"Result: {resp.json()}")
                return "PASS"
            else:
                print(f"Error: {resp.text}")
                return "FAIL"
    except Exception as e:
        print(f"FAIL: Request error: {e}")
        return "FAIL"

async def main():
    print("=== MEDSYNC AI SPACE #2 VERIFICATION ===")
    
    env_path = os.path.join("apps", "backend", ".env")
    if load_dotenv and os.path.exists(env_path):
        load_dotenv(env_path)
    
    # Try to load from env first
    default_url = os.environ.get("MEDSYNC_AI_URL", "https://dharshan8197-medsync-ai.hf.space")
    default_token = os.environ.get("MEDSYNC_AI_TOKEN", "")

    base_url = input(f"Enter your HF Space URL [{default_url}]: ").strip()
    if not base_url:
        base_url = default_url
    base_url = base_url.rstrip("/")
    
    # Auto-correct huggingface.co/spaces/User/Repo to user-repo.hf.space
    match = re.match(r"https?://huggingface\.co/spaces/([^/]+)/([^/]+)", base_url)
    if match:
        username = match.group(1).lower()
        spacename = match.group(2).lower()
        base_url = f"https://{username}-{spacename}.hf.space"
        print(f"Auto-corrected URL to direct Space endpoint: {base_url}")
        
    token = input(f"Enter your AI_SERVICE_TOKEN [{default_token if default_token else 'leave blank if none'}]: ").strip()
    if not token:
        token = default_token
    
    if not base_url.startswith("http"):
        print("Error: base_url must start with http:// or https://")
        return
        
    # Run health check
    is_healthy = await test_health(base_url, token)
    if not is_healthy:
        print("\nHealth check failed. Aborting inference tests.")
        return
        
    print("\nPlease provide paths to real test images for the 4 diagnostic models.")
    print("If you don't have an image for a specific type, leave it blank (will mark as BLOCKED).")
    
    img_bone = input("Path to Bone X-ray image: ").strip()
    img_brain = input("Path to Brain MRI image: ").strip()
    img_kidney = input("Path to Kidney scan image: ").strip()
    img_skin = input("Path to Skin lesion image: ").strip()
    
    results = {}
    
    for scan_type, path in [("bone", img_bone), ("brain", img_brain), ("kidney", img_kidney), ("skin", img_skin)]:
        if path:
            results[scan_type] = await test_inference(base_url, token, scan_type, path)
        else:
            results[scan_type] = "BLOCKED"
            
    print("\n==============================")
    print("FINAL REPORT - SPACE #2")
    print("==============================")
    for k, v in results.items():
        print(f"{k.capitalize()}: {v}")

if __name__ == "__main__":
    asyncio.run(main())
