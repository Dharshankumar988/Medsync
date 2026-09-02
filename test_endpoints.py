import os
import httpx
import asyncio

BASE_URL = "http://127.0.0.1:8000"

async def get_token():
    async with httpx.AsyncClient() as client:
        # Try to register
        try:
            reg_data = {
                "email": "testagent@medsync.com",
                "password": "Password123!",
                "first_name": "Test",
                "last_name": "Agent",
                "role": "doctor"
            }
            await client.post(f"{BASE_URL}/api/v1/auth/register", json=reg_data)
        except Exception:
            pass
            
        # Login
        login_data = {
            "username": "testagent@medsync.com",
            "password": "Password123!"
        }
        r = await client.post(f"{BASE_URL}/api/v1/auth/login", data=login_data)
        return r.json().get("access_token")

async def test_pulse_chat(token):
    print("\n=== Testing PULSE Chat ===")
    url = f"{BASE_URL}/api/v1/ai/pulse/chat"
    data = {
        "message": "Hello PULSE, what is your purpose?",
        "context": {},
        "patient_id": "test_patient",
        "system_prompt_override": "You are a helpful medical assistant."
    }
    headers = {"Authorization": f"Bearer {token}"}
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            r = await client.post(url, json=data, headers=headers)
            print(f"Status: {r.status_code}")
            res = r.json()
            if r.status_code == 200:
                print(f"Response snippet: {res['response'][:100]}...")
            else:
                print("Failed:", res)
            return r.status_code == 200, res
        except Exception as e:
            print("PULSE test failed:", e)
            return False, str(e)

async def test_image_analysis(scan_type, token):
    print(f"\n=== Testing Image Analysis: {scan_type} ===")
    url = f"{BASE_URL}/api/v1/ai/analyze-image"
    img_path = os.path.join("apps", "backend", "test_face.jpg")
    
    with open(img_path, "rb") as f:
        img_bytes = f.read()
        
    data = {"scan_type": scan_type}
    files = {"file": ("test_face.jpg", img_bytes, "image/jpeg")}
    headers = {"Authorization": f"Bearer {token}"}
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            r = await client.post(url, data=data, files=files, headers=headers)
            print(f"Status: {r.status_code}")
            res = r.json()
            if r.status_code == 200:
                print("Prediction success!")
                print(f"Clinical Explanation included: {bool(res.get('clinical_explanation'))}")
            else:
                print("Failed:", res)
            return r.status_code == 200, res
        except Exception as e:
            print("Image analysis test failed:", e)
            return False, str(e)

async def main():
    token = await get_token()
    if not token:
        print("Failed to get auth token!")
        return
        
    print(f"Got JWT Token: {token[:10]}...")
    
    pulse_success, pulse_res = await test_pulse_chat(token)
    
    results = {}
    for model in ["bone", "brain", "kidney", "skin"]:
        success, res = await test_image_analysis(model, token)
        results[model] = {"success": success, "res": res}
        
    print("\n\n=== FINAL RESULTS ===")
    for model, res in results.items():
        print(f"{model.capitalize()}: {'✅ VERIFIED' if res['success'] else '❌ FAILED'}")
        
    print(f"PULSE: {'✅ VERIFIED' if pulse_success else '❌ FAILED'}")

if __name__ == "__main__":
    asyncio.run(main())
