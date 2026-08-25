import os
import sys
import asyncio
import httpx
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("verify_pulse_e2e")

API_URL = os.getenv("API_URL", "http://localhost:8000/api/v1")

# The test environment is expected to provide real JWT tokens for these roles.
PATIENT_JWT = os.getenv("TEST_PATIENT_JWT")
DOCTOR_JWT = os.getenv("TEST_DOCTOR_JWT")
PHARMACY_JWT = os.getenv("TEST_PHARMACY_JWT")
ADMIN_JWT = os.getenv("TEST_ADMIN_JWT")

# Colors for output
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
RESET = "\033[0m"

results = {}

def report(name, status, details=""):
    color = GREEN if status == "PASS" else RED if status == "FAIL" else YELLOW
    print(f"{color}[{status}]{RESET} {name} {details}")
    results[name] = status

async def make_request(method, endpoint, token, json_data=None):
    if not token:
        return None, "BLOCKED (No Token Provided)"
    
    headers = {"Authorization": f"Bearer {token}"}
    url = f"{API_URL}{endpoint}"
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            if method.upper() == "GET":
                response = await client.get(url, headers=headers)
            elif method.upper() == "POST":
                response = await client.post(url, headers=headers, json=json_data)
            return response, None
        except Exception as e:
            return None, f"FAIL (Connection Error: {e})"

async def test_patient_flows():
    print("\n--- PATIENT FLOWS ---")
    if not PATIENT_JWT:
        report("PATIENT PULSE -> Groq / RAG", "BLOCKED", "- Missing PATIENT_JWT")
        report("PATIENT -> Diagnostic Endpoint", "BLOCKED", "- Missing PATIENT_JWT")
        return

    # 1. Patient RAG / Groq (Pulse AI chat)
    res, err = await make_request("POST", "/ai/chat", PATIENT_JWT, {"message": "Hello", "context": {}})
    if err:
        report("PATIENT PULSE -> Groq / RAG", err.split(" ")[0], err)
    elif res.status_code == 200:
        report("PATIENT PULSE -> Groq / RAG", "PASS")
    else:
        report("PATIENT PULSE -> Groq / RAG", "FAIL", f"- Status {res.status_code}")

    # 2. Patient Diagnostic Access (Should be Denied)
    res, err = await make_request("POST", "/diagnostics/bone-fracture", PATIENT_JWT, {"image_url": "test"})
    if err:
        report("PATIENT -> Diagnostic Endpoint", err.split(" ")[0], err)
    elif res.status_code in [403, 401]:
        report("PATIENT -> Diagnostic Endpoint", "PASS", "- Correctly Denied")
    else:
        report("PATIENT -> Diagnostic Endpoint", "FAIL", f"- Unexpected Status {res.status_code}")


async def test_doctor_flows():
    print("\n--- DOCTOR FLOWS ---")
    if not DOCTOR_JWT:
        report("DOCTOR PULSE -> Groq", "BLOCKED", "- Missing DOCTOR_JWT")
        report("DOCTOR -> Bone Fracture Inference", "BLOCKED", "- Missing DOCTOR_JWT")
        report("DOCTOR -> Brain Tumour Inference", "BLOCKED", "- Missing DOCTOR_JWT")
        report("DOCTOR -> Kidney Stone Inference", "BLOCKED", "- Missing DOCTOR_JWT")
        report("DOCTOR -> Skin Classification Inference", "BLOCKED", "- Missing DOCTOR_JWT")
        return

    # 1. Doctor Groq / RAG
    res, err = await make_request("POST", "/ai/chat", DOCTOR_JWT, {"message": "Hello", "context": {}})
    if err:
        report("DOCTOR PULSE -> Groq", err.split(" ")[0], err)
    elif res.status_code == 200:
        report("DOCTOR PULSE -> Groq", "PASS")
    else:
        report("DOCTOR PULSE -> Groq", "FAIL", f"- Status {res.status_code}")

    # 2. Doctor Diagnostics
    models = ["bone-fracture", "brain-tumour", "kidney-stone", "skin-classification"]
    for model in models:
        # Provide a dummy image payload (the backend should hit HF space and return a valid AI response)
        res, err = await make_request("POST", f"/diagnostics/{model}", DOCTOR_JWT, {"image_url": "https://example.com/dummy.jpg"})
        if err:
            report(f"DOCTOR -> {model.title()} Inference", err.split(" ")[0], err)
        elif res.status_code == 200:
            data = res.json()
            if "diagnosis" in data or "result" in data:
                report(f"DOCTOR -> {model.title()} Inference", "PASS")
            else:
                report(f"DOCTOR -> {model.title()} Inference", "FAIL", "- Missing result payload")
        else:
            report(f"DOCTOR -> {model.title()} Inference", "FAIL", f"- Status {res.status_code}")


async def test_pharmacy_flows():
    print("\n--- PHARMACY FLOWS ---")
    if not PHARMACY_JWT:
        report("PHARMACY PULSE -> Groq", "BLOCKED", "- Missing PHARMACY_JWT")
        report("PHARMACY -> Own Stock RAG", "BLOCKED", "- Missing PHARMACY_JWT")
        report("PHARMACY -> Diagnostic Endpoint", "BLOCKED", "- Missing PHARMACY_JWT")
        return

    # 1. Pharmacy Groq / RAG
    res, err = await make_request("POST", "/ai/chat", PHARMACY_JWT, {"message": "Hello", "context": {}})
    if err:
        report("PHARMACY PULSE -> Groq", err.split(" ")[0], err)
    elif res.status_code == 200:
        report("PHARMACY PULSE -> Groq", "PASS")
    else:
        report("PHARMACY PULSE -> Groq", "FAIL", f"- Status {res.status_code}")

    # 2. Pharmacy Diagnostic Access (Should be Denied)
    res, err = await make_request("POST", "/diagnostics/bone-fracture", PHARMACY_JWT, {"image_url": "test"})
    if err:
        report("PHARMACY -> Diagnostic Endpoint", err.split(" ")[0], err)
    elif res.status_code in [403, 401]:
        report("PHARMACY -> Diagnostic Endpoint", "PASS", "- Correctly Denied")
    else:
        report("PHARMACY -> Diagnostic Endpoint", "FAIL", f"- Unexpected Status {res.status_code}")


async def test_admin_flows():
    print("\n--- ADMIN FLOWS ---")
    if not ADMIN_JWT:
        report("ADMIN PULSE -> Groq", "BLOCKED", "- Missing ADMIN_JWT")
        report("ADMIN -> Diagnostic Endpoint", "BLOCKED", "- Missing ADMIN_JWT")
        return

    # 1. Admin Groq / RAG
    res, err = await make_request("POST", "/ai/chat", ADMIN_JWT, {"message": "Hello", "context": {}})
    if err:
        report("ADMIN PULSE -> Groq", err.split(" ")[0], err)
    elif res.status_code == 200:
        report("ADMIN PULSE -> Groq", "PASS")
    else:
        report("ADMIN PULSE -> Groq", "FAIL", f"- Status {res.status_code}")

    # 2. Admin Diagnostic Access (Should be Denied)
    res, err = await make_request("POST", "/diagnostics/bone-fracture", ADMIN_JWT, {"image_url": "test"})
    if err:
        report("ADMIN -> Diagnostic Endpoint", err.split(" ")[0], err)
    elif res.status_code in [403, 401]:
        report("ADMIN -> Diagnostic Endpoint", "PASS", "- Correctly Denied")
    else:
        report("ADMIN -> Diagnostic Endpoint", "FAIL", f"- Unexpected Status {res.status_code}")


async def main():
    print("========================================")
    print("MEDSYNC E2E API SECURITY VERIFICATION")
    print("========================================")
    
    # 0. Health check
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(f"{API_URL.replace('/api/v1', '/health')}")
            if res.status_code == 200:
                report("Backend Health Check", "PASS")
            else:
                report("Backend Health Check", "FAIL", f"- Status {res.status_code}")
    except Exception as e:
        report("Backend Health Check", "FAIL", f"- Connection refused. Is the server running? {e}")

    await test_patient_flows()
    await test_doctor_flows()
    await test_pharmacy_flows()
    await test_admin_flows()

    print("\n========================================")
    print("SUMMARY")
    print("========================================")
    for name, status in results.items():
        color = GREEN if status == "PASS" else RED if status == "FAIL" else YELLOW
        print(f"{name}: {color}{status}{RESET}")
    
    if "FAIL" in results.values():
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
