import os

def safe_replace(directory, old_str, new_str):
    for root, _, files in os.walk(directory):
        if "venv" in root or "__pycache__" in root or ".git" in root:
            continue
        for file in files:
            if not file.endswith(".py"):
                continue
            filepath = os.path.join(root, file)
            try:
                if os.path.getsize(filepath) == 0:
                    continue
                with open(filepath, "r", encoding="utf-8") as f:
                    content = f.read()
                
                if old_str in content:
                    new_content = content.replace(old_str, new_str)
                    with open(filepath, "w", encoding="utf-8") as f:
                        f.write(new_content)
                    print(f"Updated {filepath}")
            except Exception as e:
                print(f"Error processing {filepath}: {e}")

if __name__ == "__main__":
    d = r'c:\IMP PROJECTS\Medsync\apps\backend'
    print("Replacing app.ai.services.hf_llm_client ...")
    safe_replace(d, "app.ai.services.hf_llm_client", "app.ai.services.hf_llm_client")
    print("Replacing hf_llm_client ...")
    safe_replace(d, "hf_llm_client", "hf_llm_client")
    print("Replacing LLM_MODEL_ ...")
    safe_replace(d, "LLM_MODEL_", "LLM_MODEL_")
