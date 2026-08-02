import os
import re

TARGET_DIR = r"c:\IMP PROJECTS\Medsync\apps\web"

# Regex to match imports from @/components/ui/...
pattern = re.compile(r'from\s+["\']@/components/ui/[^"\']+["\']')

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    new_content = pattern.sub('from "@medsync/ui"', content)

    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated: {filepath}")

for root, dirs, files in os.walk(TARGET_DIR):
    for filename in files:
        if filename.endswith(".ts") or filename.endswith(".tsx"):
            process_file(os.path.join(root, filename))

print("Done refactoring imports.")
