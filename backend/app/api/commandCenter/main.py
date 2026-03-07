from flask import Flask
from flask_cors import CORS
import os
from dotenv import load_dotenv

load_dotenv()

# Import blueprints
from generate_ad import generate_ad_bp
from api_call import image_gen_bp

# Create Flask app
app = Flask(__name__)


def _parse_frontend_origins(raw_value: str) -> list[str]:
    """Parse FRONTEND_URL from env and normalize origin values."""
    if not raw_value:
        return []

    origins = []
    for part in raw_value.split(','):
        candidate = part.strip().strip('"').strip("'").rstrip('/')
        if candidate:
            origins.append(candidate)
    return origins

# CORS: localhost + FRONTEND_URL from env (set in Railway for production)
_cors_origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
_frontend_url = os.environ.get("FRONTEND_URL", "")
_cors_origins.extend(_parse_frontend_origins(_frontend_url))

# De-duplicate while preserving order
_cors_origins = list(dict.fromkeys(_cors_origins))
CORS(app,
     resources={r"/*": {
         "origins": _cors_origins,
         "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
         "allow_headers": ["Content-Type", "Authorization", "Accept", "Origin"],
         "expose_headers": ["Content-Type"],
         "supports_credentials": False,
         "max_age": 3600
     }})

# Register blueprints
app.register_blueprint(generate_ad_bp, url_prefix='')  # No prefix - routes defined in blueprint
app.register_blueprint(image_gen_bp, url_prefix='')    # No prefix - routes defined in blueprint

# Root route
@app.route('/')
def index():
    return {
        "message": "Flask Server Running",
        "endpoints": {
            "chat": {
                "path": "/genai_call",
                "method": "POST",
                "description": "Generate marketing/advertising content"
            },
            "image_gen": {
                "path": "/image_gen",
                "method": "POST",
                "description": "Generate images from text prompts"
            },
            "get_image": {
                "path": "/get_image/<filename>",
                "method": "GET",
                "description": "Retrieve generated images"
            },
            "list_images": {
                "path": "/list_images",
                "method": "GET",
                "description": "List all generated images"
            },
            "debug": {
                "path": "/debug",
                "method": "GET",
                "description": "Debug server status"
            }
        },
        "status": "active",
        "port": 5002
    }

@app.route('/health', methods=['GET'])
def health():
    return {"status": "healthy", "service": "combined_flask_server"}, 200

# REMOVED after_request - this was causing duplicate CORS headers

if __name__ == '__main__':
    print("=" * 60)
    print("🚀 Starting Combined Flask Server")
    print("📁 Blueprints Loaded:")
    print(f"   • Ad Generation Blueprint")
    print(f"   • Chat Generation Blueprint")
    print("=" * 60)
    print("📋 Available Endpoints:")
    print("   POST   /genai_call              - Generate marketing content")
    print("   POST   /image_gen               - Generate images")
    print("   GET    /get_image/<filename>    - Get generated image")
    print("   GET    /list_images             - List all images")
    print("   GET    /debug                   - Debug info")
    print("   GET    /                        - Server info")
    print("   GET    /health                  - Health check")
    print("=" * 60)
    print("🌐 CORS enabled for http://localhost:5173")
    print("=" * 60)
    
    app.run(host='0.0.0.0', port=5002, debug=True, threaded=True)