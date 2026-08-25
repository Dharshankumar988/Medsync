import re

with open('dummy_values.sql', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Replace emails using regex
content = content.replace('demo.admin.01@medsync.com', 'admin@medsync.com')
content = re.sub(r'demo\.patient\.0*(\d+)@medsync\.com', r'patient\1@medsync.com', content)
content = re.sub(r'demo\.doctor\.0*(\d+)@medsync\.com', r'doctor\1@medsync.com', content)
content = re.sub(r'demo\.pharmacy\.0*(\d+)@medsync\.com', r'pharmacy\1@medsync.com', content)

# 2. Remove the second admin (UUID 1a000000-0000-0000-0000-000000000002)
# The UUID is used in auth.users, auth.identities, public.users, public.admins.
lines = content.split('\n')
new_lines = []

for i, line in enumerate(lines):
    if '1a000000-0000-0000-0000-000000000002' in line:
        # If the line has 'ON CONFLICT', we need to pull it up to the previous line
        if 'ON CONFLICT' in line:
            # Extract the ON CONFLICT part
            conflict_part = line[line.find('ON CONFLICT'):]
            # Replace the trailing comma on the previous line with the conflict part
            prev_line = new_lines.pop()
            if prev_line.strip().endswith(','):
                prev_line = prev_line.rsplit(',', 1)[0] + ' ' + conflict_part
            new_lines.append(prev_line)
    else:
        new_lines.append(line)

with open('dummy_values.sql', 'w', encoding='utf-8') as f:
    f.write('\n'.join(new_lines))

print("Done")
