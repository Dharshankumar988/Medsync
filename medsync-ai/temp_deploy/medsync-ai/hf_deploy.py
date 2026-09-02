import os
import hashlib
from huggingface_hub import HfApi, hf_hub_download

repo_id = "Dharshan8197/medsync-ai-weights"
local_dir = r"C:\IMP PROJECTS\medsync-models"
verify_dir = r"C:\IMP PROJECTS\medsync-models-verification"

expected_hashes = {
    "bone.pt": "332156CB32317B650528438B984C043D11DA848DC6B680AE46AF74373F347113".lower(),
    "brain.pt": "CE3D5B48F0E36AEE35F0ABD96B66DDB3FFA022A74B8494458F1B5A9DD3D7EA08".lower(),
    "kidney.pt": "0C630A7B13EAC8739F1BD17D30462C6F3CFF54A340B386873114DB50B5462AAE".lower(),
    "skin_model.pt": "592F9A304827EF391DBF7E0DD1F7D17ABAB535FDEEB7B76FBE1C7B308704684B".lower()
}

def get_hash(path):
    sha256_hash = hashlib.sha256()
    with open(path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest().lower()

print("--- STEP 1: VERIFY LOCAL HASHES ---")
for file_name, expected in expected_hashes.items():
    file_path = os.path.join(local_dir, file_name)
    actual = get_hash(file_path)
    if actual != expected:
        raise ValueError(f"Hash mismatch for {file_name}! Expected: {expected}, Got: {actual}")
print("Local hashes match perfectly.")

print("\n--- STEP 2: CREATE REPO ---")
api = HfApi()
api.create_repo(repo_id=repo_id, repo_type="model", exist_ok=True)
print(f"Repository {repo_id} exists/created.")

print("\n--- STEP 3: UPLOAD MODELS ---")
api.upload_folder(
    folder_path=local_dir,
    repo_id=repo_id,
    repo_type="model",
    commit_message="Initial commit with production models"
)
print("Upload completed.")

print("\n--- STEP 4: VERIFY UPLOADED FILES ---")
files = api.list_repo_files(repo_id=repo_id, repo_type="model")
expected_files = ["bone.pt", "brain.pt", "kidney.pt", "skin_model.pt", "README.md"]
for ef in expected_files:
    if ef not in files:
        raise ValueError(f"Missing file in remote repo: {ef}")
print("All files present in remote repository.")

print("\n--- STEP 5: VERIFY REMOTE INTEGRITY ---")
os.makedirs(verify_dir, exist_ok=True)
for file_name, expected in expected_hashes.items():
    print(f"Downloading {file_name} for verification...")
    downloaded_path = hf_hub_download(
        repo_id=repo_id,
        repo_type="model",
        filename=file_name,
        local_dir=verify_dir,
        force_download=True
    )
    actual = get_hash(downloaded_path)
    if actual != expected:
        raise ValueError(f"Remote hash mismatch for {file_name}! Expected: {expected}, Got: {actual}")
    print(f"{file_name} remote hash perfectly matches.")

print("\n--- ALL STEPS COMPLETED SUCCESSFULLY ---")
