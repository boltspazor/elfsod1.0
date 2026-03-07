# main.py
import os
from flask import Flask
from flask_cors import CORS

from config import settings

app = Flask(__name__)
CORS(app, origins=settings.CORS_ORIGINS)

# Import blueprints
from audience_step import audience_bp
from budget_testing import budget_testing_bp
from campaign_goal import campaign_goal_bp
from copy_messaging import copy_messaging_bp
from creative_assets import creative_assets_bp

# Register blueprints
app.register_blueprint(audience_bp)
app.register_blueprint(budget_testing_bp)
app.register_blueprint(campaign_goal_bp)
app.register_blueprint(copy_messaging_bp)
app.register_blueprint(creative_assets_bp)

@app.route("/")
def root():
    return {"service": "AutoCreate", "status": "running"}

@app.route("/health")
def health():
    return {"status": "healthy"}, 200

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5050))
    
    # Check for Runway API key
    RUNWAY_API_KEY = os.environ.get('RUNWAY_API_KEY', 'your_runway_api_key_here')
    
    print("=" * 60)
    print("🚀 AutoCreate Backend Service")
    print("=" * 60)
    print(f"📁 Available Endpoints:")
    print(f"  • /api/upload-image        - Upload product images")
    print(f"  • /api/generate-assets     - Generate ad variations")
    print(f"  • /api/save-selected-assets - Save selected assets")
    print(f"  • /api/create-campaign     - Create new campaign")
    print(f"  • /api/get-campaign/<id>   - Get campaign details")
    print("=" * 60)
    print(f"🔗 Server starting on http://localhost:{port}")
    print(f"🤖 Runway ML: {'✅ Ready' if RUNWAY_API_KEY != 'your_runway_api_key_here' else '❌ Not Configured'}")
    print("=" * 60)
    
    if RUNWAY_API_KEY == 'your_runway_api_key_here':
        print("⚠️  WARNING: RUNWAY_API_KEY not set!")
        print("   Set it with: export RUNWAY_API_KEY='your_key_here'")
        print("   Or add to .env file: RUNWAY_API_KEY=your_key_here")
    
    app.run(debug=False, host='0.0.0.0', port=port)