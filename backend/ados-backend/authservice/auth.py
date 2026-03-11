from flask import Flask, request, jsonify
from flask_cors import CORS
from supabase import create_client, Client
from werkzeug.security import generate_password_hash, check_password_hash
import datetime
import jwt
import os
from dotenv import load_dotenv

# --------------------
# Setup
# --------------------
_env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
load_dotenv(_env_path)

app = Flask(__name__)
CORS(app, origins=["*"])  # Dev only

SECRET_KEY = os.environ["SECRET_KEY"]


def _load_supabase_settings():
    supabase_url = os.environ.get("SUPABASE_URL", "").strip()
    supabase_key = (
        os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
        or os.environ.get("SUPABASE_KEY", "").strip()
    )

    if not supabase_url:
        raise RuntimeError("Missing SUPABASE_URL")

    if not supabase_url.startswith("http"):
        raise RuntimeError(
            "SUPABASE_URL must be https://<project-ref>.supabase.co (not postgresql://...)"
        )

    if not supabase_key:
        raise RuntimeError("Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_KEY")

    return supabase_url, supabase_key


SUPABASE_URL, SUPABASE_KEY = _load_supabase_settings()
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

JWT_ALGORITHM = "HS256"
JWT_EXP_DAYS = 30


# --------------------
# Utilities
# --------------------
def create_jwt(user):
    return jwt.encode(
        {
            "user_id": user["user_id"],
            "email": user["email"],
            "name": user["name"],
            "exp": datetime.datetime.utcnow() + datetime.timedelta(days=JWT_EXP_DAYS)
        },
        SECRET_KEY,
        algorithm=JWT_ALGORITHM
    )


def get_bearer_token():
    auth = request.headers.get("Authorization")
    if not auth or not auth.startswith("Bearer "):
        return None
    return auth.split(" ")[1]


# --------------------
# Health
# --------------------
@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "healthy",
        "service": "auth",
        "timestamp": datetime.datetime.utcnow().isoformat()
    })


# --------------------
# Signup
# --------------------
@app.route("/signup", methods=["POST"])
def signup():
    data = request.get_json() or {}

    name = data.get("name")
    email = data.get("email", "").lower().strip()
    password = data.get("password")
    confirm = data.get("confirmPassword")

    if not all([name, email, password, confirm]):
        return jsonify({"success": False, "error": "All fields required"}), 400

    if password != confirm:
        return jsonify({"success": False, "error": "Passwords do not match"}), 400

    if len(password) < 8:
        return jsonify({"success": False, "error": "Password too short"}), 400

    existing = supabase.table("users").select("user_id").eq("email", email).execute()
    if existing.data:
        return jsonify({"success": False, "error": "Email already exists"}), 409

    hashed = generate_password_hash(password, method="pbkdf2:sha256")

    result = supabase.table("users").insert({
        "name": name,
        "email": email,
        "password_hash": hashed,
        "onboarding_completed": False
    }).execute()

    user = result.data[0]
    token = create_jwt(user)

    return jsonify({
        "success": True,
        "token": token,
        "user": {
            "user_id": user["user_id"],
            "name": user["name"],
            "email": user["email"],
            "onboarding_completed": False
        }
    }), 201


# --------------------
# Login
# --------------------
@app.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}

    email = data.get("email", "").lower().strip()
    password = data.get("password")

    if not email or not password:
        return jsonify({"success": False, "error": "Email and password required"}), 400

    res = supabase.table("users").select("*").eq("email", email).execute()
    if not res.data:
        return jsonify({"success": False, "error": "Invalid credentials"}), 401

    user = res.data[0]

    if not check_password_hash(user["password_hash"], password):
        return jsonify({"success": False, "error": "Invalid credentials"}), 401

    token = create_jwt(user)

    supabase.table("users").update({
        "last_login": datetime.datetime.utcnow().isoformat()
    }).eq("user_id", user["user_id"]).execute()

    return jsonify({
        "success": True,
        "token": token,
        "user": {
            "user_id": user["user_id"],
            "name": user["name"],
            "email": user["email"],
            "onboarding_completed": user.get("onboarding_completed", False)
        }
    })


# --------------------
# Verify Token (FastAPI will trust this logic)
# --------------------
@app.route("/verify", methods=["POST"])
def verify():
    token = request.json.get("token") if request.json else None

    if not token:
        return jsonify({"success": False, "error": "Token required"}), 400

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return jsonify({"success": True, "payload": payload})
    except jwt.ExpiredSignatureError:
        return jsonify({"success": False, "error": "Token expired"}), 401
    except jwt.InvalidTokenError:
        return jsonify({"success": False, "error": "Invalid token"}), 401


# --------------------
# Complete Onboarding
# --------------------
@app.route("/complete-onboarding", methods=["POST"])
def complete_onboarding():
    token = get_bearer_token()
    if not token:
        return jsonify({"success": False, "error": "Unauthorized"}), 401

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[JWT_ALGORITHM])
    except jwt.InvalidTokenError:
        return jsonify({"success": False, "error": "Invalid token"}), 401

    data = request.get_json() or {}

    update = supabase.table("users").update({
        "business_type": data.get("businessType"),
        "industry": data.get("industry"),
        "goals": data.get("goals"),
        "onboarding_completed": True
    }).eq("user_id", payload["user_id"]).execute()

    return jsonify({"success": True, "message": "Onboarding completed"})


# --------------------
# Run
# --------------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5003, debug=True)

