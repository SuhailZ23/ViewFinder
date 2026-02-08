import os
import pickle
import numpy as np
import ssl
from tensorflow.keras.applications.resnet50 import ResNet50, preprocess_input
from tensorflow.keras.preprocessing import image as kimage
from tensorflow.keras.models import Model

# --- MAC SSL FIX ---
try:
    _create_unverified_https_context = ssl._create_unverified_context
except AttributeError:
    pass
else:
    ssl._create_default_https_context = _create_unverified_https_context

# --- CONFIG ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# CHANGE THIS if your images are in a different folder name
IMAGES_DIR = os.path.join(BASE_DIR, "datasets")
OUTPUT_DIR = os.path.join(BASE_DIR, "data")

if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)


def build_database():
    print(f"🚀 Scanning images in: {IMAGES_DIR}")

    # 1. SCAN IMAGES
    image_paths = []
    labels = []

    # Walk through all folders
    for root, dirs, files in os.walk(IMAGES_DIR):
        for file in files:
            if file.lower().endswith(('.png', '.jpg', '.jpeg')):
                full_path = os.path.join(root, file)
                # Get the folder name (e.g., "Eiffel_Tower")
                label = os.path.basename(os.path.dirname(full_path))

                image_paths.append(full_path)
                labels.append(label)

    if len(image_paths) == 0:
        print("❌ No images found! Check your 'datasets' folder path.")
        return

    print(f"✅ Found {len(image_paths)} images.")

    # 2. LOAD MODEL
    print("🧠 Loading ResNet50...")
    base_model = ResNet50(weights='imagenet', include_top=False, pooling='avg')
    model = Model(inputs=base_model.input, outputs=base_model.output)

    # 3. EXTRACT FEATURES
    print("⚡ Extracting Features (This might take a while on CPU)...")
    feature_list = []

    for i, img_path in enumerate(image_paths):
        try:
            # Show progress every 100 images
            if i % 100 == 0:
                print(f"   Processing {i}/{len(image_paths)}...")

            img = kimage.load_img(img_path, target_size=(224, 224))
            x = kimage.img_to_array(img)
            x = np.expand_dims(x, axis=0)
            x = preprocess_input(x)

            features = model.predict(x, verbose=0)
            feature_list.append(features.flatten())

        except Exception as e:
            print(f"   ⚠️ Error processing {img_path}: {e}")

    # 4. SAVE FILES
    print("💾 Saving Database to 'backend/data'...")

    # Save Vectors (.npy)
    np.save(os.path.join(OUTPUT_DIR, "famous_places_features.npy"), np.array(feature_list))

    # Save Paths (.pkl)
    with open(os.path.join(OUTPUT_DIR, "famous_places_paths.pkl"), 'wb') as f:
        pickle.dump(image_paths, f)

    # Save Labels (.pkl)
    with open(os.path.join(OUTPUT_DIR, "famous_places_labels.pkl"), 'wb') as f:
        pickle.dump(labels, f)

    print("🎉 DONE! You are ready to run the server.")


if __name__ == "__main__":
    build_database()