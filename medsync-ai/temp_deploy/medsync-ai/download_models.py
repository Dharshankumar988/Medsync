import os
import urllib.request

HF_TOKEN = os.getenv("HF_TOKEN")
REPO_ID = "dharshan8197/medsync-ai-weights"
MODELS = ["bone.pt", "brain.pt", "kidney.pt", "skin_model.pt"]

os.makedirs("models", exist_ok=True)
for m in MODELS:
    print(f"Downloading {m}...")
    url = f"https://huggingface.co/{REPO_ID}/resolve/main/{m}"
    req = urllib.request.Request(url)
    req.add_header("Authorization", f"Bearer {HF_TOKEN}")
    try:
        with urllib.request.urlopen(req) as response:
            if response.status == 200:
                with open(f"models/{m}", "wb") as f:
                    f.write(response.read())
                print(f"Success {m}")
            else:
                print(f"Failed {m} {response.status}")
    except Exception as e:
        print(f"Error {m} {e}")
