import cv2
import numpy as np
import sys

def remove_background(input_path, output_path):
    print(f"Processing {input_path}")
    # Read image
    img = cv2.imread(input_path)
    if img is None:
        print("Error: Could not read image.")
        return
        
    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # In this case (assuming it's a logo on a white/light background from feeling), 
    # we threshold it. Since the user said "without white background":
    # Let's create a mask where white is the background
    
    # Blur slightly to reduce noise
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    
    # Threshold: values > 240 (near white) become 0 (black/bg), values < 240 become 255 (white/fg)
    _, mask = cv2.threshold(blurred, 240, 255, cv2.THRESH_BINARY_INV)
    
    # Optional: Morphological operations to clean up the mask
    kernel = np.ones((3,3), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel, iterations=1)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=1)
    
    # Create an alpha channel based on the mask
    b, g, r = cv2.split(img)
    rgba = [b, g, r, mask]
    dst = cv2.merge(rgba, 4)
    
    # Save the output
    cv2.imwrite(output_path, dst)
    print(f"Saved processed image to {output_path}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python bg_remove.py <input> <output>")
        sys.exit(1)
    remove_background(sys.argv[1], sys.argv[2])
