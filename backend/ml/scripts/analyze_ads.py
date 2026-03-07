#!/usr/bin/env python3
"""
analyze_ads_toon.py

Ad analysis pipeline:
- Uses screen-recorded videos (.webm/.mp4) AND images from raw_videos
- For VIDEOS: audio extraction, Whisper transcription, scene detection,
  frame sampling, color palette extraction, face detection (NO OCR)
- For IMAGES: color palette extraction, OCR text extraction, face detection
- Saves per-ad analysis in TOON format
- Works WITHOUT metadata JSON - analyzes all videos and images in raw_videos directory
"""

import os
import numbers
from pathlib import Path
from typing import Any, Dict, List
from datetime import datetime

import imageio_ffmpeg
os.environ["FFMPEG_BINARY"] = imageio_ffmpeg.get_ffmpeg_exe()

import cv2
import numpy as np
try:
    from moviepy import VideoFileClip  # moviepy 2.x
except ImportError:
    from moviepy.editor import VideoFileClip  # moviepy 1.x
from PIL import Image
from scenedetect import VideoManager, SceneManager
from scenedetect.detectors import ContentDetector
from sklearn.cluster import KMeans
import soundfile as sf
import whisper
import pytesseract  # pip install pytesseract
# Note: Also requires tesseract-ocr system package installed

from toon import encode, decode  # pip install python-toon

# Face detection (optional: skip if not installed, e.g. on Railway without face-recognition)
try:
    import face_recognition
    HAS_FACE_RECOGNITION = True
except ImportError:
    HAS_FACE_RECOGNITION = False

# ===========================
# Paths & Config
# ===========================

SCRIPT_DIR = Path(__file__).resolve().parent
ML_DIR = SCRIPT_DIR.parent
DATA_DIR = ML_DIR / "data"

RAW_VIDEO_DIR = DATA_DIR / "raw_videos"
ANALYSIS_DIR = DATA_DIR / "analysis"

RAW_VIDEO_DIR.mkdir(parents=True, exist_ok=True)
ANALYSIS_DIR.mkdir(parents=True, exist_ok=True)

WHISPER_MODEL_NAME = "small"

SUPPORTED_VIDEO_EXTS = {".webm", ".mp4", ".mkv", ".avi", ".mov"}
SUPPORTED_IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".webp"}

# ===========================
# Utilities
# ===========================

def is_video_file(file_path: Path) -> bool:
    """Check if file is a video based on extension"""
    return file_path.suffix.lower() in SUPPORTED_VIDEO_EXTS


def is_image_file(file_path: Path) -> bool:
    """Check if file is an image based on extension"""
    return file_path.suffix.lower() in SUPPORTED_IMAGE_EXTS


def get_video_metadata(video_path: Path) -> Dict[str, Any]:
    """Extract basic metadata from video file"""
    try:
        cap = cv2.VideoCapture(str(video_path))
        fps = cap.get(cv2.CAP_PROP_FPS)
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        duration = frame_count / fps if fps > 0 else 0
        cap.release()
        
        file_stats = video_path.stat()
        
        return {
            "duration_seconds": duration,
            "fps": fps,
            "frame_count": frame_count,
            "resolution": {"width": width, "height": height},
            "file_size_mb": file_stats.st_size / (1024 * 1024),
            "modified_time": datetime.fromtimestamp(file_stats.st_mtime).isoformat()
        }
    except Exception as e:
        print(f"[WARN] Could not extract metadata: {e}")
        return {}


def extract_audio(video_path: Path) -> Path:
    audio_path = video_path.with_suffix(".wav")
    if audio_path.exists():
        return audio_path

    clip = VideoFileClip(str(video_path))
    if clip.audio is None:
        clip.close()
        raise RuntimeError("No audio track found")

    clip.audio.write_audiofile(
        str(audio_path),
        fps=16000,
        nbytes=2,
        codec="pcm_s16le",
        verbose=False,
        logger=None,
    )
    clip.close()
    return audio_path


def transcribe_audio_whisper(audio_path: Path, model) -> Dict[str, Any]:
    data, sr = sf.read(str(audio_path), dtype="float32")
    if data.ndim > 1:
        data = np.mean(data, axis=1)

    if sr != 16000:
        import resampy
        data = resampy.resample(data, sr, 16000)

    return model.transcribe(data, word_timestamps=True)


def detect_scenes(video_path: Path, threshold: float = 27.0) -> List[Dict[str, float]]:
    video_manager = VideoManager([str(video_path)])
    scene_manager = SceneManager()
    scene_manager.add_detector(ContentDetector(threshold=threshold))

    video_manager.start()
    scene_manager.detect_scenes(frame_source=video_manager)
    scenes_raw = scene_manager.get_scene_list()
    video_manager.release()

    return [
        {"start_sec": s.get_seconds(), "end_sec": e.get_seconds()}
        for s, e in scenes_raw
    ]


def sample_frames(video_path: Path, num_frames: int = 5) -> List[Image.Image]:
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise RuntimeError("Cannot open video")

    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    if total == 0:
        cap.release()
        return []

    indices = np.linspace(0, total - 1, num_frames, dtype=int)
    frames = []

    for idx in indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, int(idx))
        ret, frame = cap.read()
        if ret:
            frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            frames.append(Image.fromarray(frame))

    cap.release()
    return frames


def extract_palette_from_frames(frames: List[Image.Image], k: int = 4) -> List[Dict[str, float]]:
    if not frames:
        return []

    pixels = []
    for img in frames:
        # Convert to RGB if not already (handles grayscale, RGBA, etc.)
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        small = img.resize((128, 128))
        img_array = np.array(small)
        
        # Ensure we have 3 channels
        if img_array.ndim == 2:  # Grayscale
            img_array = np.stack([img_array] * 3, axis=-1)
        elif img_array.shape[2] == 4:  # RGBA
            img_array = img_array[:, :, :3]
        
        pixels.append(img_array.reshape(-1, 3))

    pixels = np.vstack(pixels)
    kmeans = KMeans(n_clusters=k, n_init=3, random_state=42)
    labels = kmeans.fit_predict(pixels)
    centers = kmeans.cluster_centers_.astype(int)

    counts = np.bincount(labels)
    total = counts.sum()

    palette = []
    for c, cnt in zip(centers, counts):
        r, g, b = c
        palette.append({
            "hex": f"#{r:02X}{g:02X}{b:02X}",
            "ratio": float(cnt) / float(total)
        })

    return sorted(palette, key=lambda x: x["ratio"], reverse=True)


# ===========================
# Face Detection
# ===========================

def detect_faces_in_image(image: Image.Image) -> Dict[str, Any]:
    """Detect faces in a single image using face_recognition"""
    if not HAS_FACE_RECOGNITION:
        return {"face_count": 0, "faces": [], "error": "face_recognition not installed"}
    try:
        # Convert to RGB if not already (handles all formats)
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Convert PIL image to numpy array (RGB) with uint8 dtype
        img_array = np.array(image, dtype=np.uint8)
        
        # Ensure it's 8-bit RGB
        if img_array.ndim == 2:  # Grayscale
            img_array = np.stack([img_array] * 3, axis=-1)
        elif img_array.shape[2] == 4:  # RGBA
            img_array = img_array[:, :, :3]
        
        # Detect face locations
        face_locations = face_recognition.face_locations(img_array)
        
        # Get face encodings (can be used for face recognition/comparison)
        face_encodings = face_recognition.face_encodings(img_array, face_locations)
        
        faces_data = []
        for idx, (top, right, bottom, left) in enumerate(face_locations):
            faces_data.append({
                'face_id': idx,
                'bbox': {
                    'top': top,
                    'right': right,
                    'bottom': bottom,
                    'left': left,
                    'width': right - left,
                    'height': bottom - top
                }
            })
        
        return {
            'face_count': len(face_locations),
            'faces': faces_data
        }
    except Exception as e:
        print(f"[WARN] Face detection failed: {e}")
        return {
            'face_count': 0,
            'faces': [],
            'error': str(e)
        }


def detect_faces_in_frames(frames: List[Image.Image]) -> Dict[str, Any]:
    """Detect unique faces across all sampled frames (count each person once)"""
    if not HAS_FACE_RECOGNITION:
        return {
            "unique_people_count": 0,
            "max_faces_in_single_frame": 0,
            "frames_with_faces": 0,
            "frames_analyzed": len(frames),
            "face_detection_by_frame": [],
        }
    all_faces = []
    unique_face_encodings = []
    unique_face_count = 0
    max_faces_in_frame = 0

    for idx, frame in enumerate(frames):
        try:
            # Convert to RGB if not already
            if frame.mode != 'RGB':
                frame = frame.convert('RGB')
            
            # Convert PIL image to numpy array (RGB) with uint8 dtype
            img_array = np.array(frame, dtype=np.uint8)
            
            # Ensure it's 8-bit RGB
            if img_array.ndim == 2:  # Grayscale
                img_array = np.stack([img_array] * 3, axis=-1)
            elif img_array.shape[2] == 4:  # RGBA
                img_array = img_array[:, :, :3]
            
            # Detect face locations
            face_locations = face_recognition.face_locations(img_array)
            face_count = len(face_locations)
            
            if face_count > 0:
                # Get face encodings for comparison
                face_encodings = face_recognition.face_encodings(img_array, face_locations)
                
                frame_faces = []
                for face_idx, (encoding, location) in enumerate(zip(face_encodings, face_locations)):
                    top, right, bottom, left = location
                    
                    # Check if this is a new unique face
                    is_new_face = True
                    for known_encoding in unique_face_encodings:
                        # Compare with known faces (tolerance of 0.6 is default)
                        matches = face_recognition.compare_faces([known_encoding], encoding, tolerance=0.6)
                        if matches[0]:
                            is_new_face = False
                            break
                    
                    # If it's a new face, add to unique faces
                    if is_new_face:
                        unique_face_encodings.append(encoding)
                        unique_face_count += 1
                    
                    frame_faces.append({
                        'face_id': face_idx,
                        'is_new_unique_face': is_new_face,
                        'bbox': {
                            'top': top,
                            'right': right,
                            'bottom': bottom,
                            'left': left,
                            'width': right - left,
                            'height': bottom - top
                        }
                    })
                
                all_faces.append({
                    'frame_index': idx,
                    'face_count': face_count,
                    'faces': frame_faces
                })
                max_faces_in_frame = max(max_faces_in_frame, face_count)
        except Exception as e:
            print(f"[WARN] Face detection failed for frame {idx}: {e}")
            continue
    
    return {
        'unique_people_count': unique_face_count,
        'max_faces_in_single_frame': max_faces_in_frame,
        'frames_with_faces': len(all_faces),
        'frames_analyzed': len(frames),
        'face_detection_by_frame': all_faces
    }


# ===========================
# OCR Extraction (Images Only - NOT for videos)
# ===========================

def preprocess_image_for_ocr(image: Image.Image) -> Image.Image:
    """Enhance image for better OCR results"""
    # Convert to grayscale
    img_array = np.array(image.convert('L'))
    
    # Apply adaptive thresholding for better text detection
    img_array = cv2.adaptiveThreshold(
        img_array, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
        cv2.THRESH_BINARY, 11, 2
    )
    
    # Denoise
    img_array = cv2.fastNlMeansDenoising(img_array, None, 10, 7, 21)
    
    return Image.fromarray(img_array)


def extract_text_from_image(image: Image.Image, preprocess: bool = True) -> Dict[str, Any]:
    """Extract text from a single image using OCR - ONLY FOR IMAGE FILES"""
    try:
        if preprocess:
            processed_img = preprocess_image_for_ocr(image)
        else:
            processed_img = image
        
        # Extract text with detailed data
        ocr_data = pytesseract.image_to_data(
            processed_img, 
            output_type=pytesseract.Output.DICT,
            config='--psm 6'  # Assume uniform block of text
        )
        
        # Extract simple text
        text = pytesseract.image_to_string(processed_img, config='--psm 6')
        
        # Filter out low-confidence detections and organize by lines
        words = []
        for i in range(len(ocr_data['text'])):
            if int(ocr_data['conf'][i]) > 30:  # Confidence threshold
                word_text = ocr_data['text'][i].strip()
                if word_text:
                    words.append({
                        'text': word_text,
                        'confidence': int(ocr_data['conf'][i]),
                        'bbox': {
                            'x': ocr_data['left'][i],
                            'y': ocr_data['top'][i],
                            'width': ocr_data['width'][i],
                            'height': ocr_data['height'][i]
                        }
                    })
        
        return {
            'full_text': text.strip(),
            'words': words,
            'word_count': len(words)
        }
    except Exception as e:
        print(f"[WARN] OCR extraction failed: {e}")
        return {
            'full_text': '',
            'words': [],
            'word_count': 0,
            'error': str(e)
        }


# ===========================
# TOON helpers
# ===========================

def sanitize_for_toon(obj: Any) -> Any:
    if obj is None or isinstance(obj, (str, bool, int, float)):
        return obj
    if isinstance(obj, numbers.Number):
        return obj
    if isinstance(obj, dict):
        return {str(k): sanitize_for_toon(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple, set)):
        return [sanitize_for_toon(v) for v in obj]
    if isinstance(obj, Path):
        return str(obj)
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    return str(obj)


def save_analysis_to_toon(file_id: str, analysis: Dict[str, Any]) -> Path:
    out = ANALYSIS_DIR / f"{file_id}_analysis.toon"
    data = sanitize_for_toon(analysis)
    toon_str = encode(data)
    out.write_text(toon_str, encoding="utf-8")
    print(f"[OK] Saved TOON → {out.name}")
    return out


# ===========================
# Analysis Functions
# ===========================

def analyze_video(video_path: Path, whisper_model) -> Dict[str, Any]:
    """
    Analyze a video file
    - NO OCR (OCR is disabled for video files)
    - Includes: audio transcription, scene detection, color palette, face detection
    """
    video_id = video_path.stem
    
    print(f"\n[INFO] Analyzing VIDEO: {video_path.name}")
    print(f"[INFO] File type: {video_path.suffix} - OCR will be SKIPPED")
    
    # Get video metadata
    video_metadata = get_video_metadata(video_path)
    
    # Extract audio and transcribe
    print(f"[INFO] Extracting audio...")
    try:
        audio_path = extract_audio(video_path)
        print(f"[INFO] Transcribing audio...")
        transcript = transcribe_audio_whisper(audio_path, whisper_model)
    except Exception as e:
        print(f"[WARN] Audio extraction/transcription failed: {e}")
        audio_path = None
        transcript = {"text": "", "segments": []}
    
    # Detect scenes
    print(f"[INFO] Detecting scenes...")
    scenes = detect_scenes(video_path)
    
    # Sample frames
    print(f"[INFO] Sampling frames...")
    frames = sample_frames(video_path)
    
    # Extract color palette
    print(f"[INFO] Extracting color palette...")
    palette = extract_palette_from_frames(frames)
    
    # Detect faces (NO OCR for videos)
    print(f"[INFO] Detecting unique faces in {len(frames)} frames...")
    face_data = detect_faces_in_frames(frames)
    print(f"[INFO] ✓ Found {face_data['unique_people_count']} unique person(s)")

    return {
        "content_type": "video",
        "video_id": video_id,
        "filename": video_path.name,
        "file_path": str(video_path),
        "audio_path": str(audio_path) if audio_path else None,
        "video_metadata": video_metadata,
        "transcript": {
            "text": transcript.get("text", ""),
            "segments": [
                {
                    "start": s.get("start"),
                    "end": s.get("end"),
                    "text": s.get("text", "").strip()
                }
                for s in transcript.get("segments", [])
            ],
        },
        "scenes": scenes,
        "scene_count": len(scenes),
        "color_palette": palette,
        "face_detection": face_data,
        "ocr_performed": False,  # Explicitly mark that OCR was NOT performed
        "ocr_skipped_reason": "OCR is disabled for video files",
        "analysis_timestamp": datetime.now().isoformat()
    }


def analyze_image(image_path: Path) -> Dict[str, Any]:
    """
    Analyze an image file
    - Includes: OCR text extraction, color palette, face detection
    - OCR is ONLY performed for image files
    """
    image_id = image_path.stem
    
    print(f"\n[INFO] Analyzing IMAGE: {image_path.name}")
    print(f"[INFO] File type: {image_path.suffix} - OCR will be PERFORMED")
    
    try:
        image = Image.open(image_path)
        
        # Extract text using OCR (ONLY for images)
        print(f"[INFO] Running OCR on image...")
        ocr_result = extract_text_from_image(image)
        print(f"[INFO] ✓ Extracted {ocr_result['word_count']} words")
        
        # Extract color palette
        print(f"[INFO] Extracting color palette...")
        palette = extract_palette_from_frames([image], k=4)
        
        # Detect faces
        print(f"[INFO] Detecting faces...")
        face_data = detect_faces_in_image(image)
        print(f"[INFO] ✓ Found {face_data['face_count']} face(s)")
        
        file_stats = image_path.stat()
        
        return {
            'content_type': 'image',
            'image_id': image_id,
            'filename': image_path.name,
            'file_path': str(image_path),
            'ocr_data': ocr_result,
            'ocr_performed': True,  # Explicitly mark that OCR WAS performed
            'color_palette': palette,
            'face_detection': face_data,
            'image_size': {
                'width': image.width,
                'height': image.height
            },
            'file_size_mb': file_stats.st_size / (1024 * 1024),
            'modified_time': datetime.fromtimestamp(file_stats.st_mtime).isoformat(),
            'analysis_timestamp': datetime.now().isoformat()
        }
    except Exception as e:
        print(f"[ERROR] Failed to analyze image {image_path.name}: {e}")
        import traceback
        traceback.print_exc()
        return {
            'content_type': 'image',
            'image_id': image_id,
            'filename': image_path.name,
            'file_path': str(image_path),
            'error': str(e),
            'analysis_timestamp': datetime.now().isoformat()
        }


# ===========================
# Main
# ===========================

def main():
    print("=" * 60)
    print("AD VIDEO & IMAGE ANALYSIS PIPELINE")
    print("=" * 60)
    print("NOTE: OCR is ONLY performed on IMAGE files (.jpg, .png, etc.)")
    print("      OCR is SKIPPED for VIDEO files (.mp4, .webm, etc.)")
    print("=" * 60)
    
    # Find all videos and images in raw_videos directory
    all_files = [f for f in RAW_VIDEO_DIR.iterdir() if f.is_file()]
    videos = [f for f in all_files if is_video_file(f)]
    images = [f for f in all_files if is_image_file(f)]
    
    print(f"\n[INFO] Scanning {RAW_VIDEO_DIR}")
    print(f"[INFO] Found {len(videos)} videos: {[v.name for v in videos]}")
    print(f"[INFO] Found {len(images)} images: {[i.name for i in images]}")
    
    if not videos and not images:
        print(f"\n[WARN] No videos or images found in {RAW_VIDEO_DIR}")
        print(f"[WARN] Supported video formats: {', '.join(SUPPORTED_VIDEO_EXTS)}")
        print(f"[WARN] Supported image formats: {', '.join(SUPPORTED_IMAGE_EXTS)}")
        return
    
    # Load Whisper model only if we have videos
    whisper_model = None
    if videos:
        print(f"\n[INFO] Loading Whisper model: {WHISPER_MODEL_NAME}")
        whisper_model = whisper.load_model(WHISPER_MODEL_NAME)
    
    # Process videos
    if videos:
        print(f"\n{'=' * 60}")
        print(f"PROCESSING {len(videos)} VIDEO(S) - NO OCR")
        print(f"{'=' * 60}")
        
        for idx, video_path in enumerate(videos, 1):
            print(f"\n[VIDEO {idx}/{len(videos)}] {video_path.name}")
            
            try:
                analysis = analyze_video(video_path, whisper_model)
                save_analysis_to_toon(f"video_{video_path.stem}", analysis)
                
                # Print summary
                print(f"[SUCCESS] Completed analysis for {video_path.name}")
                print(f"  ✓ Unique People: {analysis['face_detection']['unique_people_count']}")
                print(f"  ✓ Scenes: {analysis['scene_count']}")
                print(f"  ✓ OCR: Skipped (video file)")
                
            except Exception as e:
                print(f"[ERROR] Failed to analyze {video_path.name}: {e}")
                import traceback
                traceback.print_exc()
    
    # Process images
    if images:
        print(f"\n{'=' * 60}")
        print(f"PROCESSING {len(images)} IMAGE(S) - WITH OCR")
        print(f"{'=' * 60}")
        
        for idx, img_path in enumerate(images, 1):
            print(f"\n[IMAGE {idx}/{len(images)}] {img_path.name}")
            
            try:
                analysis = analyze_image(img_path)
                save_analysis_to_toon(f"image_{img_path.stem}", analysis)
                
                # Print summary
                if 'error' not in analysis:
                    print(f"[SUCCESS] Completed analysis for {img_path.name}")
                    print(f"  ✓ Faces: {analysis['face_detection']['face_count']}")
                    print(f"  ✓ Words: {analysis['ocr_data']['word_count']}")
                    print(f"  ✓ OCR: Performed (image file)")
                else:
                    print(f"[ERROR] Analysis failed with error")
                    
            except Exception as e:
                print(f"[ERROR] Failed to analyze {img_path.name}: {e}")
                import traceback
                traceback.print_exc()
    
    print(f"\n{'=' * 60}")
    print("ANALYSIS COMPLETE")
    print(f"{'=' * 60}")
    print(f"Videos processed: {len(videos)} (OCR skipped)")
    print(f"Images processed: {len(images)} (OCR performed)")
    print(f"Results saved to: {ANALYSIS_DIR}")


if __name__ == "__main__":
    main()