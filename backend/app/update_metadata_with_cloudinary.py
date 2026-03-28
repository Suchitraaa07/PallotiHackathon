import json

# 1. Load your JSON
with open('metadata_final.json', 'r') as f:
    data = json.load(f)

# 2. Your Cloudinary Base (update this if needed)
cloud_base = "https://res.cloudinary.com/dk5l8mpey/image/upload/v1/"

for item in data:
    # Construct the new URL: Base + Folder + Filename
    # Example: base/train/Venomous/cobra_01.jpg
    item['image_url'] = f"{cloud_base}train/{item['category']}/{item['filename']}"

# 3. Save the new version
with open('metadata_final.json', 'w') as f:
    json.dump(data, f, indent=4)

print("✅ Metadata updated with Cloudinary URLs!")
