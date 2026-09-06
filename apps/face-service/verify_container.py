import urllib.request
import requests
import time
import json
import os
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

TOKEN = "local-dev-token"
URL_BASE = "http://localhost:8080"
HEADERS = {"Authorization": f"Bearer {TOKEN}"}

# Image URLs
IMAGES = {
    "one_face": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "matching_face": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "non_matching_face": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "zero_faces": "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "multiple_faces": "https://images.unsplash.com/photo-1511632765486-a01980e01a18?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
}

def download_images():
    print("Downloading test images...")
    headers = {"User-Agent": "Mozilla/5.0"}
    for name, url in IMAGES.items():
        filename = f"{name}.jpg"
        try:
            resp = requests.get(url, headers=headers, verify=False)
            with open(filename, "wb") as f:
                f.write(resp.content)
            print(f"Downloaded {filename}")
        except Exception as e:
            print(f"Failed to download {filename}: {e}")
    print("Download complete.")

def run_tests():
    print("\n--- Testing /health ---")
    t0 = time.time()
    resp = requests.get(f"{URL_BASE}/health")
    dur = (time.time() - t0) * 1000
    print(f"Status: {resp.status_code}, Latency: {dur:.1f}ms, Body: {resp.json()}")

    print("\n--- Testing /detect (One Face) ---")
    with open("one_face.jpg", "rb") as f:
        t0 = time.time()
        resp = requests.post(f"{URL_BASE}/detect", headers=HEADERS, files={"image": f})
        dur = (time.time() - t0) * 1000
        print(f"Status: {resp.status_code}, Latency: {dur:.1f}ms, Body: {resp.json()}")

    print("\n--- Testing /detect (Zero Faces) ---")
    with open("zero_faces.jpg", "rb") as f:
        t0 = time.time()
        resp = requests.post(f"{URL_BASE}/detect", headers=HEADERS, files={"image": f})
        dur = (time.time() - t0) * 1000
        print(f"Status: {resp.status_code}, Latency: {dur:.1f}ms, Body: {resp.json()}")

    print("\n--- Testing /detect (Multiple Faces) ---")
    with open("multiple_faces.jpg", "rb") as f:
        t0 = time.time()
        resp = requests.post(f"{URL_BASE}/detect", headers=HEADERS, files={"image": f})
        dur = (time.time() - t0) * 1000
        print(f"Status: {resp.status_code}, Latency: {dur:.1f}ms, Body: {resp.json()}")

    print("\n--- Testing /enroll (One Face) ---")
    with open("one_face.jpg", "rb") as f:
        t0 = time.time()
        resp = requests.post(f"{URL_BASE}/enroll", headers=HEADERS, files={"image": f})
        dur = (time.time() - t0) * 1000
        data = resp.json()
        print(f"Status: {resp.status_code}, Latency: {dur:.1f}ms")
        embedding = data.get("embedding")
        if embedding:
            print(f"Extracted embedding of length {len(embedding)}")
        else:
            print(f"Error: {data}")

    print("\n--- Testing /verify (Matching Face) ---")
    with open("matching_face.jpg", "rb") as f:
        t0 = time.time()
        resp = requests.post(f"{URL_BASE}/verify", headers=HEADERS, files={"image": f}, data={"registered_embedding": json.dumps(embedding)})
        dur = (time.time() - t0) * 1000
        print(f"Status: {resp.status_code}, Latency: {dur:.1f}ms, Body: {resp.json()}")

    print("\n--- Testing /verify (Non-Matching Face) ---")
    with open("non_matching_face.jpg", "rb") as f:
        t0 = time.time()
        resp = requests.post(f"{URL_BASE}/verify", headers=HEADERS, files={"image": f}, data={"registered_embedding": json.dumps(embedding)})
        dur = (time.time() - t0) * 1000
        print(f"Status: {resp.status_code}, Latency: {dur:.1f}ms, Body: {resp.json()}")

    print("\n--- Testing /verify (Zero Faces) ---")
    with open("zero_faces.jpg", "rb") as f:
        t0 = time.time()
        resp = requests.post(f"{URL_BASE}/verify", headers=HEADERS, files={"image": f}, data={"registered_embedding": json.dumps(embedding)})
        dur = (time.time() - t0) * 1000
        print(f"Status: {resp.status_code}, Latency: {dur:.1f}ms, Body: {resp.json()}")

    print("\n--- Testing /verify (Multiple Faces) ---")
    with open("multiple_faces.jpg", "rb") as f:
        t0 = time.time()
        resp = requests.post(f"{URL_BASE}/verify", headers=HEADERS, files={"image": f}, data={"registered_embedding": json.dumps(embedding)})
        dur = (time.time() - t0) * 1000
        print(f"Status: {resp.status_code}, Latency: {dur:.1f}ms, Body: {resp.json()}")


if __name__ == "__main__":
    download_images()
    print("\nWaiting 10 seconds for container startup...")
    time.sleep(10)
    run_tests()
