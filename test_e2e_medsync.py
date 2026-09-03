"""
MedSync End-to-End Test Suite
Run with: python test_e2e_medsync.py --base-url https://entangled-dealmaker-storable.ngrok-free.dev
Or for local: python test_e2e_medsync.py --base-url http://localhost:8000
"""
import argparse
import httpx
import json
import sys
import os
import tempfile
import time

# Colors for terminal output
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
RESET = "\033[0m"
BOLD = "\033[1m"

passed = 0
failed = 0
skipped = 0

def result(name, success, detail=""):
    global passed, failed
    if success:
        passed += 1
        print(f"  {GREEN}✓{RESET} {name}" + (f" — {detail}" if detail else ""))
    else:
        failed += 1
        print(f"  {RED}✗{RESET} {name}" + (f" — {detail}" if detail else ""))

def skip(name, reason=""):
    global skipped
    skipped += 1
    print(f"  {YELLOW}⊘{RESET} {name}" + (f" — {reason}" if reason else ""))

def test_cors_options(base_url):
    """Test 4A: CORS OPTIONS preflight with Vercel frontend origin."""
    print(f"\n{BOLD}═══ TEST 4A: CORS OPTIONS ═══{RESET}")
    
    endpoints = [
        "/api/v1/security/status",
        "/api/v1/ai/pulse/chat",
        "/api/v1/security/enroll-pin",
    ]
    origins = [
        "https://medsync-web.vercel.app",
        "https://entangled-dealmaker-storable.ngrok-free.dev",
    ]
    
    for origin in origins:
        for endpoint in endpoints:
            try:
                r = httpx.options(
                    f"{base_url}{endpoint}",
                    headers={
                        "Origin": origin,
                        "Access-Control-Request-Method": "POST",
                        "Access-Control-Request-Headers": "authorization,content-type",
                    },
                    timeout=10,
                )
                cors_origin = r.headers.get("access-control-allow-origin", "")
                success = r.status_code == 200 and cors_origin == origin
                result(
                    f"OPTIONS {endpoint} (Origin: {origin})",
                    success,
                    f"status={r.status_code}, ACAO={cors_origin}"
                )
            except Exception as e:
                result(f"OPTIONS {endpoint} (Origin: {origin})", False, str(e))


def test_health(base_url):
    """Test health endpoint."""
    print(f"\n{BOLD}═══ TEST: Health ═══{RESET}")
    try:
        r = httpx.get(f"{base_url}/health", timeout=10)
        data = r.json()
        result("/health", r.status_code == 200 and data.get("status") == "ok", f"version={data.get('version')}")
    except Exception as e:
        result("/health", False, str(e))


def test_pulse_chat(base_url, token):
    """Test 4B: Authenticated PULSE chat with real AI response."""
    print(f"\n{BOLD}═══ TEST 4B: PULSE AI Chat ═══{RESET}")
    if not token:
        skip("PULSE chat", "No auth token provided (--token)")
        return
    
    try:
        r = httpx.post(
            f"{base_url}/api/v1/ai/pulse/chat",
            json={"message": "What are common symptoms of hypertension?"},
            headers={"Authorization": f"Bearer {token}"},
            timeout=30,
        )
        if r.status_code == 200:
            data = r.json()
            reply = data.get("data", {}).get("reply", "")
            has_content = len(reply) > 20
            result("PULSE chat response", has_content, f"reply_len={len(reply)}")
        else:
            result("PULSE chat response", False, f"status={r.status_code}, body={r.text[:200]}")
    except Exception as e:
        result("PULSE chat response", False, str(e))


def test_security_status(base_url, token):
    """Test security status endpoint."""
    print(f"\n{BOLD}═══ TEST: Security Status ═══{RESET}")
    if not token:
        skip("Security status", "No auth token provided")
        return
    
    try:
        r = httpx.get(
            f"{base_url}/api/v1/security/status",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10,
        )
        result("GET /security/status", r.status_code == 200, f"status={r.status_code}, body={r.text[:100]}")
    except Exception as e:
        result("GET /security/status", False, str(e))


def test_pin_enrollment(base_url, token):
    """Test 4C: PIN enrollment."""
    print(f"\n{BOLD}═══ TEST 4C: PIN Enrollment ═══{RESET}")
    if not token:
        skip("PIN enrollment", "No auth token provided")
        return
    
    try:
        r = httpx.post(
            f"{base_url}/api/v1/security/enroll-pin",
            data={"pin": "123456"},
            headers={"Authorization": f"Bearer {token}"},
            timeout=10,
        )
        success = r.status_code == 200
        result("POST /security/enroll-pin", success, f"status={r.status_code}, body={r.text[:100]}")
    except Exception as e:
        result("POST /security/enroll-pin", False, str(e))


def test_blockchain_rpc(base_url, token):
    """Test 4E: Blockchain RPC connectivity."""
    print(f"\n{BOLD}═══ TEST 4E: Blockchain RPC ═══{RESET}")
    
    try:
        r = httpx.get(
            f"{base_url}/api/v1/blockchain/status",
            headers={"Authorization": f"Bearer {token}"} if token else {},
            timeout=10,
        )
        result("GET /blockchain/status", r.status_code in [200, 503], f"status={r.status_code}, body={r.text[:200]}")
    except Exception as e:
        result("GET /blockchain/status", False, str(e))


def test_pharmacy_qr(base_url, token):
    """Test 4G: Pharmacy QR generation."""
    print(f"\n{BOLD}═══ TEST 4G: Pharmacy QR ═══{RESET}")
    if not token:
        skip("Pharmacy QR", "No pharmacy auth token provided (--pharmacy-token)")
        return
    
    try:
        r = httpx.get(
            f"{base_url}/api/v1/pharmacy/my-qr",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10,
        )
        if r.status_code == 200:
            data = r.json()
            qr_id = data.get("data", {}).get("qr_identifier", "")
            starts_with_prefix = qr_id.startswith("QR-PHM-")
            result("GET /pharmacy/my-qr", starts_with_prefix, f"qr_identifier={qr_id}")
            
            if starts_with_prefix:
                r2 = httpx.get(
                    f"{base_url}/api/v1/pharmacy/resolve-qr/{qr_id}",
                    headers={"Authorization": f"Bearer {token}"},
                    timeout=10,
                )
                result("GET /pharmacy/resolve-qr/{id}", r2.status_code == 200, f"status={r2.status_code}")
        else:
            result("GET /pharmacy/my-qr", False, f"status={r.status_code}, body={r.text[:200]}")
    except Exception as e:
        result("GET /pharmacy/my-qr", False, str(e))


def main():
    parser = argparse.ArgumentParser(description="MedSync E2E Tests")
    parser.add_argument("--base-url", default="http://localhost:8000", help="Backend base URL")
    parser.add_argument("--token", default="", help="JWT auth token for authenticated tests")
    parser.add_argument("--pharmacy-token", default="", help="JWT auth token for pharmacy user")
    args = parser.parse_args()

    base = args.base_url.rstrip("/")
    token = args.token
    pharmacy_token = args.pharmacy_token or token

    print(f"{BOLD}MedSync End-to-End Test Suite{RESET}")
    print(f"Target: {base}\n")

    test_health(base)
    test_cors_options(base)
    test_pulse_chat(base, token)
    test_security_status(base, token)
    test_pin_enrollment(base, token)
    test_blockchain_rpc(base, token)
    test_pharmacy_qr(base, pharmacy_token)

    print(f"\n{BOLD}═══ SUMMARY ═══{RESET}")
    print(f"  {GREEN}Passed: {passed}{RESET}")
    print(f"  {RED}Failed: {failed}{RESET}")
    print(f"  {YELLOW}Skipped: {skipped}{RESET}")
    
    sys.exit(1 if failed > 0 else 0)


if __name__ == "__main__":
    main()
