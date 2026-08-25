import re

with open('dummy_values.sql', 'r', encoding='utf-8') as f:
    text = f.read()

# Fix the last segment if it has exactly 11 digits
text = re.sub(r'(-)([0-9a-f]{11})([^0-9a-f])', r'\g<1>0\g<2>\g<3>', text)

# Fix the first segment if it has 7 digits
text = re.sub(r'([\'\"])([0-9a-f]{7})(-)', r'\g<1>\g<2>0\g<3>', text)

with open('dummy_values.sql', 'w', encoding='utf-8') as f:
    f.write(text)
