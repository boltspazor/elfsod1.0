# creative_assets.py - Fixed video generation function
import os
import base64
import uuid
import json
import time
import threading
import requests
from flask import Blueprint, request, jsonify, send_file
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

# Headers for Runway API
RUNWAY_HEADERS = {
    "Authorization": f"Bearer {RUNWAY_API_KEY}",
    "X-Runway-Version": RUNWAY_VERSION,
    "Content-Type": "application/json",
}

# NanoBanana API (image generation; set NANOBANANA_API_KEY in production)
NANOBANANA_API_KEY = os.environ.get('NANOBANANA_API_KEY', '')
NANOBANANA_BASE_URL = os.environ.get('NANOBANANA_BASE_URL', 'https://api.nanobananaapi.ai')
# Callback URL required by API; set in production to your backend URL if you implement a callback route
NANOBANANA_CALLBACK_URL = os.environ.get('NANOBANANA_CALLBACK_URL', 'https://example.com/nanobanana-callback')
# Base URL of this backend (e.g. https://your-api.com) so NanoBanana can fetch the uploaded image for IMAGETOIAMGE
BACKEND_PUBLIC_URL = (os.environ.get('BACKEND_PUBLIC_URL') or '').rstrip('/')

# Valid ratios for Runway ML API (from error message)
VALID_RATIOS = [
    "1024:1024",  # Square
    "1080:1080",  # Square HD
    "1168:880",   # Desktop
    "1360:768",   # Widescreen
    "1440:1080",  # 4:3 HD
    "1080:1440",  # Portrait HD
    "1808:768",   # Ultra Wide
    "1920:1080",  # Full HD
    "1080:1920",  # Portrait Full HD
    "2112:912",   # Super Wide
    "1280:720",   # HD
    "720:1280",   # Portrait HD
    "720:720",    # Square Mobile
    "960:720",    # 4:3 Mobile
    "720:960",    # Portrait Mobile
    "1680:720"    # Cinematic
]

# In-memory storage for tasks (in production, use a database)
tasks_store = {}
generation_tasks = {}  # Separate storage for tracking individual tasks
# For linked video chain: campaign_id -> { task_id -> next_task_id }
chain_next_task = {}

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

def create_image_generation_task(
    image_data_uri: str,
    prompt_text: str,
    variation_number: int = 1,
    campaign_id: str = None,
):
    """
    Create image generation task using NanoBanana API.
    Uses IMAGETOIAMGE with the uploaded product image when possible so the output matches the product (e.g. red shoe).
    Video generation still uses Runway (create_video_generation_task).
    """
    try:
        # Prefer public URL so NanoBanana can fetch the image; fallback to data URI (some APIs accept it)
        image_urls = []
        if campaign_id and BACKEND_PUBLIC_URL:
            image_urls = [f"{BACKEND_PUBLIC_URL}/api/campaign/{campaign_id}/uploaded-image"]
            logger.info(f"Using public image URL for IMAGETOIAMGE: {image_urls[0][:60]}...")
        elif image_data_uri and image_data_uri.startswith("data:"):
            image_urls = [image_data_uri]
            logger.info("Using data URI for IMAGETOIAMGE. If your product image is not used, set BACKEND_PUBLIC_URL to your backend base URL (e.g. https://your-api.com).")

        use_image_to_image = len(image_urls) > 0
        payload = {
            "prompt": prompt_text,
            "type": "IMAGETOIAMGE" if use_image_to_image else "TEXTTOIAMGE",
            "numImages": 1,
            "image_size": "1:1",
            "callBackUrl": NANOBANANA_CALLBACK_URL,
        }
        if use_image_to_image:
            payload["imageUrls"] = image_urls
        logger.info(f"Creating NanoBanana image task (type={payload['type']}); prompt: {prompt_text[:80]}...")
        response = requests.post(
            f"{NANOBANANA_BASE_URL}/api/v1/nanobanana/generate",
            headers={
                "Authorization": f"Bearer {NANOBANANA_API_KEY}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=30,
        )
        if response.status_code != 200:
            logger.error(f"NanoBanana API Error: {response.status_code} {response.text}")
            response.raise_for_status()
        data = response.json()
        if data.get("code") != 200:
            raise Exception(data.get("msg", "NanoBanana API error"))
        task_id = (data.get("data") or {}).get("taskId")
        if not task_id:
            raise Exception("No taskId from NanoBanana API")
        logger.info(f"NanoBanana image task created: {task_id}")
        return task_id
    except Exception as e:
        logger.error(f"Error creating image generation task: {e}")
        raise

def create_video_generation_task(image_data_uri: str, prompt_text: str, variation_number: int = 1):
    """
    Create video generation task using Runway ML
    Based on the working template from the user
    """
    try:
        # Prepare request payload for video generation according to Runway API
        # The API expects either a single promptImage (string) or an array of promptImages
        
        # Clean up the prompt - remove @product reference for videos
        clean_prompt = prompt_text.replace("@product", "").strip()
        
        payload = {
            "model": "veo3.1",
            "promptImage": image_data_uri,  # Single image as data URI
            "promptText": clean_prompt,
            "ratio": "1280:720",  # Valid ratio for video
            "duration": 4,  # Must be 4, 6, or 8 seconds
        }
        
        logger.info(f"Creating video generation task with prompt: {clean_prompt[:100]}...")
        logger.info(f"Using image data URI: {image_data_uri[:80]}...")
        
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
            # Log more details for debugging
            try:
                error_details = response.json()
                logger.error(f"Error details: {error_details}")
            except:
                logger.error(f"Raw error response: {response.text}")
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


def create_video_to_video_task(video_uri: str, prompt_text: str) -> str:
    """
    Create video-to-video task using Runway gen4_aleph.
    Input video is the previous clip's output; output continues from where it left off.
    """
    try:
        clean_prompt = prompt_text.replace("@product", "").strip()
        payload = {
            "model": "gen4_aleph",
            "videoUri": video_uri,
            "promptText": clean_prompt,
        }
        logger.info(f"Creating video_to_video (gen4_aleph) task, prompt: {clean_prompt[:80]}...")
        response = requests.post(
            f"{RUNWAY_BASE_URL}/v1/video_to_video",
            headers=RUNWAY_HEADERS,
            json=payload,
            timeout=30,
        )
        logger.info(f"Runway video_to_video API Response: {response.status_code}")
        if response.status_code != 200:
            logger.error(f"Runway video_to_video Error: {response.text}")
            response.raise_for_status()
        task_data = response.json()
        task_id = task_data.get("id")
        if not task_id:
            raise Exception("No task ID from Runway video_to_video API")
        logger.info(f"Video-to-video task created: {task_id}")
        return task_id
    except Exception as e:
        logger.error(f"Error creating video_to_video task: {e}")
        raise


def get_output_video_url(task: dict) -> str:
    """Extract output video URL from Runway task result (handles list or dict output)."""
    output = task.get("output") or task.get("result")
    if not output:
        logger.warning(f"No output/result in task: {list(task.keys())}")
        return None
    if isinstance(output, list) and len(output) > 0:
        first = output[0]
        if isinstance(first, str):
            return first
        if isinstance(first, dict):
            return first.get("url") or first.get("uri") or first.get("video")
    if isinstance(output, dict):
        return output.get("video") or output.get("uri") or output.get("url")
    return None


def run_linked_video_chain(
    campaign_id: str,
    image_data_uri: str,
    user_id: str,
    ad_type: str,
    campaign_goal: str,
    num_clips: int,
    shared: dict,
):
    """
    Run a linked video sequence in a background thread:
    Clip 1 = image_to_video; Clip 2..N = video_to_video (gen4_aleph) using previous clip output.
    Each clip starts where the previous ended. Accumulates all clips and appends to generated_assets
    only when the full chain is done so the UI shows all 4-5 videos at once.
    """
    global chain_next_task
    chain_assets = []  # collect all clips; add to campaign only at the end
    try:
        if campaign_id not in chain_next_task:
            chain_next_task[campaign_id] = {}
        prev_output_url = None
        prev_task_id = None
        last_variation = 0

        for i in range(num_clips):
            variation = i + 1
            last_variation = variation
            prompt_text = generate_video_prompt(ad_type, campaign_goal, variation)

            if i == 0:
                task_id = create_video_generation_task(image_data_uri, prompt_text, variation)
            else:
                task_id = create_video_to_video_task(prev_output_url, prompt_text)

            task_info = {
                "task_id": task_id,
                "campaign_id": campaign_id,
                "user_id": user_id,
                "asset_type": "video",
                "ad_type": ad_type,
                "campaign_goal": campaign_goal,
                "status": "processing",
                "variation": variation,
                "started_at": time.time(),
                "prompt": prompt_text,
            }
            if campaign_id not in generation_tasks:
                generation_tasks[campaign_id] = []
            generation_tasks[campaign_id].append(task_info)

            if prev_task_id is not None:
                chain_next_task[campaign_id][prev_task_id] = task_id

            if i == 0:
                shared["first_task_id"] = task_id
                ev = shared.get("event")
                if ev is not None:
                    ev.set()

            result = poll_task_status(task_id)
            if not result.get("success"):
                logger.error(f"Linked video clip {variation} failed: {result.get('error')}")
                break
            prev_output_url = result.get("output_url")
            prev_task_id = task_id
            if not prev_output_url:
                logger.error(f"Linked video clip {variation} succeeded but no output URL")
                break

            # Collect this clip; we will add all to generated_assets only when the full chain is done
            try:
                asset_data = download_and_store_asset(
                    prev_output_url,
                    task_id,
                    "video",
                    campaign_id,
                )
                asset_id = str(uuid.uuid4())
                asset_info = {
                    "id": asset_id,
                    "task_id": task_id,
                    "campaign_id": campaign_id,
                    "type": "video",
                    "data_uri": asset_data["data_uri"],
                    "filename": asset_data["filename"],
                    "local_path": asset_data.get("local_path"),
                    "output_url": asset_data.get("output_url"),
                    "file_size": asset_data.get("file_size"),
                    "title": f"AI Generated Video {variation}",
                    "prompt": prompt_text,
                    "score": 80 + (variation * 5),
                    "created_at": time.time(),
                    "status": "completed",
                }
                chain_assets.append(asset_info)
                task_info["status"] = "completed"
                task_info["asset_info"] = asset_info
                logger.info(f"Collected linked video clip {variation}/{num_clips} for campaign {campaign_id}")
            except Exception as store_err:
                logger.error(f"Failed to store clip {variation}: {store_err}")
                # Continue chain

        # Add all clips at once so the UI shows all 4-5 videos together, not one-by-one
        if chain_assets:
            campaign = tasks_store.get(campaign_id, {})
            if "generated_assets" not in campaign:
                campaign["generated_assets"] = []
            campaign["generated_assets"].extend(chain_assets)
            campaign.pop("linked_chain", None)
            tasks_store[campaign_id] = campaign
            logger.info(f"Linked video chain finished for campaign {campaign_id}: added {len(chain_assets)} clips at once")
        else:
            logger.info(f"Linked video chain finished for campaign {campaign_id} up to clip {last_variation}/{num_clips} (no assets to add)")
    except Exception as e:
        logger.error(f"Linked video chain error: {e}")
        import traceback
        logger.error(traceback.format_exc())
        if shared.get("event"):
            shared["event"].set()


def poll_task_status(task_id: str):
    """Poll Runway ML task status with better logging"""
    max_attempts = 300  # 5 minutes with 1-second intervals (videos take longer)
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
                output_url = get_output_video_url(task)
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
            
            # Wait before next poll (longer for videos)
            time.sleep(2)
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


def nanobanana_get_task_status(task_id: str):
    """
    Poll NanoBanana task status once. Returns same shape as poll_task_status:
    { success, output_url?, status?, error? }.
    successFlag: 0=GENERATING, 1=SUCCESS, 2=CREATE_TASK_FAILED, 3=GENERATE_FAILED.
    """
    try:
        resp = requests.get(
            f"{NANOBANANA_BASE_URL}/api/v1/nanobanana/record-info",
            params={"taskId": task_id},
            headers={"Authorization": f"Bearer {NANOBANANA_API_KEY}"},
            timeout=15,
        )
        if resp.status_code != 200:
            return {"success": False, "status": "error", "error": f"API returned {resp.status_code}"}
        data = resp.json()
        code = data.get("code")
        if code != 200:
            return {"success": False, "status": "error", "error": data.get("msg", "Unknown error")}
        payload = data.get("data") or {}
        success_flag = payload.get("successFlag", -1)
        if success_flag == 1:
            response_data = payload.get("response") or {}
            output_url = response_data.get("resultImageUrl") or response_data.get("originImageUrl")
            if output_url:
                return {"success": True, "output_url": output_url, "task_id": task_id}
            return {"success": False, "status": "error", "error": "No image URL in response"}
        if success_flag == 2:
            return {"success": False, "status": "FAILED", "error": "Create task failed"}
        if success_flag == 3:
            return {"success": False, "status": "FAILED", "error": "Generate failed"}
        # 0 or other = still generating
        return {"success": False, "status": "GENERATING", "error": "Still generating"}
    except Exception as e:
        logger.error(f"NanoBanana status check error for {task_id}: {e}")
        return {"success": False, "status": "error", "error": str(e)}


def download_and_store_asset(output_url: str, task_id: str, asset_type: str, campaign_id: str):
    """Download generated asset and store it"""
    try:
        logger.info(f"Downloading asset from: {output_url[:50]}...")
        
        # Download the asset
        response = requests.get(output_url, timeout=60)  # Longer timeout for videos
        response.raise_for_status()
        
        # Convert to base64
        asset_data = base64.b64encode(response.content).decode('utf-8')
        mime_type = 'video/mp4' if asset_type == 'video' else 'image/png'
        data_uri = f"data:{mime_type};base64,{asset_data}"
        
        # Generate filename
        timestamp = int(time.time())
        asset_filename = f"{campaign_id}_{task_id}_{timestamp}_{asset_type}.{'mp4' if asset_type == 'video' else 'png'}"
        
        # Save locally
        output_dir = "generated_videos" if asset_type == 'video' else "generated_images"
        os.makedirs(output_dir, exist_ok=True)
        filepath = os.path.join(output_dir, asset_filename)
        
        with open(filepath, "wb") as f:
            f.write(response.content)
        
        logger.info(f"Asset saved to: {filepath} (size: {len(response.content)} bytes)")
        
        return {
            "data_uri": data_uri,
            "local_path": filepath,
            "filename": asset_filename,
            "output_url": output_url,
            "file_size": len(response.content)
        }
        
    except Exception as e:
        logger.error(f"Error downloading/storing asset: {e}")
        raise

def generate_trend_aware_prompt(base_prompt: str, ad_type: str, campaign_goal: str) -> str:
    """
    Generate trend-aware prompts incorporating current trends
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

def generate_video_prompt(ad_type: str, campaign_goal: str, variation_number: int) -> str:
    """
    Generate specific video prompts based on variation number for continuous sequence
    Each video is designed to flow seamlessly into the next
    """
    # Base continuity instruction for all videos
    continuity_base = "Ensure smooth motion that can flow continuously into subsequent clips."
    
    video_prompts = [
        # Video 1: Opening/Introduction - Slow zoom in
        f"""Create a cinematic opening sequence for an advertisement.
Campaign goal: {campaign_goal}.
Product type: {ad_type}.
Start with a slow, smooth zoom towards the product.
Gentle camera movement with professional lighting.
Build anticipation with subtle motion effects.
End frame should show product in clear focus with slight rotation beginning.
{continuity_base}
Cinematic quality, professional lighting, establish the scene.""",
        
        # Video 2: Product Rotation - Continue from zoom
        f"""Continue the advertisement with smooth product rotation.
Campaign goal: {campaign_goal}.
Product type: {ad_type}.
Begin with product in focus, continue the rotation motion smoothly.
Showcase product details with 360-degree view.
Dynamic lighting that highlights key features.
End with product facing forward, ready for feature highlight.
{continuity_base}
Modern advertising style with attention-grabbing movements.""",
        
        # Video 3: Feature Showcase - Dynamic angles
        f"""Continue with dynamic feature showcase sequence.
Campaign goal: {campaign_goal}.
Product type: {ad_type}.
Transition smoothly from previous rotation into close-up details.
Use elegant camera pans to highlight specific features.
Professional studio lighting with vibrant colors.
End with camera pulling back slightly for context.
{continuity_base}
High-end commercial quality with sleek presentation.""",
        
        # Video 4: Lifestyle Context - Environmental integration
        f"""Continue into lifestyle and contextual presentation.
Campaign goal: {campaign_goal}.
Product type: {ad_type}.
Smoothly transition from close-up to showing product in use/context.
Integrate product naturally into an aspirational scene.
Use warm, inviting lighting and smooth motion.
End with product positioned for final emphasis.
{continuity_base}
Contemporary design with emotional appeal.""",
        
        # Video 5: Closing/Impact - Final presentation
        f"""Create the closing sequence with strong visual impact.
Campaign goal: {campaign_goal}.
Product type: {ad_type}.
Continue from contextual scene into bold, confident product presentation.
Fast-paced motion with eye-catching final reveal.
Bold colors and dynamic camera movements.
End with memorable product positioning and brand emphasis.
{continuity_base}
Modern, trendy style perfect for social media - strong finish."""
    ]
    
    # Return the appropriate prompt based on variation number
    index = (variation_number - 1) % len(video_prompts)
    return video_prompts[index]

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


@creative_assets_bp.route('/api/campaign/<campaign_id>/uploaded-image', methods=['GET'])
def serve_uploaded_image(campaign_id: str):
    """Serve the campaign's uploaded product image so NanoBanana can fetch it for IMAGETOIAMGE."""
    if campaign_id not in tasks_store:
        return jsonify({"error": "Campaign not found"}), 404
    campaign = tasks_store[campaign_id]
    filepath = campaign.get("filepath")
    if not filepath or not os.path.isfile(filepath):
        return jsonify({"error": "Uploaded image not found"}), 404
    return send_file(filepath, mimetype=mimetypes.guess_type(filepath)[0] or "image/jpeg")


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
        image_data_uri = campaign['image_data']
        
        # Validate asset type
        if asset_type not in ['image', 'video']:
            return jsonify({"success": False, "error": "Invalid asset type. Must be 'image' or 'video'"}), 400
        
        logger.info(f"Starting {asset_type} generation for campaign: {campaign_id}, ad_type: {ad_type}")
        
        # Image generation uses NanoBanana; video uses Runway
        if asset_type == 'image':
            if not NANOBANANA_API_KEY or NANOBANANA_API_KEY.strip() == '':
                logger.error("❌ NanoBanana API key not configured!")
                return jsonify({
                    "success": False,
                    "error": "NanoBanana API key not configured. Please set NANOBANANA_API_KEY environment variable."
                }), 500
        else:
            if not RUNWAY_API_KEY or RUNWAY_API_KEY == 'your_runway_api_key_here':
                logger.error("❌ Runway API key not configured!")
                return jsonify({
                    "success": False,
                    "error": "Runway API key not configured. Please set RUNWAY_API_KEY environment variable."
                }), 500
        
        # Images: 5 variations. Video: single output only (multi-video chain commented out for now).
        num_variations = 5 if asset_type == 'image' else 1
        logger.info(f"🎯 Target: {num_variations} {asset_type} variation(s)")
        
        # Clear any existing assets of this type to start fresh
        if 'generated_assets' in campaign:
            existing_assets = [a for a in campaign['generated_assets'] if a.get('type') == asset_type]
            existing_count = len(existing_assets)
            if existing_count > 0:
                logger.info(f"🔄 Clearing {existing_count} existing {asset_type} assets to generate fresh set")
                campaign['generated_assets'] = [a for a in campaign['generated_assets'] if a.get('type') != asset_type]
        
        task_ids = []

        # --- VIDEO: single clip only (linked multi-clip chain commented out) ---
        if asset_type == 'video':
            prompt_text = generate_video_prompt(ad_type, campaign_goal, 1)
            task_id = create_video_generation_task(image_data_uri, prompt_text, 1)
            task_info = {
                "task_id": task_id,
                "campaign_id": campaign_id,
                "user_id": user_id,
                "asset_type": "video",
                "ad_type": ad_type,
                "campaign_goal": campaign_goal,
                "status": "processing",
                "variation": 1,
                "started_at": time.time(),
                "prompt": prompt_text,
            }
            if campaign_id not in generation_tasks:
                generation_tasks[campaign_id] = []
            generation_tasks[campaign_id].append(task_info)
            task_ids = [task_id]
            campaign['status'] = 'generating_video'
            tasks_store[campaign_id] = campaign
            logger.info(f"Started single video generation for campaign {campaign_id}, task: {task_id}")
            return jsonify({
                "success": True,
                "message": "Started video generation (1 video)",
                "task_ids": task_ids,
                "campaign_id": campaign_id,
                "asset_type": asset_type,
                "variations": 1,
                "linked_chain": False,
                "estimated_time": "About 2–5 minutes",
            }), 200

        # --- IMAGES: multiple variations ---
        # (Linked video chain for 4–5 clips commented out; uncomment block below to restore.)
        # if asset_type == 'video':
        #     campaign['linked_chain'] = True
        #     tasks_store[campaign_id] = campaign
        #     linked_video_shared = {"first_task_id": None, "event": threading.Event()}
        #     thread = threading.Thread(
        #         target=run_linked_video_chain,
        #         kwargs={
        #             "campaign_id": campaign_id,
        #             "image_data_uri": image_data_uri,
        #             "user_id": user_id,
        #             "ad_type": ad_type,
        #             "campaign_goal": campaign_goal,
        #             "num_clips": num_variations,
        #             "shared": linked_video_shared,
        #         },
        #         daemon=True,
        #     )
        #     thread.start()
        #     linked_video_shared["event"].wait(timeout=20)
        #     first_task_id = linked_video_shared.get("first_task_id")
        #     if not first_task_id:
        #         return jsonify({"success": False, "error": "Video chain failed to start"}), 500
        #     task_ids = [first_task_id]
        #     return jsonify({...}), 200

        logger.info(f"📝 Starting loop to create {num_variations} tasks...")
        for i in range(num_variations):
            try:
                logger.info(f"🔄 Creating task {i+1}/{num_variations}...")
                # Images only (video handled above)
                base_prompt = f"Create a professional advertisement background for {ad_type}. Campaign goal: {campaign_goal}. Use modern, clean design with the product placed naturally."
                prompt_text = generate_trend_aware_prompt(
                    base_prompt,
                    ad_type,
                    campaign_goal
                )
                task_id = create_image_generation_task(
                    image_data_uri,
                    prompt_text,
                    i + 1,
                    campaign_id=campaign_id,
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
                    "prompt": prompt_text,
                    "provider": "nanobanana",
                }
                if campaign_id not in generation_tasks:
                    generation_tasks[campaign_id] = []
                generation_tasks[campaign_id].append(task_info)
                task_ids.append(task_id)
                logger.info(f"✅ Created {asset_type} generation task {i+1}/{num_variations}: {task_id}")
                if i < num_variations - 1:
                    time.sleep(1)
            except Exception as e:
                logger.error(f"❌ Failed to create variation {i+1}/{num_variations}: {str(e)}")
                import traceback
                logger.error(traceback.format_exc())
                # Continue with other variations

        if not task_ids:
            return jsonify({"success": False, "error": "Failed to create any generation tasks"}), 500

        campaign['status'] = f'generating_{asset_type}'
        tasks_store[campaign_id] = campaign

        return jsonify({
            "success": True,
            "message": f"Started {len(task_ids)} {asset_type} generation tasks",
            "task_ids": task_ids,
            "campaign_id": campaign_id,
            "asset_type": asset_type,
            "variations": len(task_ids),
            "estimated_time": "1-3 minutes per image",
            "note": f"Generating {len(task_ids)} {asset_type}s. They will appear one at a time as they're generated."
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Error generating assets: {str(e)}")
        logger.error(f"❌ Error type: {type(e).__name__}")
        import traceback
        logger.error(f"❌ Full traceback: {traceback.format_exc()}")
        return jsonify({
            "success": False, 
            "error": str(e),
            "error_type": type(e).__name__
        }), 500

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
        
        next_task_id = chain_next_task.get(campaign_id, {}).get(task_id)

        for asset in generated_assets:
            if asset.get('task_id') == task_id:
                # Task already completed and stored
                logger.info(f"Task {task_id} already completed, returning stored asset")
                resp = {
                    "success": True,
                    "status": "completed",
                    "asset_type": task_info.get('asset_type'),
                    "task_id": task_id,
                    "asset": {
                        "id": asset.get('id'),
                        "data_uri": asset.get('data_uri'),
                        "filename": asset.get('filename'),
                        "type": asset.get('type'),
                        "file_size": asset.get('file_size')
                    },
                    "variation": task_info.get('variation'),
                    "message": f"{task_info.get('asset_type').capitalize()} generation completed"
                }
                if next_task_id is not None:
                    resp["next_task_id"] = next_task_id
                return jsonify(resp), 200

        # Poll provider for status (NanoBanana for images, Runway for video)
        if task_info.get("provider") == "nanobanana":
            logger.info(f"Polling NanoBanana for task status: {task_id}")
            result = nanobanana_get_task_status(task_id)
        else:
            logger.info(f"Polling Runway for task status: {task_id}")
            result = poll_task_status(task_id)
        
        if result['success']:
            campaign = tasks_store.get(campaign_id, {})
            # Linked chain: do not store here; thread will add all clips at once at the end
            if campaign.get('linked_chain'):
                resp = {
                    "success": True,
                    "status": "completed",
                    "asset_type": task_info.get('asset_type'),
                    "task_id": task_id,
                    "message": f"{task_info.get('asset_type', 'video').capitalize()} generation completed",
                }
                if next_task_id is not None:
                    resp["next_task_id"] = next_task_id
                return jsonify(resp), 200
            # Thread may have already stored this (non-linked); avoid double download
            for asset in campaign.get('generated_assets', []):
                if asset.get('task_id') == task_id:
                    resp = {
                        "success": True,
                        "status": "completed",
                        "asset_type": task_info.get('asset_type'),
                        "task_id": task_id,
                        "asset": {
                            "id": asset.get('id'),
                            "data_uri": asset.get('data_uri'),
                            "filename": asset.get('filename'),
                            "type": asset.get('type'),
                            "file_size": asset.get('file_size'),
                        },
                        "variation": task_info.get('variation'),
                        "message": f"{task_info.get('asset_type', 'video').capitalize()} generation completed",
                    }
                    if next_task_id is not None:
                        resp["next_task_id"] = next_task_id
                    return jsonify(resp), 200

            # Task completed successfully; store it
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
                    "file_size": asset_data.get('file_size'),
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
                resp = {
                    "success": True,
                    "status": "completed",
                    "asset_type": asset_type,
                    "task_id": task_id,
                    "asset": {
                        "id": asset_id,
                        "data_uri": asset_data['data_uri'],
                        "filename": asset_data['filename'],
                        "type": asset_type,
                        "file_size": asset_data.get('file_size')
                    },
                    "variation": task_info.get('variation'),
                    "message": f"{asset_type.capitalize()} generation completed successfully"
                }
                if next_task_id is not None:
                    resp["next_task_id"] = next_task_id
                return jsonify(resp), 200

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
            # Still generating (NanoBanana) or failed/timed out
            if result.get('status') == 'GENERATING':
                return jsonify({
                    "success": False,
                    "status": "processing",
                    "error": result.get('error', 'Still generating'),
                    "task_id": task_id
                }), 200
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
        # Let frontend know to retry when linked video chain is still running and no assets yet
        still_generating = bool(campaign.get('linked_chain') and len(generated_assets) == 0)

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
                "file_size": asset.get('file_size'),
                "status": asset.get('status', 'completed')
            })
        
        logger.info(f"Returning {len(formatted_assets)} generated assets for campaign: {campaign_id} (still_generating={still_generating})")

        return jsonify({
            "success": True,
            "campaign_id": campaign_id,
            "assets": formatted_assets,
            "count": len(formatted_assets),
            "total_generating": len(generation_tasks.get(campaign_id, [])),
            "still_generating": still_generating,
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting generated assets: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

# Test endpoint to check video generation directly
@creative_assets_bp.route('/api/test-video-generation', methods=['POST', 'OPTIONS'])
def test_video_generation():
    """Test video generation with a simple image"""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        data = request.get_json()
        
        # Use a simple test image or provided image
        if data and data.get('image_data'):
            image_data_uri = get_image_as_data_uri(data['image_data'], 'test.jpg')
        else:
            # Create a simple test image
            import base64
            # Create a simple 1x1 red pixel
            test_image = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==")
            image_data_uri = f"data:image/png;base64,{base64.b64encode(test_image).decode('utf-8')}"
        
        # Test video generation
        prompt_text = "Create a simple test video with motion effects. Cinematic style."
        
        task_id = create_video_generation_task(
            image_data_uri,
            prompt_text,
            1
        )
        
        return jsonify({
            "success": True,
            "message": "Test video generation started",
            "task_id": task_id,
            "estimated_time": "2-5 minutes"
        }), 200
        
    except Exception as e:
        logger.error(f"Test video generation error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

# Add test endpoint for valid ratios
@creative_assets_bp.route('/api/get-valid-ratios', methods=['GET', 'OPTIONS'])
def get_valid_ratios():
    """Get list of valid ratios for Runway ML API"""
    if request.method == 'OPTIONS':
        return '', 200
    
    return jsonify({
        "success": True,
        "valid_ratios": VALID_RATIOS,
        "recommended_for_images": "1024:1024 (square), 1920:1080 (widescreen), 1080:1920 (portrait)",
        "recommended_for_videos": "1280:720 (HD), 1920:1080 (Full HD)"
    }), 200

# Health check endpoint
@creative_assets_bp.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "creative-assets",
        "runway_configured": RUNWAY_API_KEY and RUNWAY_API_KEY != 'your_runway_api_key_here',
        "campaigns_count": len(tasks_store),
        "generation_tasks_count": sum(len(tasks) for tasks in generation_tasks.values()),
        "valid_ratios_count": len(VALID_RATIOS)
    })