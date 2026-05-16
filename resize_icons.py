from PIL import Image
import os

# Define paths
base_dir = r"c:\xampp\htdocs\health\frontend\public"
source_icon = os.path.join(base_dir, "app-icon.jpg")
output_dir = os.path.join(base_dir, "icons")

# Ensure output directory exists
os.makedirs(output_dir, exist_ok=True)

# PWA required sizes
sizes = [72, 96, 128, 144, 152, 192, 384, 512]

try:
    print(f"Opening source icon: {source_icon}")
    img = Image.open(source_icon)
    
    # Convert to RGB if necessary (JPEGs are RGB, but just in case)
    if img.mode in ("RGBA", "P"):
        img = img.convert("RGB")
        
    for size in sizes:
        resized_img = img.resize((size, size), Image.Resampling.LANCZOS)
        out_path = os.path.join(output_dir, f"icon-{size}x{size}.png")
        # Save as PNG as required by manifest
        resized_img.save(out_path, "PNG")
        print(f"Successfully generated: {out_path}")
        
    print("\nAll PWA icons generated successfully from app-icon.jpg")
    
except Exception as e:
    print(f"Error during icon generation: {e}")
