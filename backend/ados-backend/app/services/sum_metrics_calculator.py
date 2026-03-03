import logging
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from uuid import UUID

from app.models import Competitor, SurvMetrics, SumMetrics, Ad
from app.utils.logger import get_logger

logger = get_logger(__name__)

class SumMetricsCalculator:
    """Simple calculator for summary metrics"""
    
    DEFAULT_CPM = 10.0  # Default CPM for impression estimation
    
    def __init__(self, db: Session):
        self.db = db
    
    def calculate_for_user(self, user_id: UUID, time_period: str = "monthly",
                         competitor_ids: Optional[List[UUID]] = None,
                         force_recalculate: bool = False) -> Optional[SumMetrics]:
        """Calculate simple summary metrics for a user's competitors"""
        try:
            # Determine date range based on time_period
            start_date, end_date = self._get_date_range(time_period)
            
            # Check if recent calculation exists (within 6 hours)
            if not force_recalculate:
                existing = self.db.query(SumMetrics).filter(
                    SumMetrics.user_id == user_id,
                    SumMetrics.time_period == time_period,
                    SumMetrics.is_active == True,
                    SumMetrics.calculated_at >= datetime.utcnow() - timedelta(hours=6)
                ).first()
                
                if existing:
                    logger.info(f"Using cached summary metrics for user {user_id}, period {time_period}")
                    return existing
            
            # Get ALL user's competitors
            query = self.db.query(Competitor).filter(
                Competitor.user_id == user_id,
                Competitor.is_active == True
            )
            
            if competitor_ids:
                query = query.filter(Competitor.id.in_(competitor_ids))
            
            competitors = query.all()
            
            if not competitors:
                logger.warning(f"No active competitors found for user {user_id}")
                return self._create_empty_sum_metrics(user_id, time_period)
            
            # Calculate simple metrics
            total_spend = 0.0
            total_active_campaigns = 0
            total_weighted_ctr = 0.0
            total_weight = 0.0
            total_impressions = 0
            
            ctr_values = []
            total_competitors = len(competitors)
            
            for competitor in competitors:
                # Get latest metrics for this competitor
                metrics = self._get_latest_metrics(competitor.id, time_period)
                
                # Get monthly spend - first try from metrics, then from competitor
                monthly_spend = 0.0
                if metrics and metrics.estimated_monthly_spend:
                    monthly_spend = float(metrics.estimated_monthly_spend)
                elif competitor.estimated_monthly_spend:
                    monthly_spend = float(competitor.estimated_monthly_spend)
                
                total_spend += monthly_spend
                
                # Get active campaigns - count from ads table directly
                active_ads = self._count_active_ads(competitor.id)
                total_active_campaigns += active_ads
                
                if metrics:
                    # Get CTR from metrics
                    ctr = float(metrics.avg_ctr) if metrics.avg_ctr else 0.0
                    ctr_values.append(ctr)
                    
                    # Weight CTR by spend for average calculation
                    weight = monthly_spend if monthly_spend > 0 else 1
                    total_weighted_ctr += ctr * weight
                    total_weight += weight
                    
                    # Estimate impressions
                    impressions = self._estimate_impressions(metrics, monthly_spend)
                    total_impressions += impressions
            
            logger.info(f"Processing {total_competitors} competitors for user {user_id}")
            logger.info(f"Total spend: ${total_spend:,.0f}, Active ads: {total_active_campaigns}")
            
            # Calculate weighted average CTR
            avg_ctr = 0.0
            if total_weight > 0:
                avg_ctr = total_weighted_ctr / total_weight
            elif ctr_values:
                avg_ctr = sum(ctr_values) / len(ctr_values)
            
            # Log CTR calculation
            logger.info(f"CTR calculation: weighted_ctr={total_weighted_ctr}, weight={total_weight}, avg_ctr={avg_ctr}")
            
            # Create or update SumMetrics record
            sum_metrics = self.db.query(SumMetrics).filter(
                SumMetrics.user_id == user_id,
                SumMetrics.time_period == time_period
            ).first()
            
            if not sum_metrics:
                sum_metrics = SumMetrics(
                    user_id=user_id,
                    time_period=time_period,
                    start_date=start_date,
                    end_date=end_date,
                    total_competitors=total_competitors,
                    total_competitor_spend=total_spend,
                    active_campaigns=total_active_campaigns,
                    total_impressions=total_impressions,
                    avg_ctr=avg_ctr,
                    is_active=True
                )
                self.db.add(sum_metrics)
            else:
                # Update existing record
                sum_metrics.total_competitors = total_competitors
                sum_metrics.total_competitor_spend = total_spend
                sum_metrics.active_campaigns = total_active_campaigns
                sum_metrics.total_impressions = total_impressions
                sum_metrics.avg_ctr = avg_ctr
                sum_metrics.is_active = True
            
            self.db.commit()
            self.db.refresh(sum_metrics)
            
            logger.info(f"✅ Calculated summary metrics for user {user_id}: "
                       f"${total_spend:,.0f} total spend, {total_active_campaigns} active campaigns, "
                       f"{total_competitors} competitors, {avg_ctr:.2%} avg CTR")
            
            return sum_metrics
            
        except Exception as e:
            logger.error(f"❌ Error calculating summary metrics for user {user_id}: {e}", exc_info=True)
            self.db.rollback()
            return None
    
    def _get_date_range(self, time_period: str):
        """Get date range based on time period"""
        now = datetime.utcnow()
        
        if time_period == "daily":
            start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
            end_date = now
        elif time_period == "weekly":
            start_date = now - timedelta(days=7)
            end_date = now
        elif time_period == "monthly":
            start_date = now - timedelta(days=30)
            end_date = now
        elif time_period == "all_time":
            start_date = None
            end_date = now
        else:
            start_date = now - timedelta(days=30)  # Default to monthly
            end_date = now
        
        return start_date, end_date
    
    def _get_latest_metrics(self, competitor_id: UUID, time_period: str) -> Optional[SurvMetrics]:
        """Get latest metrics for a competitor"""
        try:
            metrics = self.db.query(SurvMetrics).filter(
                SurvMetrics.competitor_id == competitor_id,
                SurvMetrics.time_period == time_period
            ).order_by(SurvMetrics.calculated_at.desc()).first()
            
            return metrics
            
        except Exception as e:
            logger.warning(f"Error getting metrics for competitor {competitor_id}: {e}")
            return None
    
    def _count_active_ads(self, competitor_id: UUID) -> int:
        """Count active ads for a competitor directly from ads table"""
        try:
            count = self.db.query(func.count(Ad.id)).filter(
                Ad.competitor_id == competitor_id,
                Ad.is_active == True
            ).scalar()
            
            return count or 0
            
        except Exception as e:
            logger.warning(f"Error counting active ads for competitor {competitor_id}: {e}")
            return 0
    
    def _estimate_impressions(self, metrics: SurvMetrics, monthly_spend: float) -> int:
        """Estimate impressions from spend and CPM"""
        if monthly_spend <= 0:
            return 0
            
        # Use avg_cpm from metrics if available
        if metrics.avg_cpm and float(metrics.avg_cpm) > 0:
            cpm = float(metrics.avg_cpm)
            impressions = int((monthly_spend / cpm) * 1000)
        else:
            # Use default CPM
            impressions = int((monthly_spend / self.DEFAULT_CPM) * 1000)
            
        return impressions
    
    def _create_empty_sum_metrics(self, user_id: UUID, time_period: str) -> SumMetrics:
        """Create empty summary metrics when no data is available"""
        try:
            sum_metrics = SumMetrics(
                user_id=user_id,
                time_period=time_period,
                total_competitors=0,
                total_competitor_spend=0.0,
                active_campaigns=0,
                total_impressions=0,
                avg_ctr=0.0,
                is_active=True
            )
            
            self.db.add(sum_metrics)
            self.db.commit()
            self.db.refresh(sum_metrics)
            
            logger.info(f"Created empty summary metrics for user {user_id}")
            return sum_metrics
            
        except Exception as e:
            logger.error(f"Error creating empty summary metrics: {e}")
            raise
    
    def get_summary_dashboard(self, user_id: UUID) -> Dict:
        """Get simple dashboard view"""
        try:
            # Get current monthly summary
            current_summary = self.calculate_for_user(user_id, time_period="monthly")
            
            if not current_summary:
                return {
                    "success": False,
                    "message": "No summary data available"
                }
            
            # Get platform distribution from ads
            platforms = self._get_platform_distribution(user_id)
            
            # Get top competitors by spend
            top_competitors = self._get_top_competitors(user_id, limit=5)
            
            # Get previous summary for comparison
            prev_summary = self.db.query(SumMetrics).filter(
                SumMetrics.user_id == user_id,
                SumMetrics.time_period == "monthly",
                SumMetrics.is_active == True,
                SumMetrics.id != current_summary.id
            ).order_by(SumMetrics.calculated_at.desc()).first()
            
            # Calculate spend change
            spend_change = 0.0
            if prev_summary and prev_summary.total_competitor_spend > 0:
                spend_change = ((current_summary.total_competitor_spend - prev_summary.total_competitor_spend) / 
                              prev_summary.total_competitor_spend) * 100
            
            dashboard = {
                "total_competitor_spend": current_summary.total_competitor_spend,
                "active_campaigns": current_summary.active_campaigns,
                "total_impressions": current_summary.total_impressions or 0,
                "avg_ctr": current_summary.avg_ctr,
                "total_competitors": current_summary.total_competitors,
                "spend_change_percentage": round(spend_change, 1) if spend_change else 0.0,
                "platform_distribution": platforms,
                "top_competitors": top_competitors
            }
            
            return {
                "success": True,
                "dashboard": dashboard
            }
            
        except Exception as e:
            logger.error(f"Error getting summary dashboard for user {user_id}: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def _get_platform_distribution(self, user_id: UUID) -> Dict[str, float]:
        """Get platform distribution from ads"""
        try:
            # Get all competitors for this user
            competitors = self.db.query(Competitor).filter(
                Competitor.user_id == user_id,
                Competitor.is_active == True
            ).all()
            
            if not competitors:
                return {}
            
            platform_counts = {}
            total_ads = 0
            
            for competitor in competitors:
                # Count ads by platform for this competitor
                ads_by_platform = self.db.query(Ad.platform, func.count(Ad.id)).filter(
                    Ad.competitor_id == competitor.id,
                    Ad.is_active == True
                ).group_by(Ad.platform).all()
                
                for platform, count in ads_by_platform:
                    if platform not in platform_counts:
                        platform_counts[platform] = 0
                    platform_counts[platform] += count
                    total_ads += count
            
            # Convert to percentages
            platform_distribution = {}
            if total_ads > 0:
                for platform, count in platform_counts.items():
                    platform_distribution[platform] = (count / total_ads) * 100
            
            return platform_distribution
            
        except Exception as e:
            logger.warning(f"Error getting platform distribution: {e}")
            return {}
    
    def _get_top_competitors(self, user_id: UUID, limit: int = 5) -> List[Dict]:
        """Get top competitors by estimated monthly spend"""
        try:
            competitors = self.db.query(Competitor).filter(
                Competitor.user_id == user_id,
                Competitor.is_active == True
            ).order_by(Competitor.estimated_monthly_spend.desc()).limit(limit).all()
            
            top_competitors = []
            for competitor in competitors:
                # Get active ads count
                active_ads = self._count_active_ads(competitor.id)
                
                monthly_spend = float(competitor.estimated_monthly_spend) if competitor.estimated_monthly_spend else 0.0
                
                top_competitors.append({
                    "name": competitor.name,
                    "monthly_spend": monthly_spend,
                    "active_ads": active_ads,
                    "domain": competitor.domain
                })
            
            return top_competitors
            
        except Exception as e:
            logger.warning(f"Error getting top competitors: {e}")
            return []