# budget_testing.py
from flask import Blueprint, request, jsonify
import os
from dotenv import load_dotenv
import jwt
from datetime import datetime

from unified_db import (
    decode_jwt_token,
    handle_campaign_save,
    get_active_campaign,
    save_assets_to_campaign,
)

# Supabase
try:
    from supabase import create_client
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False

load_dotenv()

budget_testing_bp = Blueprint("budget_testing", __name__)

# --------------------------------------------------
# Supabase setup
# --------------------------------------------------

if SUPABASE_AVAILABLE and os.getenv("SUPABASE_URL") and os.getenv("SUPABASE_KEY"):
    supabase = create_client(
        os.getenv("SUPABASE_URL"),
        os.getenv("SUPABASE_KEY")
    )
else:
    class MockSupabase:
        def table(self, _): return self
        def select(self, *_): return self
        def update(self, *_): return self
        def eq(self, *_): return self
        def execute(self):
            return type("obj", (), {"data": [{"id": 1}]})
    supabase = MockSupabase()

# --------------------------------------------------
# Routes
# --------------------------------------------------

@budget_testing_bp.route("/api/budget-testing/save", methods=["POST"])
def save_budget_testing():
    try:
        data = request.get_json()

        token = data.get("user_id")
        if not token:
            return jsonify({"error": "Missing auth token"}), 401

        user_id = decode_jwt_token(token)

        budget_type = data["budget_type"]
        budget_amount = float(data["budget_amount"])
        campaign_duration = int(data["campaign_duration"])
        selected_tests = data["selected_tests"]

        budget_data = {
            "budget_type": budget_type,
            "budget_amount": budget_amount,
            "campaign_duration": campaign_duration,
            "selected_tests": selected_tests,
            "messaging_tone": data.get("messaging_tone")
        }

        campaign_id = data.get("campaign_id")

        save_result = handle_campaign_save(
            supabase,
            user_id,
            budget_data,
            campaign_id
        )

        if not save_result["success"]:
            return jsonify({"error": save_result["error"]}), 500

        campaign_result = get_active_campaign(
            supabase,
            user_id,
            save_result["campaign_id"]
        )

        projections = calculate_projections(
            budget_type,
            budget_amount,
            campaign_duration,
            selected_tests,
            campaign_result["campaign"].get("campaign_goal")
        )

        return jsonify({
            "success": True,
            "campaign_id": save_result["campaign_id"],
            "projections": projections
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@budget_testing_bp.route("/api/budget-testing/<campaign_id>", methods=["GET"])
def get_budget_testing(campaign_id):
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        return jsonify({"error": "Unauthorized"}), 401

    user_id = decode_jwt_token(token)

    response = supabase.table("auto_create") \
        .select("*") \
        .eq("id", int(campaign_id)) \
        .eq("user_id", user_id) \
        .execute()

    if not response.data:
        return jsonify({"error": "Campaign not found"}), 404

    return jsonify(response.data[0]), 200


@budget_testing_bp.route("/api/budget-testing/projections", methods=["POST"])
def get_projections():
    data = request.get_json()

    projections = calculate_projections(
        data.get("budget_type", "daily"),
        float(data.get("budget_amount", 500)),
        int(data.get("campaign_duration", 14)),
        data.get("selected_tests", []),
        data.get("campaign_goal")
    )

    return jsonify({"success": True, "projections": projections}), 200


@budget_testing_bp.route("/api/budget-testing/testing-options", methods=["GET"])
def get_testing_options():
    return jsonify({
        "testing_options": [
            {
                "id": "creative",
                "title": "Creative Testing",
                "description": "Test multiple ad variations",
                "variants": 3
            },
            {
                "id": "audience",
                "title": "Audience Testing",
                "description": "Compare audience segments",
                "variants": 2
            },
            {
                "id": "messaging",
                "title": "Message Testing",
                "description": "Test different copy variations",
                "variants": 4
            }
        ]
    }), 200


@budget_testing_bp.route("/api/budget-testing/budget-recommendations", methods=["GET"])
def budget_recommendations():
    goal = request.args.get("goal", "consideration")

    return jsonify({
        "goal": goal,
        "recommended_budget": "$500 - $2000",
        "recommendations": [
            {"value": 250, "label": "$250", "desc": "Starter"},
            {"value": 500, "label": "$500", "desc": "Recommended"},
            {"value": 1000, "label": "$1,000", "desc": "Aggressive"},
            {"value": 2500, "label": "$2,500", "desc": "Enterprise"}
        ]
    }), 200


@budget_testing_bp.route("/api/campaigns/publish", methods=["POST"])
def publish_campaign():
    try:
        data = request.get_json() or {}

        token = data.get("user_id")
        if not token:
            return jsonify({"error": "Missing auth token"}), 401

        user_id = decode_jwt_token(token)

        campaign_id = data.get("campaign_id")
        if not campaign_id:
            return jsonify({"error": "Missing campaign_id"}), 400

        try:
            campaign_id = int(campaign_id)
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid campaign_id"}), 400

        update_payload = {
            "campaign_status": "published",
            "published_at": datetime.now().isoformat()
        }
        response = supabase.table("auto_create").update(update_payload).eq("id", campaign_id).eq("user_id", user_id).execute()

        if response.data and data.get("assets"):
            save_assets_to_campaign(supabase, user_id, data["assets"], campaign_id)

        if response.data:
            return jsonify({
                "success": True,
                "campaign_id": campaign_id,
                "message": "Campaign published successfully"
            }), 200
        else:
            return jsonify({"error": "Campaign not found or access denied"}), 404

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@budget_testing_bp.route("/api/campaigns/my-campaigns", methods=["GET"])
def get_my_campaigns():
    try:
        token = request.headers.get("Authorization", "").replace("Bearer ", "")
        if not token:
            return jsonify({"error": "Unauthorized"}), 401

        user_id = decode_jwt_token(token)

        response = supabase.table("auto_create") \
            .select("*") \
            .eq("user_id", user_id) \
            .order("created_at", desc=True) \
            .execute()

        return jsonify({
            "success": True,
            "campaigns": response.data or []
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@budget_testing_bp.route("/api/campaigns/<int:campaign_id>", methods=["GET"])
def get_campaign_by_id(campaign_id):
    """Get a single campaign with full data (including assets) for the current user."""
    try:
        token = request.headers.get("Authorization", "").replace("Bearer ", "")
        if not token:
            return jsonify({"error": "Unauthorized"}), 401

        user_id = decode_jwt_token(token)

        response = supabase.table("auto_create").select("*").eq("id", campaign_id).eq("user_id", user_id).execute()

        if not response.data or len(response.data) == 0:
            return jsonify({"success": False, "error": "Campaign not found"}), 404

        return jsonify({"success": True, "campaign": response.data[0]}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# --------------------------------------------------
# Helpers
# --------------------------------------------------

def calculate_total_budget(budget_type, budget_amount, duration):
    return budget_amount * duration if budget_type == "daily" else budget_amount


def calculate_projections(budget_type, budget_amount, duration, tests, goal=None):
    daily_spend = budget_amount if budget_type == "daily" else budget_amount / duration
    
    # Calculate daily metrics
    daily_impressions_min = int(daily_spend * 90)
    daily_impressions_max = int(daily_spend * 124)
    daily_clicks_min = int(daily_spend * 2.4)
    daily_clicks_max = int(daily_spend * 3.6)
    daily_conversions_min = int(daily_spend * 0.17)
    daily_conversions_max = int(daily_spend * 0.24)
    
    # Calculate CPA range
    total_budget = budget_amount * duration if budget_type == "daily" else budget_amount
    avg_conversions = (daily_conversions_min + daily_conversions_max) / 2 * duration
    cpa_min = total_budget / (avg_conversions * 1.2) if avg_conversions > 0 else 0
    cpa_max = total_budget / (avg_conversions * 0.8) if avg_conversions > 0 else 0
    
    return {
        "daily_spend": daily_spend,
        "expected_roas": "3.2x - 4.8x",
        "tests_running": len(tests),
        "daily": {
            "impressions": f"{daily_impressions_min:,} - {daily_impressions_max:,}",
            "clicks": f"{daily_clicks_min:,} - {daily_clicks_max:,}",
            "conversions": f"{daily_conversions_min} - {daily_conversions_max}",
            "cpa": f"${cpa_min:.2f} - ${cpa_max:.2f}"
        },
        "lifetime": {
            "impressions": f"{int(daily_impressions_min * duration / 1000)}K - {int(daily_impressions_max * duration / 1000)}K",
            "clicks": f"{(daily_clicks_min * duration / 1000):.1f}K - {(daily_clicks_max * duration / 1000):.1f}K",
            "conversions": f"{daily_conversions_min * duration} - {daily_conversions_max * duration}",
            "total_spend": f"${total_budget:,.0f}"
        }
    }