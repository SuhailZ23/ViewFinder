# ViewFinder📸

ViewFinder is a Visual Recommendation Engine powered by Content-Based Image Retrieval (CBIR). It allows users to upload or choose photos of a landscape or architectural landmark (View), or and instantly finds the most visually similar destinations from a database of over 9,000 images.

I built this project out of a strong interest in Applied AI. My goal was to take an experimental computer vision model I originally created for a university AI course and transform it into a practical, user-facing product. By moving the model out of a standard Python notebook and wrapping it in a fully Dockerized, FastAPI and React ecosystem, as a jump from academic scripting to production-ready software engineering.

![ViewFinder Demo](/frontend/public/ViewFinderScreenshot.png)

## 🧠 How the AI Works

Instead of using basic tags or text metadata, this search engine operates entirely on mathematical visual geometry.

1. **Feature Extraction:** I used **ResNet50** (via Transfer Learning) as a feature extractor. By removing the final classification layer, the model doesn't try to guess *what* the image is. Instead, it reads the uploaded image and outputs a 2048-dimensional embedding a mathematical "fingerprint" of the image's edges, textures, and geometry.
2. **The Database:** The dataset consists of 9,447 images. I pre-processed all of these images through ResNet50 and saved their embeddings as `.npy` arrays to act as the searchable database.
3. **The Search Algorithm:** When a user uploads or chooses a new photo, the backend generates a new 2048-D vector. I then use the **K-Nearest Neighbors (KNN)** algorithm to calculate the mathematical distance (Cosine Similarity) between the user's vector and the 9,447 vectors in the database, returning the closest visual matches.

## 💻 Tech Stack

**Frontend:**
* React.js (Vite)
* Tailwind CSS for styling
* Pure CSS animations for the scanning UI

**Backend & ML:**
* FastAPI (Python)
* TensorFlow / Keras (ResNet50)
* Scikit-learn (KNN)
* NumPy & Pandas for data manipulation

**Infrastructure:**
* Docker & Docker Compose (Fully isolated containerized environment)
* Git for version control

## 🚀 Running the Project Locally

The entire application is containerized, meaning you don't need to configure Python environments or install Node.js locally.

### Prerequisites
* Docker Desktop installed and running.
* Git.

### Setup Instructions

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/YourUsername/ViewFinder.git](https://github.com/YourUsername/ViewFinder.git)
   cd ViewFinder
