import os
import random
import pickle
import re
import tempfile
import numpy as np
import cv2
import gradio as gr
from PIL import Image
from sentence_transformers import SentenceTransformer
from transformers import AutoModelForImageClassification, AutoImageProcessor
from gradio_client import Client, handle_file
import openai
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import base64
import io

# ============================================================
# INITIALIZATION
# ============================================================
print("Initializing Tree & House Story Generator (Flask + Gradio)")

# OpenAI
client = openai.OpenAI(
    base_url="https://api.llm7.io/v1",
    api_key=os.environ.get("LLM7_API_KEY", "unused")
)

# NSFW MODEL
nsfw_processor = AutoImageProcessor.from_pretrained("Falconsai/nsfw_image_detection")
nsfw_model = AutoModelForImageClassification.from_pretrained("Falconsai/nsfw_image_detection")

# CLIP Interrogator
clipi_client = Client("https://fffiloni-clip-interrogator-2.hf.space/")

# SAFETY
UNSAFE_KEYWORDS = [
    "penis", "vagina", "genitals", "testicle",
    "sex", "sexual", "erotic", "porn", "explicit",
    "nipple", "genital", "lewd"
]

def is_safe_description(text):
    text = text.lower()
    return not any(re.search(rf"\b{w}\b", text) for w in UNSAFE_KEYWORDS)

def is_drawing_safe(image):
    try:
        inputs = nsfw_processor(images=image, return_tensors="pt")
        outputs = nsfw_model(**inputs)
        probs = outputs.logits.softmax(dim=1)[0]
        if probs[1] > 0.85:
            return False, "NSFW detected"
        return True, None
    except:
        return True, None

# LOAD TREE & HOUSE MODEL
classifier = None
bert_model = None
tree_stories = []
house_stories = []

try:
    with open("tree_house_model.pkl", "rb") as f:
        model_package = pickle.load(f)

    classifier = model_package["classifier"]
    bert_model = SentenceTransformer(model_package["bert_model_name"])
    tree_stories = model_package["tree_stories"]
    house_stories = model_package["house_stories"]
    model_accuracy = model_package["accuracy"]

    print(f"✓ Model loaded ({model_accuracy*100:.2f}%)")
except:
    print("Tree/House model not loaded")

# CORE FUNCTIONS
def get_image_description(image):
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as f:
        path = f.name
        image.save(path)
    try:
        desc = clipi_client.predict(
            input_image=handle_file(path),
            interrogation_mode="best",
            api_name="/clipi2"
        )
    finally:
        os.remove(path)
    return desc

def predict_category(description):
    if not classifier:
        return None, 0.0, {}
    emb = bert_model.encode([description], normalize_embeddings=True)
    pred = classifier.predict(emb)[0]
    probs = classifier.predict_proba(emb)[0]
    return pred, float(max(probs)), {"tree": float(probs[0]), "house": float(probs[1])}

def get_random_story(category):
    stories = tree_stories if category == "tree" else house_stories
    if not stories:
        return None
    s = random.choice(stories).copy()
    s.pop("category", None)
    return s

def generate_story_openai(description, audience, is_vulgar=False):
    """
    description: user drawing description (string or list)
    audience: string, e.g., 'children aged 5-7'
    is_vulgar: boolean, True if Hugging Face classifier detects vulgar content
    """

    # Handle list input
    if isinstance(description, list):
        first_desc = description[0]
    else:
        first_desc = description

    # Pre-check using local unsafe keywords
    lower_desc = first_desc.lower()
    for word in UNSAFE_KEYWORDS:
        if word in lower_desc:
            return "Your drawing contains inappropriate content and cannot be used to generate a story."

    # If Hugging Face classifier detects vulgar content
    if is_vulgar:
        return "Your drawing contains inappropriate content and cannot be used to generate a story."

    # Prompt with explicit instruction
    prompt = (
        f"Create a short, kid-friendly story for {audience} about: {first_desc}. "
        f"Use simple, cheerful words suitable for children. Include characters, action, "
        f"and make it imaginative. "
        f"Write only 3 paragraphs. "
        f"Also, provide a creative title at the very beginning. "
        f"IMPORTANT: If the input contains any vulgar, sexual, or inappropriate content, "
        f"do NOT generate any story and reply only with: "
        f"'The content is inappropriate and cannot be used for a story.' "
        f"Do NOT add extra questions, suggestions, or prompts at the end."
    )

    try:
        res = client.chat.completions.create(
            model="gpt-5-chat",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.8
        )
        return res.choices[0].message.content
    except:
        return "Story generation failed."


def format_story(story_data):
    """Return story text ONLY – no labels like characters, setting, plot, etc."""

    if isinstance(story_data, str):
        return story_data

    elif isinstance(story_data, dict):
        parts = []

        # Optional title (pwede mo rin alisin kung ayaw mo)
        if "title" in story_data and story_data["title"]:
            parts.append(story_data["title"].strip())

        # All possible story parts (NO LABELS)
        ordered_keys = [
            "characters",
            "setting",
            "plot",
            "problem",
            "ending",
            "lesson",
            "moral",
            "story"
        ]

        for key in ordered_keys:
            if key in story_data and story_data[key]:
                parts.append(story_data[key].strip())

        # Join as clean paragraphs
        return "\n\n".join(parts)

    else:
        return str(story_data)

def process_image_base64(image_base64, audience="Children"):
    image_data = base64.b64decode(image_base64)
    image = Image.open(io.BytesIO(image_data)).convert("RGB")

    # Description mula sa CLIP
    description = get_image_description(image)
    
    # Predict category (tree, house, other)
    category, confidence, probs = predict_category(description)

    # Check if description contains tree/house keywords
    description_lower = description.lower()
    is_tree = "tree" in description_lower or "branch" in description_lower or "leaf" in description_lower or "trunk" in description_lower
    is_house = "house" in description_lower or "building" in description_lower or "home" in description_lower or "roof" in description_lower

    # TREE/HOUSE → always use dataset story, ignore vulgar/NSFW
    if (category == "tree" and is_tree) or (category == "house" and is_house):
        story_data = get_random_story("tree" if category == "tree" else "house")
        story_category = category
        formatted_story = format_story(story_data)
        return {
            "success": True,
            "description": description,
            "category": story_category,
            "confidence": confidence,
            "probabilities": probs,
            "story": formatted_story
        }

    # Ibang drawings → GPT-generated, check NSFW and vulgar keywords
    safe, reason = is_drawing_safe(image)
    if not safe:
        return {"success": False, "error": "Bawal sa bata: NSFW detected", "reason": reason}

    if not is_safe_description(description):
        return {"success": False, "error": "Bawal sa bata: unsafe description detected"}

    formatted_story = generate_story_openai(description, audience)
    story_category = "OPENAI"

    return {
        "success": True,
        "description": description,
        "category": story_category,
        "confidence": None,
        "probabilities": probs,
        "story": formatted_story
    }



# GRADIO FUNCTION
def generate_story_gradio(image, audience):
    buffered = io.BytesIO()
    image.save(buffered, format="PNG")
    img_b64 = base64.b64encode(buffered.getvalue()).decode()
    result = process_image_base64(img_b64, audience)
    if not result["success"]:
        return result.get("error", "Failed"), "", "", ""
    # Story is already formatted as a string
    return result["description"], result["category"], str(result["probabilities"]), result["story"]

# GRADIO UI
with gr.Blocks(title=" Tree & House Story Generator") as demo:
    gr.Markdown("# Tree & House Story Generator")
    gr.Markdown("Upload a drawing and generate a creative story!")
    
    with gr.Row():
        with gr.Column():
            image_input = gr.Image(type="pil", label="Upload a drawing")
            audience_input = gr.Dropdown(["Children", "Teens"], value="Children", label="Audience")
            btn = gr.Button(" Generate Story", variant="primary")
        
        with gr.Column():
            description_output = gr.Textbox(label="Image Description", lines=2)
            category_output = gr.Textbox(label="Category")
            probabilities_output = gr.Textbox(label="Probabilities")
            story_output = gr.Textbox(label="Story", lines=12)
    
    btn.click(
        generate_story_gradio,
        inputs=[image_input, audience_input],
        outputs=[description_output, category_output, probabilities_output, story_output]
    )

# FLASK API
app = Flask(__name__)
CORS(app)

# Create Gradio WSGI app with SSR disabled
gradio_app = gr.routes.App.create_app(demo, ssr_mode=False)

@app.route('/')
def index():
    return Response("Redirecting to Gradio UI...", status=302, headers={"Location": "/gradio"})

@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "healthy",
        "model_loaded": classifier is not None,
        "tree_stories": len(tree_stories),
        "house_stories": len(house_stories)
    })

@app.route("/api/generate-story-base64", methods=["POST"])
def generate_story_api():
    data = request.get_json()
    if "image" not in data:
        return jsonify({"error": "No image provided"}), 400
    audience = data.get("audience", "Children")
    result = process_image_base64(data["image"], audience)
    return jsonify(result)

@app.route('/api/test', methods=['GET'])
def api_test():
    """API documentation and test page"""
    html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>API Test - Story Generator</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
            h1 { color: #333; }
            .endpoint { background: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px; }
            .method { display: inline-block; padding: 5px 10px; border-radius: 3px; font-weight: bold; }
            .get { background: #61affe; color: white; }
            .post { background: #49cc90; color: white; }
            code { background: #f5f5f5; padding: 2px 5px; border-radius: 3px; }
            .test-section { margin: 20px 0; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
            button { background: #49cc90; color: white; border: none; padding: 10px 20px; cursor: pointer; border-radius: 5px; }
            button:hover { background: #3da877; }
            #result { margin-top: 15px; padding: 15px; background: #f9f9f9; border-radius: 5px; white-space: pre-wrap; }
        </style>
    </head>
    <body>
        <h1> Story Generator API</h1>
        
        <div class="endpoint">
            <span class="method get">GET</span> <code>/api/health</code>
            <p>Check API status</p>
        </div>
        
        <div class="endpoint">
            <span class="method post">POST</span> <code>/api/generate-story-base64</code>
            <p>Generate story from base64 image</p>
            <strong>Request body:</strong>
            <pre>{
"image": "base64_encoded_image_string",
"audience": "Children"
}</pre>
        </div>

        <div class="test-section">
            <h2>Test API</h2>
            <p>Upload an image to test the story generation:</p>
            <input type="file" id="imageInput" accept="image/*">
            <br><br>
            <label>Audience: 
                <select id="audience">
                    <option>Children</option>
                    <option>Teens</option>
                </select>
            </label>
            <br><br>
            <button onclick="testAPI()">Generate Story</button>
            <div id="result"></div>
        </div>

        <script>
            async function testAPI() {
                const fileInput = document.getElementById('imageInput');
                const audience = document.getElementById('audience').value;
                const resultDiv = document.getElementById('result');
                
                if (!fileInput.files[0]) {
                    resultDiv.textContent = 'Please select an image first!';
                    return;
                }
                
                resultDiv.textContent = 'Processing...';
                
                const reader = new FileReader();
                reader.onload = async function(e) {
                    const base64 = e.target.result.split(',')[1];
                    
                    try {
                        const response = await fetch('/api/generate-story-base64', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                image: base64,
                                audience: audience
                            })
                        });
                        
                        const data = await response.json();
                        resultDiv.textContent = JSON.stringify(data, null, 2);
                    } catch (error) {
                        resultDiv.textContent = 'Error: ' + error.message;
                    }
                };
                
                reader.readAsDataURL(fileInput.files[0]);
            }
        </script>
    </body>
    </html>
    """
    return html

# Mount Gradio at /gradio using WSGI middleware
from werkzeug.middleware.dispatcher import DispatcherMiddleware

app.wsgi_app = DispatcherMiddleware(
    app.wsgi_app,
    {'/gradio': gradio_app}
)

# RUN FLASK APP
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 7860))
    print("=" * 60)
    print(" Flask + Gradio Server Starting")
    print("=" * 60)
    print(f" Gradio UI:           http://localhost:{port}/gradio")
    print(f" Home (Redirect):     http://localhost:{port}/")
    print(f" API Test Page:       http://localhost:{port}/api/test")
    print(f" Health Check:        http://localhost:{port}/api/health")
    print(f" API Endpoint:        http://localhost:{port}/api/generate-story-base64")
    print("=" * 60)
    app.run(host="0.0.0.0", port=port, debug=False)
