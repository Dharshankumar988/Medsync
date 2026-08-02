import os
import re

ui_dir = r"c:\IMP PROJECTS\Medsync\packages\ui\components"

for filename in os.listdir(ui_dir):
    if filename.endswith(".tsx") or filename.endswith(".ts"):
        filepath = os.path.join(ui_dir, filename)
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Replace "@/components/ui/XYZ" with "./XYZ"
        new_content = re.sub(r'["\']@/components/ui/([^"\']+)["\']', r'"./\1"', content)
        
        # Replace "@/lib/XYZ" with "@medsync/web/lib/XYZ" or we can just leave it as it might be complex. 
        # Actually in apps/web, the import alias for apps/web is not defined as @medsync/web.
        # But we can just use relative paths if needed, or leave it for now and see if we can just define @ in packages/ui tsconfig.
        
        if new_content != content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Fixed internal imports in {filename}")
