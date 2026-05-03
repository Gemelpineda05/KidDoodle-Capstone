# Kidoodle: Tree & House Story Generator

## About
Kidoodle is a web application that generates kid-friendly stories from children's drawings. It is optimized for tree and house drawings, which pull from a pre-curated story dataset, while other drawings use an LLM to generate custom stories. The app includes safety filters to block NSFW content and inappropriate descriptions, making it safe for children.

## Features
- Automatic image description using CLIP Interrogator
- Tree/house drawing classification with a pre-trained BERT-based model
- Pre-loaded story dataset for tree and house drawings
- LLM-generated stories for non-tree/house drawings
- Built-in NSFW detection and unsafe keyword filtering
- Web UI built with Gradio, mounted alongside a Flask RESTful API
- Audience targeting (Children/Teens)
- Health check endpoint for monitoring

## Tech Stack
- **Backend**: Python, Flask, Gradio
- **ML Models**:
  - CLIP Interrogator (via Gradio Client) for image description
  - Sentence Transformers (BERT) for text embedding
  - scikit-learn classifier for tree/house categorization
  - Falconsai/nsfw_image_detection for NSFW detection
- **LLM**: OpenAI-compatible API (default: llm7.io)
- **Libraries**: Flask-CORS, Pillow, NumPy, OpenCV

## Prerequisites
- Python 3.8 or higher
- pip (Python package manager)
- Access to the public Hugging Face CLIP Interrogator space (no API key required)
- `tree_house_model.pkl` (pre-trained model and story dataset)
- (Optional) LLM7 API key for LLM story generation (defaults to "unused" if not provided)

## Installation
1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd kidoodle-app
   ```

2. Create and activate a virtual environment (recommended):
   ```bash
   python -m venv venv
   # Windows
   venv\Scripts\activate
   # macOS/Linux
   source venv/bin/activate
   ```

3. Install required dependencies:
   ```bash
   pip install flask flask-cors gradio gradio-client sentence-transformers transformers openai scikit-learn numpy opencv-python pillow
   ```

4. Place the `tree_house_model.pkl` file in the `api/` directory. This file contains the pre-trained classifier, BERT model name, and curated story datasets.

## Configuration
The app uses these optional environment variables:
- `LLM7_API_KEY`: API key for the LLM7 service (defaults to "unused")
- `PORT`: Port to run the app on (defaults to 7860)

Set environment variables:
```bash
# Windows (PowerShell)
$env:LLM7_API_KEY = "your-api-key"
$env:PORT = 8080

# macOS/Linux
export LLM7_API_KEY="your-api-key"
export PORT=8080
```

## Usage
1. Start the application:
   ```bash
   python api/app.py
   ```

2. Access the app via these endpoints:
   - **Gradio Web UI**: http://localhost:7860/gradio
     Upload a drawing, select audience (Children/Teens), click "Generate Story"
   - **API Test Page**: http://localhost:7860/api/test
     Interactive page to test the API with uploaded images
   - **Health Check**: http://localhost:7860/api/health
     Returns app status, model load state, and story counts

## API Documentation
### Base URL
`http://localhost:7860`

### Endpoints
#### GET /api/health
Check application health and model status.
- **Response**:
  ```json
  {
    "status": "healthy",
    "model_loaded": true,
    "tree_stories": 150,
    "house_stories": 120
  }
  ```

#### POST /api/generate-story-base64
Generate a story from a base64-encoded image.
- **Request Body**:
  ```json
  {
    "image": "base64-encoded-image-string",
    "audience": "Children"
  }
  ```
- **Success Response**:
  ```json
  {
    "success": true,
    "description": "a drawing of a large oak tree with green leaves",
    "category": "tree",
    "confidence": 0.92,
    "probabilities": {"tree": 0.92, "house": 0.08},
    "story": "The Big Oak Tree\nOnce upon a time, there was a big oak tree..."
  }
  ```
- **Failure Response**:
  ```json
  {
    "success": false,
    "error": "Bawal sa bata: NSFW detected"
  }
  ```

## Project Structure
```
kidoodle-app/
├── api/
│   └── app.py                # Main Flask + Gradio application
├── tree_house_model.pkl      # Pre-trained model and story dataset (place in api/)
└── README.md
```

## Troubleshooting
- **IndentationError**: Ensure `api/app.py` has no leading whitespace on any line (fixed in recent updates).
- **CLIP Interrogator API Errors**: The app uses the `fffiloni-clip-interrogator-2` Hugging Face space. If the space updates its API, verify the `input_image` and `interrogation_mode` parameters in the `get_image_description` function match the space's current API spec.
- **Model File Missing**: Verify `tree_house_model.pkl` is present in the `api/` directory. The app runs without it but will not classify tree/house drawings.
- **Port Already in Use**: Change the `PORT` environment variable to an available port.

## Deployment to Hugging Face Spaces
1. Create a new Hugging Face Space with the Gradio SDK.
2. Upload `api/app.py` and `tree_house_model.pkl` to the Space.
3. Add a `requirements.txt` file with all dependencies listed in the Installation section.
4. Set the `LLM7_API_KEY` environment variable in the Space settings if using the LLM7 service.
5. The Space will automatically run `api/app.py` as the entry point.
