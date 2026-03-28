import json
import os

# Load the metadata
with open('metadata_final.json', 'r') as f:
    data = json.load(f)

# Fix the image_path for each entry
def fix_path(entry):
    category = entry.get('category', '').strip().replace(' ', '%20')
    filename = entry.get('filename', '').strip().replace(' ', '%20')
    if category and filename:
        return f"images/{category}/{filename}"
    return entry['image_path']

for entry in data:
    entry['image_path'] = fix_path(entry)

# Save the fixed metadata
with open('metadata_final.json', 'w') as f:
    json.dump(data, f, indent=2)

print('Metadata image paths fixed!')
