import json

# Load your metadata
with open('metadata_final.json', 'r') as f:
    data = json.load(f)

# Update cobra descriptions
cobra_keywords = ['cobra', 'hood']
for item in data:
    desc = item.get('description', '').lower()
    if any(kw in desc for kw in cobra_keywords) or 'cobra' in item.get('species', '').lower():
        # Add more descriptive keywords if not present
        new_desc = item['description']
        if 'hood' not in desc:
            new_desc = new_desc.rstrip('.') + ', known for its hood.'
        if 'brown' not in desc and 'brown' in item.get('description', '').lower():
            pass  # already present
        elif 'brown' not in desc:
            new_desc = 'A photo of a brown cobra with a hood, which is a venomous snake.'
        item['description'] = new_desc

# Save the updated metadata
with open('metadata_final.json', 'w') as f:
    json.dump(data, f, indent=4)

print("✅ Cobra descriptions updated with 'hood' and 'brown' keywords!")
