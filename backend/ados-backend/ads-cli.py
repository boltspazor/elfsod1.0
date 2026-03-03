#!/usr/bin/env python3
"""
ADOS CLI Tool - Command Line Interface for ADOS Ad Surveillance
"""

import requests
import json
import sys
import time
from typing import Dict, List, Optional
import getpass
import uuid
from datetime import datetime
from typing import Dict, List

BASE_URL = "http://localhost:8000"

class ADOSClient:
    """CLI client for ADOS API."""
    
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.email = None

    def _get_headers(self):
        """Get request headers with auth token if available."""
        headers = {"Content-Type": "application/json"}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        return headers
    

    def logout(self) -> bool:
        """Logout user."""
        try:
            response = requests.post(
                f"{self.base_url}/api/auth/logout",
                headers=self._get_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                # Clear local session data
                self.token = None
                self.user_id = None
                self.email = None
                print(f"✓ {data.get('message', 'Logged out successfully')}")
                return True
            else:
                # Even if server logout fails, clear local session
                self.token = None
                self.user_id = None
                self.email = None
                print(f"✓ Local session cleared")
                return True
                
        except Exception as e:
            # Clear local session even on error
            self.token = None
            self.user_id = None
            self.email = None
            print(f"✓ Local session cleared")
            return True
    
    # ===== TARGETING INTEL METHODS =====
    
    def calculate_targeting_intel(self, competitor_ids: List[str] = None, 
                                force_recalculate: bool = False) -> Dict:
        """Calculate targeting intelligence for competitors."""
        try:
            payload = {"force_recalculate": force_recalculate}
            if competitor_ids:
                payload["competitor_ids"] = competitor_ids
            
            response = requests.post(
                f"{self.base_url}/api/targ-intel/calculate",
                headers=self._get_headers(),
                json=payload
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                print(f"✗ Failed to calculate targeting intel: {response.json().get('detail', 'Unknown error')}")
                return {}
                
        except Exception as e:
            print(f"✗ Error: {e}")
            return {}
    
    def get_competitor_targeting_intel(self, competitor_id: str) -> Dict:
        """Get targeting intelligence for a specific competitor."""
        try:
            response = requests.get(
                f"{self.base_url}/api/targ-intel/competitor/{competitor_id}",
                headers=self._get_headers()
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                print(f"✗ Failed to get targeting intel: {response.json().get('detail', 'Unknown error')}")
                return {}
                
        except Exception as e:
            print(f"✗ Error: {e}")
            return {}
    
    def get_all_targeting_intel(self) -> List[Dict]:
        """Get targeting intelligence for all user's competitors."""
        try:
            response = requests.get(
                f"{self.base_url}/api/targ-intel/all",
                headers=self._get_headers()
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                print(f"✗ Failed to get all targeting intel: {response.json().get('detail', 'Unknown error')}")
                return []
                
        except Exception as e:
            print(f"✗ Error: {e}")
            return []
    
    def get_targeting_dashboard(self) -> Dict:
        """Get targeting intelligence dashboard."""
        try:
            response = requests.get(
                f"{self.base_url}/api/targ-intel/dashboard",
                headers=self._get_headers()
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                print(f"✗ Failed to get targeting dashboard: {response.json().get('detail', 'Unknown error')}")
                return {}
                
        except Exception as e:
            print(f"✗ Error: {e}")
            return {}
    
    def refresh_targeting_intel(self) -> Dict:
        """Refresh targeting intelligence for all competitors."""
        try:
            response = requests.post(
                f"{self.base_url}/api/targ-intel/refresh-all",
                headers=self._get_headers()
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                print(f"✗ Failed to refresh targeting intel: {response.json().get('detail', 'Unknown error')}")
                return {}
                
        except Exception as e:
            print(f"✗ Error: {e}")
            return {}
    
    def delete_targeting_intel(self, competitor_id: str) -> Dict:
        """Delete targeting intelligence for a competitor."""
        try:
            response = requests.delete(
                f"{self.base_url}/api/targ-intel/{competitor_id}",
                headers=self._get_headers()
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                print(f"✗ Failed to delete targeting intel: {response.json().get('detail', 'Unknown error')}")
                return {}
                
        except Exception as e:
            print(f"✗ Error: {e}")
            return {}
    
    # ===== SUMMARY METRICS METHODS =====

    def calculate_summary_metrics(self, time_period: str = "monthly", 
                                competitor_ids: List[str] = None,
                                force_recalculate: bool = False) -> Dict:
        """Calculate summary metrics"""
        try:
            payload = {
                "time_period": time_period,
                "force_recalculate": force_recalculate
            }
            if competitor_ids:
                payload["competitor_ids"] = competitor_ids
            
            response = requests.post(
                f"{self.base_url}/api/sum-metrics/calculate",
                headers=self._get_headers(),
                json=payload
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                print(f"✗ Failed to calculate summary metrics: {response.json().get('detail', 'Unknown error')}")
                return {}
                
        except Exception as e:
            print(f"✗ Error: {e}")
            return {}

    def get_summary_dashboard(self) -> Dict:
        """Get summary metrics dashboard"""
        try:
            response = requests.get(
                f"{self.base_url}/api/sum-metrics/dashboard",
                headers=self._get_headers()
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                print(f"✗ Failed to get summary dashboard: {response.json().get('detail', 'Unknown error')}")
                return {}
                
        except Exception as e:
            print(f"✗ Error: {e}")
            return {}

    def get_summary_history(self, limit: int = 10, time_period: str = None) -> List[Dict]:
        """Get summary metrics history"""
        try:
            params = {"limit": limit}
            if time_period:
                params["time_period"] = time_period
            
            response = requests.get(
                f"{self.base_url}/api/sum-metrics/history",
                headers=self._get_headers(),
                params=params
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                print(f"✗ Failed to get summary history: {response.json().get('detail', 'Unknown error')}")
                return []
                
        except Exception as e:
            print(f"✗ Error: {e}")
            return []

    def refresh_summary_metrics(self) -> Dict:
        """Refresh all summary metrics"""
        try:
            response = requests.post(
                f"{self.base_url}/api/sum-metrics/refresh",
                headers=self._get_headers()
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                print(f"✗ Failed to refresh summary metrics: {response.json().get('detail', 'Unknown error')}")
                return {}
                
        except Exception as e:
            print(f"✗ Error: {e}")
            return {}
    
    # ===== EXISTING METHODS (keeping for compatibility) =====
    
    def search_trending(self, keyword: str, platforms: List[str] = None, 
                       limit_per_platform: int = 5, async_mode: bool = False) -> Dict:
        """Search trending ads"""
        try:
            if platforms is None:
                platforms = ["meta", "reddit", "linkedin", "instagram", "youtube"]
            
            response = requests.post(
                f"{self.base_url}/api/trending/search",
                headers=self._get_headers(),
                json={
                    "keyword": keyword,
                    "platforms": platforms,
                    "limit_per_platform": limit_per_platform,
                    "async_mode": async_mode
                }
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                print(f"✗ Failed to search trending: {response.json().get('detail', 'Unknown error')}")
                return {}
                
        except Exception as e:
            print(f"✗ Error: {e}")
            return {}
    
    def register(self, email: str, name: str, password: str) -> bool:
        """Register a new user."""
        try:
            response = requests.post(
                f"{self.base_url}/api/auth/register",
                json={
                    "email": email,
                    "name": name,
                    "password": password
                }
            )
            
            if response.status_code == 200:
                print(f"✓ User registered: {email}")
                return True
            else:
                print(f"✗ Registration failed: {response.json().get('detail', 'Unknown error')}")
                return False
                
        except Exception as e:
            print(f"✗ Error: {e}")
            return False
    
    def login(self, email: str, password: str) -> bool:
        """Login user and get token."""
        try:
            # Use form data for login endpoint
            response = requests.post(
                f"{self.base_url}/api/auth/login",
                data={
                    "username": email,
                    "password": password
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            
            if response.status_code == 200:
                data = response.json()
                self.token = data["access_token"]
                self.user_id = data["user_id"]
                self.email = data["email"]
                print(f"✓ Logged in as: {self.email}")
                return True
            else:
                print(f"✗ Login failed: {response.json().get('detail', 'Unknown error')}")
                return False
                
        except Exception as e:
            print(f"✗ Error: {e}")
            return False
    
    def get_competitors(self) -> List[Dict]:
        """Get all competitors for current user."""
        try:
            response = requests.get(
                f"{self.base_url}/api/competitors/",
                headers=self._get_headers()
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                print(f"✗ Failed to get competitors: {response.json().get('detail', 'Unknown error')}")
                return []
                
        except Exception as e:
            print(f"✗ Error: {e}")
            return []
    
    def add_competitor(self, name: str, domain: str = None, industry: str = None) -> Optional[str]:
        """Add a new competitor."""
        try:
            competitor_data = {"name": name}
            if domain:
                competitor_data["domain"] = domain
            if industry:
                competitor_data["industry"] = industry
            
            response = requests.post(
                f"{self.base_url}/api/competitors/",
                headers=self._get_headers(),
                json=competitor_data
            )
            
            if response.status_code == 200:
                competitor = response.json()
                print(f"✓ Competitor added: {competitor['name']} (ID: {competitor['id']})")
                return competitor["id"]
            else:
                print(f"✗ Failed to add competitor: {response.json().get('detail', 'Unknown error')}")
                return None
                
        except Exception as e:
            print(f"✗ Error: {e}")
            return None
    
    def refresh_ads(self, competitor_id: str = None) -> bool:
        """
        Refresh ads for a specific competitor or all competitors.
        """
        try:
            if competitor_id:
                # Refresh specific competitor
                response = requests.post(
                    f"{self.base_url}/api/ads/refresh/{competitor_id}",
                    headers=self._get_headers()
                )
            else:
                # Refresh all competitors
                response = requests.post(
                    f"{self.base_url}/api/ads/refresh-all",
                    headers=self._get_headers()
                )
            
            if response.status_code == 200:
                data = response.json()
                print(f"✓ {data['message']}")
                if competitor_id:
                    print(f"  Competitor ID: {data.get('competitor_id')}")
                    print(f"  Name: {data.get('competitor_name')}")
                else:
                    print(f"  User ID: {data.get('user_id')}")
                return True
            else:
                print(f"✗ Failed to refresh ads: {response.json().get('detail', 'Unknown error')}")
                return False
                
        except Exception as e:
            print(f"✗ Error: {e}")
            return False
    
    def fetch_platform_ads(self, competitor_id: str, platforms: List[str] = None) -> bool:
        """
        Fetch ads from specific platforms for a competitor.
        """
        try:
            if platforms is None:
                platforms = ["google", "meta", "reddit", "linkedin"]
            
            response = requests.post(
                f"{self.base_url}/api/platforms/fetch",
                headers=self._get_headers(),
                json={
                    "competitor_id": competitor_id,
                    "platforms": platforms
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                print(f"✓ {data['message']}")
                print(f"  Task ID: {data.get('task_id')}")
                print(f"  Platforms: {', '.join(data.get('platforms', []))}")
                return True
            else:
                print(f"✗ Failed to fetch platform ads: {response.json().get('detail', 'Unknown error')}")
                return False
                
        except Exception as e:
            print(f"✗ Error: {e}")
            return False
    
    def get_ads(self, competitor_id: str = None) -> List[Dict]:
        """Get ads for a specific competitor or all competitors."""
        try:
            if competitor_id:
                response = requests.get(
                    f"{self.base_url}/api/ads/competitor/{competitor_id}",
                    headers=self._get_headers()
                )
            else:
                # Get all ads through competitors endpoint
                competitors = self.get_competitors()
                all_ads = []
                for comp in competitors:
                    ads = self.get_ads(comp["id"])
                    all_ads.extend(ads)
                return all_ads
            
            if response.status_code == 200:
                return response.json()
            else:
                print(f"✗ Failed to get ads: {response.json().get('detail', 'Unknown error')}")
                return []
                
        except Exception as e:
            print(f"✗ Error: {e}")
            return []
    
    def get_ad_fetches(self) -> List[Dict]:
        """Get ad fetch history."""
        try:
            response = requests.get(
                f"{self.base_url}/api/ads/fetches",
                headers=self._get_headers()
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                print(f"✗ Failed to get fetch history: {response.json().get('detail', 'Unknown error')}")
                return []
                
        except Exception as e:
            print(f"✗ Error: {e}")
            return []
    
    def get_user_profile(self) -> Optional[Dict]:
        """Get current user profile."""
        try:
            response = requests.get(
                f"{self.base_url}/api/users/me",
                headers=self._get_headers()
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                print(f"✗ Failed to get profile: {response.json().get('detail', 'Unknown error')}")
                return None
                
        except Exception as e:
            print(f"✗ Error: {e}")
            return None
    
    # ===== METRICS METHODS =====
    
    def calculate_metrics(self, competitor_ids: List[str] = None, time_period: str = "weekly") -> List[Dict]:
        """Calculate metrics for competitors."""
        try:
            payload = {"time_period": time_period}
            if competitor_ids:
                payload["competitor_ids"] = competitor_ids
            
            response = requests.post(
                f"{self.base_url}/api/metrics/calculate",
                headers=self._get_headers(),
                json=payload
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                print(f"✗ Failed to calculate metrics: {response.json().get('detail', 'Unknown error')}")
                return []
                
        except Exception as e:
            print(f"✗ Error: {e}")
            return []
    
    def get_metrics_summary(self) -> List[Dict]:
        """Get summary of latest metrics for all competitors."""
        try:
            response = requests.get(
                f"{self.base_url}/api/metrics/summary",
                headers=self._get_headers()
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                print(f"✗ Failed to get metrics summary: {response.json().get('detail', 'Unknown error')}")
                return []
                
        except Exception as e:
            print(f"✗ Error: {e}")
            return []
    
    def get_competitor_metrics(self, competitor_id: str, limit: int = 10) -> List[Dict]:
        """Get metrics history for a specific competitor."""
        try:
            response = requests.get(
                f"{self.base_url}/api/metrics/competitor/{competitor_id}",
                headers=self._get_headers(),
                params={"limit": limit}
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                print(f"✗ Failed to get competitor metrics: {response.json().get('detail', 'Unknown error')}")
                return []
                
        except Exception as e:
            print(f"✗ Error: {e}")
            return []
    
    def get_platform_stats(self) -> Dict:
        """Get platform statistics across all competitors."""
        try:
            response = requests.get(
                f"{self.base_url}/api/metrics/platform-stats",
                headers=self._get_headers()
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                print(f"✗ Failed to get platform stats: {response.json().get('detail', 'Unknown error')}")
                return {}
                
        except Exception as e:
            print(f"✗ Error: {e}")
            return {}
    
    def wait_for_fetch_completion(self, timeout: int = 300, check_interval: int = 5):
        """Wait for background fetch tasks to complete."""
        print(f"\n⏳ Waiting for ad fetch to complete (timeout: {timeout}s)...")
        
        start_time = time.time()
        last_status = None
        
        while time.time() - start_time < timeout:
            fetches = self.get_ad_fetches()
            
            if fetches:
                latest = fetches[0]  # Most recent fetch
                current_status = latest.get("status")
                
                if current_status != last_status:
                    print(f"  Status: {current_status}")
                    last_status = current_status
                
                if current_status == "completed":
                    print(f"✓ Fetch completed successfully!")
                    print(f"  Total ads fetched: {latest.get('total_ads_fetched', 0)}")
                    print(f"  Platforms: {latest.get('platforms_queried', 'N/A')}")
                    return True
                elif current_status == "failed":
                    print(f"✗ Fetch failed: {latest.get('error_message', 'Unknown error')}")
                    return False
            
            time.sleep(check_interval)
        
        print("✗ Timeout waiting for fetch completion")
        return False

def print_banner():
    """Print ADOS CLI banner."""
    banner = """
    ╔══════════════════════════════════════════╗
    ║         ADOS Ad Surveillance CLI         ║
    ║           Competitor Ads Tracker         ║
    ╚══════════════════════════════════════════╝
    """
    print(banner)

def display_menu():
    """Display main menu."""
    menu = """
    ┌──────────────────────────────────────────┐
    │              MAIN MENU                   │
    ├──────────────────────────────────────────┤
    │  1. Register New User                    │
    │  2. Login                                │
    │  3. Logout                               │
    │  4. View Competitors                     │
    │  5. Add Competitor                       │
    │  6. Refresh Ads (All Competitors)        │
    │  7. Refresh Ads (Specific Competitor)    │
    │  8. Fetch Platform Ads                   │
    │  9. View Ads                             │
    │ 10. View Fetch History                   │
    │ 11. View Profile                         │
    │ 12. Run Full Surveillance                │
    │ 13. Metrics Menu                         │
    │ 14. Targeting Intel Menu                 │
    │ 15. Trending ads                         │
    │ 16. Summary Metrics Menu                 │
    │ 17. Exit                                 │
    └──────────────────────────────────────────┘
    """
    print(menu)

def display_competitors(competitors: List[Dict]):
    """Display competitors in a table."""
    if not competitors:
        print("No competitors found.")
        return
    
    print("\n📊 COMPETITORS:")
    print("─" * 80)
    print(f"{'ID':<38} {'Name':<25} {'Domain':<20} {'Ads':<6}")
    print("─" * 80)
    
    for comp in competitors:
        comp_id = comp.get('id', 'N/A')[:8] + "..."
        name = comp.get('name', 'N/A')[:23] + "..." if len(comp.get('name', '')) > 23 else comp.get('name', 'N/A')
        domain = comp.get('domain', 'N/A')[:17] + "..." if len(comp.get('domain', '')) > 17 else comp.get('domain', 'N/A')
        ads_count = comp.get('ads_count', 0)
        
        print(f"{comp_id:<38} {name:<25} {domain:<20} {ads_count:<6}")
    
    print("─" * 80)
    print(f"Total: {len(competitors)} competitors")

def display_ads(ads: List[Dict]):
    """Display ads in a table."""
    if not ads:
        print("No ads found.")
        return
    
    print("\n📰 ADS:")
    print("─" * 100)
    print(f"{'Platform':<10} {'Headline':<40} {'URL':<30} {'Seen':<20}")
    print("─" * 100)
    
    for ad in ads[:10]:  # Show only first 10
        platform = ad.get('platform', 'N/A')
        headline = (ad.get('headline', 'N/A') or ad.get('description', 'N/A') or 'No title')[:37] + "..."
        url = (ad.get('destination_url', 'N/A') or 'N/A')[:27] + "..."
        seen = ad.get('last_seen', 'N/A')
        if isinstance(seen, str) and 'T' in seen:
            seen = seen.split('T')[0]
        
        print(f"{platform:<10} {headline:<40} {url:<30} {seen:<20}")
    
    if len(ads) > 10:
        print(f"... and {len(ads) - 10} more ads")
    
    print("─" * 100)
    print(f"Total: {len(ads)} ads")

def display_fetch_history(fetches: List[Dict]):
    """Display fetch history."""
    if not fetches:
        print("No fetch history found.")
        return
    
    print("\n📋 FETCH HISTORY:")
    print("─" * 90)
    print(f"{'Time':<20} {'Status':<12} {'Ads':<6} {'Platforms':<30} {'Error':<20}")
    print("─" * 90)
    
    for fetch in fetches[:10]:  # Show only first 10
        started = fetch.get('started_at', 'N/A')
        if isinstance(started, str) and 'T' in started:
            started = started.replace('T', ' ').split('.')[0][11:19]  # Extract time only
        
        status = fetch.get('status', 'N/A')
        ads_count = fetch.get('total_ads_fetched', 0)
        platforms = fetch.get('platforms_queried', 'N/A')
        if platforms and len(platforms) > 25:
            platforms = platforms[:22] + "..."
        error = fetch.get('error_message', '')
        if error and len(error) > 17:
            error = error[:14] + "..."
        
        print(f"{started:<20} {status:<12} {ads_count:<6} {platforms:<30} {error:<20}")
    
    print("─" * 90)

def display_metrics_summary(metrics_summary: List[Dict]):
    """Display metrics summary."""
    if not metrics_summary:
        print("No metrics calculated yet. Run metrics calculation first.")
        return
    
    print("\n📈 METRICS SUMMARY")
    print("─" * 100)
    print(f"{'Competitor':<20} {'Active Ads':<12} {'Monthly Spend':<15} {'CTR':<10} {'Risk':<8} {'Opportunity':<12}")
    print("─" * 100)
    
    for summary in metrics_summary:
        competitor_name = summary.get('competitor_name', 'Unknown')[:18]
        active_ads = summary.get('active_ads', 0)
        
        # Handle spend formatting
        monthly_spend = summary.get('estimated_monthly_spend', 0)
        if monthly_spend:
            monthly_spend_str = f"${float(monthly_spend):,.0f}"
        else:
            monthly_spend_str = "$0"
        
        # Handle CTR formatting
        ctr = summary.get('avg_ctr', 0)
        if ctr:
            ctr_str = f"{float(ctr)*100:.1f}%"
        else:
            ctr_str = "0.0%"
        
        risk_score = summary.get('risk_score', 50)
        opportunity_score = summary.get('opportunity_score', 50)
        
        print(f"{competitor_name:<20} "
              f"{active_ads:<12} "
              f"{monthly_spend_str:<15} "
              f"{ctr_str:<10} "
              f"{risk_score:<8} "
              f"{opportunity_score:<12}")
    
    print("─" * 100)
    print(f"Total: {len(metrics_summary)} competitors")

def display_metrics_details(metric: Dict):
    """Display detailed metrics."""
    print(f"\n📊 DETAILED METRICS")
    print(f"Time Period: {metric.get('time_period', 'N/A')}")
    print(f"Calculated: {metric.get('calculated_at', 'N/A')}")
    
    print(f"\n📈 PERFORMANCE METRICS:")
    print(f"  Active Ads: {metric.get('active_ads', 0)}")
    print(f"  Total Ads: {metric.get('total_ads', 0)}")
    
    monthly_spend = metric.get('estimated_monthly_spend')
    if monthly_spend:
        print(f"  Monthly Spend: ${float(monthly_spend):,.2f}")
    
    ctr = metric.get('avg_ctr')
    if ctr:
        print(f"  Avg CTR: {float(ctr)*100:.2f}%")
    
    cpc = metric.get('avg_cpc')
    if cpc:
        print(f"  Avg CPC: ${float(cpc):.2f}")
    
    conv_prob = metric.get('conversion_probability')
    if conv_prob:
        print(f"  Conversion Probability: {float(conv_prob)*100:.1f}%")
    
    print(f"\n🎯 FUNNEL STAGES:")
    funnel = metric.get('funnel_stage_distribution')
    if funnel:
        for stage, percent in funnel.items():
            if percent:
                print(f"  {stage.title()}: {float(percent)*100:.1f}%")
    else:
        print("  No funnel data available")
    
    print(f"\n📱 DEVICE DISTRIBUTION:")
    devices = metric.get('device_distribution')
    if devices:
        for device, percent in devices.items():
            if percent:
                print(f"  {device.title()}: {float(percent)*100:.1f}%")
    else:
        print("  No device data available")
    
    print(f"\n⚠️  RISK SCORE: {metric.get('risk_score', 50)}/100")
    print(f"🎯 OPPORTUNITY SCORE: {metric.get('opportunity_score', 50)}/100")
    
    recommendations = metric.get('recommendations', [])
    if recommendations:
        print(f"\n💡 RECOMMENDATIONS:")
        for rec in recommendations[:5]:  # Show only first 5
            print(f"  • {rec}")

def display_platform_stats(stats: Dict):
    """Display platform statistics."""
    if not stats or 'message' in stats:
        print("No platform statistics available.")
        return
    
    print("\n🌐 PLATFORM STATISTICS")
    print("─" * 70)
    print(f"{'Platform':<15} {'Competitors':<12} {'Total Ads':<12} {'Active Ads':<12}")
    print("─" * 70)
    
    for platform, data in stats.items():
        if isinstance(data, dict):
            competitors = data.get('competitors', 0)
            total_ads = data.get('total_ads', 0)
            active_ads = data.get('active_ads', 0)
            
            print(f"{platform:<15} {competitors:<12} {total_ads:<12} {active_ads:<12}")
    
    print("─" * 70)

def display_summary_dashboard(dashboard: Dict):
    """Display summary metrics dashboard."""
    if not dashboard:
        print("No summary dashboard data available.")
        return
    
    print("\n📊 SUMMARY METRICS DASHBOARD")
    print("=" * 120)
    
    # Overall stats
    if 'total_spend' in dashboard:
        total_spend = dashboard.get('total_spend', 0)
        print(f"💰 Total Monthly Spend: ${float(total_spend):,.2f}")
    
    if 'average_ctr' in dashboard:
        avg_ctr = dashboard.get('average_ctr', 0)
        print(f"📈 Average CTR: {float(avg_ctr)*100:.2f}%")
    
    if 'total_ads' in dashboard:
        total_ads = dashboard.get('total_ads', 0)
        print(f"📰 Total Active Ads: {total_ads:,}")
    
    if 'total_competitors' in dashboard:
        total_competitors = dashboard.get('total_competitors', 0)
        print(f"🏢 Total Competitors: {total_competitors}")
    
    print("-" * 120)
    
    # Platform breakdown
    if 'platform_breakdown' in dashboard and dashboard['platform_breakdown']:
        print("\n🌐 PLATFORM BREAKDOWN:")
        print("-" * 60)
        print(f"{'Platform':<15} {'Spend':<15} {'Ads':<10} {'Competitors':<12}")
        print("-" * 60)
        
        for platform, data in dashboard['platform_breakdown'].items():
            spend = data.get('spend', 0)
            ads = data.get('ads', 0)
            competitors = data.get('competitors', 0)
            
            spend_str = f"${float(spend):,.0f}" if spend > 0 else "$0"
            
            print(f"{platform:<15} {spend_str:<15} {ads:<10} {competitors:<12}")
    
    # Top competitors by spend
    if 'top_competitors_by_spend' in dashboard and dashboard['top_competitors_by_spend']:
        print("\n🏆 TOP COMPETITORS BY SPEND:")
        print("-" * 60)
        for i, comp in enumerate(dashboard['top_competitors_by_spend'][:5], 1):
            name = comp.get('competitor_name', 'Unknown')[:25]
            spend = comp.get('spend', 0)
            ads = comp.get('ads', 0)
            
            spend_str = f"${float(spend):,.0f}" if spend > 0 else "$0"
            print(f"{i}. {name:<25} {spend_str:<15} ({ads} ads)")
    
    # Funnel stage distribution
    if 'funnel_stage_distribution' in dashboard and dashboard['funnel_stage_distribution']:
        print("\n🎯 FUNNEL STAGE DISTRIBUTION:")
        print("-" * 60)
        for stage, percentage in dashboard['funnel_stage_distribution'].items():
            pct = float(percentage) * 100
            bar = "█" * int(pct / 2)  # Each █ = 2%
            print(f"{stage.title():<12}: {bar} {pct:.1f}%")
    
    # Risk distribution
    if 'risk_distribution' in dashboard and dashboard['risk_distribution']:
        print("\n⚠️  RISK DISTRIBUTION:")
        print("-" * 60)
        for risk_level, count in dashboard['risk_distribution'].items():
            if count > 0:
                print(f"{risk_level.title():<12}: {count} competitors")
    
    print("=" * 120)

def display_summary_history(history: List[Dict]):
    """Display summary metrics history."""
    if not history:
        print("No summary metrics history found.")
        return
    
    print("\n📜 SUMMARY METRICS HISTORY")
    print("=" * 120)
    print(f"{'Time Period':<12} {'Calculated':<20} {'Total Spend':<15} {'Total Ads':<12} {'Competitors':<12} {'Avg CTR':<12}")
    print("=" * 120)
    
    for item in history:
        time_period = item.get('time_period', 'N/A')
        calculated = item.get('calculated_at', 'N/A')
        if isinstance(calculated, str) and 'T' in calculated:
            calculated = calculated.replace('T', ' ').split('.')[0][:16]
        
        total_spend = item.get('total_competitor_spend', 0)  # NOTE: This is the correct field name
        total_ads = item.get('active_campaigns', 0)  # NOTE: This is the correct field name
        total_competitors = item.get('total_competitors', 0)
        avg_ctr = item.get('avg_ctr', 0)
        
        spend_str = f"${float(total_spend):,.0f}" if total_spend > 0 else "$0"
        ctr_str = f"{float(avg_ctr)*100:.2f}%" if avg_ctr > 0 else "0.00%"
        
        print(f"{time_period:<12} {calculated:<20} {spend_str:<15} {total_ads:<12} {total_competitors:<12} {ctr_str:<12}")
    
    print("=" * 120)
    print(f"Total entries: {len(history)}")

def run_full_surveillance(client: ADOSClient):
    """Run complete surveillance: get all competitors and fetch their ads."""
    print("\n🚀 RUNNING FULL SURVEILLANCE")
    print("=" * 50)
    
    # Get competitors
    competitors = client.get_competitors()
    if not competitors:
        print("No competitors found. Please add competitors first.")
        return
    
    print(f"Found {len(competitors)} competitors")
    
    # Fetch ads for each competitor
    for i, comp in enumerate(competitors, 1):
        print(f"\n[{i}/{len(competitors)}] Processing: {comp.get('name')}")
        print(f"  ID: {comp.get('id')}")
        
        # Start ad fetch
        if client.refresh_ads(comp.get('id')):
            print("  ⏳ Fetch started in background...")
            # Wait a bit between competitors
            time.sleep(2)
    
    print(f"\n✅ Surveillance initiated for {len(competitors)} competitors")
    print("Check fetch history for results.")

def metrics_menu(client: ADOSClient):
    """Metrics calculation menu."""
    while True:
        print("\n📊 METRICS MENU")
        print("1. Calculate metrics for all competitors")
        print("2. Calculate metrics for specific competitor")
        print("3. View latest metrics summary")
        print("4. View competitor metrics history")
        print("5. View platform statistics")
        print("6. View detailed metrics for competitor")
        print("7. Back to main menu")
        
        choice = input("\nSelect option (1-7): ").strip()
        
        if choice == "1":
            print("\n🔄 CALCULATING METRICS FOR ALL COMPETITORS")
            time_period = input("Time period (weekly/monthly/all_time) [weekly]: ").strip() or "weekly"
            metrics = client.calculate_metrics(time_period=time_period)
            if metrics:
                print(f"✅ Calculated metrics for {len(metrics)} competitors")
        
        elif choice == "2":
            competitors = client.get_competitors()
            if not competitors:
                print("No competitors found. Add competitors first.")
                continue
            
            display_competitors(competitors)
            print("\nSelect competitor by number:")
            
            try:
                choice = int(input("\nEnter competitor number: "))
                if 1 <= choice <= len(competitors):
                    competitor = competitors[choice - 1]
                    time_period = input("Time period (weekly/monthly/all_time) [weekly]: ").strip() or "weekly"
                    
                    print(f"\n🔄 CALCULATING METRICS FOR: {competitor['name']}")
                    metrics = client.calculate_metrics(
                        competitor_ids=[competitor['id']],
                        time_period=time_period
                    )
                    
                    if metrics:
                        print(f"✅ Metrics calculated for {competitor['name']}")
                        display_metrics_details(metrics[0])
                else:
                    print("Invalid selection")
            except ValueError:
                print("Please enter a valid number")
        
        elif choice == "3":
            print("\n📈 FETCHING METRICS SUMMARY")
            summary = client.get_metrics_summary()
            display_metrics_summary(summary)
        
        elif choice == "4":
            competitors = client.get_competitors()
            if not competitors:
                print("No competitors found. Add competitors first.")
                continue
            
            display_competitors(competitors)
            print("\nSelect competitor by number:")
            
            try:
                choice = int(input("\nEnter competitor number: "))
                if 1 <= choice <= len(competitors):
                    competitor = competitors[choice - 1]
                    limit = input("Number of historical entries to show [10]: ").strip()
                    limit = int(limit) if limit.isdigit() else 10
                    
                    print(f"\n📜 METRICS HISTORY FOR: {competitor['name']}")
                    metrics_history = client.get_competitor_metrics(competitor['id'], limit)
                    
                    if metrics_history:
                        for i, metric in enumerate(metrics_history, 1):
                            print(f"\n[{i}] Period: {metric.get('time_period')} | "
                                  f"Calculated: {metric.get('calculated_at', '')[:16]}")
                            print(f"   Active Ads: {metric.get('active_ads')} | "
                                  f"Monthly Spend: ${float(metric.get('estimated_monthly_spend', 0)):,.0f}")
                    else:
                        print("No metrics history found for this competitor")
                else:
                    print("Invalid selection")
            except ValueError:
                print("Please enter a valid number")
        
        elif choice == "5":
            print("\n🌐 FETCHING PLATFORM STATISTICS")
            stats = client.get_platform_stats()
            display_platform_stats(stats)
        
        elif choice == "6":
            competitors = client.get_competitors()
            if not competitors:
                print("No competitors found. Add competitors first.")
                continue
            
            display_competitors(competitors)
            print("\nSelect competitor by number:")
            
            try:
                choice = int(input("\nEnter competitor number: "))
                if 1 <= choice <= len(competitors):
                    competitor = competitors[choice - 1]
                    
                    print(f"\n📊 DETAILED METRICS FOR: {competitor['name']}")
                    metrics_history = client.get_competitor_metrics(competitor['id'], limit=1)
                    
                    if metrics_history:
                        display_metrics_details(metrics_history[0])
                    else:
                        print("No metrics found for this competitor. Calculate metrics first.")
                else:
                    print("Invalid selection")
            except ValueError:
                print("Please enter a valid number")
        
        elif choice == "7":
            break
        
        else:
            print("Invalid choice. Please try again.")

def summary_metrics_menu(client: ADOSClient):
    """Summary metrics menu."""
    while True:
        print("\n📊 SUMMARY METRICS MENU")
        print("1. Calculate summary metrics")
        print("2. View summary dashboard")
        print("3. View summary history")
        print("4. Refresh all summary metrics")
        print("5. Back to main menu")
        
        choice = input("\nSelect option (1-5): ").strip()
        
        if choice == "1":
            print("\n🔄 CALCULATING SUMMARY METRICS")
            time_period = input("Time period (weekly/monthly/quarterly) [monthly]: ").strip() or "monthly"
            
            competitors = client.get_competitors()
            if not competitors:
                print("No competitors found. Add competitors first.")
                continue
            
            display_competitors(competitors)
            print("\nSelect competitors:")
            print("  1. All competitors")
            print("  2. Specific competitors")
            
            comp_choice = input("\nEnter choice (1-2): ").strip()
            
            competitor_ids = None
            if comp_choice == "2":
                comp_nums = input("Enter competitor numbers (comma-separated): ").strip()
                if comp_nums:
                    competitor_ids = []
                    for num in comp_nums.split(','):
                        try:
                            idx = int(num.strip()) - 1
                            if 0 <= idx < len(competitors):
                                competitor_ids.append(competitors[idx]['id'])
                        except ValueError:
                            pass
            
            force = input("Force recalculate (y/n) [n]: ").strip().lower() == 'y'
            
            print(f"\n🔄 Calculating summary metrics...")
            result = client.calculate_summary_metrics(
                time_period=time_period,
                competitor_ids=competitor_ids,
                force_recalculate=force
            )
            
            if result:
                print(f"✅ Summary metrics calculated")
                if 'total_spend' in result:
                    print(f"   Total Spend: ${float(result.get('total_spend', 0)):,.2f}")
                if 'total_ads' in result:
                    print(f"   Total Ads: {result.get('total_ads', 0)}")
                if 'total_competitors' in result:
                    print(f"   Competitors: {result.get('total_competitors', 0)}")
            else:
                print("✗ Failed to calculate summary metrics")
        
        elif choice == "2":
            print("\n📊 FETCHING SUMMARY DASHBOARD")
            dashboard = client.get_summary_dashboard()
            display_summary_dashboard(dashboard)
        
        elif choice == "3":
            print("\n📜 FETCHING SUMMARY HISTORY")
            limit = input("Number of entries to show [10]: ").strip()
            limit = int(limit) if limit.isdigit() else 10
            
            time_period = input("Filter by time period (optional): ").strip() or None
            
            history = client.get_summary_history(limit=limit, time_period=time_period)
            display_summary_history(history)
        
        elif choice == "4":
            print("\n🔄 REFRESHING ALL SUMMARY METRICS")
            confirm = input("This will recalculate summary metrics for all time periods. Continue? (y/n): ").strip().lower()
            
            if confirm == 'y':
                result = client.refresh_summary_metrics()
                if result:
                    print(f"✅ Summary metrics refreshed")
                    if 'message' in result:
                        print(f"   {result.get('message')}")
                else:
                    print("✗ Failed to refresh summary metrics")
        
        elif choice == "5":
            break
        
        else:
            print("Invalid choice. Please try again.")

def targeting_intel_menu(client: ADOSClient):
    """Targeting intelligence menu."""
    while True:
        print("\n🎯 TARGETING INTELLIGENCE MENU")
        print("1. Calculate targeting intel for all competitors")
        print("2. Calculate targeting intel for specific competitor")
        print("3. View all targeting intel")
        print("4. View competitor targeting intel")
        print("5. View targeting dashboard")
        print("6. Refresh all targeting intel")
        print("7. Delete targeting intel for competitor")
        print("8. Run complete analysis")
        print("9. Back to main menu")
        
        choice = input("\nSelect option (1-9): ").strip()
        
        if choice == "1":
            print("\n🔄 CALCULATING TARGETING INTEL FOR ALL COMPETITORS")
            force = input("Force recalculate (y/n) [n]: ").strip().lower() == 'y'
            result = client.calculate_targeting_intel(force_recalculate=force)
            
            if result.get('success'):
                print(f"✅ {result.get('message')}")
                print(f"   Total: {result.get('total_competitors')}")
                print(f"   Calculated: {result.get('calculated')}")
                print(f"   Failed: {result.get('failed')}")
            else:
                print(f"✗ {result.get('error', 'Unknown error')}")
        
        elif choice == "2":
            competitors = client.get_competitors()
            if not competitors:
                print("No competitors found. Add competitors first.")
                continue
            
            display_competitors(competitors)
            print("\nSelect competitor by number:")
            
            try:
                choice = int(input("\nEnter competitor number: "))
                if 1 <= choice <= len(competitors):
                    competitor = competitors[choice - 1]
                    force = input("Force recalculate (y/n) [n]: ").strip().lower() == 'y'
                    
                    print(f"\n🔄 CALCULATING TARGETING INTEL FOR: {competitor['name']}")
                    result = client.calculate_targeting_intel(
                        competitor_ids=[competitor['id']],
                        force_recalculate=force
                    )
                    
                    if result.get('success'):
                        print(f"✅ Targeting intel calculated for {competitor['name']}")
                        # Get and display the intel
                        intel = client.get_competitor_targeting_intel(competitor['id'])
                        if intel:
                            display_targeting_intel(intel)
                    else:
                        print(f"✗ Failed: {result.get('error', 'Unknown error')}")
                else:
                    print("Invalid selection")
            except ValueError:
                print("Please enter a valid number")
        
        elif choice == "3":
            print("\n📊 FETCHING ALL TARGETING INTEL")
            all_intel = client.get_all_targeting_intel()
            display_all_targeting_intel(all_intel)
        
        elif choice == "4":
            competitors = client.get_competitors()
            if not competitors:
                print("No competitors found. Add competitors first.")
                continue
            
            display_competitors(competitors)
            print("\nSelect competitor by number:")
            
            try:
                choice = int(input("\nEnter competitor number: "))
                if 1 <= choice <= len(competitors):
                    competitor = competitors[choice - 1]
                    
                    print(f"\n📊 TARGETING INTEL FOR: {competitor['name']}")
                    intel = client.get_competitor_targeting_intel(competitor['id'])
                    
                    if intel:
                        display_targeting_intel(intel)
                    else:
                        print("No targeting intel found. Calculate it first.")
                else:
                    print("Invalid selection")
            except ValueError:
                print("Please enter a valid number")
        
        elif choice == "5":
            print("\n📈 FETCHING TARGETING DASHBOARD")
            dashboard = client.get_targeting_dashboard()
            display_targeting_dashboard(dashboard)
        
        elif choice == "6":
            print("\n🔄 REFRESHING ALL TARGETING INTEL")
            confirm = input("This will recalculate targeting for all competitors. Continue? (y/n): ").strip().lower()
            
            if confirm == 'y':
                result = client.refresh_targeting_intel()
                if result.get('success'):
                    print(f"✅ {result.get('message')}")
                    print(f"   Total: {result.get('total_competitors')}")
                    print(f"   Calculated: {result.get('calculated')}")
                    print(f"   Failed: {result.get('failed')}")
                else:
                    print(f"✗ {result.get('error', 'Unknown error')}")
        
        elif choice == "7":
            competitors = client.get_competitors()
            if not competitors:
                print("No competitors found. Add competitors first.")
                continue
            
            display_competitors(competitors)
            print("\nSelect competitor by number to delete targeting intel:")
            
            try:
                choice = int(input("\nEnter competitor number: "))
                if 1 <= choice <= len(competitors):
                    competitor = competitors[choice - 1]
                    confirm = input(f"Delete targeting intel for {competitor['name']}? (y/n): ").strip().lower()
                    
                    if confirm == 'y':
                        result = client.delete_targeting_intel(competitor['id'])
                        if result.get('success'):
                            print(f"✅ {result.get('message')}")
                        else:
                            print(f"✗ Failed to delete: {result.get('detail', 'Unknown error')}")
                else:
                    print("Invalid selection")
            except ValueError:
                print("Please enter a valid number")
        
        elif choice == "8":
            print("\n🚀 RUNNING COMPLETE ANALYSIS")
            print("This will:")
            print("1. Refresh ads for all competitors")
            print("2. Calculate metrics")
            print("3. Calculate targeting intelligence")
            
            confirm = input("\nContinue? (y/n): ").strip().lower()
            
            if confirm == 'y':
                print("\n🔄 Step 1/3: Refreshing ads...")
                if client.refresh_ads():
                    print("⏳ Waiting for ads to complete...")
                    client.wait_for_fetch_completion()
                
                print("\n📊 Step 2/3: Calculating metrics...")
                metrics = client.calculate_metrics()
                print(f"✅ Calculated metrics for {len(metrics)} competitors")
                
                print("\n🎯 Step 3/3: Calculating targeting intelligence...")
                result = client.calculate_targeting_intel()
                if result.get('success'):
                    print(f"✅ {result.get('message')}")
                    print(f"   Calculated: {result.get('calculated')} competitors")
                
                print("\n✅ Complete analysis finished!")
        
        elif choice == "9":
            break
        
        else:
            print("Invalid choice. Please try again.")

def display_targeting_intel(intel: Dict):
    """Display detailed targeting intelligence."""
    print("\n🎯 TARGETING INTELLIGENCE")
    print("=" * 100)
    
    print(f"📊 Confidence: {intel.get('overall_confidence', 0)*100:.1f}%")
    print(f"🕒 Last Calculated: {intel.get('last_calculated_at', 'N/A')}")
    
    print("\n👥 DEMOGRAPHICS:")
    print(f"  Age Range: {intel.get('age_range', 'N/A')}")
    print(f"  Gender: {intel.get('primary_gender', 'N/A')}")
    if intel.get('gender_ratio'):
        ratio = intel['gender_ratio']
        print(f"    Ratio: Male {ratio.get('male', 0)*100:.0f}% | Female {ratio.get('female', 0)*100:.0f}% | Other {ratio.get('other', 0)*100:.0f}%")
    
    print(f"\n🌍 GEOGRAPHY:")
    print(f"  Primary Location: {intel.get('primary_location', 'N/A')}")
    if intel.get('geography'):
        geo = intel['geography']
        if geo.get('countries'):
            print(f"  Countries: {', '.join(geo['countries'][:3])}")
        if geo.get('states'):
            print(f"  States: {', '.join(geo['states'][:3])}")
    
    print(f"\n💰 INCOME LEVEL: {intel.get('income_level', 'N/A').upper()}")
    print(f"  Score: {intel.get('income_score', 0)*100:.0f}%")
    
    print(f"\n📱 DEVICE TARGETING:")
    print(f"  Primary Device: {intel.get('primary_device', 'N/A')}")
    if intel.get('device_distribution'):
        dist = intel['device_distribution']
        print(f"  Mobile: {dist.get('mobile', 0)*100:.0f}%")
        print(f"  Desktop: {dist.get('desktop', 0)*100:.0f}%")
        print(f"  Tablet: {dist.get('tablet', 0)*100:.0f}%")
    
    print(f"\n🎯 FUNNEL STAGE: {intel.get('funnel_stage', 'N/A').upper()}")
    print(f"  Score: {intel.get('funnel_score', 0)*100:.0f}%")
    
    print(f"\n👥 AUDIENCE TYPE: {intel.get('audience_type', 'N/A').upper()}")
    print(f"  Size: {intel.get('audience_size', 'N/A')}")
    
    print(f"\n💰 BIDDING STRATEGY: {intel.get('bidding_strategy', 'N/A').upper()}")
    print(f"  Confidence: {intel.get('bidding_confidence', 0)*100:.0f}%")
    
    print(f"\n🎨 CONTENT ANALYSIS:")
    print(f"  Primary Format: {intel.get('content_type', 'N/A')}")
    print(f"  Call to Action: {intel.get('call_to_action', 'N/A')}")
    
    print(f"\n📈 PERFORMANCE ESTIMATES:")
    if intel.get('estimated_cpm'):
        print(f"  Estimated CPM: ${intel['estimated_cpm']:.2f}")
    if intel.get('estimated_cpc'):
        print(f"  Estimated CPC: ${intel['estimated_cpc']:.2f}")
    if intel.get('estimated_roas'):
        print(f"  Estimated ROAS: {intel['estimated_roas']:.1f}x")
    if intel.get('engagement_rate'):
        print(f"  Engagement Rate: {intel['engagement_rate']*100:.2f}%")
    
    print(f"\n💡 INTEREST CLUSTERS:")
    if intel.get('interest_clusters'):
        clusters = intel['interest_clusters'][:5]  # Show top 5
        for cluster in clusters:
            print(f"  • {cluster}")
    
    if intel.get('primary_interests'):
        print(f"  Primary Interests: {', '.join(intel['primary_interests'][:3])}")
    
    print(f"\n🎯 CONFIDENCE SCORES:")
    if intel.get('confidence_scores'):
        scores = intel['confidence_scores']
        for metric, score in scores.items():
            bar = "█" * int(score * 10)
            print(f"  {metric:<15}: {bar} {score*100:.0f}%")
    
    print("=" * 100)

def display_all_targeting_intel(all_intel: List[Dict]):
    """Display summary of all targeting intelligence."""
    if not all_intel:
        print("No targeting intelligence calculated yet.")
        return
    
    print("\n📊 TARGETING INTELLIGENCE SUMMARY")
    print("=" * 120)
    print(f"{'Competitor':<25} {'Age':<10} {'Gender':<10} {'Location':<15} {'Income':<10} {'Funnel':<12} {'Bidding':<12} {'Confidence':<12}")
    print("=" * 120)
    
    for intel in all_intel:
        competitor_name = intel.get('competitor_name', 'Unknown')[:23] + "..." if len(intel.get('competitor_name', '')) > 23 else intel.get('competitor_name', 'Unknown')
        age_range = intel.get('age_range', 'N/A')[:8]
        gender = intel.get('primary_gender', 'N/A')[:8]
        location = intel.get('primary_location', 'N/A')[:13] + "..." if len(intel.get('primary_location', '')) > 13 else intel.get('primary_location', 'N/A')
        income = intel.get('income_level', 'N/A')[:8]
        funnel = intel.get('funnel_stage', 'N/A')[:10]
        bidding = intel.get('bidding_strategy', 'N/A')[:10]
        confidence = f"{intel.get('overall_confidence', 0)*100:.0f}%"
        
        print(f"{competitor_name:<25} {age_range:<10} {gender:<10} {location:<15} {income:<10} {funnel:<12} {bidding:<12} {confidence:<12}")
    
    print("=" * 120)
    print(f"Total: {len(all_intel)} competitors with targeting intelligence")

def display_targeting_dashboard(dashboard: Dict):
    """Display targeting intelligence dashboard."""
    if not dashboard or dashboard.get('total_competitors') == 0:
        print("No targeting intelligence data available.")
        return
    
    print("\n📈 TARGETING INTELLIGENCE DASHBOARD")
    print("=" * 80)
    
    total = dashboard.get('total_competitors', 0)
    avg_confidence = dashboard.get('average_confidence', 0)
    
    print(f"Total Competitors: {total}")
    print(f"Average Confidence: {avg_confidence*100:.1f}%")
    
    print("\n🏆 MOST COMMON PATTERNS:")
    aggregates = dashboard.get('aggregates', {})
    
    if aggregates.get('age_ranges'):
        print(f"  Age Ranges:")
        for age_range, count in sorted(aggregates['age_ranges'].items(), key=lambda x: x[1], reverse=True)[:3]:
            percent = (count / total) * 100
            print(f"    • {age_range}: {percent:.0f}% of competitors")
    
    if aggregates.get('genders'):
        print(f"  Gender Focus:")
        for gender, count in sorted(aggregates['genders'].items(), key=lambda x: x[1], reverse=True):
            percent = (count / total) * 100
            print(f"    • {gender}: {percent:.0f}%")
    
    if aggregates.get('income_levels'):
        print(f"  Income Levels:")
        for income, count in sorted(aggregates['income_levels'].items(), key=lambda x: x[1], reverse=True):
            percent = (count / total) * 100
            print(f"    • {income}: {percent:.0f}%")
    
    if aggregates.get('funnel_stages'):
        print(f"  Funnel Stages:")
        for stage, count in sorted(aggregates['funnel_stages'].items(), key=lambda x: x[1], reverse=True):
            percent = (count / total) * 100
            print(f"    • {stage}: {percent:.0f}%")
    
    if aggregates.get('bidding_strategies'):
        print(f"  Bidding Strategies:")
        for strategy, count in sorted(aggregates['bidding_strategies'].items(), key=lambda x: x[1], reverse=True):
            percent = (count / total) * 100
            print(f"    • {strategy}: {percent:.0f}%")
    
    print("\n💡 INSIGHTS:")
    insights = dashboard.get('insights', [])
    if insights:
        for insight in insights:
            print(f"  • {insight}")
    else:
        print("  No insights available")
    
    print("\n🎯 RECOMMENDATIONS:")
    recommendations = dashboard.get('recommendations', [])
    if recommendations:
        for rec in recommendations:
            print(f"  • {rec}")
    else:
        print("  No recommendations available")
    
    print("=" * 80)

def trending_menu(client: ADOSClient):
    """Trending ads search menu"""
    while True:
        print("\n🔥 TRENDING ADS SEARCH")
        print("1. Search trending ads by keyword")
        print("2. View available platforms")
        print("3. Back to main menu")
        
        choice = input("\nSelect option (1-3): ").strip()
        
        if choice == "1":
            print("\n🔍 SEARCH TRENDING ADS")
            keyword = input("Enter keyword to search: ").strip()
            
            if not keyword:
                print("✗ Keyword cannot be empty!")
                continue
            
            print("\n🌐 SELECT PLATFORMS:")
            platforms = ["meta", "reddit", "linkedin", "instagram", "youtube"]
            for i, platform in enumerate(platforms, 1):
                print(f"  {i}. {platform}")
            print("  a. All platforms")
            
            platform_choice = input("\nEnter platform numbers (comma-separated) or 'a' for all: ").strip()
            
            selected_platforms = []
            if platform_choice.lower() == 'a':
                selected_platforms = platforms
            else:
                for num in platform_choice.split(','):
                    num = num.strip()
                    if num.isdigit() and 1 <= int(num) <= len(platforms):
                        selected_platforms.append(platforms[int(num) - 1])
            
            if selected_platforms:
                print(f"\n🔎 Searching for '{keyword}' on: {', '.join(selected_platforms)}")
                results = client.search_trending(keyword, selected_platforms)
                
                if results and "results" in results:
                    display_trending_results(results)
                else:
                    print("✗ No results found or error occurred")
            else:
                print("✗ No valid platforms selected!")
        
        elif choice == "2":
            print("\n📱 AVAILABLE PLATFORMS")
            print("-" * 60)
            print(f"{'Platform':<15} {'Description':<40}")
            print("-" * 60)
            platforms_info = [
                ("Meta/Facebook", "Facebook/Instagram ads"),
                ("Reddit", "Reddit ads and posts"),
                ("LinkedIn", "LinkedIn ads and posts"),
                ("Instagram", "Posts and reels (URL lookup)"),
                ("YouTube", "Videos and shorts (URL lookup)")
            ]
            for platform, desc in platforms_info:
                print(f"{platform:<15} {desc:<40}")
            print("-" * 60)
        
        elif choice == "3":
            break
        
        else:
            print("Invalid choice. Please try again.")

def display_trending_results(results: Dict):
    """Display trending search results in formatted way"""
    print("\n" + "="*100)
    print(f"🔥 TRENDING RESULTS FOR: {results.get('keyword', 'Unknown')}")
    print("="*100)
    
    summary = results.get("summary", {})
    print(f"📊 Total Results: {summary.get('total_results', 0)}")
    print(f"📱 Platforms: {', '.join(results.get('platforms_searched', []))}")
    print("-"*100)
    
    # Display top trending items
    top_items = results.get("top_trending", [])
    if top_items:
        print("\n🏆 TOP TRENDING ITEMS:")
        print("-"*100)
        print(f"{'Rank':<4} {'Platform':<10} {'Score':<6} {'Title':<60} {'Views/Likes':<15}")
        print("-"*100)
        
        for item in top_items[:10]:  # Show top 10
            rank = item.get("rank", 0)
            platform = item.get("platform", "").upper()
            score = item.get("score", 0)
            title = (item.get("title", "")[:55] + "...") if len(item.get("title", "")) > 55 else item.get("title", "")
            
            # Get engagement metric
            views = item.get("views", 0) or item.get("impressions", 0)
            likes = item.get("likes", 0) or item.get("upvotes", 0)
            engagement = f"{views:,}v/{likes:,}l"
            
            print(f"{rank:<4} {platform:<10} {score:<6} {title:<60} {engagement:<15}")
    
    # Display platform-wise results
    print("\n" + "="*100)
    print("📱 PLATFORM-WISE RESULTS:")
    print("="*100)
    
    platform_results = results.get("results", {})
    for platform, items in platform_results.items():
        if items:
            print(f"\n{platform.upper()} ({len(items)} results):")
            print("-"*80)
            
            for i, item in enumerate(items[:3], 1):  # Show top 3 per platform
                title = (item.get("title", "")[:70] + "...") if len(item.get("title", "")) > 70 else item.get("title", "")
                score = item.get("score", 0)
                
                # Platform-specific metrics
                if platform == "youtube":
                    metrics = f"👁️ {item.get('views', 0):,} | 👍 {item.get('likes', 0):,}"
                elif platform == "instagram":
                    metrics = f"👁️ {item.get('views', 0):,} | 💖 {item.get('likes', 0):,}"
                elif platform == "reddit":
                    metrics = f"⬆️ {item.get('upvotes', 0):,} | 💬 {item.get('comments', 0):,}"
                else:
                    metrics = f"📊 {item.get('impressions', 0):,}"
                
                print(f"  {i}. {title}")
                print(f"     Score: {score} | {metrics}")
                if item.get("url"):
                    print(f"     URL: {item.get('url')[:70]}...")
                print()
    
    # Display platform performance
    platform_perf = results.get("platform_performance", {})
    if platform_perf:
        print("\n" + "="*100)
        print("📈 PLATFORM PERFORMANCE:")
        print("-"*100)
        for platform, score in sorted(platform_perf.items(), key=lambda x: x[1], reverse=True):
            print(f"{platform.upper():<12}: {'█' * int(score/10)} {score:.1f}")
    
    print("\n" + "="*100)



def main():
    """Main CLI loop."""
    print_banner()
    
    # Create client
    client = ADOSClient()
    
    while True:
        display_menu()
        
        try:
            choice = input("\nEnter your choice (1-17): ").strip()
            
            if choice == "1":
                # Register
                print("\n📝 REGISTER NEW USER")
                email = input("Email: ").strip()
                name = input("Name: ").strip()
                password = getpass.getpass("Password: ")
                confirm = getpass.getpass("Confirm Password: ")
                
                if password != confirm:
                    print("✗ Passwords do not match!")
                    continue
                
                client.register(email, name, password)
            
            elif choice == "2":
                # Login
                print("\n🔐 LOGIN")
                email = input("Email: ").strip()
                password = getpass.getpass("Password: ")
                
                if client.login(email, password):
                    print(f"✓ Logged in successfully!")
            
            elif choice == "3":
                # Logout
                if not client.token:
                    print("✗ You are not logged in!")
                    continue
                
                print("\n🚪 LOGOUT")
                confirm = input("Are you sure you want to logout? (y/n): ").strip().lower()
                
                if confirm == 'y':
                    if client.logout():
                        print(f"✓ Successfully logged out!")
            
            elif choice == "4":
                # View Competitors
                if not client.token:
                    print("✗ Please login first!")
                    continue
                
                competitors = client.get_competitors()
                display_competitors(competitors)
            
            elif choice == "5":
                # Add Competitor
                if not client.token:
                    print("✗ Please login first!")
                    continue
                
                print("\n➕ ADD COMPETITOR")
                name = input("Competitor Name (required): ").strip()
                if not name:
                    print("✗ Name is required!")
                    continue
                
                domain = input("Domain (optional, e.g., nike.com): ").strip() or None
                industry = input("Industry (optional): ").strip() or None
                
                client.add_competitor(name, domain, industry)
            
            elif choice == "6":
                # Refresh Ads (All)
                if not client.token:
                    print("✗ Please login first!")
                    continue
                
                print("\n🔄 REFRESH ADS FOR ALL COMPETITORS")
                confirm = input("This will fetch ads for all competitors. Continue? (y/n): ").strip().lower()
                
                if confirm == 'y':
                    if client.refresh_ads():
                        print("\n⏳ Waiting for completion...")
                        client.wait_for_fetch_completion()
            
            elif choice == "7":
                # Refresh Ads (Specific)
                if not client.token:
                    print("✗ Please login first!")
                    continue
                
                competitors = client.get_competitors()
                if not competitors:
                    print("No competitors found. Please add competitors first.")
                    continue
                
                display_competitors(competitors)
                print("\nSelect competitor by ID or number:")
                for i, comp in enumerate(competitors, 1):
                    print(f"  {i}. {comp.get('name')} (ID: {comp.get('id')[:8]}...)")
                
                selection = input("\nEnter number or full ID: ").strip()
                
                competitor_id = None
                if selection.isdigit():
                    idx = int(selection) - 1
                    if 0 <= idx < len(competitors):
                        competitor_id = competitors[idx].get('id')
                else:
                    # Try to find by partial ID
                    for comp in competitors:
                        if comp.get('id', '').startswith(selection):
                            competitor_id = comp.get('id')
                            break
                
                if competitor_id:
                    print(f"\n🔄 REFRESHING ADS FOR SELECTED COMPETITOR")
                    if client.refresh_ads(competitor_id):
                        print("\n⏳ Waiting for completion...")
                        client.wait_for_fetch_completion()
                else:
                    print("✗ Invalid selection!")
            
            elif choice == "8":
                # Fetch Platform Ads
                if not client.token:
                    print("✗ Please login first!")
                    continue
                
                competitors = client.get_competitors()
                if not competitors:
                    print("No competitors found. Please add competitors first.")
                    continue
                
                display_competitors(competitors)
                
                selection = input("\nEnter competitor ID or number: ").strip()
                competitor_id = None
                
                if selection.isdigit():
                    idx = int(selection) - 1
                    if 0 <= idx < len(competitors):
                        competitor_id = competitors[idx].get('id')
                else:
                    for comp in competitors:
                        if comp.get('id', '').startswith(selection):
                            competitor_id = comp.get('id')
                            break
                
                if competitor_id:
                    print("\n🌐 SELECT PLATFORMS:")
                    platforms = ["google", "meta", "reddit", "linkedin"]
                    for i, platform in enumerate(platforms, 1):
                        print(f"  {i}. {platform}")
                    print("  a. All platforms")
                    
                    platform_choice = input("\nEnter platform numbers (comma-separated) or 'a' for all: ").strip()
                    
                    selected_platforms = []
                    if platform_choice.lower() == 'a':
                        selected_platforms = platforms
                    else:
                        for num in platform_choice.split(','):
                            num = num.strip()
                            if num.isdigit() and 1 <= int(num) <= len(platforms):
                                selected_platforms.append(platforms[int(num) - 1])
                    
                    if selected_platforms:
                        print(f"\n🔄 FETCHING FROM: {', '.join(selected_platforms)}")
                        if client.fetch_platform_ads(competitor_id, selected_platforms):
                            print("\n⏳ Waiting for completion...")
                            client.wait_for_fetch_completion()
                    else:
                        print("✗ No valid platforms selected!")
                else:
                    print("✗ Invalid competitor selection!")
            
            elif choice == "9":
                # View Ads
                if not client.token:
                    print("✗ Please login first!")
                    continue
                
                competitors = client.get_competitors()
                if not competitors:
                    print("No competitors found.")
                    continue
                
                print("\nSelect competitor to view ads:")
                print("  0. All competitors")
                for i, comp in enumerate(competitors, 1):
                    print(f"  {i}. {comp.get('name')} ({comp.get('ads_count', 0)} ads)")
                
                selection = input("\nEnter number (0 for all): ").strip()
                
                if selection == "0":
                    ads = client.get_ads()
                    display_ads(ads)
                elif selection.isdigit():
                    idx = int(selection) - 1
                    if 0 <= idx < len(competitors):
                        ads = client.get_ads(competitors[idx].get('id'))
                        display_ads(ads)
                else:
                    print("✗ Invalid selection!")
            
            elif choice == "10":
                # View Fetch History
                if not client.token:
                    print("✗ Please login first!")
                    continue
                
                fetches = client.get_ad_fetches()
                display_fetch_history(fetches)
            
            elif choice == "11":
                # View Profile
                if not client.token:
                    print("✗ Please login first!")
                    continue
                
                profile = client.get_user_profile()
                if profile:
                    print("\n👤 USER PROFILE:")
                    print("─" * 40)
                    print(f"Name:  {profile.get('name')}")
                    print(f"Email: {profile.get('email')}")
                    print(f"ID:    {profile.get('user_id')}")
                    print(f"Joined: {profile.get('created_at', 'N/A')}")
                    print("─" * 40)
            
            elif choice == "12":
                # Run Full Surveillance
                if not client.token:
                    print("✗ Please login first!")
                    continue
                
                print("\n🚀 RUN FULL SURVEILLANCE")
                print("This will fetch ads for ALL your competitors from ALL platforms.")
                confirm = input("Continue? (y/n): ").strip().lower()
                
                if confirm == 'y':
                    run_full_surveillance(client)
            
            elif choice == "13":
                # Metrics Menu
                if not client.token:
                    print("✗ Please login first!")
                    continue
                
                metrics_menu(client)
            
            elif choice == "14":
                # Targeting Intel Menu
                if not client.token:
                    print("✗ Please login first!")
                    continue
                
                targeting_intel_menu(client)
            
            elif choice == "15":
                # Trending Ads Search
                if not client.token:
                    print("✗ Please login first!")
                    continue
                trending_menu(client)
            
            elif choice == "16":
                # Summary Metrics Menu
                if not client.token:
                    print("✗ Please login first!")
                    continue
                summary_metrics_menu(client)
            
            elif choice == "17":
                # Exit
                print("\n👋 Goodbye!")
                break
            
            else:
                print("✗ Invalid choice! Please enter 1-17.")
        
        except KeyboardInterrupt:
            print("\n\n👋 Interrupted. Goodbye!")
            break
        except Exception as e:
            print(f"\n✗ Error: {e}")

if __name__ == "__main__":
    main()
