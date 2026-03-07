from flask import Flask, request
from flask_cors import CORS
import os
from dotenv import load_dotenv

load_dotenv()

# Import blueprints
from generate_ad import generate_ad_bp
from api_call import image_gen_bp

# Create Flask app
app = Flask(__name__)


def _parse_frontend_origins(raw_value: str) -> list:
    """Parse FRONTEND_URL from env; return both with and without trailing slash."""
    if not raw_value:
        return []
    origins = []
    for part in raw_value.split(","):
        candidate = part.strip().strip('"').strip("'").rstrip("/")
        if candidate:
            origins.append(candidate)
            origins.append(candidate + "/")  # allow both forms for CORS match
    return origins


# Allowed origins (both with and without trailing slash for frontend)
cors_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

frontend_url = os.environ.get("FRONTEND_URL", "")
cors_origins.extend(_parse_frontend_origins(frontend_url))
cors_origins = list(dict.fromkeys(cors_origins))

# Set of origins for fast lookup in after_request
_cors_origins_set = set(cors_origins)

# CORS headers to add when origin is allowed
CORS_HEADERS = {
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept, Origin",
    "Access-Control-Max-Age": "3600",
}

CORS(
    app,
    origins=cors_origins,
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Accept", "Origin"],
    expose_headers=["Content-Type"],
    supports_credentials=False,
    max_age=3600,
)


@app.after_request
def add_cors_headers(response):
    """Ensure CORS headers on every response so preflight always passes."""
    origin = request.headers.get("Origin")
    if origin and origin in _cors_origins_set:
        response.headers["Access-Control-Allow-Origin"] = origin
    for key, value in CORS_HEADERS.items():
        response.headers[key] = value
    return response


# App-level OPTIONS handlers so preflight always gets CORS headers
@app.route("/genai_call", methods=["OPTIONS"])
@app.route("/image_gen", methods=["OPTIONS"])
def options_preflight():
    return "", 204


# Register blueprints
app.register_blueprint(generate_ad_bp, url_prefix="")
app.register_blueprint(image_gen_bp, url_prefix="")


# Root route
@app.route("/")
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


@app.route("/health", methods=["GET"])
def health():
    return {"status": "healthy", "service": "combined_flask_server"}, 200


if __name__ == "__main__":
    print("=" * 60)
    print("🚀 Starting Combined Flask Server")
    print("📁 Blueprints Loaded:")
    print("   • Ad Generation Blueprint")
    print("   • Chat Generation Blueprint")
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

    print("🌐 FRONTEND_URL ENV:", frontend_url)
    print("🌐 CORS ORIGINS:", cors_origins)
    print("=" * 60)

    port = int(os.environ.get("PORT", "5002"))
    app.run(
        host="0.0.0.0",
        port=port,
        debug=True,
        threaded=True
    )