import json
import os

# Path to metadata and images directory
metadata_path = 'metadata_final.json'
images_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'images'))

with open(metadata_path, 'r') as f:
    data = json.load(f)

missing = []
for entry in data:
    rel_path = entry['image_path']
    # Remove any leading slashes
    rel_path = rel_path.lstrip('/')
    img_path = os.path.join(images_root, os.path.relpath(rel_path, 'images'))
    if not os.path.isfile(img_path):
        missing.append(rel_path)

if missing:
    print(f"Missing {len(missing)} images:")
    for m in missing:
        print(m)
else:
    print("All images found!")
