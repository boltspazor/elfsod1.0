import React, { useState, useEffect } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  Eye,
  Filter,
  Search,
  Download,
  Wifi,
  Plus,
  X,
  AlertCircle,
  Calendar,
  Clock,
  Users,
  DollarSign,
  Globe,
  Sparkles,
  Lightbulb,
  Heart,
  Youtube,
  Facebook,
  Instagram,
  Linkedin,
  Loader2,
  ShoppingBag,
  Shirt,
  Utensils,
  Smartphone as SmartphoneIcon,
  Car,
  Home,
} from "lucide-react";

// Import Recharts components
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from "recharts";

// Import UPDATED API services with types
import {
  UsersAPI,
  CompetitorsAPI,
  AdsAPI,
  TrendingAPI,
  PlatformStats,
  TrendingAd as TrendingAdType,
  TrendingSearchResponse,
  parseSpendValue,
  parseImpressionValue,
} from "../services/adsurv";

interface UserInfo {
  user_id: string;
  email: string;
  name: string;
  business_type?: string;
  industry?: string;
  goals?: string;
}

interface Competitor {
  id: string;
  name: string;
  domain?: string;
  industry?: string;
  estimated_monthly_spend?: number;
  created_at: string;
  ads_count: number;
  last_fetched_at?: string;
  is_active: boolean;
  user_id: string;
  last_fetch_status: string;
}

interface AdData {
  id: string;
  competitor_id: string;
  competitor_name: string;
  platform: string;
  headline: string;
  description: string;
  full_text: string;
  destination_url: string;
  image_url: string;
  video_url: string;
  format: string;
  impressions: string | number;
  spend: number;
  is_active: boolean;
  first_seen: string;
  last_seen: string;
  platform_ad_id?: string;
  created_at?: string;
}

interface SummaryMetrics {
  total_competitor_spend: number;
  active_campaigns: number;
  total_impressions: number;
  avg_ctr: number;
  total_competitors: number;
  platform_distribution: Record<string, number>;
}

interface AnalyticsData {
  competitorSpend: any[];
  spendRanges: any[];
  ctrPerformance: any[];
  spendImpressions: any[];
  platformCTR: any[];
}

interface TrendingAdWithEngagement extends TrendingAdType {
  engagement_score: number;
  competitor_name?: string;
}

// NEW: Interface for competitor metrics summary (calculated in frontend)
interface CompetitorMetricsSummary {
  competitor_id: string;
  competitor_name: string;
  active_ads: number;
  estimated_monthly_spend: number;
  avg_ctr: number;
  risk_score: number;
  opportunity_score: number;
  last_calculated: string;
}

// Platform icon mapping
const platformIcons: Record<string, React.ReactNode> = {
  meta: <Facebook className="w-3.5 h-3.5" />,
  facebook: <Facebook className="w-3.5 h-3.5" />,
  instagram: <Instagram className="w-3.5 h-3.5" />,
  youtube: <Youtube className="w-3.5 h-3.5" />,
  linkedin: <Linkedin className="w-3.5 h-3.5" />,
  reddit: <Globe className="w-3.5 h-3.5" />, // Change Reddit to Globe,
  tiktok: <Instagram className="w-3.5 h-3.5" />, // Using Instagram icon as fallback
  google: <Globe className="w-3.5 h-3.5" />,
  twitter: <Globe className="w-3.5 h-3.5" />,
  pinterest: <Globe className="w-3.5 h-3.5" />,
};

// Search history suggestions
const searchSuggestions = [
  {
    id: 1,
    keyword: "Food ads",
    icon: <Utensils className="w-4 h-4" />,
    category: "Food & Beverage",
  },
  {
    id: 2,
    keyword: "Fashion ads",
    icon: <Shirt className="w-4 h-4" />,
    category: "Fashion",
  },
  {
    id: 3,
    keyword: "Shoes ads",
    icon: <ShoppingBag className="w-4 h-4" />,
    category: "Footwear",
  },
  {
    id: 4,
    keyword: "Tech gadgets",
    icon: <SmartphoneIcon className="w-4 h-4" />,
    category: "Technology",
  },
  {
    id: 5,
    keyword: "Car commercials",
    icon: <Car className="w-4 h-4" />,
    category: "Automotive",
  },
  {
    id: 6,
    keyword: "Home decor",
    icon: <Home className="w-4 h-4" />,
    category: "Home & Garden",
  },
  {
    id: 7,
    keyword: "Fitness products",
    icon: <TrendingUp className="w-4 h-4" />,
    category: "Health & Fitness",
  },
  {
    id: 8,
    keyword: "Beauty products",
    icon: <Sparkles className="w-4 h-4" />,
    category: "Beauty",
  },
  {
    id: 9,
    keyword: "Travel deals",
    icon: <Globe className="w-4 h-4" />,
    category: "Travel",
  },
  {
    id: 10,
    keyword: "E-commerce",
    icon: <ShoppingBag className="w-4 h-4" />,
    category: "Shopping",
  },
];

const AdSurveillance = () => {
  // User state
  const [_userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [_isAuthenticated, setIsAuthenticated] = useState(false);

  // Competitors state
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [selectedCompetitor, setSelectedCompetitor] = useState<string | null>(
    null,
  );
  const [showAddCompetitor, setShowAddCompetitor] = useState(false);
  const [newCompetitor, setNewCompetitor] = useState({
    name: "",
    domain: "",
    industry: "",
    estimated_monthly_spend: 0,
  });

  // Ads state
  const [ads, setAds] = useState<AdData[]>([]);
  const [filteredAds, setFilteredAds] = useState<AdData[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<string>("all");

  // Metrics state - UPDATED: Use frontend calculation
  const [summaryMetrics, setSummaryMetrics] = useState<SummaryMetrics | null>(
    null,
  );
  const [platformStats, setPlatformStats] = useState<PlatformStats[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<
    "daily" | "weekly" | "monthly" | "all_time"
  >("weekly");
  const [metricsSummary, setMetricsSummary] = useState<
    CompetitorMetricsSummary[]
  >([]);
  const [isCalculatingMetrics, setIsCalculatingMetrics] = useState(false);

  // View modes
  const [dataViewMode, setDataViewMode] = useState<"latest" | "historical">(
    "latest",
  );
  const [_expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    financial: true,
    performance: true,
    audience: true,
    strategic: true,
    platform: true,
    recommendations: true,
  });

  // Analytics state
  const [_analyticsData, _setAnalyticsData] = useState<AnalyticsData | null>(
    null,
  );
  const [_activeChart, _setActiveChart] = useState("overview");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Trending ads state
  const [trendingAds, setTrendingAds] = useState<TrendingAdWithEngagement[]>(
    [],
  );
  const [_isLoadingTrending, setIsLoadingTrending] = useState(false);
  const [_trendingSearchResult, setTrendingSearchResult] =
    useState<TrendingSearchResponse | null>(null);
  const [trendingSearchKeyword, setTrendingSearchKeyword] = useState("");
  const [selectedTrendingPlatforms, setSelectedTrendingPlatforms] = useState<
    string[]
  >(["meta", "instagram", "youtube"]);
  const [isSearchingTrending, setIsSearchingTrending] = useState(false);
  const [showTrendingSearch, setShowTrendingSearch] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  // Error state
  const [error, setError] = useState<string | null>(null);

  // ============================================
  // CALCULATION HELPER FUNCTIONS
  // ============================================

  // Helper function to calculate ad lifespan in days
  const calculateAdLifespan = (ad: AdData): number => {
    if (!ad.first_seen || !ad.last_seen) return 0;
    
    try {
      const firstSeen = new Date(ad.first_seen);
      const lastSeen = new Date(ad.last_seen);
      const lifespanDays = (lastSeen.getTime() - firstSeen.getTime()) / (1000 * 60 * 60 * 24);
      return Math.max(lifespanDays, 1);
    } catch (error) {
      console.error('Error calculating ad lifespan:', error);
      return 0;
    }
  };

  // Helper function to calculate ad spend based on lifespan and platform
  const calculateAdSpend = (ad: AdData): number => {
    // Try to parse actual spend first
    if (ad.spend) {
      const parsedSpend = parseSpendValue(ad.spend);
      if (parsedSpend > 0) {
        return parsedSpend;
      }
    }
    
    // Estimate based on lifespan if no spend data
    if (ad.first_seen && ad.last_seen) {
      const lifespanDays = calculateAdLifespan(ad);
      if (lifespanDays > 0) {
        // Platform-specific daily spend estimates
        const platformDailySpend: Record<string, number> = {
          'meta': 150, 'facebook': 150, 'instagram': 100,
          'youtube': 300, 'linkedin': 200, 'reddit': 50,
          'google': 250, 'tiktok': 120, 'twitter': 80,
          'pinterest': 60
        };
        
        const platform = ad.platform?.toLowerCase() || 'meta';
        const baseDaily = platformDailySpend[platform] || 100;
        
        let multiplier = ad.is_active ? 1.5 : 0.7;
        
        // Adjust for format
        if (ad.format?.toLowerCase().includes('video')) multiplier *= 1.8;
        else if (ad.format?.toLowerCase().includes('carousel')) multiplier *= 1.3;
        else if (ad.format?.toLowerCase().includes('story')) multiplier *= 1.2;
        
        const estimated = baseDaily * lifespanDays * multiplier;
        return Math.min(estimated, 1000000); // Cap at $1M
      }
    }
    
    // If no data at all, use platform minimum
    const platformMinSpend: Record<string, number> = {
      'meta': 300, 'facebook': 300, 'instagram': 200,
      'youtube': 500, 'linkedin': 400, 'reddit': 100,
      'google': 500, 'tiktok': 200, 'twitter': 150,
      'pinterest': 100
    };
    
    const platform = ad.platform?.toLowerCase() || 'meta';
    return platformMinSpend[platform] || 200;
  };

  // Helper function to calculate ad impressions
  const calculateAdImpressions = (ad: AdData): number => {
    // Try to parse actual impressions first
    if (ad.impressions) {
      const parsedImpressions = parseImpressionValue(ad.impressions);
      if (parsedImpressions > 0) {
        return parsedImpressions;
      }
    }
    
    // Estimate based on spend if available
    const spend = calculateAdSpend(ad);
    if (spend > 0) {
      // Platform CPM (Cost Per 1000 Impressions) rates
      const platformCpm: Record<string, number> = {
        'meta': 10, 'facebook': 10, 'instagram': 8,
        'youtube': 12, 'linkedin': 15, 'reddit': 6,
        'google': 5, 'tiktok': 7, 'twitter': 9,
        'pinterest': 8
      };
      
      const platform = ad.platform?.toLowerCase() || 'meta';
      const cpm = platformCpm[platform] || 10;
      return (spend / cpm) * 1000;
    }
    
    // Estimate based on lifespan
    if (ad.first_seen && ad.last_seen) {
      const lifespanDays = calculateAdLifespan(ad);
      if (lifespanDays > 0) {
        // Platform-specific daily impressions
        const platformDailyImpressions: Record<string, number> = {
          'meta': 5000, 'facebook': 5000, 'instagram': 8000,
          'youtube': 15000, 'linkedin': 3000, 'reddit': 2000,
          'google': 10000, 'tiktok': 12000, 'twitter': 4000,
          'pinterest': 3000
        };
        
        const platform = ad.platform?.toLowerCase() || 'meta';
        const baseDaily = platformDailyImpressions[platform] || 5000;
        
        let multiplier = ad.is_active ? 1.3 : 1.0;
        
        // Adjust for format
        if (ad.format?.toLowerCase().includes('video')) multiplier *= 1.5;
        else if (ad.format?.toLowerCase().includes('story')) multiplier *= 1.8;
        
        const estimated = baseDaily * lifespanDays * multiplier;
        return Math.min(estimated, 10000000); // Cap at 10M
      }
    }
    
    // If no data at all, use platform minimum
    const platformMinImpressions: Record<string, number> = {
      'meta': 10000, 'facebook': 10000, 'instagram': 15000,
      'youtube': 25000, 'linkedin': 5000, 'reddit': 3000,
      'google': 20000, 'tiktok': 20000, 'twitter': 6000,
      'pinterest': 4000
    };
    
    const platform = ad.platform?.toLowerCase() || 'meta';
    return platformMinImpressions[platform] || 10000;
  };

  // ============================================
  // CALCULATION FUNCTIONS
  // ============================================

  // NEW: Calculate dashboard metrics from ads and competitors
  const calculateDashboardMetrics = (
    ads: AdData[],
    competitors: Competitor[],
  ): SummaryMetrics => {
    console.log(
      "Calculating dashboard metrics from",
      ads.length,
      "ads and",
      competitors.length,
      "competitors",
    );

    let totalSpend = 0;
    let activeCampaigns = 0;
    let totalImpressions = 0;
    const platformDistribution: Record<string, number> = {};

    ads.forEach((ad) => {
      const spendValue = calculateAdSpend(ad);
      const impressionValue = calculateAdImpressions(ad);

      totalSpend += spendValue;
      totalImpressions += impressionValue;

      if (ad.is_active) {
        activeCampaigns += 1;
      }

      // Platform distribution
      if (ad.platform) {
        const platform = ad.platform.toLowerCase();
        platformDistribution[platform] =
          (platformDistribution[platform] || 0) + 1;
      }
    });

    // Calculate average CTR (simplified for now)
    const avg_ctr = ads.length > 0 ? 0.02 : 0; // Default 2% CTR

    const result = {
      total_competitor_spend: totalSpend,
      active_campaigns: activeCampaigns,
      total_impressions: totalImpressions,
      avg_ctr: avg_ctr,
      total_competitors: competitors.length,
      platform_distribution: platformDistribution,
    };

    console.log("Dashboard metrics result:", result);
    return result;
  };

  // NEW: Calculate platform stats from ads
  const calculatePlatformStats = (ads: AdData[]): PlatformStats[] => {
    const platformMap: Record<string, PlatformStats> = {};

    // Colors for platforms
    const platformColors: Record<string, string> = {
      meta: "#00C2B3",
      facebook: "#00C2B3",
      instagram: "#4A90E2",
      youtube: "#FF6B6B",
      linkedin: "#FFD166",
      reddit: "#9B59B6",
      tiktok: "#2ECC71",
      google: "#3498DB",
      twitter: "#1ABC9C",
      pinterest: "#E74C3C",
    };

    // Calculate totals per platform
    ads.forEach((ad) => {
      if (ad.platform) {
        const platform = ad.platform.toLowerCase();
        if (!platformMap[platform]) {
          platformMap[platform] = {
            platform: platform,
            ad_count: 0,
            total_spend: 0,
            avg_ctr: 0,
            percentage: 0,
            color: platformColors[platform] || "#3498DB",
          };
        }

        // Use the new calculateAdSpend function
        const spendValue = calculateAdSpend(ad);

        platformMap[platform].ad_count += 1;
        platformMap[platform].total_spend += spendValue || 0;
      }
    });

    // Calculate total for percentages
    const totalAds = ads.length;

    // Calculate percentages and average CTR
    const platformStats = Object.values(platformMap).map((platform) => ({
      ...platform,
      percentage: totalAds > 0 ? (platform.ad_count / totalAds) * 100 : 0,
      avg_ctr: 0.02, // Default CTR for now
    }));

    // Sort by spend (highest first)
    return platformStats.sort((a, b) => b.total_spend - a.total_spend);
  };

  // NEW: Calculate competitor metrics summary
  const calculateCompetitorMetricsSummary = (
    ads: AdData[],
    _competitors: Competitor[],
  ): CompetitorMetricsSummary[] => {
    const competitorMap: Record<
      string,
      {
        competitor_id: string;
        competitor_name: string;
        ads: AdData[];
        total_spend: number;
        active_ads: number;
      }
    > = {};

    // Group ads by competitor
    ads.forEach((ad) => {
      if (ad.competitor_id) {
        if (!competitorMap[ad.competitor_id]) {
          competitorMap[ad.competitor_id] = {
            competitor_id: ad.competitor_id,
            competitor_name:
              ad.competitor_name ||
              `Competitor ${ad.competitor_id.substring(0, 8)}`,
            ads: [],
            total_spend: 0,
            active_ads: 0,
          };
        }

        competitorMap[ad.competitor_id].ads.push(ad);
        // Use the new calculateAdSpend function
        const spendValue = calculateAdSpend(ad);
        competitorMap[ad.competitor_id].total_spend += spendValue || 0;

        if (ad.is_active) {
          competitorMap[ad.competitor_id].active_ads += 1;
        }
      }
    });

    // Calculate metrics for each competitor
    const competitorMetrics = Object.values(competitorMap).map((competitor) => {
      const monthlySpend = competitor.total_spend;
      const avg_ctr = 0.02; // Default CTR

      // Calculate risk score (0-100)
      // Higher spend = higher risk
      const riskScore = Math.min(Math.round(monthlySpend / 1000) + 30, 90);

      // Calculate opportunity score (0-100)
      // More active ads and higher spend = more opportunity
      const opportunityScore = Math.min(
        Math.round(competitor.active_ads * 5 + monthlySpend / 2000) + 20,
        95,
      );

      return {
        competitor_id: competitor.competitor_id,
        competitor_name: competitor.competitor_name,
        active_ads: competitor.active_ads,
        estimated_monthly_spend: monthlySpend,
        avg_ctr: avg_ctr,
        risk_score: riskScore,
        opportunity_score: opportunityScore,
        last_calculated: new Date().toISOString(),
      };
    });

    // Sort by opportunity score (highest first)
    return competitorMetrics.sort(
      (a, b) => b.opportunity_score - a.opportunity_score,
    );
  };

  // Initialize
  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  // Check authentication and load initial data
  const checkAuthAndLoadData = async () => {
    try {
      const userData = await UsersAPI.getMe();
      setUserInfo(userData);
      setIsAuthenticated(true);

      await loadCompetitors();
    } catch (error) {
      console.error("Authentication error:", error);
      setIsAuthenticated(false);
      setError("Please login to access AdSurv Intelligence");
    } finally {
      setIsLoading(false);
    }
  };

  // Load competitors
  const loadCompetitors = async () => {
    try {
      console.log("Loading competitors...");
      const data = await CompetitorsAPI.list();
      console.log("Competitors API response:", data);

      let competitorsList: Competitor[] = [];

      if (Array.isArray(data)) {
        competitorsList = data;
      }

      console.log("Processed competitors:", competitorsList.length);
      setCompetitors(competitorsList);

      // Load data that depends on competitors
      if (competitorsList.length > 0) {
        await Promise.all([loadRecentAds(), loadTrendingAds()]);

        // Calculate metrics in frontend after loading ads
        await calculateFrontendMetrics(competitorsList);
      } else {
        // Reset metrics if no competitors
        setSummaryMetrics(null);
        setPlatformStats([]);
        setMetricsSummary([]);
      }
    } catch (error) {
      console.error("Error loading competitors:", error);
      setError("Failed to load competitors. Please try again.");
    }
  };

  // NEW: Calculate metrics in frontend
  const calculateFrontendMetrics = async (competitorsList: Competitor[]) => {
    try {
      console.log("Calculating metrics in frontend...");

      // Get all ads first
      let allAds: AdData[] = [];
      try {
        const adsData = await AdsAPI.getAllAds(500);
        console.log("All ads API response:", adsData);

        if (Array.isArray(adsData)) {
          allAds = adsData.map((ad: any) => {
            // Parse spend and impressions safely
            const parsedSpend = parseSpendValue(ad.spend);
            const parsedImpressions = parseImpressionValue(ad.impressions);

            return {
              ...ad,
              competitor_name: ad.competitor_name || "",
              impressions: parsedImpressions,
              spend: parsedSpend,
              is_active: ad.is_active !== undefined ? ad.is_active : true,
            };
          });
        }

        setAds(allAds);
        setFilteredAds(allAds);
      } catch (adsError) {
        console.error("Error loading all ads:", adsError);
        // Continue with empty ads array
      }

      // Calculate dashboard metrics
      const dashboardMetrics = calculateDashboardMetrics(
        allAds,
        competitorsList,
      );
      setSummaryMetrics(dashboardMetrics);

      // Calculate platform stats
      const platformStatsData = calculatePlatformStats(allAds);
      setPlatformStats(platformStatsData);

      // Calculate competitor metrics summary
      const competitorMetrics = calculateCompetitorMetricsSummary(
        allAds,
        competitorsList,
      );
      setMetricsSummary(competitorMetrics);

      console.log("Frontend metrics calculation complete");
    } catch (error) {
      console.error("Error calculating frontend metrics:", error);
      setError("Failed to calculate metrics. Using default values.");

      // Set default values
      const defaultMetrics = calculateDashboardMetrics([], competitorsList);
      setSummaryMetrics(defaultMetrics);
      setPlatformStats([]);
      setMetricsSummary([]);
    }
  };

  // Load recent ads - UPDATED to use getAllAds
  const loadRecentAds = async (competitorId?: string) => {
    try {
      console.log("Loading recent ads...");
      let adsData: AdData[] = [];

      if (competitorId) {
        // Get ads for specific competitor
        const data = await AdsAPI.getCompetitorAds(
          competitorId,
          undefined,
          100,
        );
        console.log("Competitor ads API response:", data);

        if (Array.isArray(data)) {
          adsData = data.map((ad) => {
            // Parse spend and impressions safely
            const parsedSpend = parseSpendValue(ad.spend);
            const parsedImpressions = parseImpressionValue(ad.impressions);

            return {
              ...ad,
              competitor_name: ad.competitor_name || "",
              impressions: parsedImpressions,
              spend: parsedSpend,
              is_active: ad.is_active !== undefined ? ad.is_active : true,
            };
          });
        }
      } else {
        // Get all ads
        try {
          const data = await AdsAPI.getAllAds(500);
          console.log("All ads API response:", data);

          if (Array.isArray(data)) {
            adsData = data.map((ad: any) => {
              // Parse spend and impressions safely
              const parsedSpend = parseSpendValue(ad.spend);
              const parsedImpressions = parseImpressionValue(ad.impressions);

              return {
                ...ad,
                competitor_name: ad.competitor_name || "",
                impressions: parsedImpressions,
                spend: parsedSpend,
                is_active: ad.is_active !== undefined ? ad.is_active : true,
              };
            });
          }
        } catch (error) {
          console.error("Error loading all ads:", error);
          // Fallback to loading competitor by competitor
          for (const comp of competitors) {
            try {
              const data = await AdsAPI.getCompetitorAds(
                comp.id,
                undefined,
                20,
              );
              let compAds: AdData[] = [];

              if (Array.isArray(data)) {
                compAds = data.map((ad) => {
                  // Parse spend and impressions safely
                  const parsedSpend = parseSpendValue(ad.spend);
                  const parsedImpressions = parseImpressionValue(
                    ad.impressions,
                  );

                  return {
                    ...ad,
                    competitor_name: comp.name,
                    impressions: parsedImpressions,
                    spend: parsedSpend,
                    is_active: ad.is_active !== undefined ? ad.is_active : true,
                  };
                });
              }

              adsData.push(...compAds);
            } catch (compError) {
              console.error(
                `Error loading ads for competitor ${comp.name}:`,
                compError,
              );
            }
          }
        }
      }

      // Sort by last_seen date (newest first)
      adsData.sort((a, b) => {
        const dateA = a.last_seen || a.created_at || "";
        const dateB = b.last_seen || b.created_at || "";
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      });

      console.log("Loaded ads:", adsData.length);
      setAds(adsData);
      setFilteredAds(adsData);
    } catch (error) {
      console.error("Error loading ads:", error);
      setError("Failed to load ads. Please try refreshing.");
    }
  };

  // Load trending ads
  const loadTrendingAds = async () => {
    try {
      setIsLoadingTrending(true);
      setTrendingAds([]);
      setTrendingSearchResult(null);

      // Get competitor names for trending search
      const competitorNames = competitors.map((c) => c.name);

      if (competitorNames.length === 0) {
        // If no competitors, search for trending keywords
        try {
          const result = await TrendingAPI.search({
            keyword: trendingSearchKeyword || "technology ecommerce",
            platforms: selectedTrendingPlatforms,
            limit_per_platform: 5,
            async_mode: false,
          });

          setTrendingSearchResult(result);

          if (result.top_trending && Array.isArray(result.top_trending)) {
            const trendingData = result.top_trending
              .slice(0, 5)
              .map((item: TrendingAdType) => ({
                ...item,
                engagement_score: calculateEngagementScore(item),
              }));
            setTrendingAds(trendingData);
          }
        } catch (searchError) {
          console.error("Error in trending search:", searchError);
          // Don't show error for trending - it's optional
        }
      } else {
        // Use the helper function to get trending for competitors
        try {
          const trendingResults =
            await TrendingAPI.getTrendingForCompetitors(competitorNames);

          if (trendingResults.length > 0) {
            const processedTrending = trendingResults.map((item) => ({
              ...item,
              engagement_score: calculateEngagementScore(item),
            }));
            setTrendingAds(processedTrending);
          }
        } catch (searchError) {
          console.error("Error getting trending for competitors:", searchError);
          // Fallback to generic search
          try {
            const result = await TrendingAPI.search({
              keyword: "advertising trends",
              platforms: selectedTrendingPlatforms,
              limit_per_platform: 5,
              async_mode: false,
            });

            setTrendingSearchResult(result);

            if (result.top_trending && Array.isArray(result.top_trending)) {
              const trendingData = result.top_trending
                .slice(0, 5)
                .map((item: TrendingAdType) => ({
                  ...item,
                  engagement_score: calculateEngagementScore(item),
                }));
              setTrendingAds(trendingData);
            }
          } catch (fallbackError) {
            console.error("Fallback trending search error:", fallbackError);
          }
        }
      }
    } catch (error) {
      console.error("Error loading trending ads:", error);
      // Don't set error for trending ads - it's optional
    } finally {
      setIsLoadingTrending(false);
    }
  };

  // Handle trending search
  const handleTrendingSearch = async (keyword?: string) => {
    const searchKeyword = keyword || trendingSearchKeyword.trim();

    if (!searchKeyword) {
      setError("Please enter a search keyword");
      return;
    }

    if (selectedTrendingPlatforms.length === 0) {
      setError("Please select at least one platform");
      return;
    }

    setIsSearchingTrending(true);
    setError(null);
    setShowResults(true);

    try {
      const result = await TrendingAPI.search({
        keyword: searchKeyword,
        platforms: selectedTrendingPlatforms,
        limit_per_platform: 5,
        async_mode: false,
      });

      setTrendingSearchResult(result);
      setTrendingSearchKeyword(searchKeyword);

      // Add to search history
      if (!searchHistory.includes(searchKeyword)) {
        setSearchHistory((prev) => [searchKeyword, ...prev.slice(0, 4)]);
      }

      if (result.top_trending && Array.isArray(result.top_trending)) {
        const trendingData = result.top_trending
          .slice(0, 10)
          .map((item: TrendingAdType) => ({
            ...item,
            engagement_score: calculateEngagementScore(item),
          }));
        setTrendingAds(trendingData);
      }

      // Hide search modal if open
      setShowTrendingSearch(false);
    } catch (error: any) {
      console.error("Trending search error:", error);
      setError(`Trending search failed: ${error.message}`);
    } finally {
      setIsSearchingTrending(false);
    }
  };

  // Calculate engagement score for trending ads
  const calculateEngagementScore = (ad: TrendingAdType): number => {
    let score = 0;

    // Use normalized values from the API
    const views = typeof ad.views === "number" ? ad.views : 0;
    const likes = typeof ad.likes === "number" ? ad.likes : 0;
    const comments = typeof ad.comments === "number" ? ad.comments : 0;
    const shares = typeof ad.shares === "number" ? ad.shares : 0;
    const impressions = typeof ad.impressions === "number" ? ad.impressions : 0;

    // Base engagement score (70 points max)
    const engagement = likes + comments * 5 + shares * 3;
    score += Math.min(Math.pow(engagement, 0.4) * 3, 70);

    // View bonus (15 points max)
    if (views > 0) {
      const viewBonus = Math.min(Math.pow(views, 0.3), 15);
      score += viewBonus;
    } else if (impressions > 0) {
      const impressionBonus = Math.min(Math.pow(impressions, 0.3), 15);
      score += impressionBonus;
    }

    // Recency bonus (15 points max)
    if (ad.created_at || ad.published_at || ad.taken_at) {
      const dateStr = ad.created_at || ad.published_at || ad.taken_at || "";
      try {
        const postDate = new Date(dateStr);
        const now = new Date();
        const hoursDiff =
          Math.abs(now.getTime() - postDate.getTime()) / (1000 * 60 * 60);

        if (hoursDiff < 1) score += 15;
        else if (hoursDiff < 24) score += 10;
        else if (hoursDiff < 168)
          score += 5; // 7 days
        else if (hoursDiff < 720) score += 2; // 30 days
      } catch {
        // Date parsing failed, skip recency bonus
      }
    }

    // Platform bonus (10 points max)
    const platform = ad.platform?.toLowerCase() || "";
    const platformBonuses: Record<string, number> = {
      tiktok: 10,
      instagram: 8,
      reddit: 6,
      youtube: 5,
      meta: 3,
      facebook: 3,
      linkedin: 4,
    };

    score += platformBonuses[platform] || 0;

    // Video content bonus
    if (ad.video_url || ad.type?.toLowerCase().includes("video")) {
      score += 3;
    }

    // Quality bonus (10 points max)
    let qualityScore = 0;
    if (ad.title && ad.title.length > 10) qualityScore += 2;
    if (ad.description && ad.description.length > 20) qualityScore += 3;
    if (ad.image_url || ad.thumbnail) qualityScore += 2;
    if (ad.video_url) qualityScore += 3;
    if (ad.channel || ad.owner || ad.advertiser) qualityScore += 2;

    score += Math.min(qualityScore, 10);

    // Add score from API if available
    if (ad.score) {
      score += Math.min(ad.score, 30);
    }

    return Math.min(Math.round(score), 100); // Cap at 100
  };

  // Handle search suggestion click
  const handleSuggestionClick = (keyword: string) => {
    setTrendingSearchKeyword(keyword);
    handleTrendingSearch(keyword);
  };

  // Toggle trending platform selection
  const toggleTrendingPlatform = (platform: string) => {
    setSelectedTrendingPlatforms((prev) => {
      if (prev.includes(platform)) {
        return prev.filter((p) => p !== platform);
      } else {
        return [...prev, platform];
      }
    });
  };

  // Handle new search
  const handleNewSearch = () => {
    setTrendingAds([]);
    setTrendingSearchResult(null);
    setShowResults(false);
    setTrendingSearchKeyword("");
  };

  // UPDATED: Handle calculate metrics (now uses frontend calculation)
  const handleCalculateMetrics = async () => {
    if (competitors.length === 0) {
      setError("Add competitors first to calculate metrics");
      return;
    }

    setIsCalculatingMetrics(true);
    setError(null);

    try {
      // Refresh ads first
      await loadRecentAds();

      // Then recalculate metrics
      await calculateFrontendMetrics(competitors);

      // Show success message
      setError("Metrics calculated successfully!");
      setTimeout(() => setError(null), 3000);
    } catch (error: any) {
      console.error("Error calculating metrics:", error);
      setError(`Failed to calculate metrics: ${error.message}`);
    } finally {
      setIsCalculatingMetrics(false);
    }
  };

  // Filter ads based on search, platform, and company
  useEffect(() => {
    let filtered = [...ads];

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        (ad) =>
          ad?.competitor_name
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          ad?.headline?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ad?.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ad?.full_text?.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    // Filter by platform
    if (selectedPlatform !== "all") {
      filtered = filtered.filter(
        (ad) => ad?.platform?.toLowerCase() === selectedPlatform.toLowerCase(),
      );
    }

    // Filter by company
    if (selectedCompany !== "all") {
      filtered = filtered.filter((ad) => ad?.competitor_id === selectedCompany);
    }

    setFilteredAds(filtered);
  }, [ads, searchQuery, selectedPlatform, selectedCompany]);

  // Add competitor handler
  const handleAddCompetitor = async () => {
    if (!newCompetitor.name.trim()) {
      setError("Competitor name is required");
      return;
    }

    try {
      await CompetitorsAPI.create(newCompetitor);
      await loadCompetitors();
      setNewCompetitor({
        name: "",
        domain: "",
        industry: "",
        estimated_monthly_spend: 0,
      });
      setShowAddCompetitor(false);
      setError(null);
    } catch (error: any) {
      console.error("Error adding competitor:", error);
      setError(error.message || "Failed to add competitor");
    }
  };

  // Refresh ads handler - UPDATED to recalculate metrics
  const handleRefreshAds = async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      if (selectedCompetitor) {
        await AdsAPI.refreshCompetitor(selectedCompetitor);
      } else {
        await AdsAPI.refreshAll();
      }

      // Wait a moment for backend to process
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Reload data after refresh
      await Promise.all([
        loadRecentAds(selectedCompetitor || undefined),
        loadTrendingAds(),
      ]);

      // Recalculate metrics
      await calculateFrontendMetrics(competitors);
    } catch (error: any) {
      console.error("Error refreshing ads:", error);
      setError(error.message || "Failed to refresh ads");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Toggle section expansion
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Formatting helpers
  const formatCurrency = (amount: number | string | undefined) => {
    if (amount === undefined || amount === null) return "$0";

    let numAmount: number;
    if (typeof amount === "string") {
      numAmount = parseSpendValue(amount);
    } else {
      numAmount = amount;
    }

    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numAmount);
  };

  const formatCurrencyShort = (amount: number | string | undefined) => {
    if (amount === undefined || amount === null) return "$0";

    let numAmount: number;
    if (typeof amount === "string") {
      numAmount = parseSpendValue(amount);
    } else {
      numAmount = amount;
    }

    if (numAmount >= 1000000) return `$${(numAmount / 1000000).toFixed(1)}M`;
    if (numAmount >= 1000) return `$${(numAmount / 1000).toFixed(1)}K`;
    return `$${Math.round(numAmount)}`;
  };

  const formatNumber = (num: number | undefined) => {
    if (num === undefined || num === null || isNaN(num)) return "0";
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return Math.round(num).toString();
  };

  const formatPercentage = (value: number | string | undefined) => {
    if (value === undefined || value === null) return "0.00%";

    let numValue: number;
    if (typeof value === "string") {
      numValue = parseFloat(value);
      if (isNaN(numValue)) return "0.00%";
    } else {
      numValue = value;
    }

    return `${(numValue * 100).toFixed(2)}%`;
  };

  const formatDecimal = (
    value: number | string | undefined,
    decimals: number = 2,
  ) => {
    if (value === undefined || value === null) return "0.00";

    let numValue: number;
    if (typeof value === "string") {
      numValue = parseFloat(value);
      if (isNaN(numValue)) return "0.00";
    } else {
      numValue = value;
    }

    return numValue.toFixed(decimals);
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid date";
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return "Today";
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7) return `${diffDays} days ago`;

      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      });
    } catch {
      return "N/A";
    }
  };

  const getStatusColor = (status: string | undefined) => {
    if (!status) return "bg-gray-500";
    switch (status.toLowerCase()) {
      case "active":
        return "bg-green-500";
      case "pending":
        return "bg-yellow-500";
      case "paused":
        return "bg-orange-500";
      case "ended":
        return "bg-gray-500";
      default:
        return "bg-blue-500";
    }
  };

  const proxyImageUrl = (url: string | undefined): string => {
    if (!url) return "https://via.placeholder.com/300x200?text=No+Image";

    // Skip proxy for placeholder images
    if (url.includes("via.placeholder.com")) return url;

    // Use a public CORS proxy
    const proxyUrl = "https://corsproxy.io/?";
    return proxyUrl + encodeURIComponent(url);
  };

  const getStatusBadge = (status: boolean | undefined) => {
    if (status === undefined)
      return "bg-gray-700 text-gray-300 border-gray-600";
    return status
      ? "bg-emerald-900/50 text-emerald-400 border-emerald-700"
      : "bg-gray-700 text-gray-400 border-gray-600";
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400 bg-emerald-900/30";
    if (score >= 60) return "text-yellow-400 bg-yellow-900/30";
    if (score >= 40) return "text-orange-400 bg-orange-900/30";
    return "text-red-400 bg-red-900/30";
  };

  // Render JSON data as formatted list
  const renderJSONData = (data: any, title: string) => {
    if (!data || Object.keys(data).length === 0) {
      return (
        <div className="text-gray-500 text-sm italic">
          No {title} data available
        </div>
      );
    }

    if (Array.isArray(data)) {
      return (
        <div className="space-y-2">
          {data.map((item, index) => (
            <div key={index} className="text-sm text-gray-300">
              {JSON.stringify(item, null, 2)}
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-1">
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className="flex justify-between items-center">
            <span className="text-sm text-gray-400">{key}:</span>
            <span className="text-sm font-medium text-white">
              {typeof value === "number" ? formatNumber(value) : String(value)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  // Render platform distribution chart
  const renderPlatformDistribution = (data: Record<string, number>) => {
    if (!data || Object.keys(data).length === 0) {
      return (
        <div className="text-gray-500 text-sm italic">No platform data</div>
      );
    }

    const chartData = Object.entries(data).map(([platform, count]) => ({
      platform,
      count,
    }));

    return (
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsPieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={70}
              paddingAngle={5}
              dataKey="count"
              nameKey="platform"
              label={({ name, value }: any) => `${name}: ${value}`}
            >
              {chartData.map((_entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    [
                      "#00C2B3",
                      "#4A90E2",
                      "#FF6B6B",
                      "#FFD166",
                      "#9B59B6",
                      "#2ECC71",
                    ][index % 6]
                  }
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "#1f2937",
                border: "1px solid #374151",
                borderRadius: "8px",
                color: "#f3f4f6",
              }}
            />
            <Legend wrapperStyle={{ color: "#9ca3af" }} />
          </RechartsPieChart>
        </ResponsiveContainer>
      </div>
    );
  };

  if (isLoading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-[#0a0a0f] p-6 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-t-teal-500 border-gray-700 rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-gray-300">
              Loading surveillance dashboard...
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Preparing your competitive intelligence
            </p>
          </div>
        </div>
        <Footer />
      </>
    );
  }



  return (
    <>
    <Navigation />
    <div className="min-h-screen bg-[#0f0f0f] text-white">

      {/* ========== HEADER ========== */}
      <div className="max-w-[1200px] mx-auto px-6 pt-8 pb-2">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[28px] font-bold text-white tracking-tight">Competitor Ad Surveillience</h1>
            <p className="text-[#8a8a8a] text-sm mt-1">Real-time intelligence across all advertising platforms.</p>
          </div>
          <button className="px-4 py-2 bg-[#1a1a1a] hover:bg-[#252525] border border-[#333] text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors">
            <Wifi className="w-4 h-4" />
            Live Database
          </button>
        </div>
      </div>

      {/* ========== CONNECTION STATUS BAR ========== */}
      <div className="max-w-[1200px] mx-auto px-6 mt-3">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-2.5 flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-sm text-[#ccc]">
            <span className="font-medium text-white">Connected to Supabase Database</span>
            {" · "}Found {competitors.length} summary records and {ads.length} daily records
          </span>
        </div>
      </div>

      {/* ========== ERROR BANNER ========== */}
      {error && (
        <div className="max-w-[1200px] mx-auto px-6 mt-3">
          <div className={`px-4 py-3 rounded-lg flex items-center gap-3 ${
            error.includes("successfully")
              ? "bg-emerald-900/40 border border-emerald-700/50 text-emerald-300"
              : "bg-red-900/40 border border-red-700/50 text-red-300"
          }`}>
            {error.includes("successfully") ? (
              <Sparkles className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <span className="text-sm">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-gray-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========== TOOLBAR ========== */}
      <div className="max-w-[1200px] mx-auto px-6 mt-4">
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setShowAddCompetitor(true)}
            className="px-4 py-2.5 bg-[#1a1a1a] hover:bg-[#252525] border border-[#333] text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add a competitor
          </button>
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666]" />
            <input
              type="text"
              placeholder="Search for campaigns . . ."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#1a1a1a] border border-[#333] rounded-lg text-sm text-white placeholder-[#666] focus:outline-none focus:ring-1 focus:ring-[#444] focus:border-[#444]"
            />
          </div>
          <select
            className="px-3 py-2.5 bg-[#1a1a1a] border border-[#333] rounded-lg text-sm text-[#ccc] focus:outline-none appearance-none pr-8"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as any)}
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23888' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10l-5 5z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
          >
            <option value="daily">Last 7 days</option>
            <option value="weekly">Last 30 days</option>
            <option value="monthly">Last 90 days</option>
            <option value="all_time">All time</option>
          </select>
          <button
            onClick={() => setShowTrendingSearch(true)}
            className="px-5 py-2.5 bg-[#0ea5e9] hover:bg-[#0284c7] text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Search
          </button>
          <button
            onClick={handleCalculateMetrics}
            disabled={isCalculatingMetrics}
            className="px-4 py-2.5 bg-[#1a1a1a] hover:bg-[#252525] border border-[#333] text-[#ccc] text-sm rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {isCalculatingMetrics ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Activity className="w-4 h-4" />
            )}
            Check Connection
          </button>
          <button
            onClick={handleRefreshAds}
            disabled={isRefreshing}
            className="px-4 py-2.5 bg-[#0ea5e9] hover:bg-[#0284c7] text-white text-sm font-semibold rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>

        {/* Data View Toggle */}
        <div className="mt-4 flex items-center gap-4">
          <span className="text-sm text-[#888]">Data View:</span>
          <div className="flex bg-[#1a1a1a] rounded-lg p-1 border border-[#333]">
            <button
              onClick={() => setDataViewMode("latest")}
              className={`px-4 py-1.5 text-sm rounded-md flex items-center gap-2 transition-colors ${
                dataViewMode === "latest"
                  ? "bg-[#2a2a2a] text-white border border-[#444]"
                  : "text-[#888] hover:text-white"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Latest Ads
            </button>
            <button
              onClick={() => setDataViewMode("historical")}
              className={`px-4 py-1.5 text-sm rounded-md flex items-center gap-2 transition-colors ${
                dataViewMode === "historical"
                  ? "bg-[#2a2a2a] text-white border border-[#444]"
                  : "text-[#888] hover:text-white"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Historical Data
            </button>
          </div>
          <span className="text-xs text-[#666] flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-white" />
            {dataViewMode === "latest" ? "Latest data only" : "Historical view"}
          </span>
        </div>

        {/* Sub-description */}
        <p className="text-xs text-[#666] mt-2">• Showing Ads from the most recent data in your database.</p>
      </div>

      {/* ========== TRENDING SEARCH MODAL ========== */}
      {showTrendingSearch && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto shadow-2xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#0ea5e9] rounded-xl flex items-center justify-center">
                    <Search className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Trending Ads Search</h3>
                    <p className="text-sm text-[#888]">Search across all platforms</p>
                  </div>
                </div>
                <button
                  onClick={() => { setShowTrendingSearch(false); setError(null); }}
                  className="p-2 hover:bg-[#2a2a2a] rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-[#888]" />
                </button>
              </div>

              <div className="relative mb-4">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#666]" />
                <input
                  type="text"
                  placeholder="Search trending ads..."
                  value={trendingSearchKeyword}
                  onChange={(e) => setTrendingSearchKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleTrendingSearch()}
                  className="w-full pl-12 pr-4 py-3.5 bg-[#111] border border-[#333] rounded-xl text-white placeholder-[#666] focus:outline-none focus:ring-1 focus:ring-[#444]"
                />
              </div>

              <div className="mb-6">
                <p className="text-sm text-[#888] mb-3">Platforms</p>
                <div className="flex flex-wrap gap-2">
                  {["meta", "instagram", "youtube", "tiktok", "reddit", "linkedin"].map((platform) => (
                    <button
                      key={platform}
                      onClick={() => toggleTrendingPlatform(platform)}
                      className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-colors border ${
                        selectedTrendingPlatforms.includes(platform)
                          ? "bg-[#0ea5e9]/20 border-[#0ea5e9] text-[#0ea5e9]"
                          : "bg-[#111] border-[#333] text-[#888] hover:border-[#555]"
                      }`}
                    >
                      {platformIcons[platform]}
                      {platform.charAt(0).toUpperCase() + platform.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <p className="text-sm text-[#888] mb-3">Popular Searches</p>
                <div className="grid grid-cols-2 gap-2">
                  {searchSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      onClick={() => handleSuggestionClick(suggestion.keyword)}
                      className="flex items-center gap-3 p-3 bg-[#111] border border-[#2a2a2a] rounded-lg hover:bg-[#1a1a1a] hover:border-[#444] transition-colors text-left"
                    >
                      <div className="text-[#888]">{suggestion.icon}</div>
                      <div>
                        <div className="text-sm text-white">{suggestion.keyword}</div>
                        <div className="text-xs text-[#666]">{suggestion.category}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => handleTrendingSearch()}
                disabled={isSearchingTrending || !trendingSearchKeyword.trim() || selectedTrendingPlatforms.length === 0}
                className="w-full py-3 bg-[#0ea5e9] hover:bg-[#0284c7] disabled:bg-[#333] disabled:text-[#666] text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                {isSearchingTrending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Search className="w-5 h-5" />
                )}
                {isSearchingTrending ? "Searching..." : "Search Trending Ads"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== ADD COMPETITOR MODAL (WHITE - matches screenshot exactly) ========== */}
      {showAddCompetitor && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl">
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold text-black">Add New Competitor</h3>
                <button
                  onClick={() => { setShowAddCompetitor(false); setError(null); }}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Competitor Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newCompetitor.name}
                    onChange={(e) => setNewCompetitor({ ...newCompetitor, name: e.target.value })}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg text-black placeholder-gray-400 focus:outline-none focus:border-gray-400 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Website Domain <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newCompetitor.domain}
                    onChange={(e) => setNewCompetitor({ ...newCompetitor, domain: e.target.value })}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg text-black placeholder-gray-400 focus:outline-none focus:border-gray-400 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Industry</label>
                  <input
                    type="text"
                    value={newCompetitor.industry}
                    onChange={(e) => setNewCompetitor({ ...newCompetitor, industry: e.target.value })}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg text-black placeholder-gray-400 focus:outline-none focus:border-gray-400 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Estimated Monthly Ad Spend ($)</label>
                  <input
                    type="number"
                    placeholder="Example: 5000"
                    value={newCompetitor.estimated_monthly_spend || ""}
                    onChange={(e) => setNewCompetitor({ ...newCompetitor, estimated_monthly_spend: e.target.value ? parseInt(e.target.value) : 0 })}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg text-black placeholder-gray-400 focus:outline-none focus:border-gray-400 text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between mt-8">
                <button
                  onClick={() => { setShowAddCompetitor(false); setError(null); }}
                  className="px-6 py-2.5 bg-[#0ea5e9] hover:bg-[#0284c7] text-white font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddCompetitor}
                  disabled={!newCompetitor.name.trim()}
                  className="px-6 py-2.5 bg-black hover:bg-gray-900 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add a competitor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========== MAIN CONTENT ========== */}
      <div className="max-w-[1200px] mx-auto px-6 mt-6 pb-8">

        {/* ===== 4 METRIC CARDS ===== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Average Impressions */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold text-white">Average Impressions</span>
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs text-emerald-400">12%</span>
              </div>
            </div>
            <p className="text-xs text-[#666] mb-2">vs previous spend</p>
            <div className="text-2xl font-bold text-white text-right">
              {formatCurrency(summaryMetrics?.total_competitor_spend || 0)}
            </div>
          </div>

          {/* Active Campaigns */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold text-white">Active Campaigns</span>
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs text-emerald-400">8%</span>
              </div>
            </div>
            <p className="text-xs text-[#666] mb-2">Across all platforms</p>
            <div className="text-2xl font-bold text-white text-right">
              {formatNumber(summaryMetrics?.active_campaigns || 0)}
            </div>
          </div>

          {/* Total Impressions */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold text-white">Total Impressions</span>
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs text-emerald-400">15%</span>
              </div>
            </div>
            <p className="text-xs text-[#666] mb-2">Combined reach</p>
            <div className="text-2xl font-bold text-white text-right">
              {formatNumber(summaryMetrics?.total_impressions || 0)}
            </div>
          </div>

          {/* Average CTR */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold text-white">Average CTR</span>
              <div className="flex items-center gap-1">
                <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                <span className="text-xs text-red-400">2%</span>
              </div>
            </div>
            <p className="text-xs text-[#666] mb-2">Industry benchmark</p>
            <div className="text-2xl font-bold text-white text-right">
              {formatPercentage(summaryMetrics?.avg_ctr || 0)}
            </div>
          </div>
        </div>

        {/* ===== CHARTS ROW ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-10">
          {/* 7-Day Competitor Spend Trend */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white italic">7-Day Competitor Spend Trend</h3>
              <div className="flex bg-[#111] rounded-lg p-0.5 border border-[#333]">
                {(["daily", "weekly", "monthly"] as const).map((period) => (
                  <button
                    key={period}
                    onClick={() => setSelectedPeriod(period)}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${
                      selectedPeriod === period
                        ? "bg-[#333] text-white"
                        : "text-[#888] hover:text-white"
                    }`}
                  >
                    {period.charAt(0).toUpperCase() + period.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            {platformStats.length > 0 ? (
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={platformStats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                    <XAxis dataKey="platform" tick={{ fill: "#888", fontSize: 11 }} axisLine={{ stroke: "#333" }} />
                    <YAxis tick={{ fill: "#888", fontSize: 11 }} axisLine={{ stroke: "#333" }} tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}`} />
                    <Tooltip contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333", borderRadius: "8px", color: "#fff" }} formatter={(value: any) => [`$${Number(value).toLocaleString()}`, "Spend"]} />
                    <Bar dataKey="total_spend" radius={[4, 4, 0, 0]}>
                      {platformStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || "#0ea5e9"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-52 flex items-center justify-center text-[#666] text-sm">No spend data available</div>
            )}
          </div>

          {/* Spend by Platform */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white italic">Spend by Platform</h3>
            </div>
            {platformStats.length > 0 ? (
              <div className="flex items-center">
                <div className="h-48 flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie data={platformStats} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="total_spend" nameKey="platform">
                        {platformStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color || "#0ea5e9"} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333", borderRadius: "8px", color: "#fff" }} formatter={(value: any) => [`$${Number(value).toLocaleString()}`, "Spend"]} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-3 ml-4">
                  {platformStats.map((stat) => (
                    <div key={stat.platform} className="flex items-center gap-2.5">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: stat.color }} />
                      <span className="text-sm text-[#ccc] capitalize">{stat.platform}</span>
                    </div>
                  ))}
                  <div className="mt-3 pt-3 border-t border-[#333]">
                    <p className="text-xs text-[#888]">Total Platform Spend</p>
                    <p className="text-xl font-bold text-white mt-0.5">
                      {formatCurrency(platformStats.reduce((sum, s) => sum + s.total_spend, 0))}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-52 flex items-center justify-center text-[#666] text-sm">No platform data available</div>
            )}
          </div>
        </div>

        {/* ===== TRENDING ADS RESULTS ===== */}
        {showResults && trendingAds.length > 0 && (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl mb-8">
            <div className="p-5 border-b border-[#2a2a2a]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-[#0ea5e9]" />
                  <h3 className="text-base font-semibold text-white">Trending Results for &quot;{trendingSearchKeyword}&quot;</h3>
                  <span className="px-2 py-0.5 text-xs bg-[#0ea5e9]/20 text-[#0ea5e9] rounded-full">{trendingAds.length} results</span>
                </div>
                <button onClick={handleNewSearch} className="text-sm text-[#888] hover:text-white transition-colors">New Search</button>
              </div>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {trendingAds.slice(0, 6).map((ad, index) => (
                <div key={ad.id || `${ad.platform}-${index}`} className="bg-[#111] border border-[#2a2a2a] rounded-xl overflow-hidden hover:border-[#444] transition-colors">
                  {(ad.image_url || ad.thumbnail) && (
                    <div className="relative h-40">
                      <img
                        src={proxyImageUrl(ad.image_url || ad.thumbnail || "")}
                        alt={ad.title || "Trending ad"}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).src = "https://via.placeholder.com/300x200?text=No+Image"; }}
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-2 left-2">
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-black/70 text-white rounded uppercase">{ad.platform || "unknown"}</span>
                      </div>
                    </div>
                  )}
                  <div className="p-3.5">
                    <h4 className="text-sm font-medium text-white line-clamp-2 mb-2">{ad.title || ad.description || "Untitled"}</h4>
                    <div className="flex items-center gap-3 text-xs text-[#666]">
                      {(ad.views || ad.impressions) && (
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {formatNumber(typeof (ad.views || ad.impressions) === 'number' ? (ad.views || ad.impressions) as number : 0)}
                        </span>
                      )}
                      {ad.likes && (
                        <span className="flex items-center gap-1">
                          <Heart className="w-3 h-3" />
                          {formatNumber(typeof ad.likes === 'number' ? ad.likes : 0)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== COMPETITORS TABLE ===== */}
        {metricsSummary.length > 0 && (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl mb-8 overflow-hidden">
            <div className="p-5 border-b border-[#2a2a2a]">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-[#0ea5e9]" />
                <h3 className="text-base font-semibold text-white">Competitors Performance</h3>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#2a2a2a]">
                    <th className="text-left px-5 py-3 text-xs font-medium text-[#888] uppercase tracking-wider">Competitor</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-[#888] uppercase tracking-wider">Active Ads</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-[#888] uppercase tracking-wider">Monthly Spend</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-[#888] uppercase tracking-wider">Avg CTR</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-[#888] uppercase tracking-wider">Risk Score</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-[#888] uppercase tracking-wider">Opportunity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1f1f1f]">
                  {metricsSummary.map((summary) => (
                    <tr key={summary.competitor_id} className="hover:bg-[#222] transition-colors">
                      <td className="px-5 py-4">
                        <span className="text-sm font-medium text-white">{summary.competitor_name}</span>
                      </td>
                      <td className="px-5 py-4 text-sm text-[#ccc]">{summary.active_ads}</td>
                      <td className="px-5 py-4 text-sm text-[#ccc]">{formatCurrency(summary.estimated_monthly_spend)}</td>
                      <td className="px-5 py-4 text-sm text-[#ccc]">{formatPercentage(summary.avg_ctr)}</td>
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-1 text-xs font-medium rounded-lg ${getScoreColor(summary.risk_score)}`}>{summary.risk_score}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-1 text-xs font-medium rounded-lg ${getScoreColor(summary.opportunity_score)}`}>{summary.opportunity_score}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===== LIVE AD FEED ===== */}
        <div className="mb-6">
          {/* Live Ad Feed Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold text-white italic" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>Live Ad Feed</h2>
              <span className="px-3 py-1 text-xs font-medium bg-[#1a1a1a] text-white rounded-full border border-[#333] flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Latest
              </span>
            </div>
            <div className="flex items-center gap-4">
              <select
                className="text-sm bg-transparent text-[#888] focus:outline-none cursor-pointer"
                value={selectedCompany}
                onChange={(e) => {
                  setSelectedCompany(e.target.value);
                  if (e.target.value !== "all") { setSelectedCompetitor(e.target.value); loadRecentAds(e.target.value); }
                  else { setSelectedCompetitor(null); loadRecentAds(); }
                }}
              >
                <option value="all">All Companies</option>
                {competitors.map((comp) => (
                  <option key={comp.id} value={comp.id}>{comp.name}</option>
                ))}
              </select>
              <button className="flex items-center gap-1.5 text-sm text-[#888] hover:text-white transition-colors">
                <Filter className="w-4 h-4" />
                Filter
              </button>
              <button className="flex items-center gap-1.5 text-sm text-[#888] hover:text-white transition-colors">
                <Lightbulb className="w-4 h-4" />
                Insights
              </button>
            </div>
          </div>

          {/* Ad Cards */}
          <div className="space-y-6">
            {filteredAds.length > 0 ? (
              filteredAds.slice(0, 10).map((ad, index) => (
                <div key={ad.id || index}>
                  {/* Ad Title */}
                  <h3 className="text-base font-semibold text-white mb-3">{ad.competitor_name} Ad</h3>

                  {/* Ad Card */}
                  <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
                    <div className="flex">
                      {/* Left: Image */}
                      <div className="relative w-[280px] min-h-[280px] flex-shrink-0 bg-[#111]">
                        {ad.image_url ? (
                          <img
                            src={proxyImageUrl(ad.image_url)}
                            alt={ad.headline}
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full bg-[#111] flex items-center justify-center">
                            <div className="w-16 h-16 bg-[#2a2a2a] rounded-lg" />
                          </div>
                        )}
                        {/* Platform Badge */}
                        <div className="absolute top-3 left-3">
                          <span className="px-3 py-1 text-[11px] font-bold bg-[#1a1a1a] text-white rounded-md uppercase tracking-wider border border-[#333]">
                            {ad.platform?.toUpperCase() || "UNKNOWN"}
                          </span>
                        </div>
                        {/* Active/Paused Badge */}
                        <div className="absolute top-3 right-3">
                          <span className={`px-3 py-1 text-[11px] font-bold rounded-md ${
                            ad.is_active
                              ? "bg-emerald-400 text-black"
                              : "bg-yellow-400 text-black"
                          }`}>
                            {ad.is_active ? "Active" : "Paused"}
                          </span>
                        </div>
                      </div>

                      {/* Right: Details */}
                      <div className="flex-1 p-5">
                        <h4 className="text-lg font-semibold text-white mb-1">{ad.headline || "No Title"}</h4>
                        <p className="text-xs text-[#888] mb-4">{formatDate(ad.last_seen || ad.created_at || ad.first_seen)}</p>

                        <div className="space-y-3">
                          <div>
                            <p className="text-xs text-[#666] italic">Daily Spend</p>
                            <p className="text-base font-bold text-white">{formatCurrency(ad.spend)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-[#666] italic">Impressions</p>
                            <p className="text-base font-bold text-white">
                              {formatNumber(typeof ad.impressions === "number" ? ad.impressions : parseImpressionValue(ad.impressions))}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-[#666] italic">CTR</p>
                            <p className="text-base font-bold text-white">
                              2.5% <span className="text-xs text-[#666] font-normal">(Industry Average: 2.1%)</span>
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-[#666] italic">Variants</p>
                            <p className="text-sm text-white">
                              <span className="font-bold">Creatives</span> <span className="text-[#888]">(A/B Testing)</span>
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-[#666] italic">A/B Tests</p>
                            <p className="text-sm text-white">
                              <span className="font-bold">{ad.is_active ? "Active" : "Paused"}</span> <span className="text-[#888]">(In Progress)</span>
                            </p>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-3 mt-5">
                          <button className="px-4 py-2 bg-[#0ea5e9] hover:bg-[#0284c7] text-white text-sm font-medium rounded-lg flex items-center gap-1.5 transition-colors">
                            <Eye className="w-3.5 h-3.5" />
                            Analyze
                          </button>
                          <button className="px-4 py-2 bg-[#1a1a1a] hover:bg-[#252525] border border-[#333] text-[#ccc] text-sm font-medium rounded-lg flex items-center gap-1.5 transition-colors">
                            <DollarSign className="w-3.5 h-3.5" />
                            Clone Strategy
                          </button>
                          <button className="px-4 py-2 bg-[#1a1a1a] hover:bg-[#252525] border border-[#333] text-[#ccc] text-sm font-medium rounded-lg flex items-center gap-1.5 transition-colors">
                            <Target className="w-3.5 h-3.5" />
                            Track
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-5 py-16 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-[#222] rounded-full flex items-center justify-center">
                  <Eye className="w-8 h-8 text-[#444]" />
                </div>
                <h4 className="text-lg font-medium text-white mb-2">No Ads Found</h4>
                <p className="text-[#888] mb-6 max-w-md mx-auto">
                  {searchQuery || selectedPlatform !== "all" || selectedCompany !== "all"
                    ? "Try adjusting your search or filter criteria"
                    : "Start tracking competitors to see their ads"}
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => { setSearchQuery(""); setSelectedPlatform("all"); setSelectedCompany("all"); setSelectedCompetitor(null); loadRecentAds(); }}
                    className="px-4 py-2.5 bg-[#222] hover:bg-[#333] border border-[#333] text-[#ccc] rounded-lg transition-colors"
                  >
                    Clear Filters
                  </button>
                  <button
                    onClick={() => setShowAddCompetitor(true)}
                    className="px-4 py-2.5 bg-[#0ea5e9] hover:bg-[#0284c7] text-white rounded-lg transition-colors"
                  >
                    Add Competitor
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    <Footer />
    </>
  );
};

export default AdSurveillance;
