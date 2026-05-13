from PIL import Image
import os

sizes = [96, 128, 144, 152, 192, 384, 512]
base_dir = r"c:\xampp\htdocs\health\frontend\public\icons"
icon_path = os.path.join(base_dir, "icon-72x72.png")

try:
    img = Image.open(icon_path)
    # The original image is 72x72. Resizing it up to 512x512 might make it blurry,
    # but it will satisfy the PWA requirements.
    for size in sizes:
        resized_img = img.resize((size, size), Image.Resampling.LANCZOS)
        out_path = os.path.join(base_dir, f"icon-{size}x{size}.png")
        resized_img.save(out_path)
        print(f"Generated {out_path}")
except Exception as e:
    print(f"Error: {e}")
