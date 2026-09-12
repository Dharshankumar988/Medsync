import httpx
import json

base_url = "http://localhost:8000"
email = "admin@medsync.com"
password = "admin"

def test_endpoints():
    print(f"Testing endpoints on {base_url}...")
    
    # Login
    response = httpx.post(f"{base_url}/api/v1/auth/login", data={"username": email, "password": password})
    if response.status_code != 200:
        print(f"Login failed: {response.status_code} {response.text}")
        return
        
    token = response.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    
    print("Login successful.")
    
    endpoints = [
        "/api/v1/admin/dashboard",
        "/api/v1/admin/operations",
        "/api/v1/admin/security",
        "/api/v1/admin/ai"
    ]
    
    for ep in endpoints:
        resp = httpx.get(f"{base_url}{ep}", headers=headers)
        if resp.status_code == 200:
            print(f"PASS: {ep} - {resp.status_code}")
            print(f"Data: {json.dumps(resp.json(), indent=2)[:500]}...\n")
        else:
            print(f"FAIL: {ep} - {resp.status_code} {resp.text}\n")
            
    # Test unauthorized (no token)
    print("Testing unauthorized access...")
    for ep in endpoints:
        resp = httpx.get(f"{base_url}{ep}")
        if resp.status_code in (401, 403):
            print(f"PASS (Rejected Unauthorized): {ep} - {resp.status_code}")
        else:
            print(f"FAIL (Did not reject): {ep} - {resp.status_code}\n")

if __name__ == "__main__":
    test_endpoints()
