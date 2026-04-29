import ssl
# BYPASS SSL VERIFICATION (Fix for Mac)
try:
    _create_unverified_https_context = ssl._create_unverified_context
except AttributeError:
    pass
else:
    ssl._create_default_https_context = _create_unverified_https_context

import os
import numpy as np
import pickle
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles                     # ← ADDED
from tensorflow.keras.applications.resnet50 import ResNet50, preprocess_input
from tensorflow.keras.preprocessing import image as kimage
from tensorflow.keras.models import Model
from sklearn.neighbors import NearestNeighbors
from sklearn.metrics.pairwise import cosine_similarity
from PIL import Image
from io import BytesIO

# --- CONFIGURATION ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = os.path.join(BASE_DIR, "data")       # .npy / .pkl files live here
IMAGES_PATH  = os.path.join(BASE_DIR, "datasets")   # actual image files live here

app = FastAPI(title="ViewFinder API")

# --- STATIC FILES (serves /static/* from the datasets folder) ---  ← ADDED
# This is what lets the frontend actually display result images.
# Make sure your "datasets" folder (with all landmark subfolders) is inside backend/
if os.path.exists(IMAGES_PATH):
    app.mount("/static", StaticFiles(directory=IMAGES_PATH), name="static")
else:
    print("⚠️  'datasets' folder not found — /static routes will not work.")

# --- CORS MIDDLEWARE ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- GLOBAL VARIABLES ---
model = None
feature_vectors = None
image_paths = None
labels = None
knn = None

# --- KNOWLEDGE GRAPH ---
category_map = {
    "Blue_Mosque": "Islamic_Heritage", "Sultan_Ahmed_Mosque": "Islamic_Heritage",
    "Hagia_Sophia": "Islamic_Heritage", "Taj_Mahal": "Islamic_Heritage",
    "Dresden_Frauenkirche": "Christian_Heritage", "Helsinki_Cathedral": "Christian_Heritage",
    "Milan_Cathedral": "Christian_Heritage", "Sagrada_Familia": "Christian_Heritage",
    "Christ_the_Redeemer": "Christian_Heritage", "Mont_St_Michel": "Christian_Heritage",
    "St_Pauls_Cathedral": "Christian_Heritage", "Notre_Dame_Paris": "Christian_Heritage",
    "Acropolis_of_Athens": "Ancient_Civilization", "Angkor_Wat": "Ancient_Civilization",
    "Chichen_Itza_Mexico": "Ancient_Civilization", "Ephesus": "Ancient_Civilization",
    "Machu_Picchu": "Ancient_Civilization", "The_Great_Sphinx": "Ancient_Civilization",
    "The_Pyramids_of_Giza": "Ancient_Civilization", "Tian_Tan_Buddha": "Ancient_Civilization",
    "Petra": "Ancient_Civilization", "Colosseum": "Ancient_Civilization",
    "Berlin_Museum_Island": "Palaces_and_Castles", "Bodiam_Castle": "Palaces_and_Castles",
    "Chateau_Frontenac": "Palaces_and_Castles", "Kremlin": "Palaces_and_Castles",
    "Musee_du_Louvre": "Palaces_and_Castles", "Neuschwanstein_Castle": "Palaces_and_Castles",
    "Osaka_Castle": "Palaces_and_Castles", "Oxford_University": "Palaces_and_Castles",
    "White_House": "Palaces_and_Castles", "Musee_dOrsay": "Palaces_and_Castles",
    "Buckingham_Palace": "Palaces_and_Castles", "Versailles": "Palaces_and_Castles",
    "Atomium": "Modern_Architecture", "Burj_Khalifa": "Modern_Architecture",
    "Casa_Mila": "Modern_Architecture", "Dancing_House": "Modern_Architecture",
    "Flatiron_Building": "Modern_Architecture", "Guggenheim_Museum": "Modern_Architecture",
    "Le_Centre_Pompidou": "Modern_Architecture", "Lincoln_Center": "Modern_Architecture",
    "Space_Needle": "Modern_Architecture", "Sydney_Opera_House": "Modern_Architecture",
    "Petronas_Towers": "Modern_Architecture", "Burj_Al_Arab": "Modern_Architecture",
    "Eiffel_Tower": "Engineering_Marvels", "Gateway_Arch": "Engineering_Marvels",
    "Golden_Gate_Bridge": "Engineering_Marvels", "Millau_Bridge": "Engineering_Marvels",
    "Sydney_Harbor_Bridge": "Engineering_Marvels", "Tower_Bridge": "Engineering_Marvels",
    "Big_Ben": "Engineering_Marvels", "Brooklyn_Bridge": "Engineering_Marvels",
    "London_Eye": "Engineering_Marvels",
    "Arc_de_Triomphe": "Monuments", "Brandenburg_Gate": "Monuments",
    "Washington_Monument": "Monuments", "Leaning_Tower_of_Pisa": "Monuments",
    "India_Gate": "Monuments", "statue_of_liberty": "Monuments",
    "Giants_Causeway": "Nature"
}

structure_map = {
    "Burj_Khalifa": "Tower", "Eiffel_Tower": "Tower", "Big_Ben": "Tower",
    "Leaning_Tower_of_Pisa": "Tower", "Space_Needle": "Tower", "Skytree": "Tower",
    "Washington_Monument": "Tower", "Atomium": "Tower",
    "Sultan_Ahmed_Mosque": "Tower", "Blue_Mosque": "Tower", "Tokyo_Tower": "Tower",
    "Neuschwanstein_Castle": "Tower", "Osaka_Castle": "Tower", "Mont_St_Michel": "Tower",
    "Petronas_Towers": "Tower", "Christ_the_Redeemer": "Tower",
    "statue_of_liberty": "Tower",
    "Guggenheim_Museum": "Dome_Curve", "Taj_Mahal": "Dome_Curve",
    "Hagia_Sophia": "Dome_Curve", "Pantheon": "Dome_Curve",
    "St_Pauls_Cathedral": "Dome_Curve", "Dresden_Frauenkirche": "Dome_Curve",
    "Dancing_House": "Dome_Curve", "Sydney_Opera_House": "Dome_Curve",
    "Helsinki_Cathedral": "Dome_Curve", "Lotus_Temple": "Dome_Curve",
    "Milan_Cathedral": "Dome_Curve", "Sacré_Cœur": "Dome_Curve",
    "The_Pyramids_of_Giza": "Pyramid", "Musee_du_Louvre": "Pyramid",
    "Chichen_Itza_Mexico": "Pyramid",
    "Arc_de_Triomphe": "Arch", "Brandenburg_Gate": "Arch",
    "Gateway_Arch": "Arch", "India_Gate": "Arch",
    "Golden_Gate_Bridge": "Bridge", "Tower_Bridge": "Bridge",
    "Sydney_Harbor_Bridge": "Bridge", "Millau_Bridge": "Bridge",
    "Brooklyn_Bridge": "Bridge",
    "Buckingham_Palace": "Block_Palace", "Versailles": "Block_Palace",
    "Colosseum": "Arena_Curve", "Petra": "Block_Palace",
    "Machu_Picchu": "Block_Palace", "Kremlin": "Block_Palace",
    "Oxford_University": "Block_Palace", "Bodiam_Castle": "Block_Palace",
    "Berlin_Museum_Island": "Block_Palace", "Musee_dOrsay": "Block_Palace",
    "White_House": "Block_Palace", "Chateau_Frontenac": "Block_Palace",
    "Acropolis_of_Athens": "Block_Palace", "Lincoln_Center": "Block_Palace",
    "Ephesus": "Block_Palace", "Flatiron_Building": "Block_Palace",
    "Le_Centre_Pompidou": "Block_Palace", "Casa_Mila": "Block_Palace"
}

hybrid_structures = {
    "Gateway_Arch": ["Arch", "Tower"],
    "Tower_Bridge": ["Bridge", "Tower"],
    "Brooklyn_Bridge": ["Bridge", "Tower"],
    "Osaka_Castle": ["Tower", "Block_Palace"],
    "Neuschwanstein_Castle": ["Tower", "Block_Palace"],
    "Mont_St_Michel": ["Tower", "Block_Palace"],
    "Sagrada_Familia": ["Dome_Curve", "Tower"],
    "Milan_Cathedral": ["Dome_Curve", "Tower"],
    "Taj_Mahal": ["Dome_Curve", "Block_Palace"],
    "Hagia_Sophia": ["Dome_Curve", "Block_Palace"],
    "St_Pauls_Cathedral": ["Dome_Curve", "Block_Palace"],
    "Helsinki_Cathedral": ["Dome_Curve", "Block_Palace"],
    "Capitol_Building": ["Dome_Curve", "Block_Palace"],
    "Burj_Al_Arab": ["Tower", "Dome_Curve"],
    "Sydney_Opera_House": ["Dome_Curve", "Block_Palace"]
}

related_map = {
    "Islamic_Heritage": ["Christian_Heritage", "Ancient_Civilization", "Palaces_and_Castles", "Monuments"],
    "Christian_Heritage": ["Islamic_Heritage", "Ancient_Civilization", "Palaces_and_Castles", "Monuments",
                           "Modern_Architecture"],
    "Palaces_and_Castles": ["Christian_Heritage", "Islamic_Heritage", "Ancient_Civilization", "Monuments", "Nature"],
    "Ancient_Civilization": ["Christian_Heritage", "Islamic_Heritage", "Palaces_and_Castles", "Monuments", "Nature",
                             "Engineering_Marvels"],
    "Modern_Architecture": ["Engineering_Marvels", "Monuments", "Christian_Heritage"],
    "Engineering_Marvels": ["Modern_Architecture", "Monuments", "Palaces_and_Castles", "Ancient_Civilization"],
    "Monuments": ["Ancient_Civilization", "Modern_Architecture", "Engineering_Marvels", "Palaces_and_Castles",
                  "Christian_Heritage", "Islamic_Heritage"],
    "Nature": ["Ancient_Civilization", "Waterfront", "Hilltop", "Palaces_and_Castles"]
}

environment_map = {
    "Gateway_Arch": "Waterfront", "Washington_Monument": "Waterfront",
    "Bodiam_Castle": "Waterfront", "Mont_St_Michel": "Waterfront",
    "Angkor_Wat": "Waterfront", "Osaka_Castle": "Waterfront",
    "Sydney_Opera_House": "Waterfront", "Sydney_Harbor_Bridge": "Waterfront",
    "Tower_Bridge": "Waterfront", "Golden_Gate_Bridge": "Waterfront",
    "Giants_Causeway": "Waterfront", "Blue_Mosque": "Waterfront",
    "Sultan_Ahmed_Mosque": "Waterfront", "Chateau_Frontenac": "Waterfront",
    "Millau_Bridge": "Waterfront", "Musee_dOrsay": "Waterfront",
    "London_Eye": "Waterfront", "Helsinki_Cathedral": "Waterfront",
    "Big_Ben": "Waterfront", "Burj_Al_Arab": "Waterfront",
    "Musee_du_Louvre": "Waterfront", "Brooklyn_Bridge": "Waterfront",
    "Guggenheim_Museum": "Waterfront", "Lincoln_Center": "Urban",
    "Machu_Picchu": "Hilltop", "Christ_the_Redeemer": "Hilltop",
    "Neuschwanstein_Castle": "Hilltop", "Acropolis_of_Athens": "Hilltop",
    "Great_Wall_of_China": "Hilltop", "Tian_Tan_Buddha": "Hilltop",
    "Petra": "Hilltop", "Burj_Khalifa": "Hilltop",
    "Times_Square": "Urban", "Eiffel_Tower": "Urban",
    "Tokyo_Tower": "Urban", "Arc_de_Triomphe": "Urban",
    "Brandenburg_Gate": "Urban", "Milan_Cathedral": "Urban",
    "Le_Centre_Pompidou": "Urban", "Empire_State_Building": "Urban",
    "Flatiron_Building": "Urban", "Casa_Mila": "Urban",
    "Dancing_House": "Urban", "Sagrada_Familia": "Urban"
}


# --- LOGIC HELPERS ---
def get_category(name): return category_map.get(name.strip(), "General")
def get_environment(name): return environment_map.get(name.strip(), "General")

def get_structures(name):
    clean_name = name.strip()
    if clean_name in hybrid_structures:
        return hybrid_structures[clean_name]
    base_struct = structure_map.get(clean_name, "General")
    return [base_struct]

def are_related(cat1, cat2):
    if cat1 == cat2: return True
    if cat2 in related_map.get(cat1, []): return True
    return False


# --- SERVER STARTUP ---
@app.on_event("startup")
async def startup_event():
    global model, feature_vectors, image_paths, labels, knn
    print("🚀 Starting ViewFinder API...")

    # 1. Load Model
    print("🧠 Loading ResNet50...")
    base_model = ResNet50(weights='imagenet', include_top=False, pooling='avg')
    model = Model(inputs=base_model.input, outputs=base_model.output)

    # 2. Load pre-computed feature vectors
    print("📂 Loading Vectors...")
    try:
        feature_vectors = np.load(os.path.join(DATASET_PATH, "famous_places_features.npy"))
        with open(os.path.join(DATASET_PATH, "famous_places_paths.pkl"), 'rb') as f:
            image_paths = pickle.load(f)
        with open(os.path.join(DATASET_PATH, "famous_places_labels.pkl"), 'rb') as f:
            labels = pickle.load(f)

        # 3. Initialize KNN
        print("🔍 Training KNN...")
        knn = NearestNeighbors(n_neighbors=300, metric='cosine', algorithm='brute')
        knn.fit(feature_vectors)
        print("✅ System Ready!")

    except FileNotFoundError:
        print("⚠️  Vectors not found! Make sure .npy/.pkl files are in backend/data/")
        print("⚠️  Server running in Mock Mode (Will return fake data).")


# --- API ENDPOINT ---
@app.post("/analyze")
async def analyze_image(file: UploadFile = File(...)):
    """
    Receives an image -> Runs ResNet -> Runs KNN -> Returns Logic-Filtered Results
    """
    if not model:
        raise HTTPException(status_code=503, detail="Model not loaded")

    # 1. Read & resize image
    contents = await file.read()
    img = Image.open(BytesIO(contents)).convert('RGB')
    img = img.resize((224, 224))

    # 2. Preprocess for ResNet
    x = kimage.img_to_array(img)
    x = np.expand_dims(x, axis=0)
    x = preprocess_input(x)

    # 3. Extract feature vector
    query_vector = model.predict(x)

    # 4. KNN lookup (or mock if no data loaded)
    if knn is None:
        return {"results": [
            {"id": 0, "name": "Mock Mode", "similarity": 99, "matchType": "visual",
             "matchReason": "No Data Loaded", "image": "https://via.placeholder.com/400"}
        ]}

    distances, indices = knn.kneighbors(query_vector)

    # 5. Build deduplicated, filtered results
    results = []
    seen_names = set()

    for i in range(len(indices[0])):
        idx = indices[0][i]
        dist = distances[0][i]
        similarity = (1 - dist) * 100

        name = labels[idx]
        if name in seen_names:
            continue
        seen_names.add(name)

        cat = get_category(name)
        env = get_environment(name)

        # ↓ FIXED: build a relative path that lines up with the StaticFiles mount
        # image_paths[idx] is an absolute path like /app/datasets/Eiffel_Tower/img1.jpg
        # We need                                        Eiffel_Tower/img1.jpg
        rel_path = os.path.relpath(image_paths[idx], IMAGES_PATH)

        rec = {
            "id": int(idx),
            "name": str(name.replace("_", " ")),
            "similarity": round(float(similarity), 1),
            "matchType": "visual",
            "matchReason": f"{cat} | {env}",
            "image": f"/static/{rel_path}"   # ← now correctly resolves via the mounted route
        }
        results.append(rec)

        if len(results) >= 4:
            break

    return {"results": results}


@app.post("/analyze_multiple")
async def analyze_multiple_images(files: list[UploadFile] = File(...)):
    """
    Receives MULTIPLE images -> Averages their feature vectors -> Returns better recommendations
    This gives a richer "preference profile" than single image analysis
    """
    if not model:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    if len(files) < 1:
        raise HTTPException(status_code=400, detail="At least 1 image required")

    print(f"📸 Analyzing {len(files)} images for preference profile...")

    # 1. Extract features from all images
    feature_vectors_batch = []
    
    for file in files:
        try:
            contents = await file.read()
            img = Image.open(BytesIO(contents)).convert('RGB')
            img = img.resize((224, 224))
            
            x = kimage.img_to_array(img)
            x = np.expand_dims(x, axis=0)
            x = preprocess_input(x)
            
            features = model.predict(x, verbose=0)
            feature_vectors_batch.append(features.flatten())
        except Exception as e:
            print(f"⚠️  Error processing image: {e}")
            continue
    
    if len(feature_vectors_batch) == 0:
        raise HTTPException(status_code=400, detail="Could not process any images")
    
    # 2. AVERAGE the feature vectors to create a "preference profile"
    avg_vector = np.mean(feature_vectors_batch, axis=0).reshape(1, -1)
    print(f"✅ Created preference profile from {len(feature_vectors_batch)} images")

    if knn is None:
        return {"results": [
            {"id": 0, "name": "Mock Mode", "similarity": 99, "matchType": "visual",
             "matchReason": "No Data Loaded", "image": "https://via.placeholder.com/400"}
        ]}

    # --- THE MATHEMATICAL BAN LIST ---
    # Find the #1 closest DB match for EACH individual uploaded image to identify them
    _, input_indices = knn.kneighbors(feature_vectors_batch, n_neighbors=1)
    
    # Create a set of the names the user inputted, so we can ban them from the output
    banned_names = {labels[idx[0]] for idx in input_indices}
    print(f"🚫 Banning inputs from results: {banned_names}")

    # 3. KNN lookup on the averaged "preference profile"
    distances, indices = knn.kneighbors(avg_vector)

    # 4. Build deduplicated results
    results = []
    
    # We initialize our 'seen' list with our 'banned' list. 
    # This guarantees the inputs will be instantly skipped in the loop!
    seen_names = set(banned_names) 

    for i in range(len(indices[0])):
        idx = indices[0][i]
        dist = distances[0][i]
        
        name = labels[idx]
        if name in seen_names:
            continue
        seen_names.add(name)

        # 1. The Real Math: Keep it 100% mathematically accurate
        raw_sim = (1 - dist) * 100

        # 2. The Semantic Thresholds: Translate math to human labels
        if raw_sim >= 78:
            confidence_label = "Perfect Match"
        elif raw_sim >= 70:
            confidence_label = "Strong Match"
        elif raw_sim >= 62:
            confidence_label = "Similar Vibe"
        else:
            confidence_label = "Thematic Match"

        cat = get_category(name)
        env = get_environment(name)
        rel_path = os.path.relpath(image_paths[idx], IMAGES_PATH)

        rec = {
            "id": int(idx),
            "name": name.replace("_", " "),
            "similarity": round(float(raw_sim), 1),     # Keep the real number for debugging if needed
            "confidenceLabel": confidence_label,        # NEW: Pass the semantic label to React
            "matchType": "visual",
            "matchReason": f"{cat} | {env}",
            "image": f"/static/{rel_path}"
        }
        results.append(rec)

        if len(results) >= 6:
            break

    return {"results": results}


@app.get("/")
def home():
    return {"message": "ViewFinder API is online."}