import json

# 1. Load your current JSON
with open('high_precision_metadata.json', 'r') as f:
    data = json.load(f)

# 2. Add visual keywords to Cobra and Viper entries
for entry in data:
    species = entry.get('species', '').lower()
    label = entry.get('label', '').lower() if 'label' in entry else ''
    
    if 'cobra' in species or 'cobra' in label:
        # Enrich the description with visual features
        entry['description'] = (
            f"A photo of a brown Indian Cobra showing its distinctive hood. "
            f"This is a highly venomous and dangerous snake often found in Nagpur."
        )
    elif 'viper' in species:
        entry['description'] = (
            f"A photo of a Russell's Viper with triangular head and diamond patterns. "
            f"A dangerous venomous snake."
        )

# 3. Save as the new "Gold Standard"
with open('enriched_metadata.json', 'w') as f:
    json.dump(data, f, indent=4)

print("✅ Metadata enriched with visual keywords!")
