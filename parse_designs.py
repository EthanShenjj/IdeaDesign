import json

with open('/Users/ethan/.gemini/antigravity/brain/c852e481-8480-4d34-ab8d-259195bd8e77/.system_generated/steps/57/content.md', 'r') as f:
    content = f.read()

# Extract window.DESIGNS = [ ... ];
start_idx = content.find('window.DESIGNS = [')
if start_idx != -1:
    end_idx = content.find('];', start_idx) + 1
    designs_json_str = content[start_idx + len('window.DESIGNS = '):end_idx]
    
    import os
    os.makedirs('frontapp/src/data', exist_ok=True)
    with open('frontapp/src/data/designs.json', 'w') as out:
        out.write(designs_json_str)
        print("Success: Written to frontapp/src/data/designs.json")
else:
    print("Could not find window.DESIGNS")
