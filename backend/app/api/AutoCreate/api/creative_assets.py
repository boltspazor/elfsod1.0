import os
import base64
import uuid
import json
import time
import requests
from flask import Blueprint, request, jsonify
from dotenv import load_dotenv
import logging
import mimetypes

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create blueprint
creative_assets_bp = Blueprint('creative_assets', __name__)

# API Configuration
RUNWAY_API_KEY = os.environ.get('RUNWAY_API_KEY')
RUNWAY_BASE_URL = "https://api.dev.runwayml.com"
RUNWAY_VERSION = "2024-11-06"

# Command Center (same image_gen as GenerateAdPopup / Elfsod 2.0 – reliable text-to-image)
COMMAND_CENTER_API_URL = os.environ.get('COMMAND_CENTER_API_URL', 'http://localhost:5002').rstrip('/')

# Headers for Runway API
RUNWAY_HEADERS = {
    "Authorization": f"Bearer {RUNWAY_API_KEY}",
    "X-Runway-Version": RUNWAY_VERSION,
    "Content-Type": "application/json",
}

# In-memory storage for tasks (in production, use a database)
tasks_store = {}
generation_tasks = {}  # Separate storage for tracking individual tasks

# -----------------------------
# Helper Functions
# -----------------------------

def get_image_as_data_uri(image_path_or_data: str, filename: str = None) -> str:
    """
    Convert image to data URI format as per Runway documentation
    """
    try:
        # If it's already a data URI, return it
        if image_path_or_data.startswith('data:image/'):
            return image_path_or_data
        
        # If it's base64 data, create data URI
        elif ',' in image_path_or_data:
            # It's already a data URI without the prefix
            mime_type = 'image/jpeg'
            if filename:
                content_type = mimetypes.guess_type(filename)[0]
                if content_type and content_type.startswith('image/'):
                    mime_type = content_type
            
            return f"data:{mime_type};base64,{image_path_or_data}"
        
        else:
            # It's raw base64, add the prefix
            content_type = 'image/jpeg'
            if filename:
                file_ext = filename.lower().split('.')[-1]
                if file_ext in ['png', 'jpg', 'jpeg', 'webp', 'gif']:
                    content_type = f"image/{'jpeg' if file_ext in ['jpg', 'jpeg'] else file_ext}"
            
            return f"data:{content_type};base64,{image_path_or_data}"
            
    except Exception as e:
        logger.error(f"Error creating data URI: {e}")
        # Default to JPEG
        return f"data:image/jpeg;base64,{image_path_or_data}"

def save_image_locally(image_data: str, filename: str) -> str:
    """Save base64 image data to local file system"""
    try:
        # Create output directory if it doesn't exist
        output_dir = "uploaded_images"
        os.makedirs(output_dir, exist_ok=True)
        
        # Decode base64 data
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        image_bytes = base64.b64decode(image_data)
        
        # Save file
        filepath = os.path.join(output_dir, filename)
        with open(filepath, "wb") as f:
            f.write(image_bytes)
        
        logger.info(f"Image saved to: {filepath}")
        return filepath
    except Exception as e:
        logger.error(f"Error saving image: {e}")
        return None

def generate_image_via_command_center(prompt_text: str, aspect_ratio: str = "1344:768"):
    """
    Generate image using Command Center /image_gen (same as GenerateAdPopup).
    Synchronous call – returns when image is ready. Uses gemini_2.5_flash for reliability.
    """
    url = f"{COMMAND_CENTER_API_URL}/image_gen"
    payload = {
        "message": prompt_text,
        "aspect_ratio": aspect_ratio,
        "style": "photorealistic",
    }
    try:
        logger.info(f"Calling Command Center image_gen: {prompt_text[:80]}...")
        resp = requests.post(url, json=payload, timeout=120)
        data = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
        if not resp.ok:
            err = data.get("error", resp.text or f"HTTP {resp.status_code}")
            raise RuntimeError(err)
        if not data.get("success"):
            raise RuntimeError(data.get("error", "Image generation failed"))
        task_id = data.get("task_id") or str(uuid.uuid4())
        data_uri = data.get("data_uri", "")
        filename = data.get("filename", f"{task_id}.png")
        if not data_uri:
            raise RuntimeError("No data_uri in response")
        return {"task_id": task_id, "data_uri": data_uri, "filename": filename}
    except requests.exceptions.RequestException as e:
        logger.error(f"Command Center request error: {e}")
        raise RuntimeError(str(e))


def create_image_generation_task(image_data_uri: str, prompt_text: str, variation_number: int = 1):
    """
    Create image generation task using Runway ML with proper format as per documentation
    Uses @product to reference the uploaded image in the prompt.
    (Used only for video flow; images use generate_image_via_command_center.)
    """
    try:
        payload = {
            "model": "gen4_image",
            "ratio": "1344:768",
            "promptText": f"@product {prompt_text}",
            "referenceImages": [{"uri": image_data_uri, "tag": "product"}]
        }
        logger.info(f"Creating image generation task with prompt: {prompt_text[:100]}...")
        response = requests.post(
            f"{RUNWAY_BASE_URL}/v1/text_to_image",
            headers=RUNWAY_HEADERS,
            json=payload,
            timeout=30
        )
        logger.info(f"Runway API Response Status: {response.status_code}")
        if response.status_code != 200:
            logger.error(f"Runway API Error: {response.text}")
            response.raise_for_status()
        task_data = response.json()
        task_id = task_data.get("id")
        if not task_id:
            raise Exception("No task ID returned from Runway API")
        logger.info(f"Image generation task created: {task_id}")
        return task_id
    except Exception as e:
        logger.error(f"Error creating image generation task: {e}")
        raise

def create_video_generation_task(image_data_uri: str, prompt_text: str, variation_number: int = 1):
    """
    Create video generation task using Runway ML
    Note: Video generation uses different API structure
    """
    try:
        # Prepare request payload for video generation
        payload = {
            "model": "veo3.1",
            "referenceImage": {
                "uri": image_data_uri
            },
            "promptText": prompt_text,
            "ratio": "1280:720",
            "duration": 4,
        }
        
        logger.info(f"Creating video generation task with prompt: {prompt_text[:100]}...")
        
        # Make API call
        response = requests.post(
            f"{RUNWAY_BASE_URL}/v1/image_to_video",
            headers=RUNWAY_HEADERS,
            json=payload,
            timeout=30
        )
        
        logger.info(f"Runway Video API Response Status: {response.status_code}")
        
        if response.status_code != 200:
            logger.error(f"Runway Video API Error: {response.text}")
            response.raise_for_status()
        
        task_data = response.json()
        task_id = task_data.get("id")
        
        if not task_id:
            logger.error(f"No task ID returned for video: {task_data}")
            raise Exception("No task ID returned from Runway API for video")
        
        logger.info(f"Video generation task created: {task_id}")
        return task_id
        
    except Exception as e:
        logger.error(f"Error creating video generation task: {e}")
        raise

def poll_task_status(task_id: str):
    """Poll Runway ML task status with better logging"""
    max_attempts = 180  # 3 minutes with 1-second intervals
    attempt = 0
    
    logger.info(f"Starting to poll task: {task_id}")
    
    while attempt < max_attempts:
        try:
            # Get task status
            response = requests.get(
                f"{RUNWAY_BASE_URL}/v1/tasks/{task_id}",
                headers=RUNWAY_HEADERS,
                timeout=10
            )
            
            if response.status_code != 200:
                logger.error(f"Task status check failed: {response.status_code}")
                time.sleep(2)
                attempt += 1
                continue
            
            task = response.json()
            status = task.get("status")
            
            logger.info(f"Task {task_id} status: {status} (attempt {attempt + 1}/{max_attempts})")
            
            if status == "SUCCEEDED":
                output_url = task.get("output", [])[0] if task.get("output") else None
                if output_url:
                    logger.info(f"Task {task_id} succeeded! Output URL: {output_url[:50]}...")
                    return {
                        "success": True,
                        "status": status,
                        "output_url": output_url,
                        "task_id": task_id
                    }
                else:
                    logger.error(f"Task succeeded but no output URL: {task}")
            
            elif status == "FAILED":
                error_message = task.get("error", {}).get("message", "Unknown error")
                logger.error(f"Task {task_id} failed: {error_message}")
                return {
                    "success": False,
                    "status": status,
                    "error": error_message
                }
            elif status == "CANCELED":
                logger.error(f"Task {task_id} was canceled")
                return {
                    "success": False,
                    "status": status,
                    "error": "Task was canceled"
                }
            
            # Wait before next poll
            time.sleep(1)
            attempt += 1
            
        except Exception as e:
            logger.error(f"Error polling task {task_id}: {e}")
            time.sleep(2)
            attempt += 1
    
    logger.error(f"Task {task_id} polling timeout after {max_attempts} seconds")
    return {
        "success": False,
        "status": "TIMEOUT",
        "error": f"Task polling timeout after {max_attempts} seconds"
    }

def download_and_store_asset(output_url: str, task_id: str, asset_type: str, campaign_id: str):
    """Download generated asset and store it"""
    try:
        logger.info(f"Downloading asset from: {output_url[:50]}...")
        
        # Download the asset
        response = requests.get(output_url, timeout=30)
        response.raise_for_status()
        
        # Convert to base64
        asset_data = base64.b64encode(response.content).decode('utf-8')
        mime_type = 'video/mp4' if asset_type == 'video' else 'image/png'
        data_uri = f"data:{mime_type};base64,{asset_data}"
        
        # Generate filename
        asset_filename = f"{campaign_id}_{task_id}_{asset_type}.{'mp4' if asset_type == 'video' else 'png'}"
        
        # Save locally
        output_dir = "generated_videos" if asset_type == 'video' else "generated_images"
        os.makedirs(output_dir, exist_ok=True)
        filepath = os.path.join(output_dir, asset_filename)
        
        with open(filepath, "wb") as f:
            f.write(response.content)
        
        logger.info(f"Asset saved to: {filepath}")
        
        return {
            "data_uri": data_uri,
            "local_path": filepath,
            "filename": asset_filename,
            "output_url": output_url
        }
        
    except Exception as e:
        logger.error(f"Error downloading/storing asset: {e}")
        raise

def generate_trend_aware_prompt(base_prompt: str, ad_type: str, campaign_goal: str) -> str:
    """
    Generate trend-aware prompts incorporating current trends
    Inspired by the original creative_assets.py
    """
    # Current trends for 2026
    current_trends = [
        "AI-generated unique aesthetics",
        "Fluid morphing animations",
        "Glassmorphism 2.0 with depth",
        "Holographic and iridescent effects",
        "Sustainable design patterns",
        "Adaptive responsive layouts",
        "Kinetic typography systems",
        "Neural network inspired patterns"
    ]
    
    # Select relevant trends
    import random
    selected_trends = random.sample(current_trends, min(3, len(current_trends)))
    
    # Build the final prompt
    prompt = f"@product {base_prompt}"
    prompt += f", incorporating trends: {', '.join(selected_trends)}"
    prompt += f", 2026 design aesthetics"
    prompt += f", professional {ad_type} advertisement"
    prompt += f", ultra-detailed, photorealistic, 8K resolution"
    prompt += f", professional lighting, perfect composition"
    
    return prompt

# -----------------------------
# API Routes
# -----------------------------

@creative_assets_bp.route('/api/upload-image', methods=['POST', 'OPTIONS'])
def upload_image():
    """Upload product image and create campaign"""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data:
            return jsonify({"success": False, "error": "No data provided"}), 400
        
        required_fields = ['image_data', 'filename', 'ad_type']
        for field in required_fields:
            if field not in data:
                return jsonify({"success": False, "error": f"Missing required field: {field}"}), 400
        
        user_id = data.get('user_id', 'demo_user')
        image_data = data['image_data']
        filename = data['filename']
        ad_type = data['ad_type']
        campaign_id = data.get('campaign_id', f"campaign_{str(uuid.uuid4())[:8]}")
        
        # Convert to proper data URI format
        image_data_uri = get_image_as_data_uri(image_data, filename)
        
        logger.info(f"Uploading image for campaign: {campaign_id}, user: {user_id}")
        logger.info(f"Data URI format: {image_data_uri[:100]}...")
        
        # Save image locally
        filepath = save_image_locally(image_data, filename)
        
        if not filepath:
            return jsonify({"success": False, "error": "Failed to save image"}), 500
        
        # Store in tasks store
        tasks_store[campaign_id] = {
            "user_id": user_id,
            "filename": filename,
            "filepath": filepath,
            "image_data": image_data_uri,  # Store as data URI
            "ad_type": ad_type,
            "created_at": time.time(),
            "status": "uploaded",
            "generated_assets": []  # Store all generated assets here
        }
        
        # Initialize generation tasks for this campaign
        generation_tasks[campaign_id] = []
        
        logger.info(f"Image uploaded successfully for campaign: {campaign_id}")
        
        return jsonify({
            "success": True,
            "message": "Image uploaded successfully",
            "campaign_id": campaign_id,
            "user_id": user_id,
            "ad_type": ad_type,
            "image_format": "data_uri"
        }), 200
        
    except Exception as e:
        logger.error(f"Error uploading image: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@creative_assets_bp.route('/api/generate-assets', methods=['POST', 'OPTIONS'])
def generate_assets():
    """Generate multiple AI assets (images or videos)"""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data:
            return jsonify({"success": False, "error": "No data provided"}), 400
        
        required_fields = ['campaign_id', 'asset_type']
        for field in required_fields:
            if field not in data:
                return jsonify({"success": False, "error": f"Missing required field: {field}"}), 400
        
        campaign_id = data['campaign_id']
        asset_type = data['asset_type']  # 'image' or 'video'
        user_id = data.get('user_id', 'demo_user')
        campaign_goal = data.get('campaign_goal', 'awareness')
        ad_type = data.get('ad_type', 'General Ads')
        
        # Check if campaign exists
        if campaign_id not in tasks_store:
            return jsonify({"success": False, "error": "Campaign not found. Please upload image first."}), 404
        
        campaign = tasks_store[campaign_id]
        image_data_uri = campaign.get('image_data') or ''
        
        # Validate asset type
        if asset_type not in ['image', 'video']:
            return jsonify({"success": False, "error": "Invalid asset type. Must be 'image' or 'video'"}), 400
        
        # Video generation requires an image as reference (Runway image_to_video), not a video
        if asset_type == 'video':
            if not image_data_uri or not isinstance(image_data_uri, str):
                return jsonify({"success": False, "error": "No reference image. Please upload an image (not a video) to generate videos."}), 400
            if image_data_uri.strip().lower().startswith('data:video/'):
                return jsonify({"success": False, "error": "Video generation requires an image as reference. Please upload an image (e.g. PNG, JPG), not a video file."}), 400
            if not image_data_uri.strip().lower().startswith('data:image/'):
                return jsonify({"success": False, "error": "Reference must be an image (data:image/...). Please upload an image."}), 400
        
        logger.info(f"Starting {asset_type} generation for campaign: {campaign_id}, ad_type: {ad_type}")
        
        # Generate multiple variations (3 for demo, can be configurable)
        num_variations = 3
        task_ids = []
        
        # Different prompts for each variation
        variation_prompts = [
            f"Create a professional advertisement background for {ad_type}. Campaign goal: {campaign_goal}. Use modern, clean design with good lighting.",
            f"Generate an eye-catching marketing image for {ad_type}. Campaign goal: {campaign_goal}. Focus on product showcase with attractive colors.",
            f"Create a stylish promotional image for {ad_type}. Campaign goal: {campaign_goal}. Use contemporary aesthetics and professional composition."
        ]
        
        if asset_type == 'image':
            # Use Command Center image_gen (same as GenerateAdPopup) – reliable, no Runway errors
            for i in range(num_variations):
                try:
                    prompt_text = generate_trend_aware_prompt(
                        variation_prompts[i],
                        ad_type,
                        campaign_goal
                    )
                    # Command center is text-to-image only; strip @product reference
                    prompt_for_cc = prompt_text.replace("@product ", "").strip() or prompt_text
                    result = generate_image_via_command_center(prompt_for_cc)
                    task_id = result["task_id"]
                    data_uri = result["data_uri"]
                    filename = result["filename"]
                    asset_id = str(uuid.uuid4())
                    asset_info = {
                        "id": asset_id,
                        "task_id": task_id,
                        "campaign_id": campaign_id,
                        "type": "image",
                        "data_uri": data_uri,
                        "filename": filename,
                        "title": f"AI Generated Image {i + 1}",
                        "prompt": prompt_text,
                        "score": 80 + (i + 1) * 5,
                        "status": "completed",
                    }
                    if "generated_assets" not in campaign:
                        campaign["generated_assets"] = []
                    campaign["generated_assets"].append(asset_info)
                    tasks_store[campaign_id] = campaign
                    task_info = {
                        "task_id": task_id,
                        "campaign_id": campaign_id,
                        "user_id": user_id,
                        "asset_type": "image",
                        "ad_type": ad_type,
                        "campaign_goal": campaign_goal,
                        "status": "completed",
                        "variation": i + 1,
                        "started_at": time.time(),
                        "prompt": prompt_text,
                    }
                    if campaign_id not in generation_tasks:
                        generation_tasks[campaign_id] = []
                    generation_tasks[campaign_id].append(task_info)
                    task_ids.append(task_id)
                    logger.info(f"Image variation {i+1} generated via Command Center: {task_id}")
                except Exception as e:
                    logger.error(f"Failed image variation {i+1}: {e}")
        else:
            # Video: Runway image_to_video (reference must be image)
            for i in range(num_variations):
                try:
                    prompt_text = generate_trend_aware_prompt(
                        variation_prompts[i],
                        ad_type,
                        campaign_goal
                    )
                    task_id = create_video_generation_task(
                        image_data_uri,
                        prompt_text,
                        i + 1
                    )
                    task_info = {
                        "task_id": task_id,
                        "campaign_id": campaign_id,
                        "user_id": user_id,
                        "asset_type": asset_type,
                        "ad_type": ad_type,
                        "campaign_goal": campaign_goal,
                        "status": "processing",
                        "variation": i + 1,
                        "started_at": time.time(),
                        "prompt": prompt_text
                    }
                    if campaign_id not in generation_tasks:
                        generation_tasks[campaign_id] = []
                    generation_tasks[campaign_id].append(task_info)
                    task_ids.append(task_id)
                    logger.info(f"Created {asset_type} generation task {i+1}: {task_id}")
                except requests.exceptions.HTTPError as e:
                    err_msg = e.response.text if e.response is not None else str(e)
                    logger.error(f"Runway video API error variation {i+1}: {err_msg}")
                    return jsonify({
                        "success": False,
                        "error": "Video generation failed. Ensure RUNWAY_API_KEY is set and the reference is a valid image.",
                        "detail": err_msg[:200]
                    }), 500
                except Exception as e:
                    logger.error(f"Failed to create video variation {i+1}: {e}")
                    return jsonify({
                        "success": False,
                        "error": str(e) or "Video generation failed. Use an image (not a video) as reference."
                    }), 500
        
        if not task_ids:
            return jsonify({"success": False, "error": "Failed to create any generation tasks"}), 500
        
        # Update campaign status
        campaign['status'] = f'generating_{asset_type}'
        tasks_store[campaign_id] = campaign
        
        logger.info(f"Started {len(task_ids)} {asset_type} generation tasks for campaign: {campaign_id}")
        
        return jsonify({
            "success": True,
            "message": f"Started {len(task_ids)} {asset_type} generation tasks",
            "task_ids": task_ids,
            "campaign_id": campaign_id,
            "asset_type": asset_type,
            "variations": num_variations,
            "estimated_time": "1-3 minutes per asset",
            "note": "Assets will be generated in parallel. Check status of each task individually."
        }), 200
        
    except Exception as e:
        logger.error(f"Error generating assets: {e}", exc_info=True)
        return jsonify({"success": False, "error": str(e) or "Generation failed"}), 500

@creative_assets_bp.route('/api/check-status/<task_id>', methods=['GET', 'OPTIONS'])
def check_status(task_id: str):
    """Check status of a generation task and return asset if completed"""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        logger.info(f"Checking status for task: {task_id}")
        
        # Find the task in generation_tasks
        task_info = None
        campaign_id = None
        
        for cid, tasks in generation_tasks.items():
            for task in tasks:
                if task.get("task_id") == task_id:
                    task_info = task
                    campaign_id = cid
                    break
            if task_info:
                break
        
        if not task_info or not campaign_id:
            logger.error(f"Task {task_id} not found in generation tasks")
            return jsonify({"success": False, "error": f"Task {task_id} not found"}), 404
        
        # Check if task is already completed in campaign
        campaign = tasks_store.get(campaign_id, {})
        generated_assets = campaign.get('generated_assets', [])
        
        for asset in generated_assets:
            if asset.get('task_id') == task_id:
                # Task already completed and stored
                logger.info(f"Task {task_id} already completed, returning stored asset")
                return jsonify({
                    "success": True,
                    "status": "completed",
                    "asset_type": task_info.get('asset_type'),
                    "task_id": task_id,
                    "asset": {
                        "id": asset.get('id'),
                        "data_uri": asset.get('data_uri'),
                        "filename": asset.get('filename'),
                        "type": asset.get('type')
                    },
                    "variation": task_info.get('variation'),
                    "message": f"{task_info.get('asset_type').capitalize()} generation completed"
                }), 200
        
        # Poll Runway for status
        logger.info(f"Polling Runway for task status: {task_id}")
        result = poll_task_status(task_id)
        
        if result['success']:
            # Task completed successfully
            asset_type = task_info.get('asset_type', 'image')
            
            try:
                # Download and store the asset
                asset_data = download_and_store_asset(
                    result['output_url'],
                    task_id,
                    asset_type,
                    campaign_id
                )
                
                # Create asset info
                asset_id = str(uuid.uuid4())
                asset_info = {
                    "id": asset_id,
                    "task_id": task_id,
                    "campaign_id": campaign_id,
                    "type": asset_type,
                    "data_uri": asset_data['data_uri'],
                    "filename": asset_data['filename'],
                    "local_path": asset_data['local_path'],
                    "output_url": asset_data['output_url'],
                    "title": f"AI Generated {asset_type.capitalize()} {task_info.get('variation', 1)}",
                    "prompt": task_info.get('prompt', ''),
                    "score": 80 + (task_info.get('variation', 1) * 5),  # Score based on variation
                    "created_at": time.time(),
                    "status": "completed"
                }
                
                # Update task info
                task_info['status'] = 'completed'
                task_info['completed_at'] = time.time()
                task_info['asset_info'] = asset_info
                
                # Store in campaign's generated assets
                if 'generated_assets' not in campaign:
                    campaign['generated_assets'] = []
                campaign['generated_assets'].append(asset_info)
                tasks_store[campaign_id] = campaign
                
                logger.info(f"Task {task_id} completed and stored successfully")
                
                return jsonify({
                    "success": True,
                    "status": "completed",
                    "asset_type": asset_type,
                    "task_id": task_id,
                    "asset": {
                        "id": asset_id,
                        "data_uri": asset_data['data_uri'],
                        "filename": asset_data['filename'],
                        "type": asset_type
                    },
                    "variation": task_info.get('variation'),
                    "message": f"{asset_type.capitalize()} generation completed successfully"
                }), 200
                
            except Exception as e:
                logger.error(f"Error processing completed task {task_id}: {e}")
                task_info['status'] = 'failed'
                task_info['error'] = str(e)
                
                return jsonify({
                    "success": False,
                    "status": "error",
                    "error": f"Failed to process generated asset: {str(e)}",
                    "task_id": task_id
                }), 500
        
        else:
            # Task failed or timed out
            task_info['status'] = 'failed'
            task_info['error'] = result.get('error', 'Unknown error')
            
            logger.error(f"Task {task_id} failed: {result.get('error')}")
            
            return jsonify({
                "success": False,
                "status": "failed",
                "error": result.get('error', 'Task failed'),
                "task_id": task_id
            }), 200
            
    except Exception as e:
        logger.error(f"Error checking status: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@creative_assets_bp.route('/api/get-generated-assets/<campaign_id>', methods=['GET', 'OPTIONS'])
def get_generated_assets(campaign_id: str):
    """Get all generated assets for a campaign"""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        if campaign_id not in tasks_store:
            return jsonify({"success": False, "error": "Campaign not found"}), 404
        
        campaign = tasks_store[campaign_id]
        generated_assets = campaign.get('generated_assets', [])
        
        # Format assets for frontend
        formatted_assets = []
        for i, asset in enumerate(generated_assets):
            formatted_assets.append({
                "id": i + 1,  # Simple sequential ID for frontend
                "title": asset.get('title', f"AI Generated {asset.get('type', 'image').capitalize()}"),
                "image_url": asset.get('data_uri') if asset.get('type') == 'image' else None,
                "video_url": asset.get('data_uri') if asset.get('type') == 'video' else None,
                "data_uri": asset.get('data_uri'),
                "prompt": asset.get('prompt', ''),
                "score": asset.get('score', 85),
                "type": "ai_generated_image" if asset.get('type') == 'image' else "ai_generated_video",
                "asset_type": asset.get('type', 'image'),
                "task_id": asset.get('task_id'),
                "filename": asset.get('filename'),
                "status": asset.get('status', 'completed')
            })
        
        logger.info(f"Returning {len(formatted_assets)} generated assets for campaign: {campaign_id}")
        
        return jsonify({
            "success": True,
            "campaign_id": campaign_id,
            "assets": formatted_assets,
            "count": len(formatted_assets),
            "total_generating": len(generation_tasks.get(campaign_id, []))
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting generated assets: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@creative_assets_bp.route('/api/save-selected-assets', methods=['POST', 'OPTIONS'])
def save_selected_assets():
    """Save selected assets to campaign"""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"success": False, "error": "No data provided"}), 400
        
        campaign_id = data.get('campaign_id')
        selected_assets = data.get('selected_assets', [])
        
        if not campaign_id:
            return jsonify({"success": False, "error": "campaign_id is required"}), 400
        
        if campaign_id not in tasks_store:
            return jsonify({"success": False, "error": "Campaign not found"}), 404
        
        # Update campaign with selected assets
        campaign = tasks_store[campaign_id]
        campaign['selected_assets'] = selected_assets
        campaign['status'] = 'assets_selected'
        tasks_store[campaign_id] = campaign
        
        logger.info(f"Saved {len(selected_assets)} assets for campaign: {campaign_id}")
        
        return jsonify({
            "success": True,
            "message": f"Saved {len(selected_assets)} assets",
            "campaign_id": campaign_id,
            "selected_count": len(selected_assets),
            "selected_assets": selected_assets
        }), 200
        
    except Exception as e:
        logger.error(f"Error saving selected assets: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@creative_assets_bp.route('/api/test-runway', methods=['GET', 'OPTIONS'])
def test_runway():
    """Test Runway ML API connection"""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        if not RUNWAY_API_KEY or RUNWAY_API_KEY == 'your_runway_api_key_here':
            return jsonify({
                "success": False,
                "status": "not_configured",
                "message": "RUNWAY_API_KEY not configured"
            }), 200
        
        # Test the models endpoint
        response = requests.get(
            f"{RUNWAY_BASE_URL}/v1/models",
            headers=RUNWAY_HEADERS,
            timeout=10
        )
        
        if response.status_code == 200:
            models = response.json()
            available_models = [model.get('id') for model in models.get('data', [])]
            
            logger.info(f"Runway API test successful. Available models: {available_models}")
            
            return jsonify({
                "success": True,
                "status": "connected",
                "message": "Runway ML API is accessible",
                "available_models": available_models[:5]  # First 5 models
            }), 200
        else:
            logger.error(f"Runway API test failed: {response.status_code} - {response.text}")
            return jsonify({
                "success": False,
                "status": "error",
                "message": f"API returned status {response.status_code}"
            }), 200
            
    except Exception as e:
        logger.error(f"Error testing Runway API: {e}")
        return jsonify({
            "success": False,
            "status": "error",
            "message": str(e)
        }), 200

@creative_assets_bp.route('/api/test-image-format', methods=['POST', 'OPTIONS'])
def test_image_format():
    """Test image data URI format for Runway ML"""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        data = request.get_json()
        
        if not data or 'image_data' not in data:
            return jsonify({
                "success": False,
                "error": "No image data provided"
            }), 400
        
        image_data = data['image_data']
        filename = data.get('filename', 'test.jpg')
        
        # Convert to data URI
        data_uri = get_image_as_data_uri(image_data, filename)
        
        # Test if it's a valid format
        is_valid = data_uri.startswith('data:image/')
        
        return jsonify({
            "success": True,
            "is_valid_format": is_valid,
            "data_uri_preview": data_uri[:150] + "..." if len(data_uri) > 150 else data_uri,
            "message": "Image format test completed",
            "recommendation": "Use this data_uri for Runway ML API" if is_valid else "Invalid image format"
        }), 200
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

# Health check endpoint
@creative_assets_bp.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "creative-assets",
        "runway_configured": RUNWAY_API_KEY and RUNWAY_API_KEY != 'your_runway_api_key_here',
        "campaigns_count": len(tasks_store),
        "generation_tasks_count": sum(len(tasks) for tasks in generation_tasks.values())
    })