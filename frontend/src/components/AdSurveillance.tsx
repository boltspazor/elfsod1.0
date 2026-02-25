import React, { useState, useEffect, useCallback } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  Eye,
  MousePointer,
  BarChart3,
  Filter,
  Search,
  MoreVertical,
  PlayCircle,
  Copy,
  Download,
  Wifi,
  WifiOff,
  RefreshCw,
  Plus,
  X,
  AlertCircle,
  Calendar,
  Clock,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
  LineChart as LineChartIcon,
  Radar,
  User,
  Shield,
  Zap,
  Users,
  DollarSign,
  Percent,
  Globe,
  Sparkles,
  AlertTriangle,
  Info,
  ExternalLink,
  BarChart2,
  Layers,
  Target as TargetIcon,
  PieChart,
  LineChart,
  ScatterChart,
  Image as ImageIcon,
  Link as LinkIcon,
  Hash,
  MapPin,
  Smartphone,
  Clock as ClockIcon,
  Users as UsersIcon,
  ChevronDown,
  ChevronUp,
  Download as DownloadIcon,
  Share2,
  BarChart3 as BarChart3Icon,
  Globe as GlobeIcon,
  Cpu,
  TrendingUp as TrendingUpIcon,
  Lightbulb,
  AlertOctagon,
  Award,
  Target as TargetIcon2,
  ChartBar,
  ChartLine,
  ChartPie,
  ChartArea,
  ChartScatter,
  Heart,
  MessageCircle,
  Youtube,
  Facebook,
  Instagram,
  Linkedin,
  Loader2,
  Clock as ClockIcon2,
  History,
  Hash as HashIcon,
  ShoppingBag,
  Shirt,
  Utensils,
  Smartphone as SmartphoneIcon,
  Car,
  Home,
  TrendingUp as TrendingUpIcon2,
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
  LineChart as RechartsLineChart,
  Line,
  ComposedChart,
  ScatterChart as RechartsScatterChart,
  Scatter,
  ZAxis,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  AreaChart,
  Area,
  RadialBarChart,
  RadialBar,
  Treemap,
} from "recharts";

// Import UPDATED API services with types
import {
  UsersAPI,
  CompetitorsAPI,
  AdsAPI,
  PlatformsAPI,
  TrendingAPI,
  PlatformStats,
  TrendingAd as TrendingAdType,
  TrendingSearchResponse,
  parseSpendValue,
  parseImpressionValue,
  normalizeTrendingAd,
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
    icon: <TrendingUpIcon2 className="w-4 h-4" />,
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
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

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
  const [expandedSections, setExpandedSections] = useState<
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
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(
    null,
  );
  const [activeChart, setActiveChart] = useState("overview");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Trending ads state
  const [trendingAds, setTrendingAds] = useState<TrendingAdWithEngagement[]>(
    [],
  );
  const [isLoadingTrending, setIsLoadingTrending] = useState(false);
  const [trendingSearchResult, setTrendingSearchResult] =
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
    competitors: Competitor[],
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
      return "bg-gray-100 text-gray-800 border-gray-200";
    return status
      ? "bg-green-100 text-green-800 border-green-200"
      : "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-50";
    if (score >= 60) return "text-yellow-600 bg-yellow-50";
    if (score >= 40) return "text-orange-600 bg-orange-50";
    return "text-red-600 bg-red-50";
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
            <div key={index} className="text-sm text-gray-700">
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
            <span className="text-sm text-gray-600">{key}:</span>
            <span className="text-sm font-medium text-gray-900">
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
              label={({ platform, count }) => `${platform}: ${count}`}
            >
              {chartData.map((entry, index) => (
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
            <Tooltip />
            <Legend />
          </RechartsPieChart>
        </ResponsiveContainer>
      </div>
    );
  };

  if (isLoading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-t-blue-500 border-gray-200 rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-gray-600">
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      {/* Error Alert */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-red-700 text-sm">{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-2 text-red-600 hover:text-red-800 text-sm font-medium"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                  AdSurv Intelligence
                </h1>
                <p className="text-gray-600">
                  Real-time competitor advertising surveillance
                </p>
              </div>
            </div>

            {/* User Info */}
            {userInfo && (
              <div className="flex items-center gap-2 mt-3 bg-white/50 backdrop-blur-sm rounded-lg p-2 inline-flex">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {userInfo.name?.charAt(0) || "U"}
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {userInfo.name || "User"}
                  </div>
                  <div className="text-xs text-gray-500">
                    {userInfo.email || ""}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Header Actions */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Connection Status */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg">
              <div
                className={`w-2 h-2 rounded-full ${isAuthenticated ? "bg-green-500 animate-pulse" : "bg-red-500"}`}
              ></div>
              <span className="text-sm font-medium text-gray-700">
                {isAuthenticated ? "Connected" : "Not Connected"}
              </span>
            </div>

            {/* Calculate Metrics Button */}
            <button
              onClick={handleCalculateMetrics}
              disabled={isCalculatingMetrics || competitors.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg hover:opacity-90 transition-opacity shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <BarChart2 className="w-4 h-4" />
              <span>
                {isCalculatingMetrics ? "Calculating..." : "Calculate Metrics"}
              </span>
            </button>

            {/* Add Competitor Button */}
            <button
              onClick={() => setShowAddCompetitor(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:opacity-90 transition-opacity shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Competitor</span>
            </button>

            {/* Refresh Button */}
            <button
              onClick={handleRefreshAds}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              <span>Refresh</span>
            </button>

            {/* Debug Button - Temporary */}
            <button
              onClick={() => {
                if (ads.length > 0) {
                  console.log("Debug spend calculation for first 5 ads:");
                  ads.slice(0, 5).forEach((ad, index) => {
                    console.log(`Ad ${index + 1}:`, {
                      id: ad.id,
                      platform: ad.platform,
                      originalSpend: ad.spend,
                      parsedSpend: parseSpendValue(ad.spend),
                      calculatedSpend: calculateAdSpend(ad),
                      first_seen: ad.first_seen,
                      last_seen: ad.last_seen,
                      lifespan: calculateAdLifespan(ad),
                      is_active: ad.is_active,
                      format: ad.format
                    });
                  });
                }
              }}
              className="px-4 py-2.5 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
            >
              Debug
            </button>
          </div>
        </div>
      </div>

      {/* Trending Search Modal */}
      {showTrendingSearch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Search Trending Content
                  </h3>
                  <p className="text-sm text-gray-600">
                    Real-time search across social media platforms
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowTrendingSearch(false);
                    setError(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Search Keyword */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search Keyword *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={trendingSearchKeyword}
                      onChange={(e) => setTrendingSearchKeyword(e.target.value)}
                      placeholder="e.g., fitness shoes, technology, nike"
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                    <button
                      onClick={() => handleTrendingSearch()}
                      disabled={
                        isSearchingTrending || !trendingSearchKeyword.trim()
                      }
                      className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                    >
                      {isSearchingTrending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Searching...</span>
                        </>
                      ) : (
                        <>
                          <Search className="w-4 h-4" />
                          <span>Search</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Platform Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Platforms *
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      "meta",
                      "instagram",
                      "youtube",
                      "reddit",
                      "linkedin",
                      "tiktok",
                    ].map((platform) => (
                      <button
                        key={platform}
                        onClick={() => toggleTrendingPlatform(platform)}
                        className={`p-4 rounded-lg border-2 flex flex-col items-center justify-center gap-2 transition-all ${
                          selectedTrendingPlatforms.includes(platform)
                            ? "border-orange-500 bg-orange-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div
                          className={`p-2 rounded-full ${
                            selectedTrendingPlatforms.includes(platform)
                              ? "bg-orange-100 text-orange-600"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {platformIcons[platform] || (
                            <Globe className="w-5 h-5" />
                          )}
                        </div>
                        <span className="text-sm font-medium capitalize">
                          {platform === "meta" ? "Facebook" : platform}
                        </span>
                        <span className="text-xs text-gray-500">
                          {selectedTrendingPlatforms.includes(platform)
                            ? "Selected"
                            : "Click to select"}
                        </span>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Select 1-3 platforms for best results. More platforms = more
                    API calls.
                  </p>
                </div>

                {/* How It Works */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">
                    How Trending Search Works
                  </h4>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs mt-0.5 flex-shrink-0">
                        1
                      </div>
                      <span>
                        Real-time API calls to platform APIs (Facebook Ad
                        Library, YouTube, Instagram, etc.)
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs mt-0.5 flex-shrink-0">
                        2
                      </div>
                      <span>
                        Parallel search across selected platforms (all at once,
                        not sequential)
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs mt-0.5 flex-shrink-0">
                        3
                      </div>
                      <span>
                        Smart scoring algorithm (engagement, recency, platform
                        quality)
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs mt-0.5 flex-shrink-0">
                        4
                      </div>
                      <span>
                        Cross-platform ranking to show top-performing content
                        across all platforms
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowTrendingSearch(false);
                    setError(null);
                  }}
                  className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleTrendingSearch()}
                  disabled={
                    isSearchingTrending ||
                    !trendingSearchKeyword.trim() ||
                    selectedTrendingPlatforms.length === 0
                  }
                  className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSearchingTrending ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Searching...
                    </span>
                  ) : (
                    "Search Trending Content"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Competitor Modal */}
      {showAddCompetitor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Add New Competitor
                  </h3>
                  <p className="text-sm text-gray-600">
                    Track their advertising activities
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowAddCompetitor(false);
                    setError(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Competitor Name *
                  </label>
                  <input
                    type="text"
                    value={newCompetitor.name}
                    onChange={(e) =>
                      setNewCompetitor({
                        ...newCompetitor,
                        name: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="e.g., Nike Running"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Website Domain
                  </label>
                  <input
                    type="text"
                    value={newCompetitor.domain}
                    onChange={(e) =>
                      setNewCompetitor({
                        ...newCompetitor,
                        domain: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="e.g., nike.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Industry
                  </label>
                  <input
                    type="text"
                    value={newCompetitor.industry}
                    onChange={(e) =>
                      setNewCompetitor({
                        ...newCompetitor,
                        industry: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="e.g., Sportswear, E-commerce"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estimated Monthly Ad Spend ($)
                  </label>
                  <input
                    type="number"
                    value={newCompetitor.estimated_monthly_spend || ""}
                    onChange={(e) =>
                      setNewCompetitor({
                        ...newCompetitor,
                        estimated_monthly_spend: e.target.value
                          ? parseInt(e.target.value)
                          : 0,
                      })
                    }
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="e.g., 50000"
                  />
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowAddCompetitor(false);
                    setError(null);
                  }}
                  className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddCompetitor}
                  disabled={!newCompetitor.name.trim()}
                  className="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Competitor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Summary Metrics */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Total Spend */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-xs text-gray-500">Monthly</div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">
                {summaryMetrics
                  ? formatCurrencyShort(summaryMetrics.total_competitor_spend)
                  : "$0"}
              </h3>
              <p className="text-gray-600 text-sm">Total Competitor Spend</p>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">
                    Across {competitors.length} competitors
                  </span>
                  <button
                    onClick={() => setActiveChart("financial")}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    View details →
                  </button>
                </div>
              </div>
            </div>

            {/* Active Campaigns */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-green-50 rounded-lg">
                  <Target className="w-5 h-5 text-green-600" />
                </div>
                <div className="text-xs text-gray-500">Live</div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">
                {summaryMetrics
                  ? formatNumber(summaryMetrics.active_campaigns)
                  : "0"}
              </h3>
              <p className="text-gray-600 text-sm">Active Campaigns</p>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Live monitoring</span>
                  <button
                    onClick={() => loadRecentAds()}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Track →
                  </button>
                </div>
              </div>
            </div>

            {/* Total Impressions */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <Eye className="w-5 h-5 text-purple-600" />
                </div>
                <div className="text-xs text-gray-500">Reach</div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">
                {summaryMetrics
                  ? formatNumber(summaryMetrics.total_impressions)
                  : "0"}
              </h3>
              <p className="text-gray-600 text-sm">Total Impressions</p>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Combined reach</span>
                  <button
                    onClick={() => setActiveChart("trends")}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Analyze →
                  </button>
                </div>
              </div>
            </div>

            {/* Average CTR */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-orange-50 rounded-lg">
                  <MousePointer className="w-5 h-5 text-orange-600" />
                </div>
                <div className="text-xs text-gray-500">Avg.</div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">
                {summaryMetrics
                  ? formatPercentage(summaryMetrics.avg_ctr)
                  : "0%"}
              </h3>
              <p className="text-gray-600 text-sm">Avg. CTR</p>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Industry benchmark</span>
                  <button
                    onClick={() => setActiveChart("performance")}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Compare →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Platform Distribution */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">
              Platform Distribution
            </h3>
            <Globe className="w-5 h-5 text-gray-400" />
          </div>

          {platformStats.length > 0 ? (
            <div className="space-y-4">
              {platformStats.map((platform, index) => (
                <div
                  key={`${platform.platform}-${index}`}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: platform.color }}
                      />
                      <span className="text-sm font-medium text-gray-700">
                        {platform.platform}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">
                      {formatCurrencyShort(platform.total_spend)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(platform.percentage || 0, 100)}%`,
                        backgroundColor: platform.color,
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{formatNumber(platform.ad_count)} ads</span>
                    <span>{formatPercentage(platform.avg_ctr)} CTR</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <Globe className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">
                No platform data available
              </p>
              <button
                onClick={handleCalculateMetrics}
                className="mt-3 text-sm text-blue-600 hover:text-blue-800"
              >
                Calculate metrics →
              </button>
            </div>
          )}

          {platformStats.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Total across platforms</span>
                <span className="font-semibold text-gray-900">
                  {formatCurrencyShort(
                    platformStats.reduce(
                      (sum, p) => sum + (p.total_spend || 0),
                      0,
                    ),
                  )}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Trending Ads Section */}
      <div className="mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Trending Ads & Content
                  </h3>
                  <p className="text-sm text-gray-600">
                    Discover trending ads across all platforms
                  </p>
                </div>
              </div>
              {showResults && trendingSearchResult && (
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 bg-orange-100 text-orange-800 rounded-full">
                    "{trendingSearchResult.keyword}"
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatDate(new Date().toISOString())}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="p-5">
            {!showResults ? (
              // Initial State: Only search bar and suggestions
              <>
                {/* Main Search Bar */}
                <div className="max-w-3xl mx-auto mb-8">
                  <div className="relative">
                    <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      value={trendingSearchKeyword}
                      onChange={(e) => setTrendingSearchKeyword(e.target.value)}
                      placeholder="Search any keyword to discover trending ads..."
                      className="w-full pl-12 pr-32 py-4 text-lg border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleTrendingSearch()
                      }
                    />
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                      <button
                        onClick={() => handleTrendingSearch()}
                        disabled={
                          isSearchingTrending || !trendingSearchKeyword.trim()
                        }
                        className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                      >
                        {isSearchingTrending ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Searching...</span>
                          </>
                        ) : (
                          <>
                            <Search className="w-4 h-4" />
                            <span>Search</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mt-2 text-center">
                    Press Enter or click Search to discover trending ads
                  </p>
                </div>

                {/* Search History & Suggestions */}
                <div className="max-w-6xl mx-auto">
                  {/* Search History */}
                  {searchHistory.length > 0 && (
                    <div className="mb-8">
                      <div className="flex items-center gap-2 mb-4">
                        <History className="w-5 h-5 text-gray-400" />
                        <h4 className="font-medium text-gray-900">
                          Recent Searches
                        </h4>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {searchHistory.map((keyword, index) => (
                          <button
                            key={index}
                            onClick={() => handleSuggestionClick(keyword)}
                            className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center gap-2 transition-colors"
                          >
                            <ClockIcon2 className="w-4 h-4" />
                            <span>{keyword}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Popular Suggestions */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUpIcon2 className="w-5 h-5 text-orange-500" />
                      <h4 className="font-medium text-gray-900">
                        Popular Search Suggestions
                      </h4>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      {searchSuggestions.map((suggestion) => (
                        <button
                          key={suggestion.id}
                          onClick={() =>
                            handleSuggestionClick(suggestion.keyword)
                          }
                          className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 border border-gray-200 rounded-xl text-left group transition-all hover:shadow-md"
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-white rounded-lg group-hover:bg-orange-50 transition-colors">
                              <div className="text-orange-500">
                                {suggestion.icon}
                              </div>
                            </div>
                            <div className="flex-1">
                              <h5 className="font-medium text-gray-900 group-hover:text-orange-600">
                                {suggestion.keyword}
                              </h5>
                              <p className="text-xs text-gray-500">
                                {suggestion.category}
                              </p>
                            </div>
                          </div>
                          <div className="text-xs text-gray-400 flex items-center gap-1">
                            <HashIcon className="w-3 h-3" />
                            Click to search trending ads
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              // Results State: Show trending ads in grid
              <>
                {isSearchingTrending ? (
                  <div className="py-12 text-center">
                    <div className="w-12 h-12 border-2 border-t-orange-500 border-gray-200 rounded-full animate-spin mx-auto"></div>
                    <p className="mt-4 text-gray-600">
                      Searching trending content for "{trendingSearchKeyword}
                      "...
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      Searching across {selectedTrendingPlatforms.length}{" "}
                      platforms
                    </p>
                  </div>
                ) : trendingAds.length > 0 ? (
                  <>
                    {/* Platform Filter */}
                    <div className="mb-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            Trending ads for "
                            {trendingSearchResult?.keyword ||
                              trendingSearchKeyword}
                            "
                          </h4>
                          <p className="text-sm text-gray-600">
                            {trendingAds.length} results found • Sorted by
                            engagement score
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">
                            Platforms:
                          </span>
                          <div className="flex gap-2">
                            {["meta", "instagram", "youtube", "tiktok"].map(
                              (platform) => (
                                <button
                                  key={platform}
                                  onClick={() =>
                                    toggleTrendingPlatform(platform)
                                  }
                                  className={`px-3 py-1.5 text-sm rounded-lg border flex items-center gap-2 ${
                                    selectedTrendingPlatforms.includes(platform)
                                      ? "border-orange-500 bg-orange-50 text-orange-700"
                                      : "border-gray-300 hover:border-gray-400"
                                  }`}
                                >
                                  {platformIcons[platform] || (
                                    <Globe className="w-4 h-4" />
                                  )}
                                  <span className="capitalize">
                                    {platform === "meta"
                                      ? "Facebook"
                                      : platform}
                                  </span>
                                </button>
                              ),
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Trending Ads Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                      {trendingAds.map((ad, index) => (
                        <div
                          key={ad.id || `${ad.platform}-${index}`}
                          className="bg-gray-50 rounded-lg overflow-hidden hover:shadow-md transition-shadow border border-gray-200"
                        >
                          {/* Image/Video Preview */}
                          <div className="aspect-video bg-gray-200 relative overflow-hidden">
                            {ad.image_url || ad.thumbnail ? (
                              <img
                                src={
                                  proxyImageUrl(ad.image_url) || ad.thumbnail
                                }
                                alt={ad.title}
                                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src =
                                    "https://via.placeholder.com/300x200?text=No+Image";
                                }}
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
                                <div className="text-center">
                                  {ad.video_url ? (
                                    <PlayCircle className="w-12 h-12 text-gray-500" />
                                  ) : (
                                    <ImageIcon className="w-12 h-12 text-gray-500" />
                                  )}
                                </div>
                              </div>
                            )}
                            <div className="absolute top-2 left-2">
                              <span className="px-2 py-1 bg-black/70 text-white text-xs rounded flex items-center gap-1">
                                {platformIcons[ad.platform] || (
                                  <Globe className="w-3 h-3" />
                                )}
                                <span className="capitalize">
                                  {ad.platform === "meta"
                                    ? "Facebook"
                                    : ad.platform}
                                </span>
                              </span>
                            </div>
                            <div className="absolute top-2 right-2">
                              <span className="px-2 py-1 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs rounded font-bold">
                                #{ad.rank || index + 1}
                              </span>
                            </div>
                            <div className="absolute bottom-2 left-2">
                              <span className="px-2 py-1 bg-black/70 text-white text-xs rounded">
                                Score: {ad.score?.toFixed(1) || "N/A"}
                              </span>
                            </div>
                          </div>

                          {/* Content */}
                          <div className="p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-medium text-gray-900 truncate">
                                {ad.competitor_name ||
                                  ad.advertiser ||
                                  ad.channel ||
                                  ad.owner ||
                                  "Unknown Source"}
                              </span>
                              <div className="flex items-center">
                                <div
                                  className={`w-2 h-2 rounded-full mr-1 ${
                                    ad.engagement_score >= 80
                                      ? "bg-green-500"
                                      : ad.engagement_score >= 60
                                        ? "bg-yellow-500"
                                        : ad.engagement_score >= 40
                                          ? "bg-orange-500"
                                          : "bg-red-500"
                                  }`}
                                ></div>
                                <span className="text-xs text-gray-500">
                                  {ad.engagement_score}%
                                </span>
                              </div>
                            </div>

                            <h4 className="text-sm font-medium text-gray-900 line-clamp-2 mb-2 min-h-[2.5rem]">
                              {ad.title || ad.headline || "No title"}
                            </h4>

                            <p className="text-xs text-gray-600 line-clamp-2 mb-3">
                              {ad.description || "No description"}
                            </p>

                            {/* Engagement Metrics */}
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1">
                                  <Eye className="w-3 h-3 text-gray-400" />
                                  <span className="text-xs text-gray-600">
                                    {formatNumber(ad.views || ad.impressions)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Heart className="w-3 h-3 text-red-400" />
                                  <span className="text-xs text-gray-600">
                                    {formatNumber(ad.likes)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <MessageCircle className="w-3 h-3 text-blue-400" />
                                  <span className="text-xs text-gray-600">
                                    {formatNumber(ad.comments)}
                                  </span>
                                </div>
                              </div>
                              {ad.spend &&
                                typeof ad.spend === "number" &&
                                ad.spend > 0 && (
                                  <span className="text-xs font-medium text-green-600">
                                    {formatCurrencyShort(ad.spend)}
                                  </span>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-500">
                                {formatDate(
                                  ad.created_at ||
                                    ad.published_at ||
                                    ad.taken_at,
                                )}
                              </span>
                              {ad.url && ad.url !== "#" && (
                                <a
                                  href={ad.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 flex items-center"
                                >
                                  <LinkIcon className="w-3 h-3 mr-1" />
                                  View
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* New Search Button */}
                    <div className="mt-8 pt-6 border-t border-gray-200">
                      <div className="text-center">
                        <button
                          onClick={handleNewSearch}
                          className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:opacity-90 flex items-center gap-2 mx-auto"
                        >
                          <Search className="w-4 h-4" />
                          <span>New Search</span>
                        </button>
                        <p className="text-sm text-gray-500 mt-2">
                          Search for different trending ads
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-12 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <Search className="w-8 h-8 text-gray-400" />
                    </div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">
                      No results found for "{trendingSearchKeyword}"
                    </h4>
                    <p className="text-gray-600 mb-6">
                      Try different keywords or adjust your search
                    </p>
                    <button
                      onClick={handleNewSearch}
                      className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:opacity-90"
                    >
                      Try Another Search
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Competitors Metrics Summary - UPDATED: Uses frontend-calculated metrics */}
      {metricsSummary.length > 0 && (
        <div className="mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg">
                    <TargetIcon2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Competitors Performance
                    </h3>
                    <p className="text-sm text-gray-600">
                      Ranked by opportunity score (calculated in frontend)
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                        Competitor
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                        Active Ads
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                        Monthly Spend
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                        Avg CTR
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                        Risk Score
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                        Opportunity Score
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {metricsSummary.map((summary, index) => (
                      <tr
                        key={summary.competitor_id}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-gray-800 to-gray-600 rounded-lg flex items-center justify-center text-white font-semibold text-sm">
                              {summary.competitor_name?.charAt(0) || "C"}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">
                                {summary.competitor_name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {formatDate(summary.last_calculated)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-gray-900 font-medium">
                            {formatNumber(summary.active_ads)}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-gray-900 font-medium">
                            {formatCurrencyShort(
                              summary.estimated_monthly_spend,
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-gray-900 font-medium">
                            {formatPercentage(summary.avg_ctr)}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div
                            className={`px-3 py-1 rounded-full text-sm font-medium inline-block ${getScoreColor(summary.risk_score)}`}
                          >
                            {summary.risk_score}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div
                            className={`px-3 py-1 rounded-full text-sm font-medium inline-block ${getScoreColor(summary.opportunity_score)}`}
                          >
                            {summary.opportunity_score}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Competitors List & Live Ad Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
        {/* Competitors List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-full">
            <div className="p-5 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">
                  Tracked Competitors
                </h3>
                <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                  {competitors.length} total
                </span>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search competitors..."
                  className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="p-3">
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {competitors.map((competitor) => (
                  <div
                    key={competitor.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedCompetitor === competitor.id
                        ? "bg-blue-50 border border-blue-200"
                        : "hover:bg-gray-50"
                    }`}
                    onClick={() => {
                      setSelectedCompetitor(competitor.id);
                      setSelectedCompany(competitor.id);
                      loadRecentAds(competitor.id);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-gray-800 to-gray-600 rounded-lg flex items-center justify-center text-white font-semibold text-sm">
                          {competitor.name?.charAt(0) || "C"}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 text-sm">
                            {competitor.name}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {competitor.industry || "No industry"}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-semibold text-gray-700">
                          {formatNumber(competitor.ads_count)} ads
                        </div>
                        <div className="text-xs text-gray-500">
                          {competitor.last_fetched_at
                            ? formatDate(competitor.last_fetched_at)
                            : "Never fetched"}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {competitors.length === 0 && (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                      <Users className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-gray-600 text-sm">
                      No competitors tracked yet
                    </p>
                    <button
                      onClick={() => setShowAddCompetitor(true)}
                      className="mt-3 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      Add your first competitor →
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Live Ad Feed */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-full">
            <div className="px-5 py-4 border-b border-gray-200">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Live Ad Feed
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                      {filteredAds.length} ads
                    </span>
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                      {new Date().toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Company Filter */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">Company:</label>
                    <select
                      className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={selectedCompany}
                      onChange={(e) => {
                        setSelectedCompany(e.target.value);
                        if (e.target.value !== "all") {
                          setSelectedCompetitor(e.target.value);
                          loadRecentAds(e.target.value);
                        } else {
                          setSelectedCompetitor(null);
                          loadRecentAds();
                        }
                      }}
                    >
                      <option value="all">All Companies</option>
                      {competitors.map((comp) => (
                        <option key={comp.id} value={comp.id}>
                          {comp.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Platform Filter */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">Platform:</label>
                    <select
                      className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={selectedPlatform}
                      onChange={(e) => setSelectedPlatform(e.target.value)}
                    >
                      <option value="all">All Platforms</option>
                      <option value="google">Google</option>
                      <option value="meta">Meta</option>
                      <option value="tiktok">TikTok</option>
                      <option value="linkedin">LinkedIn</option>
                      <option value="youtube">YouTube</option>
                      <option value="instagram">Instagram</option>
                      <option value="twitter">Twitter</option>
                      <option value="reddit">Reddit</option>
                      <option value="pinterest">Pinterest</option>
                    </select>
                  </div>

                  {/* View Toggle */}
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setDataViewMode("latest")}
                      className={`px-3 py-1.5 text-sm rounded-md flex items-center gap-2 ${
                        dataViewMode === "latest"
                          ? "bg-blue-600 text-white"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      <Clock className="w-4 h-4" />
                      Latest
                    </button>
                    <button
                      onClick={() => setDataViewMode("historical")}
                      className={`px-3 py-1.5 text-sm rounded-md flex items-center gap-2 ${
                        dataViewMode === "historical"
                          ? "bg-blue-600 text-white"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      <Calendar className="w-4 h-4" />
                      Historical
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Ad List */}
            <div className="divide-y divide-gray-100">
              {filteredAds.length > 0 ? (
                filteredAds.slice(0, 10).map((ad, index) => (
                  <div
                    key={ad.id || index}
                    className="px-5 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-gray-800 to-gray-600 rounded-lg flex items-center justify-center text-white font-semibold">
                          {ad.competitor_name?.charAt(0) || "A"}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h4 className="font-semibold text-gray-900">
                              {ad.competitor_name}
                            </h4>
                            <span
                              className={`px-2 py-0.5 text-xs rounded-full ${getStatusBadge(ad.is_active)}`}
                            >
                              {ad.is_active ? "ACTIVE" : "INACTIVE"}
                            </span>
                            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                              {ad.platform?.toUpperCase() || "UNKNOWN"}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatDate(ad.last_seen || ad.created_at)}
                            </span>
                          </div>
                          <h5 className="text-gray-900 font-medium">
                            {ad.headline || "No Title"}
                          </h5>
                        </div>
                      </div>
                      <button className="text-gray-400 hover:text-gray-600 p-1">
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      {/* Ad Content */}
                      <div className="md:col-span-2">
                        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                          {ad.description ||
                            ad.full_text ||
                            "No description available"}
                        </p>

                        {/* Image Preview */}
                        {ad.image_url && (
                          <div className="mt-3">
                            <div className="flex items-center gap-2 mb-2">
                              <ImageIcon className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-600">
                                Ad Creative
                              </span>
                            </div>
                            <div className="relative rounded-lg overflow-hidden border border-gray-200 max-w-xs">
                              <img
                                src={proxyImageUrl(ad.image_url)}
                                alt={ad.headline}
                                className="w-full h-48 object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src =
                                    "https://via.placeholder.com/300x200?text=No+Image";
                                }}
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute bottom-2 right-2">
                                <a
                                  href={ad.image_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2 py-1 bg-black/70 text-white text-xs rounded hover:bg-black"
                                >
                                  View Full
                                </a>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Destination URL */}
                        {ad.destination_url && (
                          <div className="mt-3 flex items-center gap-2">
                            <LinkIcon className="w-4 h-4 text-gray-400" />
                            <a
                              href={ad.destination_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:text-blue-800 truncate"
                            >
                              {ad.destination_url}
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Metrics Grid */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <div className="text-xs text-gray-500 mb-1">
                            Spend
                          </div>
                          <div className="font-semibold text-gray-900">
                            {formatCurrency(ad.spend)}
                          </div>
                        </div>

                        <div className="bg-gray-50 p-3 rounded-lg">
                          <div className="text-xs text-gray-500 mb-1">
                            Impressions
                          </div>
                          <div className="font-semibold text-gray-900">
                            {formatNumber(
                              typeof ad.impressions === "number"
                                ? ad.impressions
                                : parseImpressionValue(ad.impressions),
                            )}
                          </div>
                        </div>

                        <div className="bg-gray-50 p-3 rounded-lg">
                          <div className="text-xs text-gray-500 mb-1">
                            First Seen
                          </div>
                          <div className="font-semibold text-gray-900 text-sm">
                            {formatDate(ad.first_seen)}
                          </div>
                        </div>

                        <div className="bg-gray-50 p-3 rounded-lg">
                          <div className="text-xs text-gray-500 mb-1">
                            Last Seen
                          </div>
                          <div className="font-semibold text-gray-900 text-sm">
                            {formatDate(ad.last_seen || ad.created_at)}
                          </div>
                        </div>

                        <div className="bg-gray-50 p-3 rounded-lg col-span-2">
                          <div className="text-xs text-gray-500 mb-1">
                            Actions
                          </div>
                          <div className="flex gap-2">
                            <button className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 flex-1">
                              Analyze
                            </button>
                            <button className="text-xs px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-100 flex-1">
                              Clone
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-5 py-12 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <Eye className="w-8 h-8 text-gray-400" />
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">
                    No Ads Found
                  </h4>
                  <p className="text-gray-600 mb-6">
                    {searchQuery ||
                    selectedPlatform !== "all" ||
                    selectedCompany !== "all"
                      ? "Try adjusting your search or filter criteria"
                      : "Start tracking competitors to see their ads"}
                  </p>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedPlatform("all");
                        setSelectedCompany("all");
                        setSelectedCompetitor(null);
                        loadRecentAds();
                     
                      }}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      Clear Filters
                    </button>
                    <button
                      onClick={() => setShowAddCompetitor(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
    </div>
    <Footer />
    </>
  );
};

export default AdSurveillance;
