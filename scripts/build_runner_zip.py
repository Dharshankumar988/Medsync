import os
import zipfile
import shutil

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SOURCE_DIR = os.path.join(ROOT_DIR, "portable_runner")
ZIP_NAME_1 = os.path.join(ROOT_DIR, "portable_runner.zip")
ZIP_NAME_2 = os.path.join(ROOT_DIR, "medsync-portable-runner.zip")

EXCLUDE_FILES = {".env"}

def build_zip():
    print(f"Packaging {SOURCE_DIR} into {ZIP_NAME_1} and {ZIP_NAME_2}...")
    
    # Create temporary zip
    temp_zip = os.path.join(ROOT_DIR, "temp_runner.zip")
    if os.path.exists(temp_zip):
        os.remove(temp_zip)

    with zipfile.ZipFile(temp_zip, "w", zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(SOURCE_DIR):
            for file in files:
                if file in EXCLUDE_FILES:
                    print(f"Excluding sensitive file: {file}")
                    continue
                file_path = os.path.join(root, file)
                rel_path = os.path.relpath(file_path, ROOT_DIR)
                # Ensure forward slashes for zip internal paths
                arcname = rel_path.replace("\\", "/")
                zf.write(file_path, arcname)
                print(f"Added: {arcname}")

    shutil.copyfile(temp_zip, ZIP_NAME_1)
    shutil.copyfile(temp_zip, ZIP_NAME_2)
    os.remove(temp_zip)

    print("\nVerifying archive contents:")
    with zipfile.ZipFile(ZIP_NAME_1, "r") as zf:
        for name in zf.namelist():
            print(f" - {name}")
            assert not name.endswith(".env"), "CRITICAL: .env must not be in zip!"

    print("\nZip archives created and verified successfully!")

if __name__ == "__main__":
    build_zip()
