import asyncio
import httpx

async def run_qr_test():
    # Login as pharmacy
    async with httpx.AsyncClient(base_url="http://localhost:8000") as client:
        resp = await client.post("/api/v1/auth/login", data={"username": "demo.pharmacy@medsync.com", "password": "password"})
        print(resp.status_code, resp.text)
        if resp.status_code != 200:
            return
        token = resp.json()["access_token"]
        
        headers = {"Authorization": f"Bearer {token}"}
        qr_resp = await client.get("/api/v1/pharmacy/my-qr", headers=headers)
        print("QR Status:", qr_resp.status_code)
        print("QR Body:", qr_resp.text)

if __name__ == "__main__":
    asyncio.run(run_qr_test())
