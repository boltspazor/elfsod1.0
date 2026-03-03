import logging
from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Optional
from decimal import Decimal
import uuid
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
import json
import re
from collections import Counter

from app.models import Ad, Competitor, SurvMetrics

logger = logging.getLogger(__name__)


class MetricsCalculator:
    def __init__(self, db: Session):
        self.db = db
    
    def calculate_for_competitor(
        self, 
        competitor_id: uuid.UUID,
        time_period: str = "weekly"
    ) -> Optional[SurvMetrics]:
        """Calculate metrics for a competitor"""
        
        try:
            competitor = self.db.query(Competitor).filter(
                Competitor.id == competitor_id,
                Competitor.is_active == True
            ).first()
            
            if not competitor:
                logger.warning(f"Competitor {competitor_id} not found or not active")
                return None
            
            # Get date range
            start_date, end_date = self._get_date_range(time_period)
            
            # Check if metrics already exist for this period
            existing_metrics = self.db.query(SurvMetrics).filter(
                SurvMetrics.competitor_id == competitor_id,
                SurvMetrics.time_period == time_period,
                SurvMetrics.start_date == start_date,
                SurvMetrics.end_date == end_date
            ).first()
            
            # Get ads within date range
            ads = self.db.query(Ad).filter(
                Ad.competitor_id == competitor_id,
                Ad.first_seen >= start_date,
                Ad.first_seen <= end_date
            ).all()
            
            logger.info(f"Found {len(ads)} ads for competitor {competitor.name} ({time_period}: {start_date} to {end_date})")
            
            # Calculate basic metrics
            total_ads = len(ads)
            active_ads = sum(1 for ad in ads if ad.is_active)
            
            # Platform distribution
            platform_counts = {}
            for ad in ads:
                platform = ad.platform or "unknown"
                platform_counts[platform] = platform_counts.get(platform, 0) + 1
            
            # Calculate spend estimates
            estimated_monthly_spend = self._estimate_spend(ads)
            
            # Calculate performance metrics
            avg_ctr = self._estimate_ctr(ads)
            
            # Prepare all metric data
            metric_data = {
                # Basic Metrics
                'total_ads': total_ads,
                'active_ads': active_ads,
                'ads_per_platform': self._serialize_for_json(platform_counts),
                
                # Spend Metrics
                'estimated_daily_spend': self._calculate_estimated_daily_spend(ads),
                'estimated_weekly_spend': self._calculate_estimated_weekly_spend(ads),
                'estimated_monthly_spend': estimated_monthly_spend,
                'total_spend': self._calculate_total_spend(ads),
                
                # Performance Metrics
                'avg_cpm': self._calculate_avg_cpm(ads),
                'avg_cpc': self._estimate_cpc(ads),
                'avg_ctr': avg_ctr,
                'avg_frequency': self._estimate_frequency(ads),
                'conversion_probability': self._estimate_conversion_probability(ads),
                
                # Creative Metrics
                'creative_performance': self._serialize_for_json(self._analyze_creatives(ads)),
                'top_performing_creatives': self._serialize_for_json(self._identify_top_creatives(ads)),
                
                # Funnel & Audience
                'funnel_stage_distribution': self._serialize_for_json(self._detect_funnel_stages(ads)),
                'audience_clusters': self._serialize_for_json(self._infer_audience_clusters(ads, competitor)),
                
                # Geo & Device Metrics
                'geo_penetration': self._serialize_for_json(self._estimate_geo_penetration()),
                'device_distribution': self._serialize_for_json(self._estimate_device_distribution(ads)),
                
                # Time-based Metrics
                'time_of_day_heatmap': self._serialize_for_json(self._estimate_time_heatmap()),
                'ad_timeline': self._serialize_for_json(self._build_ad_timeline(ads)),
                
                # Derived Insights
                'trends': self._serialize_for_json(self._analyze_trends(competitor_id, start_date, end_date)),
                'recommendations': self._serialize_for_json(self._generate_recommendations(ads, platform_counts)),
                'risk_score': self._calculate_risk_score(total_ads, active_ads, platform_counts),
                'opportunity_score': self._calculate_opportunity_score(total_ads, platform_counts)
            }
            
            if existing_metrics:
                # Update existing metrics
                logger.info(f"Updating existing metrics for {competitor.name}")
                for key, value in metric_data.items():
                    setattr(existing_metrics, key, value)
                metrics = existing_metrics
            else:
                # Create new metrics object
                logger.info(f"Creating new metrics for {competitor.name}")
                metrics = SurvMetrics(
                    competitor_id=competitor_id,
                    time_period=time_period,
                    start_date=start_date,
                    end_date=end_date,
                    **metric_data
                )
                self.db.add(metrics)
            
            self.db.commit()
            self.db.refresh(metrics)
            
            logger.info(f"Successfully calculated metrics for competitor {competitor.name}")
            return metrics
            
        except Exception as e:
            logger.error(f"Error calculating metrics for competitor {competitor_id}: {str(e)}", exc_info=True)
            self.db.rollback()
            raise
    
    def _serialize_for_json(self, data):
        """Convert data to JSON-serializable format"""
        if data is None:
            return None
        elif isinstance(data, (dict, list)):
            try:
                # Use custom JSON encoder for Decimal and other types
                class CustomJSONEncoder(json.JSONEncoder):
                    def default(self, obj):
                        if isinstance(obj, Decimal):
                            return float(str(obj))
                        elif isinstance(obj, (date, datetime)):
                            return obj.isoformat()
                        elif isinstance(obj, uuid.UUID):
                            return str(obj)
                        elif hasattr(obj, '__dict__'):
                            return obj.__dict__
                        return super().default(obj)
                
                # Convert to JSON string and back to ensure it's serializable
                json_str = json.dumps(data, cls=CustomJSONEncoder)
                return json.loads(json_str)
            except Exception as e:
                logger.warning(f"JSON serialization error: {e}, data: {str(data)[:100]}")
                # Return a safe fallback
                if isinstance(data, dict):
                    return {"error": "serialization_failed", "original_type": "dict"}
                elif isinstance(data, list):
                    return ["serialization_failed"]
                return None
        elif isinstance(data, Decimal):
            return float(str(data))
        elif isinstance(data, (date, datetime)):
            return data.isoformat()
        elif isinstance(data, uuid.UUID):
            return str(data)
        else:
            return data
    
    def _get_date_range(self, time_period: str):
        """Get date range based on time period"""
        today = date.today()
        
        if time_period == "daily":
            return today, today
        elif time_period == "weekly":
            start = today - timedelta(days=today.weekday())
            end = start + timedelta(days=6)
            return start, end
        elif time_period == "monthly":
            start = date(today.year, today.month, 1)
            if today.month == 12:
                end = date(today.year + 1, 1, 1) - timedelta(days=1)
            else:
                end = date(today.year, today.month + 1, 1) - timedelta(days=1)
            return start, end
        elif time_period == "quarterly":
            quarter = (today.month - 1) // 3
            start_month = quarter * 3 + 1
            start = date(today.year, start_month, 1)
            end_month = start_month + 2
            if end_month > 12:
                end = date(today.year + 1, 1, 1) - timedelta(days=1)
            else:
                end = date(today.year, end_month + 1, 1) - timedelta(days=1)
            return start, end
        else:  # all_time
            # Get earliest ad date for this competitor
            earliest = self.db.query(func.min(Ad.first_seen)).filter(
                Ad.competitor_id == competitor_id
            ).scalar()
            if earliest:
                return earliest.date(), today
            return today - timedelta(days=365), today
    
    def _estimate_spend(self, ads: List[Ad]) -> Decimal:
        """Estimate monthly spend"""
        total = Decimal('0')
        
        for ad in ads:
            # Try to get impressions
            impressions = self._extract_impressions(ad.impressions)
            
            # Platform CPM rates
            cpm_rates = {
                'google': Decimal('2.50'),
                'meta': Decimal('5.00'),
                'facebook': Decimal('5.00'),
                'linkedin': Decimal('8.00'),
                'reddit': Decimal('1.50'),
                'youtube': Decimal('3.50'),
                'instagram': Decimal('4.50'),
                'tiktok': Decimal('3.00')
            }
            
            platform = (ad.platform or 'unknown').lower()
            cpm = cpm_rates.get(platform, Decimal('3.00'))
            
            # Estimate impressions if not available
            if impressions == Decimal('1000'):  # Default value
                # Rough estimation based on platform
                platform_impressions = {
                    'google': Decimal('50000'),
                    'meta': Decimal('30000'),
                    'facebook': Decimal('30000'),
                    'linkedin': Decimal('15000'),
                    'youtube': Decimal('25000'),
                    'instagram': Decimal('20000'),
                    'tiktok': Decimal('35000'),
                    'reddit': Decimal('10000')
                }
                impressions = platform_impressions.get(platform, Decimal('20000'))
            
            monthly_spend = (impressions / Decimal('1000')) * cpm
            total += monthly_spend
        
        return Decimal(str(round(total, 2)))
    
    def _extract_impressions(self, impressions_val):
        """Extract numeric impressions from string or int"""
        if not impressions_val:
            return Decimal('1000')
        
        try:
            if isinstance(impressions_val, (int, float)):
                return Decimal(str(impressions_val))
            elif isinstance(impressions_val, str):
                # Handle "1.5K", "2.3M", etc.
                if 'k' in impressions_val.lower():
                    num = float(re.findall(r'[\d\.]+', impressions_val)[0])
                    return Decimal(str(num * 1000))
                elif 'm' in impressions_val.lower():
                    num = float(re.findall(r'[\d\.]+', impressions_val)[0])
                    return Decimal(str(num * 1000000))
                else:
                    numbers = re.findall(r'\d+', impressions_val)
                    if numbers:
                        return Decimal(numbers[-1])
        except Exception as e:
            logger.debug(f"Error extracting impressions from {impressions_val}: {str(e)}")
        
        return Decimal('1000')
    
    def _estimate_ctr(self, ads: List[Ad]) -> Decimal:
        """Estimate CTR"""
        if not ads:
            return Decimal('0.02')
        
        platform_ctr = {
            'google': Decimal('0.04'),
            'meta': Decimal('0.02'),
            'facebook': Decimal('0.02'),
            'linkedin': Decimal('0.03'),
            'reddit': Decimal('0.01'),
            'youtube': Decimal('0.005'),
            'instagram': Decimal('0.015'),
            'tiktok': Decimal('0.008')
        }
        
        total_ctr = Decimal('0')
        count = Decimal('0')
        
        for ad in ads:
            platform = (ad.platform or 'unknown').lower()
            base_ctr = platform_ctr.get(platform, Decimal('0.02'))
            total_ctr += base_ctr
            count += Decimal('1')
        
        return total_ctr / count if count > 0 else Decimal('0.02')
    
    def _calculate_estimated_daily_spend(self, ads: List[Ad]) -> Decimal:
        monthly = self._estimate_spend(ads)
        return monthly / Decimal('30') if monthly else Decimal('0')
    
    def _calculate_estimated_weekly_spend(self, ads: List[Ad]) -> Decimal:
        monthly = self._estimate_spend(ads)
        return monthly / Decimal('4.33') if monthly else Decimal('0')
    
    def _calculate_total_spend(self, ads: List[Ad]) -> Decimal:
        """Calculate total actual spend if available"""
        total = Decimal('0')
        for ad in ads:
            if ad.spend:
                try:
                    total += Decimal(str(ad.spend))
                except:
                    pass
        return total
    
    def _calculate_avg_cpm(self, ads: List[Ad]) -> Optional[Decimal]:
        """Calculate average CPM"""
        if not ads:
            return None
        
        # Platform average CPM
        platform_cpm = {
            'google': Decimal('2.50'),
            'meta': Decimal('5.00'),
            'facebook': Decimal('5.00'),
            'linkedin': Decimal('8.00'),
            'reddit': Decimal('1.50'),
            'youtube': Decimal('3.50'),
            'instagram': Decimal('4.50'),
            'tiktok': Decimal('3.00')
        }
        
        # Weighted average by platform
        platform_counts = Counter((ad.platform or 'unknown').lower() for ad in ads if ad.platform)
        total_cpm = Decimal('0')
        total_count = Decimal('0')
        
        for platform, count in platform_counts.items():
            cpm = platform_cpm.get(platform, Decimal('3.00'))
            total_cpm += cpm * Decimal(str(count))
            total_count += Decimal(str(count))
        
        return total_cpm / total_count if total_count > 0 else Decimal('3.00')
    
    def _estimate_cpc(self, ads: List[Ad]) -> Decimal:
        """Estimate CPC"""
        platform_cpc = {
            'google': Decimal('2.50'),
            'meta': Decimal('1.20'),
            'facebook': Decimal('1.20'),
            'linkedin': Decimal('5.00'),
            'reddit': Decimal('0.80'),
            'youtube': Decimal('0.30'),
            'instagram': Decimal('0.90'),
            'tiktok': Decimal('0.50')
        }
        
        if not ads:
            return Decimal('2.00')
        
        total_cpc = Decimal('0')
        for ad in ads:
            platform = (ad.platform or 'unknown').lower()
            cpc = platform_cpc.get(platform, Decimal('2.00'))
            total_cpc += cpc
        
        return total_cpc / Decimal(str(len(ads)))
    
    def _estimate_frequency(self, ads: List[Ad]) -> Decimal:
        """Estimate frequency"""
        if not ads:
            return Decimal('1.0')
        
        # Estimate based on platform mix
        platform_freq = {
            'google': Decimal('1.2'),
            'meta': Decimal('2.5'),
            'facebook': Decimal('2.5'),
            'linkedin': Decimal('1.8'),
            'youtube': Decimal('1.5'),
            'instagram': Decimal('2.0'),
            'tiktok': Decimal('3.0'),
            'reddit': Decimal('1.3')
        }
        
        total_freq = Decimal('0')
        for ad in ads:
            platform = (ad.platform or 'unknown').lower()
            freq = platform_freq.get(platform, Decimal('1.5'))
            total_freq += freq
        
        avg_freq = total_freq / Decimal(str(len(ads)))
        
        # Cap at reasonable values
        return min(avg_freq, Decimal('5.0'))
    
    def _estimate_conversion_probability(self, ads: List[Ad]) -> Decimal:
        """Estimate conversion probability"""
        if not ads:
            return Decimal('0.05')
        
        platform_conv = {
            'google': Decimal('0.08'),  # Search ads have higher intent
            'meta': Decimal('0.03'),
            'facebook': Decimal('0.03'),
            'linkedin': Decimal('0.06'),  # B2B
            'reddit': Decimal('0.02'),
            'youtube': Decimal('0.01'),
            'instagram': Decimal('0.025'),
            'tiktok': Decimal('0.015')
        }
        
        total_prob = Decimal('0')
        for ad in ads:
            platform = (ad.platform or 'unknown').lower()
            prob = platform_conv.get(platform, Decimal('0.05'))
            total_prob += prob
        
        avg_prob = total_prob / Decimal(str(len(ads)))
        
        # Adjust based on number of ads (more ads might indicate stronger marketing)
        if len(ads) > 20:
            avg_prob *= Decimal('1.2')
        elif len(ads) < 5:
            avg_prob *= Decimal('0.8')
        
        return min(avg_prob, Decimal('0.20'))  # Cap at 20%
    
    def _analyze_creatives(self, ads: List[Ad]) -> Dict[str, Any]:
        """Analyze creative elements"""
        analysis = {
            'total_analyzed': len(ads),
            'with_images': sum(1 for ad in ads if ad.image_url),
            'with_videos': sum(1 for ad in ads if ad.video_url),
            'avg_headline_length': 0,
            'common_ctas': [],
            'creative_variety': 0
        }
        
        if not ads:
            return analysis
        
        # Analyze headlines
        headlines = [ad.headline for ad in ads if ad.headline]
        if headlines:
            analysis['avg_headline_length'] = sum(len(h) for h in headlines) // len(headlines)
        
        # Simple CTA detection
        cta_keywords = ['buy', 'shop', 'learn', 'sign', 'get', 'try', 'download', 'subscribe', 'register']
        cta_counts = Counter()
        
        for ad in ads:
            if ad.headline:
                headline_lower = ad.headline.lower()
                for keyword in cta_keywords:
                    if keyword in headline_lower:
                        cta_counts[keyword] += 1
        
        # Get top 3 CTAs
        analysis['common_ctas'] = [{"cta": cta, "count": count} for cta, count in cta_counts.most_common(3)]
        
        # Calculate creative variety (unique combinations of platforms and creative types)
        creative_types = set()
        for ad in ads:
            creative_type = f"{ad.platform or 'unknown'}_{'video' if ad.video_url else 'image' if ad.image_url else 'text'}"
            creative_types.add(creative_type)
        
        analysis['creative_variety'] = len(creative_types)
        
        return analysis
    
    def _identify_top_creatives(self, ads: List[Ad]) -> List[Dict[str, Any]]:
        """Identify top creatives"""
        top_creatives = []
        
        # Simple heuristic: prioritize ads with both image and video, then image-only, then text-only
        scored_ads = []
        for ad in ads:
            score = 0
            if ad.video_url:
                score += 3
            if ad.image_url:
                score += 2
            if ad.headline and len(ad.headline) > 10:
                score += 1
            
            scored_ads.append((score, ad))
        
        # Sort by score and take top 5
        scored_ads.sort(key=lambda x: x[0], reverse=True)
        
        for score, ad in scored_ads[:5]:
            if ad.headline or ad.image_url or ad.video_url:
                top_creatives.append({
                    'id': str(ad.id),
                    'headline': ad.headline,
                    'has_image': bool(ad.image_url),
                    'has_video': bool(ad.video_url),
                    'platform': ad.platform,
                    'score': score
                })
        
        return top_creatives
    
    def _detect_funnel_stages(self, ads: List[Ad]) -> Dict[str, float]:
        """Detect funnel stages based on ad content"""
        if not ads:
            return {
                "awareness": 0.4,
                "consideration": 0.3,
                "conversion": 0.2,
                "retention": 0.1
            }
        
        # Keywords for each funnel stage
        awareness_keywords = ['new', 'introducing', 'discover', 'learn about', 'what is', 'guide']
        consideration_keywords = ['compare', 'vs', 'review', 'best', 'how to', 'tips', 'benefits']
        conversion_keywords = ['buy', 'shop', 'order', 'get started', 'sign up', 'subscribe', 'download']
        retention_keywords = ['thank you', 'exclusive', 'member', 'loyalty', 'upgrade', 'premium']
        
        stage_counts = {
            "awareness": 0,
            "consideration": 0,
            "conversion": 0,
            "retention": 0
        }
        
        for ad in ads:
            if not ad.headline:
                continue
                
            headline_lower = ad.headline.lower()
            stage_scores = {
                "awareness": sum(1 for kw in awareness_keywords if kw in headline_lower),
                "consideration": sum(1 for kw in consideration_keywords if kw in headline_lower),
                "conversion": sum(1 for kw in conversion_keywords if kw in headline_lower),
                "retention": sum(1 for kw in retention_keywords if kw in headline_lower)
            }
            
            # Assign to stage with highest score
            max_stage = max(stage_scores, key=stage_scores.get)
            if stage_scores[max_stage] > 0:
                stage_counts[max_stage] += 1
        
        # Calculate percentages
        total_scored = sum(stage_counts.values())
        if total_scored > 0:
            return {stage: round(count / total_scored, 2) for stage, count in stage_counts.items()}
        else:
            return {
                "awareness": 0.4,
                "consideration": 0.3,
                "conversion": 0.2,
                "retention": 0.1
            }
    
    def _infer_audience_clusters(self, ads: List[Ad], competitor) -> List[Dict[str, Any]]:
        """Infer audience clusters"""
        clusters = [
            {"name": "General Audience", "confidence": 0.3, "size": "large"},
        ]
        
        # Add based on industry if available
        if competitor.industry:
            industry_lower = competitor.industry.lower()
            if 'b2b' in industry_lower or 'enterprise' in industry_lower or 'business' in industry_lower:
                clusters.append({"name": "Business Professionals", "confidence": 0.7, "size": "medium"})
            elif 'tech' in industry_lower or 'software' in industry_lower or 'saas' in industry_lower:
                clusters.append({"name": "Tech Enthusiasts", "confidence": 0.8, "size": "medium"})
                clusters.append({"name": "Developers", "confidence": 0.6, "size": "small"})
            elif 'fashion' in industry_lower or 'apparel' in industry_lower:
                clusters.append({"name": "Fashion-forward Consumers", "confidence": 0.9, "size": "large"})
                clusters.append({"name": "Luxury Shoppers", "confidence": 0.4, "size": "small"})
            elif 'sports' in industry_lower or 'fitness' in industry_lower:
                clusters.append({"name": "Fitness Enthusiasts", "confidence": 0.8, "size": "medium"})
                clusters.append({"name": "Athletes", "confidence": 0.5, "size": "small"})
            elif 'food' in industry_lower or 'restaurant' in industry_lower:
                clusters.append({"name": "Foodies", "confidence": 0.9, "size": "large"})
            elif 'travel' in industry_lower or 'hotel' in industry_lower:
                clusters.append({"name": "Travelers", "confidence": 0.8, "size": "medium"})
                clusters.append({"name": "Luxury Travelers", "confidence": 0.4, "size": "small"})
        
        # Adjust based on ad platforms
        platform_set = set((ad.platform or '').lower() for ad in ads)
        
        if 'linkedin' in platform_set:
            clusters.append({"name": "Corporate Decision Makers", "confidence": 0.6, "size": "small"})
        
        if 'tiktok' in platform_set or 'instagram' in platform_set:
            clusters.append({"name": "Gen Z/Millennials", "confidence": 0.8, "size": "large"})
        
        if 'reddit' in platform_set:
            clusters.append({"name": "Niche Community Members", "confidence": 0.7, "size": "small"})
        
        # Limit to 5 clusters maximum
        return clusters[:5]
    
    def _estimate_geo_penetration(self) -> Dict[str, float]:
        """Estimate geographic penetration"""
        return {
            "US": 0.5,
            "UK": 0.15,
            "CA": 0.1,
            "AU": 0.05,
            "DE": 0.05,
            "FR": 0.04,
            "JP": 0.03,
            "IN": 0.03,
            "Other": 0.15
        }
    
    def _estimate_device_distribution(self, ads: List[Ad]) -> Dict[str, float]:
        """Estimate device distribution based on platforms"""
        if not ads:
            return {
                "mobile": 0.6,
                "desktop": 0.3,
                "tablet": 0.1
            }
        
        # Platform-specific device preferences
        platform_device_pref = {
            'instagram': {'mobile': 0.95, 'desktop': 0.04, 'tablet': 0.01},
            'tiktok': {'mobile': 0.98, 'desktop': 0.01, 'tablet': 0.01},
            'facebook': {'mobile': 0.80, 'desktop': 0.15, 'tablet': 0.05},
            'meta': {'mobile': 0.80, 'desktop': 0.15, 'tablet': 0.05},
            'linkedin': {'mobile': 0.60, 'desktop': 0.35, 'tablet': 0.05},
            'google': {'mobile': 0.65, 'desktop': 0.30, 'tablet': 0.05},
            'youtube': {'mobile': 0.70, 'desktop': 0.25, 'tablet': 0.05},
            'reddit': {'mobile': 0.55, 'desktop': 0.40, 'tablet': 0.05}
        }
        
        device_totals = {'mobile': 0, 'desktop': 0, 'tablet': 0}
        
        for ad in ads:
            platform = (ad.platform or 'google').lower()
            pref = platform_device_pref.get(platform, {'mobile': 0.6, 'desktop': 0.3, 'tablet': 0.1})
            
            for device, weight in pref.items():
                device_totals[device] += weight
        
        # Normalize
        total = sum(device_totals.values())
        if total > 0:
            return {device: round(weight / total, 2) for device, weight in device_totals.items()}
        else:
            return {
                "mobile": 0.6,
                "desktop": 0.3,
                "tablet": 0.1
            }
    
    def _estimate_time_heatmap(self) -> Dict[str, float]:
        """Estimate time-of-day heatmap"""
        heatmap = {}
        
        # Business hours peak
        for hour in range(24):
            hour_str = f"{hour:02d}:00"
            
            if 8 <= hour <= 10:  # Morning
                heatmap[hour_str] = 0.10
            elif 11 <= hour <= 13:  # Lunch
                heatmap[hour_str] = 0.08
            elif 14 <= hour <= 16:  # Afternoon peak
                heatmap[hour_str] = 0.15
            elif 17 <= hour <= 19:  # Evening
                heatmap[hour_str] = 0.12
            elif 20 <= hour <= 22:  # Night
                heatmap[hour_str] = 0.09
            else:  # Late night/early morning
                heatmap[hour_str] = 0.03
        
        # Normalize
        total = sum(heatmap.values())
        return {k: round(v/total, 3) for k, v in heatmap.items()}
    
    def _build_ad_timeline(self, ads: List[Ad]) -> List[Dict[str, Any]]:
        """Build ad timeline"""
        timeline = []
        
        # Sort ads by first_seen
        sorted_ads = sorted(ads, key=lambda x: x.first_seen or datetime.min)
        
        for ad in sorted_ads[:20]:  # Limit to 20
            headline_preview = None
            if ad.headline:
                headline_preview = ad.headline[:50] + '...' if len(ad.headline) > 50 else ad.headline
            
            timeline.append({
                'date': ad.first_seen.isoformat() if ad.first_seen else None,
                'action': 'ad_detected',
                'platform': ad.platform,
                'headline_preview': headline_preview,
                'has_creative': bool(ad.image_url or ad.video_url)
            })
        
        return timeline
    
    def _analyze_trends(self, competitor_id: uuid.UUID, start_date: date, end_date: date) -> Dict[str, Any]:
        """Analyze trends by comparing with previous period"""
        try:
            # Get previous period's metrics for comparison
            period_days = (end_date - start_date).days + 1
            prev_start = start_date - timedelta(days=period_days)
            prev_end = start_date - timedelta(days=1)
            
            prev_metrics = self.db.query(SurvMetrics).filter(
                SurvMetrics.competitor_id == competitor_id,
                SurvMetrics.start_date >= prev_start,
                SurvMetrics.end_date <= prev_end
            ).order_by(SurvMetrics.calculated_at.desc()).first()
            
            if not prev_metrics:
                return {
                    'status': 'no_previous_data',
                    'message': 'No previous period data available for comparison',
                    'trend': 'neutral'
                }
            
            # Get current ads count for this period
            current_ads = self.db.query(Ad).filter(
                Ad.competitor_id == competitor_id,
                Ad.first_seen >= start_date,
                Ad.first_seen <= end_date
            ).count()
            
            prev_ads = prev_metrics.total_ads or 0
            
            # Calculate trend
            if prev_ads == 0:
                trend = 'growing' if current_ads > 0 else 'stable'
                change_pct = 100 if current_ads > 0 else 0
            else:
                change_pct = ((current_ads - prev_ads) / prev_ads) * 100
                if change_pct > 20:
                    trend = 'growing'
                elif change_pct < -20:
                    trend = 'declining'
                else:
                    trend = 'stable'
            
            return {
                'status': 'data_available',
                'message': f'Ad volume changed by {change_pct:.1f}% compared to previous period',
                'trend': trend,
                'change_percentage': round(change_pct, 1),
                'current_ads': current_ads,
                'previous_ads': prev_ads
            }
            
        except Exception as e:
            logger.debug(f"Error analyzing trends: {str(e)}")
            return {
                'status': 'insufficient_data',
                'message': 'Need more data points for trend analysis',
                'trend': 'unknown'
            }
    
    def _generate_recommendations(self, ads: List[Ad], platform_counts: Dict) -> List[str]:
        """Generate recommendations based on ad analysis"""
        recommendations = []
        
        if not ads:
            recommendations.append("Start tracking ads for this competitor to gather data")
            return recommendations
        
        # Platform diversity recommendations
        if len(platform_counts) < 2:
            missing_platforms = []
            if 'google' not in platform_counts:
                missing_platforms.append("Google Search")
            if 'meta' not in platform_counts and 'facebook' not in platform_counts:
                missing_platforms.append("Facebook/Meta")
            if 'linkedin' not in platform_counts:
                missing_platforms.append("LinkedIn")
            
            if missing_platforms:
                recommendations.append(f"Consider monitoring competitor's presence on: {', '.join(missing_platforms)}")
        
        # Creative recommendations
        image_count = sum(1 for ad in ads if ad.image_url)
        video_count = sum(1 for ad in ads if ad.video_url)
        
        if video_count == 0 and image_count > 5:
            recommendations.append("Competitor uses mostly static images - video ads could be an opportunity")
        
        if image_count + video_count < len(ads) * 0.3:  # Less than 30% have creatives
            recommendations.append("Limited creative content observed - monitor for new creative launches")
        
        # Volume recommendations
        if len(ads) < 10:
            recommendations.append("Limited ad data available - continue monitoring for more insights")
        elif len(ads) > 100:
            recommendations.append("High ad volume indicates aggressive marketing - track closely for strategy changes")
        
        # Platform-specific recommendations
        if 'tiktok' in platform_counts or 'instagram' in platform_counts:
            recommendations.append("Active on social platforms - focus on visual and short-form content")
        
        if 'linkedin' in platform_counts:
            recommendations.append("B2B presence detected - monitor for whitepapers, case studies, and thought leadership")
        
        return recommendations[:5]
    
    def _calculate_risk_score(self, total_ads: int, active_ads: int, platform_counts: Dict) -> int:
        """Calculate risk score (higher = more risky/competitive)"""
        score = 50  # Base score
        
        # Volume risk
        if total_ads == 0:
            score -= 20  # Less risky if no ads
        elif total_ads < 5:
            score += 10
        elif total_ads > 50:
            score += 30
        elif total_ads > 20:
            score += 20
        
        # Platform diversity risk
        platform_risk = {
            'google': 25,
            'meta': 20,
            'facebook': 20,
            'linkedin': 15,
            'youtube': 15,
            'instagram': 10,
            'tiktok': 10,
            'reddit': 5
        }
        
        for platform, count in platform_counts.items():
            risk = platform_risk.get(platform.lower(), 5)
            score += min(risk * (count / 10), risk)  # Scale by count
        
        # Active ads risk
        if total_ads > 0:
            active_ratio = active_ads / total_ads
            if active_ratio > 0.8:
                score += 15  # High activity = more competitive
            elif active_ratio < 0.3:
                score -= 10  # Low activity = less competitive
        
        # Cap score between 0 and 100
        return max(0, min(100, score))
    
    def _calculate_opportunity_score(self, total_ads: int, platform_counts: Dict) -> int:
        """Calculate opportunity score (higher = more opportunities)"""
        score = 30  # Base score
        
        # Volume opportunity
        score += min(total_ads * 2, 40)  # More ads = more data = more opportunities
        
        # Platform opportunity
        platform_opp = {
            'google': 25,
            'meta': 20,
            'facebook': 20,
            'linkedin': 30,  # LinkedIn often has higher-value opportunities
            'youtube': 15,
            'instagram': 20,
            'tiktok': 25,    # TikTok is emerging with opportunities
            'reddit': 10
        }
        
        for platform, count in platform_counts.items():
            opp = platform_opp.get(platform.lower(), 10)
            score += min(opp * (count / 5), opp)  # Scale by count but with diminishing returns
        
        # Platform diversity bonus
        unique_platforms = len(platform_counts)
        if unique_platforms >= 3:
            score += 15
        elif unique_platforms == 2:
            score += 10
        
        # Specific platform combinations
        if 'linkedin' in platform_counts and ('google' in platform_counts or 'meta' in platform_counts):
            score += 10  # B2B + broad reach
        
        if ('tiktok' in platform_counts or 'instagram' in platform_counts) and total_ads > 10:
            score += 15  # Strong social media presence
        
        # Cap score between 0 and 100
        return max(0, min(100, score))