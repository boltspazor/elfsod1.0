#!/usr/bin/env python3
"""
Flask backend for Video Analysis Dashboard
"""
import os
import json
from pathlib import Path
from flask import Flask, jsonify, request
from flask_cors import CORS
import sys

# Ensure backend/ is on path so "ml" package is importable (for Railway: Root Directory = backend)
_script_dir = Path(__file__).resolve().parent
_ml_dir = _script_dir.parent
_backend_dir = _ml_dir.parent
if str(_backend_dir) not in sys.path:
    sys.path.insert(0, str(_backend_dir))

from ml.scripts.analyze_ads import analyze_video, analyze_image
from ml.scripts.creative_reverse_engineering import analyze_file

app = Flask(__name__)

# CORS: allow FRONTEND_URL in production (e.g. https://elfsod1-0.vercel.app)
_cors_origins = os.environ.get("FRONTEND_URL", "").strip().split(",")
_cors_origins = [o.strip().rstrip("/") for o in _cors_origins if o.strip()]
if not _cors_origins:
    _cors_origins = ["*"]
CORS(app, origins=_cors_origins, methods=["GET", "POST", "OPTIONS"], allow_headers=["Content-Type", "Authorization"])

# Paths
SCRIPT_DIR = Path(__file__).resolve().parent
ML_DIR = SCRIPT_DIR.parent
DATA_DIR = ML_DIR / "data"
RAW_VIDEO_DIR = DATA_DIR / "raw_videos"
ANALYSIS_DIR = DATA_DIR / "analysis"
REPORT_DIR = DATA_DIR / "reports"

# Ensure directories exist
for dir_path in [RAW_VIDEO_DIR, ANALYSIS_DIR, REPORT_DIR]:
    dir_path.mkdir(parents=True, exist_ok=True)

# Load Whisper model once at startup
print("[INFO] Loading Whisper model...")
import whisper
whisper_model = whisper.load_model("small")
print("[INFO] Whisper model loaded")

@app.route("/")
def home():
    """Server info / health for Railway"""
    return jsonify({
        "service": "reverse-engineering",
        "status": "running",
        "endpoints": ["/api/analyze", "/api/analysis/<id>", "/api/recent-analyses", "/health"],
    })


@app.route("/health", methods=["GET"])
def health():
    """Health check for Railway"""
    return jsonify({"status": "healthy"}), 200

@app.route('/api/analyze', methods=['POST'])
def analyze_video_endpoint():
    """Analyze a video file"""
    try:
        data = request.json
        if not data or 'video_path' not in data:
            return jsonify({'error': 'Video path is required'}), 400
        
        video_path = Path(data['video_path'])
        
        if not video_path.exists():
            return jsonify({'error': 'Video file not found'}), 404
        
        # Check if it's video or image
        supported_video = {'.webm', '.mp4', '.mkv', '.avi', '.mov'}
        supported_image = {'.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.webp'}
        
        if video_path.suffix.lower() in supported_video:
            # Analyze video
            print(f"[API] Analyzing video: {video_path}")
            analysis = analyze_video(video_path, whisper_model)
            
            # Save analysis as TOON
            from toon import encode
            import datetime
            analysis_id = f"video_{video_path.stem}_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}"
            toon_path = ANALYSIS_DIR / f"{analysis_id}_analysis.toon"
            
            # Convert Path objects to strings for serialization
            def convert_paths(obj):
                if isinstance(obj, Path):
                    return str(obj)
                elif isinstance(obj, dict):
                    return {k: convert_paths(v) for k, v in obj.items()}
                elif isinstance(obj, list):
                    return [convert_paths(v) for v in obj]
                else:
                    return obj
            
            sanitized_analysis = convert_paths(analysis)
            toon_str = encode(sanitized_analysis)
            toon_path.write_text(toon_str, encoding="utf-8")
            
            # Generate creative report
            report = analyze_file(toon_path)
            
            return jsonify({
                'success': True,
                'analysis_id': analysis_id,
                'raw_analysis': sanitized_analysis,
                'creative_report': report,
                'file_type': 'video'
            })
            
        elif video_path.suffix.lower() in supported_image:
            # Analyze image
            print(f"[API] Analyzing image: {video_path}")
            analysis = analyze_image(video_path)
            
            # Save analysis as JSON (for consistency)
            analysis_id = f"image_{video_path.stem}_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}"
            json_path = ANALYSIS_DIR / f"{analysis_id}_analysis.json"
            
            with open(json_path, 'w', encoding='utf-8') as f:
                json.dump(analysis, f, indent=2, ensure_ascii=False)
            
            # For images, we don't generate creative report, use analysis directly
            return jsonify({
                'success': True,
                'analysis_id': analysis_id,
                'raw_analysis': analysis,
                'file_type': 'image'
            })
        else:
            return jsonify({'error': 'Unsupported file format'}), 400
            
    except Exception as e:
        print(f"[ERROR] Analysis failed: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/analysis/<analysis_id>', methods=['GET'])
def get_analysis(analysis_id):
    """Get analysis by ID"""
    try:
        # Look for TOON file
        toon_path = ANALYSIS_DIR / f"{analysis_id}_analysis.toon"
        if toon_path.exists():
            from toon import decode
            toon_str = toon_path.read_text(encoding="utf-8")
            analysis = decode(toon_str)
            
            # Look for report
            report_path = REPORT_DIR / f"{analysis_id}_report.json"
            if report_path.exists():
                with open(report_path, 'r', encoding='utf-8') as f:
                    report = json.load(f)
            else:
                report = None
            
            return jsonify({
                'success': True,
                'analysis_id': analysis_id,
                'raw_analysis': analysis,
                'creative_report': report
            })
        
        # Look for JSON file (for images)
        json_path = ANALYSIS_DIR / f"{analysis_id}_analysis.json"
        if json_path.exists():
            with open(json_path, 'r', encoding='utf-8') as f:
                analysis = json.load(f)
            
            return jsonify({
                'success': True,
                'analysis_id': analysis_id,
                'raw_analysis': analysis,
                'creative_report': None
            })
        
        return jsonify({'error': 'Analysis not found'}), 404
        
    except Exception as e:
        print(f"[ERROR] Failed to get analysis: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/recent-analyses', methods=['GET'])
def get_recent_analyses():
    """Get list of recent analyses"""
    try:
        analyses = []
        
        # Get TOON files
        for toon_file in ANALYSIS_DIR.glob("*_analysis.toon"):
            analysis_id = toon_file.stem.replace("_analysis", "")
            file_type = "video" if "video_" in analysis_id else "unknown"
            
            analyses.append({
                'id': analysis_id,
                'file_type': file_type,
                'created_at': toon_file.stat().st_mtime,
                'path': str(toon_file)
            })
        
        # Get JSON files (images)
        for json_file in ANALYSIS_DIR.glob("*_analysis.json"):
            analysis_id = json_file.stem.replace("_analysis", "")
            file_type = "image" if "image_" in analysis_id else "unknown"
            
            analyses.append({
                'id': analysis_id,
                'file_type': file_type,
                'created_at': json_file.stat().st_mtime,
                'path': str(json_file)
            })
        
        # Sort by creation time (newest first)
        analyses.sort(key=lambda x: x['created_at'], reverse=True)
        
        # Convert timestamps
        for analysis in analyses:
            from datetime import datetime
            analysis['created_at'] = datetime.fromtimestamp(analysis['created_at']).isoformat()
        
        return jsonify({'success': True, 'analyses': analyses[:10]})  # Last 10
        
    except Exception as e:
        print(f"[ERROR] Failed to get recent analyses: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5000"))
    debug = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    print(f"[INFO] Starting Flask server on port {port} (debug={debug})")
    app.run(host="0.0.0.0", port=port, debug=debug)