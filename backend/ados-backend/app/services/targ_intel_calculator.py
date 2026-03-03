import logging
from typing import Dict, List, Any, Optional, Tuple
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import json
from uuid import UUID
from collections import Counter

from app.models import Competitor, SurvMetrics, TargIntel, Ad
from app.utils.logger import get_logger

logger = get_logger(__name__)

class TargIntelCalculator:
    """Calculate targeting intelligence from competitor metrics"""
    
    # Default values for when data is missing
    DEFAULT_VALUES = {
        "age_range": "25-34",
        "gender_ratio": {"male": 0.5, "female": 0.5, "other": 0.0},
        "primary_gender": "balanced",
        "geography": {"countries": ["US"], "states": [], "cities": []},
        "primary_location": "United States",
        "income_level": "middle",
        "income_score": 0.5,
        "device_distribution": {"mobile": 0.6, "desktop": 0.35, "tablet": 0.05},
        "primary_device": "mobile",
        "funnel_stage": "awareness",
        "funnel_score": 0.5,
        "audience_type": "broad",
        "audience_size": "medium",
        "bidding_strategy": "cpc",
        "bidding_confidence": 0.5,
        "content_type": "image",
        "call_to_action": "learn_more",
        "estimated_cpm": 10.0,
        "estimated_cpc": 1.5,
        "estimated_roas": 2.0,
        "engagement_rate": 0.02,
    }
    
    def __init__(self, db: Session):
        self.db = db
    
    def calculate_for_competitor(self, competitor_id: UUID, user_id: UUID, 
                               force_recalculate: bool = False) -> Optional[TargIntel]:
        """Calculate targeting intelligence for a single competitor"""
        try:
            # Check if recent calculation exists (within 24 hours)
            if not force_recalculate:
                existing = self.db.query(TargIntel).filter(
                    TargIntel.competitor_id == competitor_id,
                    TargIntel.user_id == user_id,
                    TargIntel.is_active == True,
                    TargIntel.last_calculated_at >= datetime.utcnow() - timedelta(hours=24)
                ).first()
                
                if existing:
                    logger.info(f"Using cached targeting intel for competitor {competitor_id}")
                    return existing
            
            # Get competitor
            competitor = self.db.query(Competitor).filter(
                Competitor.id == competitor_id,
                Competitor.user_id == user_id
            ).first()
            
            if not competitor:
                logger.error(f"Competitor {competitor_id} not found or doesn't belong to user")
                return None
            
            # Get latest metrics for this competitor
            metrics = self.db.query(SurvMetrics).filter(
                SurvMetrics.competitor_id == competitor_id
            ).order_by(SurvMetrics.calculated_at.desc()).first()
            
            # Get ads for this competitor
            ads = self.db.query(Ad).filter(
                Ad.competitor_id == competitor_id,
                Ad.is_active == True
            ).all()
            
            if not metrics and not ads:
                logger.warning(f"No metrics or ads found for competitor {competitor.name}")
                # Still create basic intel with defaults
                return self._create_basic_intel(competitor, user_id)
            
            # Calculate all metrics using surv_metrics data
            age_data = self._calculate_age_targeting(metrics, ads, competitor)
            gender_data = self._calculate_gender_targeting(metrics, ads, competitor)
            geo_data = self._calculate_geography_targeting(metrics, ads, competitor)
            interest_data = self._calculate_interest_clusters(metrics, ads, competitor)
            income_data = self._calculate_income_level(metrics, ads, competitor)
            device_data = self._calculate_device_targeting(metrics, ads)
            funnel_data = self._calculate_funnel_stage(metrics, ads)
            audience_data = self._calculate_audience_type(metrics, ads)
            bidding_data = self._calculate_bidding_strategy(metrics, ads)
            content_data = self._calculate_content_analysis(ads)
            performance_data = self._calculate_performance_metrics(metrics)
            
            # Calculate confidence scores
            confidence_scores = self._calculate_confidence_scores(
                metrics, ads, age_data, gender_data, geo_data, 
                interest_data, income_data, device_data, 
                funnel_data, audience_data, bidding_data
            )
            
            overall_confidence = sum(confidence_scores.values()) / len(confidence_scores)
            
            # Create or update TargIntel record
            targ_intel = self.db.query(TargIntel).filter(
                TargIntel.competitor_id == competitor_id,
                TargIntel.user_id == user_id
            ).first()
            
            if not targ_intel:
                targ_intel = TargIntel(
                    competitor_id=competitor_id,
                    user_id=user_id
                )
                self.db.add(targ_intel)
            
            # Update fields
            targ_intel.age_min = age_data.get("min_age")
            targ_intel.age_max = age_data.get("max_age")
            targ_intel.age_range = age_data.get("range")
            targ_intel.gender_ratio = gender_data.get("ratio")
            targ_intel.primary_gender = gender_data.get("primary")
            targ_intel.geography = geo_data.get("locations")
            targ_intel.primary_location = geo_data.get("primary_location")
            targ_intel.interest_clusters = interest_data.get("clusters")
            targ_intel.primary_interests = interest_data.get("primary_interests")
            targ_intel.income_level = income_data.get("level")
            targ_intel.income_score = income_data.get("score")
            targ_intel.device_distribution = device_data.get("distribution")
            targ_intel.primary_device = device_data.get("primary")
            targ_intel.funnel_stage = funnel_data.get("stage")
            targ_intel.funnel_score = funnel_data.get("score")
            targ_intel.audience_type = audience_data.get("type")
            targ_intel.audience_size = audience_data.get("size")
            targ_intel.bidding_strategy = bidding_data.get("strategy")
            targ_intel.bidding_confidence = bidding_data.get("confidence")
            targ_intel.content_type = content_data.get("type")
            targ_intel.call_to_action = content_data.get("cta")
            targ_intel.estimated_cpm = performance_data.get("cpm")
            targ_intel.estimated_cpc = performance_data.get("cpc")
            targ_intel.estimated_roas = performance_data.get("roas")
            targ_intel.engagement_rate = performance_data.get("engagement_rate")
            targ_intel.confidence_scores = confidence_scores
            targ_intel.overall_confidence = overall_confidence
            targ_intel.last_calculated_at = datetime.utcnow()
            targ_intel.is_active = True
            
            # Store raw analysis for debugging
            raw_analysis = {
                "metrics_available": bool(metrics),
                "ads_count": len(ads),
                "calculation_timestamp": datetime.utcnow().isoformat(),
                "metrics_used": self._get_metrics_used(metrics),
                "age_data": age_data,
                "gender_data": gender_data,
                "geo_data": geo_data,
            }
            targ_intel.raw_analysis = raw_analysis
            
            self.db.commit()
            self.db.refresh(targ_intel)
            
            logger.info(f"Calculated targeting intel for {competitor.name} with confidence {overall_confidence:.2f}")
            return targ_intel
            
        except Exception as e:
            logger.error(f"Error calculating targeting intel for competitor {competitor_id}: {e}", exc_info=True)
            self.db.rollback()
            return None
    
    def _get_metrics_used(self, metrics: SurvMetrics) -> Dict:
        """Get which metrics were available for calculation"""
        if not metrics:
            return {"has_metrics": False}
        
        used = {"has_metrics": True}
        
        # Check which metrics fields are populated
        fields_to_check = [
            ('geo_penetration', 'geography'),
            ('device_distribution', 'device'),
            ('funnel_stage_distribution', 'funnel'),
            ('audience_clusters', 'audience'),
            ('avg_cpm', 'cpm'),
            ('avg_cpc', 'cpc'),
            ('avg_ctr', 'ctr'),
            ('estimated_monthly_spend', 'spend'),
        ]
        
        for field, name in fields_to_check:
            value = getattr(metrics, field, None)
            used[name] = value is not None
        
        return used
    
    def _calculate_age_targeting(self, metrics: SurvMetrics, ads: List[Ad], 
                               competitor: Competitor) -> Dict[str, Any]:
        """Calculate age targeting from metrics and ads"""
        try:
            # Try to extract from audience_clusters first
            if metrics and metrics.audience_clusters:
                audience_data = metrics.audience_clusters
                if isinstance(audience_data, dict):
                    # Look for age-related clusters
                    age_patterns = self._extract_age_from_clusters(audience_data)
                    if age_patterns:
                        return self._process_age_patterns(age_patterns)
            
            # Try to extract from ad content as fallback
            age_data = self._extract_age_from_ads(ads)
            if age_data:
                return age_data
            
            # Try to infer from competitor name/industry
            inferred_age = self._infer_age_from_competitor(competitor)
            if inferred_age:
                return inferred_age
            
            # Default fallback
            return {
                "min_age": 25,
                "max_age": 34,
                "range": "25-34",
                "confidence": 0.3
            }
            
        except Exception as e:
            logger.warning(f"Error in age calculation: {e}")
            return {
                "min_age": 25,
                "max_age": 34,
                "range": "25-34",
                "confidence": 0.1
            }
    
    def _extract_age_from_clusters(self, audience_clusters: Dict) -> List[str]:
        """Extract age patterns from audience clusters"""
        age_patterns = []
        
        # Common age-related keywords in clusters
        age_keywords = {
            'teen': '18-24', 'teenager': '18-24', 'college': '18-24', 'student': '18-24',
            'young': '18-34', 'youth': '18-34', 'millennial': '25-40',
            'adult': '25-54', 'professional': '25-54', 'working': '25-54',
            'middle': '35-54', 'family': '25-44', 'parent': '25-44',
            'senior': '55+', 'retired': '55+', 'retirement': '55+'
        }
        
        if isinstance(audience_clusters, dict):
            for key, value in audience_clusters.items():
                key_lower = str(key).lower()
                for keyword, age_range in age_keywords.items():
                    if keyword in key_lower:
                        age_patterns.append(age_range)
        
        return age_patterns
    
    def _extract_age_from_ads(self, ads: List[Ad]) -> Optional[Dict]:
        """Extract age targeting from ad content"""
        age_keywords = {
            "teen": 13, "teenager": 13, "college": 18, "university": 18,
            "young": 18, "youth": 18, "adult": 25, "professional": 30,
            "middle": 40, "senior": 55, "retirement": 60, "family": 35
        }
        
        age_data = []
        for ad in ads:
            if ad.description:
                text = ad.description.lower()
                for keyword, age in age_keywords.items():
                    if keyword in text:
                        age_data.append(age)
        
        if age_data:
            return self._process_age_data(age_data)
        
        return None
    
    def _infer_age_from_competitor(self, competitor: Competitor) -> Optional[Dict]:
        """Infer age targeting from competitor information"""
        if not competitor.name:
            return None
        
        name = competitor.name.lower()
        domain = competitor.domain.lower() if competitor.domain else ""
        industry = competitor.industry.lower() if competitor.industry else ""
        
        # Age patterns based on industry/name
        if any(word in name for word in ["kid", "child", "toy", "baby", "toddler"]):
            return {"min_age": 0, "max_age": 12, "range": "0-12", "confidence": 0.6}
        elif any(word in name for word in ["teen", "youth", "college", "student"]):
            return {"min_age": 13, "max_age": 24, "range": "13-24", "confidence": 0.6}
        elif any(word in name for word in ["luxury", "premium", "wealth", "elite"]):
            return {"min_age": 35, "max_age": 65, "range": "35-65", "confidence": 0.5}
        elif any(word in name for word in ["retirement", "senior", "elder"]):
            return {"min_age": 55, "max_age": 75, "range": "55+", "confidence": 0.7}
        
        return None
    
    def _process_age_data(self, age_data: List[int]) -> Dict:
        """Process age data into ranges"""
        if not age_data:
            return self.DEFAULT_VALUES["age_range"]
        
        min_age = min(age_data)
        max_age = max(age_data)
        
        # Group into standard ranges
        age_ranges = {
            "18-24": 0, "25-34": 0, "35-44": 0, 
            "45-54": 0, "55+": 0
        }
        
        for age in age_data:
            if 18 <= age <= 24:
                age_ranges["18-24"] += 1
            elif 25 <= age <= 34:
                age_ranges["25-34"] += 1
            elif 35 <= age <= 44:
                age_ranges["35-44"] += 1
            elif 45 <= age <= 54:
                age_ranges["45-54"] += 1
            elif age >= 55:
                age_ranges["55+"] += 1
        
        primary_range = max(age_ranges, key=age_ranges.get)
        confidence = min(len(age_data) / 5, 1.0)
        
        return {
            "min_age": min_age,
            "max_age": max_age,
            "range": primary_range,
            "confidence": confidence
        }
    
    def _process_age_patterns(self, age_patterns: List[str]) -> Dict:
        """Process age patterns into final age targeting"""
        if not age_patterns:
            return {
                "min_age": 25,
                "max_age": 34,
                "range": "25-34",
                "confidence": 0.3
            }
        
        # Count patterns
        pattern_counts = Counter(age_patterns)
        most_common = pattern_counts.most_common(1)[0][0]
        
        # Convert range string to min/max
        if "-" in most_common:
            min_age, max_age = map(int, most_common.split("-"))
        elif "+" in most_common:
            min_age = int(most_common.replace("+", ""))
            max_age = 75
        else:
            min_age, max_age = 25, 34
        
        confidence = min(len(age_patterns) / 3, 1.0)
        
        return {
            "min_age": min_age,
            "max_age": max_age,
            "range": most_common,
            "confidence": confidence
        }
    
    def _calculate_gender_targeting(self, metrics: SurvMetrics, ads: List[Ad], 
                                  competitor: Competitor) -> Dict[str, Any]:
        """Calculate gender targeting from metrics and ads"""
        try:
            # Try to extract from audience_clusters first
            if metrics and metrics.audience_clusters:
                audience_data = metrics.audience_clusters
                if isinstance(audience_data, dict):
                    gender_data = self._extract_gender_from_clusters(audience_data)
                    if gender_data:
                        return gender_data
            
            # Try to extract from ad content
            gender_data = self._extract_gender_from_ads(ads)
            if gender_data:
                return gender_data
            
            # Try to infer from competitor
            inferred_gender = self._infer_gender_from_competitor(competitor)
            if inferred_gender:
                return inferred_gender
            
            # Default fallback
            return {
                "ratio": self.DEFAULT_VALUES["gender_ratio"],
                "primary": self.DEFAULT_VALUES["primary_gender"],
                "confidence": 0.3
            }
            
        except Exception as e:
            logger.warning(f"Error in gender calculation: {e}")
            return {
                "ratio": self.DEFAULT_VALUES["gender_ratio"],
                "primary": self.DEFAULT_VALUES["primary_gender"],
                "confidence": 0.1
            }
    
    def _extract_gender_from_clusters(self, audience_clusters: Dict) -> Optional[Dict]:
        """Extract gender patterns from audience clusters"""
        male_keywords = ["male", "men", "guy", "father", "dad", "brother", "boy"]
        female_keywords = ["female", "women", "girl", "mother", "mom", "sister", "girl"]
        
        male_count = 0
        female_count = 0
        
        if isinstance(audience_clusters, dict):
            for key, value in audience_clusters.items():
                key_lower = str(key).lower()
                male_count += sum(1 for kw in male_keywords if kw in key_lower)
                female_count += sum(1 for kw in female_keywords if kw in key_lower)
        
        if male_count > 0 or female_count > 0:
            total = male_count + female_count
            ratio = {
                "male": round(male_count / total, 2),
                "female": round(female_count / total, 2),
                "other": 0.0
            }
            
            if ratio["male"] > 0.6:
                primary = "male"
            elif ratio["female"] > 0.6:
                primary = "female"
            else:
                primary = "balanced"
            
            confidence = min(total / 3, 1.0)
            
            return {
                "ratio": ratio,
                "primary": primary,
                "confidence": confidence
            }
        
        return None
    
    def _extract_gender_from_ads(self, ads: List[Ad]) -> Optional[Dict]:
        """Extract gender targeting from ad content"""
        male_keywords = ["men", "male", "guy", "father", "dad", "brother", "son", "he", "him", "his"]
        female_keywords = ["women", "female", "girl", "lady", "mother", "mom", "sister", "daughter", "she", "her", "hers"]
        
        male_count = 0
        female_count = 0
        
        for ad in ads:
            if ad.description:
                text = ad.description.lower()
                male_count += sum(1 for kw in male_keywords if kw in text)
                female_count += sum(1 for kw in female_keywords if kw in text)
        
        if male_count > 0 or female_count > 0:
            total = male_count + female_count
            ratio = {
                "male": round(male_count / total, 2),
                "female": round(female_count / total, 2),
                "other": 0.0
            }
            
            if ratio["male"] > 0.6:
                primary = "male"
            elif ratio["female"] > 0.6:
                primary = "female"
            else:
                primary = "balanced"
            
            confidence = min(total / 10, 1.0)
            
            return {
                "ratio": ratio,
                "primary": primary,
                "confidence": confidence
            }
        
        return None
    
    def _infer_gender_from_competitor(self, competitor: Competitor) -> Optional[Dict]:
        """Infer gender targeting from competitor information"""
        if not competitor.name:
            return None
        
        name = competitor.name.lower()
        industry = competitor.industry.lower() if competitor.industry else ""
        
        # Gender patterns based on industry
        if any(word in name for word in ["men", "groom", "shave", "barber", "male"]):
            return {
                "ratio": {"male": 0.8, "female": 0.2, "other": 0.0},
                "primary": "male",
                "confidence": 0.7
            }
        elif any(word in name for word in ["women", "beauty", "cosmetic", "makeup", "female"]):
            return {
                "ratio": {"male": 0.2, "female": 0.8, "other": 0.0},
                "primary": "female",
                "confidence": 0.7
            }
        
        return None
    
    def _calculate_geography_targeting(self, metrics: SurvMetrics, ads: List[Ad], 
                                     competitor: Competitor) -> Dict[str, Any]:
        """Calculate geographic targeting"""
        try:
            # Use geo_penetration from metrics if available
            if metrics and metrics.geo_penetration:
                geo_data = metrics.geo_penetration
                if isinstance(geo_data, dict):
                    locations = self._extract_locations_from_geo(geo_data)
                    if locations:
                        primary_location = self._get_primary_location(locations)
                        confidence = min(len(locations.get("countries", [])) / 3, 1.0)
                        
                        return {
                            "locations": locations,
                            "primary_location": primary_location,
                            "confidence": confidence
                        }
            
            # Try to extract from competitor domain
            if competitor.domain:
                locations = self._extract_locations_from_domain(competitor.domain)
                if locations:
                    return {
                        "locations": locations,
                        "primary_location": locations["countries"][0],
                        "confidence": 0.5
                    }
            
            # Default fallback
            return {
                "locations": self.DEFAULT_VALUES["geography"],
                "primary_location": self.DEFAULT_VALUES["primary_location"],
                "confidence": 0.3
            }
            
        except Exception as e:
            logger.warning(f"Error in geography calculation: {e}")
            return {
                "locations": self.DEFAULT_VALUES["geography"],
                "primary_location": self.DEFAULT_VALUES["primary_location"],
                "confidence": 0.1
            }
    
    def _extract_locations_from_geo(self, geo_penetration: Dict) -> Dict:
        """Extract locations from geo_penetration data"""
        locations = {"countries": [], "states": [], "cities": []}
        
        try:
            if isinstance(geo_penetration, dict):
                # Extract countries (top level keys are often countries)
                for key, value in geo_penetration.items():
                    if isinstance(key, str) and len(key) == 2:  # Country code
                        locations["countries"].append(key.upper())
                    elif isinstance(key, str) and len(key) > 2:
                        # Could be country name
                        locations["countries"].append(key.title())
                
                # Look for nested location data
                for value in geo_penetration.values():
                    if isinstance(value, dict):
                        for sub_key, sub_value in value.items():
                            if isinstance(sub_key, str):
                                if len(sub_key) == 2:  # State code
                                    locations["states"].append(sub_key.upper())
                                elif "," in sub_key:  # City, State format
                                    parts = sub_key.split(",")
                                    if len(parts) > 1:
                                        locations["cities"].append(parts[0].strip())
                                        locations["states"].append(parts[1].strip())
        
        except Exception as e:
            logger.warning(f"Error extracting locations from geo data: {e}")
        
        # Deduplicate and limit
        locations["countries"] = list(set(locations["countries"]))[:10]
        locations["states"] = list(set(locations["states"]))[:10]
        locations["cities"] = list(set(locations["cities"]))[:10]
        
        return locations
    
    def _extract_locations_from_domain(self, domain: str) -> Dict:
        """Extract locations from domain name"""
        locations = {"countries": [], "states": [], "cities": []}
        
        # Country TLDs
        country_tlds = {
            ".com": "US", ".org": "US", ".net": "US",
            ".uk": "UK", ".co.uk": "UK",
            ".ca": "Canada",
            ".au": "Australia",
            ".de": "Germany",
            ".fr": "France",
            ".jp": "Japan",
            ".cn": "China",
            ".in": "India",
            ".br": "Brazil",
            ".mx": "Mexico",
        }
        
        for tld, country in country_tlds.items():
            if tld in domain.lower():
                locations["countries"].append(country)
                break
        
        if not locations["countries"]:
            locations["countries"].append("US")  # Default
        
        return locations
    
    def _get_primary_location(self, locations: Dict) -> str:
        """Get primary location from locations dict"""
        if locations.get("countries"):
            return locations["countries"][0]
        return self.DEFAULT_VALUES["primary_location"]
    
    def _calculate_interest_clusters(self, metrics: SurvMetrics, ads: List[Ad], 
                                   competitor: Competitor) -> Dict[str, Any]:
        """Calculate interest clusters from ad content and metrics"""
        try:
            interests = []
            
            # Try to get from audience_clusters
            if metrics and metrics.audience_clusters:
                audience_data = metrics.audience_clusters
                if isinstance(audience_data, dict):
                    interests.extend(self._extract_interests_from_clusters(audience_data))
            
            # Extract from ad content
            interests.extend(self._extract_interests_from_ads(ads))
            
            # Extract from competitor info
            interests.extend(self._extract_interests_from_competitor(competitor))
            
            if interests:
                # Get top interests
                interest_counts = Counter(interests)
                top_interests = [item[0] for item in interest_counts.most_common(5)]
                
                confidence = min(len(set(interests)) / 5, 1.0)
                
                return {
                    "clusters": list(set(interests)),
                    "primary_interests": top_interests,
                    "confidence": confidence
                }
            
            # Default fallback
            return {
                "clusters": ["technology", "business"],
                "primary_interests": ["technology", "business"],
                "confidence": 0.3
            }
            
        except Exception as e:
            logger.warning(f"Error in interest calculation: {e}")
            return {
                "clusters": ["technology", "business"],
                "primary_interests": ["technology", "business"],
                "confidence": 0.1
            }
    
    def _extract_interests_from_clusters(self, audience_clusters: Dict) -> List[str]:
        """Extract interests from audience clusters"""
        interests = []
        
        # Map cluster names to interest categories
        interest_mapping = {
            "fitness": ["fitness", "workout", "gym", "exercise", "health", "wellness"],
            "technology": ["tech", "software", "app", "digital", "coding", "programming"],
            "fashion": ["fashion", "style", "clothing", "wear", "outfit", "apparel"],
            "travel": ["travel", "vacation", "tour", "destination", "hotel"],
            "food": ["food", "restaurant", "recipe", "cooking", "meal", "dining"],
            "finance": ["finance", "investment", "banking", "money", "stock"],
            "education": ["education", "learning", "course", "study", "school"],
            "entertainment": ["entertainment", "movie", "music", "game", "streaming"],
            "sports": ["sports", "athletic", "game", "team", "player"],
            "business": ["business", "enterprise", "corporate", "office", "work"],
            "luxury": ["luxury", "premium", "exclusive", "high-end", "designer"]
        }
        
        if isinstance(audience_clusters, dict):
            for key, value in audience_clusters.items():
                key_lower = str(key).lower()
                for category, keywords in interest_mapping.items():
                    if any(keyword in key_lower for keyword in keywords):
                        interests.append(category)
        
        return interests
    
    def _extract_interests_from_ads(self, ads: List[Ad]) -> List[str]:
        """Extract interests from ad content"""
        interests = []
        
        interest_mapping = {
            "fitness": ["fitness", "workout", "exercise", "gym", "health", "wellness"],
            "technology": ["tech", "gadget", "software", "app", "digital", "innovation"],
            "fashion": ["fashion", "clothing", "style", "wear", "outfit", "apparel"],
            "travel": ["travel", "vacation", "tour", "destination", "hotel", "flight"],
            "food": ["food", "restaurant", "recipe", "cooking", "meal", "dining"],
            "finance": ["finance", "investment", "banking", "money", "saving", "wealth"],
            "education": ["education", "learning", "course", "study", "school", "university"],
            "entertainment": ["entertainment", "movie", "music", "game", "streaming", "fun"],
            "sports": ["sports", "athletic", "game", "team", "player", "competition"],
            "business": ["business", "enterprise", "corporate", "office", "professional", "work"],
            "luxury": ["luxury", "premium", "exclusive", "high-end", "elite", "designer"]
        }
        
        for ad in ads:
            text = ""
            if ad.headline:
                text += " " + ad.headline.lower()
            if ad.description:
                text += " " + ad.description.lower()
            if ad.full_text:
                text += " " + ad.full_text.lower()
            
            for category, keywords in interest_mapping.items():
                if any(keyword in text for keyword in keywords):
                    interests.append(category)
        
        return interests
    
    def _extract_interests_from_competitor(self, competitor: Competitor) -> List[str]:
        """Extract interests from competitor information"""
        interests = []
        
        if competitor.name:
            name = competitor.name.lower()
            
            if any(word in name for word in ["tech", "software", "app", "digital", "cloud"]):
                interests.append("technology")
            if any(word in name for word in ["fit", "gym", "health", "wellness", "exercise"]):
                interests.append("fitness")
            if any(word in name for word in ["style", "wear", "fashion", "clothing", "apparel"]):
                interests.append("fashion")
            if any(word in name for word in ["travel", "tour", "hotel", "flight", "vacation"]):
                interests.append("travel")
            if any(word in name for word in ["food", "restaurant", "cafe", "kitchen", "meal"]):
                interests.append("food")
            if any(word in name for word in ["bank", "finance", "money", "capital", "investment"]):
                interests.append("finance")
            if any(word in name for word in ["edu", "learn", "school", "academy", "course"]):
                interests.append("education")
            if any(word in name for word in ["luxury", "premium", "exclusive", "elite"]):
                interests.append("luxury")
        
        return interests
    
    def _calculate_income_level(self, metrics: SurvMetrics, ads: List[Ad], 
                              competitor: Competitor) -> Dict[str, Any]:
        """Infer income level from ad content and competitor data"""
        try:
            income_score = 0.5  # Default middle
            level = "middle"
            
            # Try to infer from estimated spend in metrics
            if metrics and metrics.estimated_monthly_spend:
                monthly_spend = float(metrics.estimated_monthly_spend)
                
                # Categorize by spend level
                if monthly_spend > 100000:
                    level = "luxury"
                    income_score = 0.9
                elif monthly_spend > 50000:
                    level = "high"
                    income_score = 0.7
                elif monthly_spend > 10000:
                    level = "middle"
                    income_score = 0.5
                else:
                    level = "low"
                    income_score = 0.3
                
                confidence = 0.8  # High confidence when using actual spend data
                
                return {
                    "level": level,
                    "score": round(income_score, 2),
                    "confidence": confidence
                }
            
            # Try to infer from ad content
            income_data = self._extract_income_from_ads(ads)
            if income_data:
                return income_data
            
            # Try to infer from competitor
            inferred_income = self._infer_income_from_competitor(competitor)
            if inferred_income:
                return inferred_income
            
            # Default fallback
            return {
                "level": self.DEFAULT_VALUES["income_level"],
                "score": self.DEFAULT_VALUES["income_score"],
                "confidence": 0.3
            }
            
        except Exception as e:
            logger.warning(f"Error in income calculation: {e}")
            return {
                "level": self.DEFAULT_VALUES["income_level"],
                "score": self.DEFAULT_VALUES["income_score"],
                "confidence": 0.1
            }
    
    def _extract_income_from_ads(self, ads: List[Ad]) -> Optional[Dict]:
        """Extract income level from ad content"""
        luxury_keywords = ["luxury", "premium", "exclusive", "high-end", "designer", 
                         "bespoke", "custom", "elite", "prestigious", "expensive"]
        affordable_keywords = ["affordable", "budget", "cheap", "discount", "sale", 
                             "value", "economical", "low-cost", "bargain"]
        
        luxury_count = 0
        affordable_count = 0
        
        for ad in ads:
            text = ""
            if ad.headline:
                text += " " + ad.headline.lower()
            if ad.description:
                text += " " + ad.description.lower()
            
            luxury_count += sum(1 for kw in luxury_keywords if kw in text)
            affordable_count += sum(1 for kw in affordable_keywords if kw in text)
        
        if luxury_count > 0 or affordable_count > 0:
            if luxury_count > affordable_count:
                income_score = 0.8 + (min(luxury_count, 5) * 0.04)
                level = "high" if income_score < 0.9 else "luxury"
            elif affordable_count > luxury_count:
                income_score = 0.2 + (min(affordable_count, 5) * 0.04)
                level = "low" if income_score < 0.4 else "middle"
            else:
                income_score = 0.5
                level = "middle"
            
            total_count = luxury_count + affordable_count
            confidence = min(total_count / 10, 1.0)
            
            return {
                "level": level,
                "score": round(income_score, 2),
                "confidence": confidence
            }
        
        return None
    
    def _infer_income_from_competitor(self, competitor: Competitor) -> Optional[Dict]:
        """Infer income level from competitor information"""
        if not competitor.name:
            return None
        
        name = competitor.name.lower()
        industry = competitor.industry.lower() if competitor.industry else ""
        
        # Income patterns based on industry/name
        if any(word in name for word in ["luxury", "premium", "exclusive", "designer", "elite"]):
            return {
                "level": "luxury",
                "score": 0.9,
                "confidence": 0.7
            }
        elif any(word in name for word in ["discount", "budget", "cheap", "value", "affordable"]):
            return {
                "level": "low",
                "score": 0.3,
                "confidence": 0.7
            }
        elif any(word in industry for word in ["finance", "banking", "investment", "consulting"]):
            return {
                "level": "high",
                "score": 0.7,
                "confidence": 0.6
            }
        
        return None
    
    def _calculate_device_targeting(self, metrics: SurvMetrics, ads: List[Ad]) -> Dict[str, Any]:
        """Calculate device type targeting"""
        try:
            # Use device_distribution from metrics if available
            if metrics and metrics.device_distribution:
                device_data = metrics.device_distribution
                if isinstance(device_data, dict):
                    # Normalize device distribution
                    distribution = self._normalize_device_distribution(device_data)
                    primary = self._get_primary_device(distribution)
                    
                    return {
                        "distribution": distribution,
                        "primary": primary,
                        "confidence": 0.8  # High confidence when using metrics data
                    }
            
            # Try to infer from ad format
            device_data = self._infer_device_from_ads(ads)
            if device_data:
                return device_data
            
            # Default fallback
            return {
                "distribution": self.DEFAULT_VALUES["device_distribution"],
                "primary": self.DEFAULT_VALUES["primary_device"],
                "confidence": 0.3
            }
            
        except Exception as e:
            logger.warning(f"Error in device calculation: {e}")
            return {
                "distribution": self.DEFAULT_VALUES["device_distribution"],
                "primary": self.DEFAULT_VALUES["primary_device"],
                "confidence": 0.1
            }
    
    def _normalize_device_distribution(self, device_data: Dict) -> Dict[str, float]:
        """Normalize device distribution to our schema"""
        distribution = {"mobile": 0.0, "desktop": 0.0, "tablet": 0.0}
        
        try:
            # Map common device names to our categories
            device_mapping = {
                "mobile": ["mobile", "phone", "smartphone", "android", "ios"],
                "desktop": ["desktop", "computer", "pc", "mac", "laptop"],
                "tablet": ["tablet", "ipad", "android tablet"]
            }
            
            total = 0
            for device, percentage in device_data.items():
                if isinstance(percentage, (int, float)):
                    device_lower = str(device).lower()
                    assigned = False
                    
                    for category, keywords in device_mapping.items():
                        if any(keyword in device_lower for keyword in keywords):
                            distribution[category] += float(percentage)
                            total += float(percentage)
                            assigned = True
                            break
                    
                    if not assigned:
                        # Default to desktop for unknown devices
                        distribution["desktop"] += float(percentage)
                        total += float(percentage)
            
            # Normalize to 100%
            if total > 0:
                for category in distribution:
                    distribution[category] = round(distribution[category] / total, 2)
        
        except Exception as e:
            logger.warning(f"Error normalizing device distribution: {e}")
        
        return distribution
    
    def _get_primary_device(self, distribution: Dict[str, float]) -> str:
        """Get primary device from distribution"""
        if distribution.get("mobile", 0) >= 0.5:
            return "mobile"
        elif distribution.get("desktop", 0) >= 0.5:
            return "desktop"
        elif distribution.get("tablet", 0) >= 0.5:
            return "tablet"
        else:
            return max(distribution, key=distribution.get)
    
    def _infer_device_from_ads(self, ads: List[Ad]) -> Optional[Dict]:
        """Infer device targeting from ad format"""
        device_counts = {"mobile": 0, "desktop": 0, "tablet": 0}
        
        for ad in ads:
            if ad.format:
                format_lower = ad.format.lower()
                if any(word in format_lower for word in ["story", "reel", "short", "vertical", "tiktok"]):
                    device_counts["mobile"] += 1
                elif any(word in format_lower for word in ["carousel", "image", "display", "banner"]):
                    device_counts["desktop"] += 0.5
                    device_counts["mobile"] += 0.5
                elif any(word in format_lower for word in ["video", "youtube"]):
                    device_counts["desktop"] += 0.7
                    device_counts["mobile"] += 0.3
        
        total = sum(device_counts.values())
        if total > 0:
            distribution = {
                "mobile": round(device_counts["mobile"] / total, 2),
                "desktop": round(device_counts["desktop"] / total, 2),
                "tablet": round(device_counts["tablet"] / total, 2)
            }
            
            primary = self._get_primary_device(distribution)
            confidence = min(len(ads) / 10, 1.0)
            
            return {
                "distribution": distribution,
                "primary": primary,
                "confidence": confidence
            }
        
        return None
    
    def _calculate_funnel_stage(self, metrics: SurvMetrics, ads: List[Ad]) -> Dict[str, Any]:
        """Infer marketing funnel stage"""
        try:
            # Use funnel_stage_distribution from metrics if available
            if metrics and metrics.funnel_stage_distribution:
                funnel_data = metrics.funnel_stage_distribution
                if isinstance(funnel_data, dict):
                    stage, score = self._get_primary_funnel_stage(funnel_data)
                    if stage:
                        return {
                            "stage": stage,
                            "score": score,
                            "confidence": 0.8  # High confidence when using metrics data
                        }
            
            # Try to infer from ad content
            funnel_data = self._infer_funnel_from_ads(ads)
            if funnel_data:
                return funnel_data
            
            # Default fallback
            return {
                "stage": self.DEFAULT_VALUES["funnel_stage"],
                "score": self.DEFAULT_VALUES["funnel_score"],
                "confidence": 0.3
            }
            
        except Exception as e:
            logger.warning(f"Error in funnel calculation: {e}")
            return {
                "stage": self.DEFAULT_VALUES["funnel_stage"],
                "score": self.DEFAULT_VALUES["funnel_score"],
                "confidence": 0.1
            }
    
    def _get_primary_funnel_stage(self, funnel_data: Dict) -> Tuple[str, float]:
        """Get primary funnel stage from distribution"""
        try:
            # Convert all values to floats
            stage_values = {}
            for stage, value in funnel_data.items():
                if isinstance(value, (int, float)):
                    stage_values[stage] = float(value)
            
            if stage_values:
                primary_stage = max(stage_values, key=stage_values.get)
                total = sum(stage_values.values())
                score = stage_values[primary_stage] / total if total > 0 else 0.5
                
                # Map to our funnel stage names
                stage_mapping = {
                    "awareness": "awareness",
                    "consideration": "consideration",
                    "conversion": "conversion",
                    "retention": "retention",
                    "acquisition": "awareness",
                    "engagement": "consideration",
                    "purchase": "conversion",
                    "loyalty": "retention"
                }
                
                mapped_stage = stage_mapping.get(primary_stage.lower(), "awareness")
                return mapped_stage, round(score, 2)
        
        except Exception as e:
            logger.warning(f"Error getting primary funnel stage: {e}")
        
        return "awareness", 0.5
    
    def _infer_funnel_from_ads(self, ads: List[Ad]) -> Optional[Dict]:
        """Infer funnel stage from ad content"""
        stage_scores = {
            "awareness": 0,
            "consideration": 0,
            "conversion": 0,
            "retention": 0
        }
        
        awareness_keywords = ["new", "introducing", "discover", "learn", "what is", "about", "awareness"]
        consideration_keywords = ["compare", "features", "benefits", "why choose", "review", "guide", "how to"]
        conversion_keywords = ["buy", "purchase", "order", "shop", "get", "deal", "offer", "sale", "discount", "limited"]
        retention_keywords = ["thank you", "loyal", "member", "exclusive", "update", "newsletter", "community"]
        
        for ad in ads:
            text = ""
            if ad.headline:
                text += " " + ad.headline.lower()
            if ad.description:
                text += " " + ad.description.lower()
            
            stage_scores["awareness"] += sum(1 for kw in awareness_keywords if kw in text)
            stage_scores["consideration"] += sum(1 for kw in consideration_keywords if kw in text)
            stage_scores["conversion"] += sum(1 for kw in conversion_keywords if kw in text)
            stage_scores["retention"] += sum(1 for kw in retention_keywords if kw in text)
        
        primary_stage = max(stage_scores, key=stage_scores.get)
        total_score = sum(stage_scores.values())
        
        if total_score > 0:
            stage_score = stage_scores[primary_stage] / total_score
            confidence = min(len(ads) / 10, 1.0)
            
            return {
                "stage": primary_stage,
                "score": round(stage_score, 2),
                "confidence": confidence
            }
        
        return None
    
    def _calculate_audience_type(self, metrics: SurvMetrics, ads: List[Ad]) -> Dict[str, Any]:
        """Determine if audience is retargeting, broad, etc."""
        try:
            # Try to get from audience_clusters
            if metrics and metrics.audience_clusters:
                audience_data = metrics.audience_clusters
                if isinstance(audience_data, dict):
                    audience_type = self._infer_audience_type_from_clusters(audience_data)
                    if audience_type:
                        confidence = 0.7
                        audience_size = self._get_audience_size(ads)
                        
                        return {
                            "type": audience_type,
                            "size": audience_size,
                            "confidence": confidence
                        }
            
            # Try to infer from ad content
            audience_data = self._infer_audience_from_ads(ads)
            if audience_data:
                return audience_data
            
            # Default fallback
            return {
                "type": self.DEFAULT_VALUES["audience_type"],
                "size": self.DEFAULT_VALUES["audience_size"],
                "confidence": 0.3
            }
            
        except Exception as e:
            logger.warning(f"Error in audience calculation: {e}")
            return {
                "type": self.DEFAULT_VALUES["audience_type"],
                "size": self.DEFAULT_VALUES["audience_size"],
                "confidence": 0.1
            }
    
    def _infer_audience_type_from_clusters(self, audience_clusters: Dict) -> Optional[str]:
        """Infer audience type from audience clusters"""
        if not isinstance(audience_clusters, dict):
            return None
        
        cluster_keys = [str(key).lower() for key in audience_clusters.keys()]
        
        # Look for audience type indicators
        retargeting_indicators = ["retarget", "remarket", "existing", "previous", "returning"]
        lookalike_indicators = ["lookalike", "similar", "alike", "match"]
        custom_indicators = ["custom", "specific", "targeted", "niche"]
        
        for key in cluster_keys:
            if any(indicator in key for indicator in retargeting_indicators):
                return "retargeting"
            elif any(indicator in key for indicator in lookalike_indicators):
                return "lookalike"
            elif any(indicator in key for indicator in custom_indicators):
                return "custom"
        
        return "broad"  # Default to broad if no specific indicators found
    
    def _infer_audience_from_ads(self, ads: List[Ad]) -> Optional[Dict]:
        """Infer audience type from ad content"""
        retargeting_indicators = ["existing", "previous", "returning", "again", "back", "reminder"]
        broad_indicators = ["everyone", "all", "anyone", "public", "general", "wide"]
        lookalike_indicators = ["similar", "like you", "alike", "match", "compatible"]
        
        retargeting_score = 0
        broad_score = 0
        lookalike_score = 0
        
        for ad in ads:
            text = ""
            if ad.headline:
                text += " " + ad.headline.lower()
            if ad.description:
                text += " " + ad.description.lower()
            
            retargeting_score += sum(1 for kw in retargeting_indicators if kw in text)
            broad_score += sum(1 for kw in broad_indicators if kw in text)
            lookalike_score += sum(1 for kw in lookalike_indicators if kw in text)
        
        scores = {
            "retargeting": retargeting_score,
            "broad": broad_score,
            "lookalike": lookalike_score
        }
        
        if all(score == 0 for score in scores.values()):
            return None
        
        audience_type = max(scores, key=scores.get)
        audience_size = self._get_audience_size(ads)
        confidence = min(len(ads) / 10, 1.0)
        
        return {
            "type": audience_type,
            "size": audience_size,
            "confidence": confidence
        }
    
    def _get_audience_size(self, ads: List[Ad]) -> str:
        """Determine audience size based on ad count and content"""
        ad_count = len(ads)
        if ad_count < 3:
            return "small"
        elif ad_count < 10:
            return "medium"
        elif ad_count < 20:
            return "large"
        else:
            return "very_large"
    
    def _calculate_bidding_strategy(self, metrics: SurvMetrics, ads: List[Ad]) -> Dict[str, Any]:
        """Infer bidding strategy"""
        try:
            # Use performance metrics to infer bidding strategy
            if metrics:
                # Check for CPC indicators
                if metrics.avg_cpc and metrics.avg_cpc > 0:
                    # High CPC suggests CPC bidding
                    cpc = float(metrics.avg_cpc)
                    if cpc > 2.0:
                        return {
                            "strategy": "cpc",
                            "confidence": 0.8
                        }
                
                # Check for CPM indicators
                if metrics.avg_cpm and metrics.avg_cpm > 0:
                    # Moderate CPM suggests CPM bidding
                    cpm = float(metrics.avg_cpm)
                    if 5.0 <= cpm <= 20.0:
                        return {
                            "strategy": "cpm",
                            "confidence": 0.7
                        }
                
                # Check for tROAS indicators (high conversion probability)
                if metrics.conversion_probability:
                    conv_prob = float(metrics.conversion_probability)
                    if conv_prob > 0.1:  # 10%+ conversion rate
                        return {
                            "strategy": "tROAS",
                            "confidence": 0.6
                        }
            
            # Try to infer from ad content
            bidding_data = self._infer_bidding_from_ads(ads)
            if bidding_data:
                return bidding_data
            
            # Default fallback
            return {
                "strategy": self.DEFAULT_VALUES["bidding_strategy"],
                "confidence": self.DEFAULT_VALUES["bidding_confidence"]
            }
            
        except Exception as e:
            logger.warning(f"Error in bidding calculation: {e}")
            return {
                "strategy": self.DEFAULT_VALUES["bidding_strategy"],
                "confidence": self.DEFAULT_VALUES["bidding_confidence"]
            }
    
    def _infer_bidding_from_ads(self, ads: List[Ad]) -> Optional[Dict]:
        """Infer bidding strategy from ad content"""
        cpc_indicators = ["click", "ctr", "engagement", "action", "visit"]
        cpm_indicators = ["impression", "view", "awareness", "brand"]
        troas_indicators = ["roas", "return", "revenue", "sales", "conversion", "purchase"]
        reach_indicators = ["reach", "audience", "people", "users", "followers"]
        freq_indicators = ["frequency", "limit", "cap", "maximum", "times"]
        
        scores = {
            "cpc": 0, "cpm": 0, "tROAS": 0, "reach": 0, "frequency_cap": 0
        }
        
        for ad in ads:
            text = ""
            if ad.headline:
                text += " " + ad.headline.lower()
            if ad.description:
                text += " " + ad.description.lower()
            
            scores["cpc"] += sum(1 for kw in cpc_indicators if kw in text)
            scores["cpm"] += sum(1 for kw in cpm_indicators if kw in text)
            scores["tROAS"] += sum(1 for kw in troas_indicators if kw in text)
            scores["reach"] += sum(1 for kw in reach_indicators if kw in text)
            scores["frequency_cap"] += sum(1 for kw in freq_indicators if kw in text)
        
        if all(score == 0 for score in scores.values()):
            return None
        
        strategy = max(scores, key=scores.get)
        total_score = sum(scores.values())
        confidence = min(scores[strategy] / max(total_score, 1), 1.0)
        
        return {
            "strategy": strategy,
            "confidence": round(confidence, 2)
        }
    
    def _calculate_content_analysis(self, ads: List[Ad]) -> Dict[str, Any]:
        """Analyze content type and call-to-action"""
        try:
            content_types = {"video": 0, "image": 0, "carousel": 0, "story": 0, "text": 0}
            ctas = {
                "shop_now": 0, "learn_more": 0, "sign_up": 0, "contact_us": 0,
                "download": 0, "subscribe": 0, "book_now": 0, "get_started": 0
            }
            
            for ad in ads:
                # Content type from format
                if ad.format:
                    format_lower = ad.format.lower()
                    if any(word in format_lower for word in ["video", "reel", "short", "youtube"]):
                        content_types["video"] += 1
                    elif any(word in format_lower for word in ["image", "photo", "picture"]):
                        content_types["image"] += 1
                    elif "carousel" in format_lower:
                        content_types["carousel"] += 1
                    elif "story" in format_lower:
                        content_types["story"] += 1
                    else:
                        content_types["text"] += 1
                else:
                    content_types["image"] += 1  # Default
            
            # Determine primary content type
            if sum(content_types.values()) == 0:
                content_type = self.DEFAULT_VALUES["content_type"]
            else:
                content_type = max(content_types, key=content_types.get)
            
            # Analyze CTAs from ad content
            cta_data = self._extract_ctas_from_ads(ads)
            
            confidence = min(len(ads) / 10, 1.0)
            
            return {
                "type": content_type,
                "cta": cta_data.get("primary_cta", self.DEFAULT_VALUES["call_to_action"]),
                "confidence": confidence
            }
            
        except Exception as e:
            logger.warning(f"Error in content analysis: {e}")
            return {
                "type": self.DEFAULT_VALUES["content_type"],
                "cta": self.DEFAULT_VALUES["call_to_action"],
                "confidence": 0.1
            }
    
    def _extract_ctas_from_ads(self, ads: List[Ad]) -> Dict:
        """Extract call-to-actions from ad content"""
        cta_keywords = {
            "shop_now": ["shop now", "buy now", "purchase", "order", "get it", "buy today"],
            "learn_more": ["learn more", "find out", "discover", "read more", "see how"],
            "sign_up": ["sign up", "register", "join", "enroll", "become a member"],
            "contact_us": ["contact us", "get in touch", "call us", "email us", "message us"],
            "download": ["download", "get the app", "install", "get your copy"],
            "subscribe": ["subscribe", "follow", "stay updated", "get updates"],
            "book_now": ["book now", "reserve", "schedule", "make appointment"],
            "get_started": ["get started", "start now", "begin", "try free"]
        }
        
        cta_counts = {cta: 0 for cta in cta_keywords.keys()}
        
        for ad in ads:
            if ad.description:
                text = ad.description.lower()
                for cta_type, keywords in cta_keywords.items():
                    if any(keyword in text for keyword in keywords):
                        cta_counts[cta_type] += 1
        
        if sum(cta_counts.values()) > 0:
            primary_cta = max(cta_counts, key=cta_counts.get)
            return {"primary_cta": primary_cta, "counts": cta_counts}
        
        return {"primary_cta": self.DEFAULT_VALUES["call_to_action"]}
    
    def _calculate_performance_metrics(self, metrics: SurvMetrics) -> Dict[str, Any]:
        """Calculate estimated performance metrics"""
        try:
            result = {
                "cpm": self.DEFAULT_VALUES["estimated_cpm"],
                "cpc": self.DEFAULT_VALUES["estimated_cpc"],
                "roas": self.DEFAULT_VALUES["estimated_roas"],
                "engagement_rate": self.DEFAULT_VALUES["engagement_rate"]
            }
            
            if not metrics:
                return result
            
            # Use actual metrics when available
            if metrics.avg_cpm:
                result["cpm"] = round(float(metrics.avg_cpm), 2)
            
            if metrics.avg_cpc:
                result["cpc"] = round(float(metrics.avg_cpc), 2)
            
            # Estimate ROAS from spend and other metrics
            if metrics.estimated_monthly_spend and metrics.conversion_probability:
                monthly_spend = float(metrics.estimated_monthly_spend)
                conv_prob = float(metrics.conversion_probability)
                
                # Simple ROAS estimation: assume $50 average order value
                if monthly_spend > 0 and conv_prob > 0:
                    estimated_conversions = (monthly_spend * conv_prob) / result["cpc"] if result["cpc"] > 0 else 0
                    estimated_revenue = estimated_conversions * 50  # $50 average order value
                    if monthly_spend > 0:
                        result["roas"] = round(estimated_revenue / monthly_spend, 2)
            
            # Estimate engagement rate from CTR
            if metrics.avg_ctr:
                ctr = float(metrics.avg_ctr)
                # Engagement rate is typically higher than CTR
                result["engagement_rate"] = round(ctr * 1.5, 4)  # Estimate
            
            return result
            
        except Exception as e:
            logger.warning(f"Error in performance calculation: {e}")
            return {
                "cpm": self.DEFAULT_VALUES["estimated_cpm"],
                "cpc": self.DEFAULT_VALUES["estimated_cpc"],
                "roas": self.DEFAULT_VALUES["estimated_roas"],
                "engagement_rate": self.DEFAULT_VALUES["engagement_rate"]
            }
    
    def _calculate_confidence_scores(self, metrics: SurvMetrics, ads: List[Ad],
                                   age_data: Dict, gender_data: Dict, geo_data: Dict,
                                   interest_data: Dict, income_data: Dict, device_data: Dict,
                                   funnel_data: Dict, audience_data: Dict, bidding_data: Dict) -> Dict[str, float]:
        """Calculate confidence scores for each metric"""
        try:
            confidence_scores = {}
            
            # Base confidence on data availability
            has_metrics = bool(metrics)
            ads_count = len(ads)
            
            # Age confidence
            confidence_scores["age"] = age_data.get("confidence", 0.1)
            
            # Gender confidence
            confidence_scores["gender"] = gender_data.get("confidence", 0.1)
            
            # Geography confidence - higher if we have geo_penetration data
            geo_confidence = geo_data.get("confidence", 0.1)
            if has_metrics and metrics.geo_penetration:
                geo_confidence = max(geo_confidence, 0.7)  # Boost confidence with metrics data
            confidence_scores["geography"] = geo_confidence
            
            # Interest confidence
            confidence_scores["interests"] = interest_data.get("confidence", 0.1)
            
            # Income confidence - higher if we have spend data
            income_confidence = income_data.get("confidence", 0.1)
            if has_metrics and metrics.estimated_monthly_spend:
                income_confidence = max(income_confidence, 0.7)
            confidence_scores["income"] = income_confidence
            
            # Device confidence - higher if we have device_distribution data
            device_confidence = device_data.get("confidence", 0.1)
            if has_metrics and metrics.device_distribution:
                device_confidence = max(device_confidence, 0.8)
            confidence_scores["device"] = device_confidence
            
            # Funnel confidence - higher if we have funnel_stage_distribution data
            funnel_confidence = funnel_data.get("confidence", 0.1)
            if has_metrics and metrics.funnel_stage_distribution:
                funnel_confidence = max(funnel_confidence, 0.8)
            confidence_scores["funnel"] = funnel_confidence
            
            # Audience confidence - higher if we have audience_clusters data
            audience_confidence = audience_data.get("confidence", 0.1)
            if has_metrics and metrics.audience_clusters:
                audience_confidence = max(audience_confidence, 0.7)
            confidence_scores["audience"] = audience_confidence
            
            # Bidding confidence - higher if we have performance metrics
            bidding_confidence = bidding_data.get("confidence", 0.1)
            if has_metrics and (metrics.avg_cpc or metrics.avg_cpm or metrics.conversion_probability):
                bidding_confidence = max(bidding_confidence, 0.6)
            confidence_scores["bidding"] = bidding_confidence
            
            # Content confidence
            confidence_scores["content"] = min(ads_count / 10, 1.0) if ads_count > 0 else 0.1
            
            # Performance confidence
            performance_confidence = 0.1
            if has_metrics:
                # Count how many performance metrics we have
                metric_count = sum([
                    1 if metrics.avg_cpm else 0,
                    1 if metrics.avg_cpc else 0,
                    1 if metrics.avg_ctr else 0,
                    1 if metrics.estimated_monthly_spend else 0,
                ])
                performance_confidence = min(metric_count / 4, 1.0)
            confidence_scores["performance"] = performance_confidence
            
            # Adjust based on total data quality
            data_quality = 0.0
            if has_metrics:
                data_quality += 0.5
            if ads_count >= 5:
                data_quality += 0.3
            if ads_count >= 10:
                data_quality += 0.2
            
            for key in confidence_scores:
                confidence_scores[key] = round(min(confidence_scores[key] * (0.5 + 0.5 * data_quality), 1.0), 2)
            
            return confidence_scores
            
        except Exception as e:
            logger.warning(f"Error in confidence calculation: {e}")
            # Return default low confidence scores
            return {key: 0.1 for key in [
                "age", "gender", "geography", "interests", "income",
                "device", "funnel", "audience", "bidding", "content", "performance"
            ]}
    
    def _create_basic_intel(self, competitor: Competitor, user_id: UUID) -> TargIntel:
        """Create basic targeting intel with defaults when no data is available"""
        try:
            targ_intel = TargIntel(
                competitor_id=competitor.id,
                user_id=user_id,
                age_range=self.DEFAULT_VALUES["age_range"],
                gender_ratio=self.DEFAULT_VALUES["gender_ratio"],
                primary_gender=self.DEFAULT_VALUES["primary_gender"],
                geography=self.DEFAULT_VALUES["geography"],
                primary_location=self.DEFAULT_VALUES["primary_location"],
                interest_clusters=["general", "business"],
                primary_interests=["general", "business"],
                income_level=self.DEFAULT_VALUES["income_level"],
                income_score=self.DEFAULT_VALUES["income_score"],
                device_distribution=self.DEFAULT_VALUES["device_distribution"],
                primary_device=self.DEFAULT_VALUES["primary_device"],
                funnel_stage=self.DEFAULT_VALUES["funnel_stage"],
                funnel_score=self.DEFAULT_VALUES["funnel_score"],
                audience_type=self.DEFAULT_VALUES["audience_type"],
                audience_size=self.DEFAULT_VALUES["audience_size"],
                bidding_strategy=self.DEFAULT_VALUES["bidding_strategy"],
                bidding_confidence=self.DEFAULT_VALUES["bidding_confidence"],
                content_type=self.DEFAULT_VALUES["content_type"],
                call_to_action=self.DEFAULT_VALUES["call_to_action"],
                estimated_cpm=self.DEFAULT_VALUES["estimated_cpm"],
                estimated_cpc=self.DEFAULT_VALUES["estimated_cpc"],
                estimated_roas=self.DEFAULT_VALUES["estimated_roas"],
                engagement_rate=self.DEFAULT_VALUES["engagement_rate"],
                confidence_scores={key: 0.1 for key in [
                    "age", "gender", "geography", "interests", "income",
                    "device", "funnel", "audience", "bidding", "content", "performance"
                ]},
                overall_confidence=0.1,
                last_calculated_at=datetime.utcnow(),
                is_active=True
            )
            
            self.db.add(targ_intel)
            self.db.commit()
            self.db.refresh(targ_intel)
            
            logger.info(f"Created basic targeting intel for {competitor.name}")
            return targ_intel
            
        except Exception as e:
            logger.error(f"Error creating basic intel: {e}")
            raise
    
    def calculate_for_user(self, user_id: UUID, competitor_ids: Optional[List[UUID]] = None,
                         force_recalculate: bool = False) -> Dict[str, Any]:
        """Calculate targeting intelligence for multiple competitors"""
        try:
            # Get competitors
            query = self.db.query(Competitor).filter(
                Competitor.user_id == user_id,
                Competitor.is_active == True
            )
            
            if competitor_ids:
                query = query.filter(Competitor.id.in_(competitor_ids))
            
            competitors = query.all()
            
            if not competitors:
                return {
                    "success": False,
                    "message": "No active competitors found",
                    "total_competitors": 0,
                    "calculated": 0,
                    "failed": 0,
                    "results": []
                }
            
            results = []
            calculated = 0
            failed = 0
            
            for competitor in competitors:
                try:
                    targ_intel = self.calculate_for_competitor(
                        competitor.id, user_id, force_recalculate
                    )
                    
                    if targ_intel:
                        results.append({
                            "competitor_id": str(competitor.id),
                            "competitor_name": competitor.name,
                            "success": True,
                            "overall_confidence": targ_intel.overall_confidence,
                            "last_calculated": targ_intel.last_calculated_at.isoformat() if targ_intel.last_calculated_at else None
                        })
                        calculated += 1
                    else:
                        results.append({
                            "competitor_id": str(competitor.id),
                            "competitor_name": competitor.name,
                            "success": False,
                            "error": "Calculation failed"
                        })
                        failed += 1
                        
                except Exception as e:
                    logger.error(f"Failed to calculate for competitor {competitor.name}: {e}")
                    results.append({
                        "competitor_id": str(competitor.id),
                        "competitor_name": competitor.name,
                        "success": False,
                        "error": str(e)
                    })
                    failed += 1
            
            return {
                "success": True,
                "message": f"Calculated targeting intel for {calculated} competitors, {failed} failed",
                "total_competitors": len(competitors),
                "calculated": calculated,
                "failed": failed,
                "results": results
            }
            
        except Exception as e:
            logger.error(f"Error in bulk calculation: {e}")
            return {
                "success": False,
                "error": str(e),
                "total_competitors": 0,
                "calculated": 0,
                "failed": 0,
                "results": []
            }