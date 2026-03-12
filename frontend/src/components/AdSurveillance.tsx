import React, { useState, useEffect } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { svgPlaceholder } from "@/utils/imageFallback";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Eye,
  Filter,
  Search,
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
  RefreshCw,
  ShoppingBag,
  Shirt,
  Utensils,
  Smartphone as SmartphoneIcon,
  Car,
  Home,
  History,
  PlayCircle,
  Image as ImageIcon,
  Link as LinkIcon,
  MessageCircle,
  Hash as HashIcon,
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
  thumbnail?: string;
  video_url: string;
  format: string;
  impressions: string | number;
  spend: number;
  is_active: boolean;
  is_official?: boolean;
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
  competitorSpend: Record<string, unknown>[];
  spendRanges: Record<string, unknown>[];
  ctrPerformance: Record<string, unknown>[];
  spendImpressions: Record<string, unknown>[];
  platformCTR: Record<string, unknown>[];
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

// ── VideoPlayer: tries direct → proxy → fallback link ──────────────────────
const VideoPlayer: React.FC<{ videoUrl: string }> = ({ videoUrl }) => {
  const [mode, setMode] = React.useState<"direct" | "proxy" | "fallback">("direct");

  // Detect if the URL is a direct video file we can try to embed
  const isDirectVideo =
    /\.(mp4|webm|ogg|mov)(\?|$)/i.test(videoUrl) ||
    videoUrl.includes("video.") ||
    videoUrl.includes("cdninstagram") ||
    videoUrl.includes("fbcdn") ||
    videoUrl.includes("scontent");

  // Use direct URL — no third-party proxy needed
  const proxiedUrl = videoUrl;

  if (mode === "fallback" || !isDirectVideo) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-10 px-6 bg-[#0a0a0a]">
        <div className="w-12 h-12 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center">
          <svg className="w-5 h-5 text-[#0ea5e9]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
        <p className="text-[#888] text-sm text-center">Video cannot be embedded due to platform restrictions.</p>
        <a
          href={videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-[#0ea5e9] hover:bg-[#0284c7] text-white text-sm font-medium rounded-lg transition-colors">
          Open Video in New Tab →
        </a>
      </div>
    );
  }

  if (mode === "proxy") {
    return (
      <video
        key="proxy"
        src={proxiedUrl}
        controls
        className="w-full max-h-64 object-contain bg-black"
        crossOrigin="anonymous"
        onError={() => setMode("fallback")}
      />
    );
  }

  // mode === "direct"
  return (
    <video
      key="direct"
      src={videoUrl}
      controls
      className="w-full max-h-64 object-contain bg-black"
      crossOrigin="anonymous"
      onError={() => setMode("proxy")}
    />
  );
};

const AdSurveillance = () => {
  // User state
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_isAuthenticated, setIsAuthenticated] = useState(false);

  // Competitors state
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [selectedCompetitor, setSelectedCompetitor] = useState<string | null>(
    null,
  );
  const [showAddCompetitor, setShowAddCompetitor] = useState(false);
  const [isAddingCompetitor, setIsAddingCompetitor] = useState(false);
  const [addCompetitorStatus, setAddCompetitorStatus] = useState<"idle" | "creating" | "fetching">("idle");
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_analyticsData, _setAnalyticsData] = useState<AnalyticsData | null>(
    null,
  );
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_activeChart, _setActiveChart] = useState("overview");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Trending ads state
  const [trendingAds, setTrendingAds] = useState<TrendingAdWithEngagement[]>(
    [],
  );
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_isLoadingTrending, setIsLoadingTrending] = useState(false);
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
  const [liveAdTypeFilter, setLiveAdTypeFilter] = useState<"all" | "official" | "unofficial">("all");

  // Error state
  const [error, setError] = useState<string | null>(null);

  // ============================================
  // PAGINATION STATE
  // ============================================
  const ADS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);

  // ============================================
  // ANALYZE / CLONE / TRACK STATE
  // ============================================
  const [analyzeAd, setAnalyzeAd] = useState<AdData | null>(null);
  const [cloneAd, setCloneAd] = useState<AdData | null>(null);
  const [cloneCopied, setCloneCopied] = useState(false);

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

  const ACTIVE_AD_MAX_AGE_DAYS = 14;
  const MIN_LIVE_AD_IMPRESSIONS = 10000;

  // Derive active status when API value is missing by using recency.
  const resolveAdActiveStatus = (ad: {
    is_active?: boolean;
    last_seen?: string;
    created_at?: string;
    first_seen?: string;
  }): boolean => {
    if (typeof ad.is_active === "boolean") return ad.is_active;

    const lastSeenValue = ad.last_seen || ad.created_at || ad.first_seen;
    if (!lastSeenValue) return false;

    const lastSeenDate = new Date(lastSeenValue);
    if (Number.isNaN(lastSeenDate.getTime())) return false;

    const ageDays =
      (Date.now() - lastSeenDate.getTime()) / (1000 * 60 * 60 * 24);
    return ageDays <= ACTIVE_AD_MAX_AGE_DAYS;
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          allAds = adsData.map((ad) => {
            // Parse spend and impressions safely
            const parsedSpend = parseSpendValue(ad.spend);
            const parsedImpressions = parseImpressionValue(ad.impressions);

            return {
              ...ad,
              competitor_name: ad.competitor_name || "",
              impressions: parsedImpressions,
              spend: parsedSpend,
              is_active: resolveAdActiveStatus({
                is_active: ad.is_active,
                last_seen: ad.last_seen,
                created_at: ad.created_at,
                first_seen: ad.first_seen,
              }),
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

  // Load recent ads - UPDATED to use getAllAds. When a competitor is selected, pass isOfficial so the API returns official/unofficial-only when that filter is on (avoids limit pushing those ads out).
  const loadRecentAds = async (competitorId?: string, isOfficial?: boolean) => {
    try {
      console.log("Loading recent ads...", competitorId ? { competitorId, isOfficial } : "all");
      let adsData: AdData[] = [];

      if (competitorId) {
        const effectiveOfficial =
          isOfficial !== undefined
            ? isOfficial
            : liveAdTypeFilter === "official"
              ? true
              : liveAdTypeFilter === "unofficial"
                ? false
                : undefined;
        const data = await AdsAPI.getCompetitorAds(
          competitorId,
          undefined,
          500,
          effectiveOfficial,
        );
        console.log("Competitor ads API response:", data?.length ?? 0, "ads (requested limit=500)");

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
              is_active: resolveAdActiveStatus({
                is_active: ad.is_active,
                last_seen: ad.last_seen,
                created_at: ad.created_at,
                first_seen: ad.first_seen,
              }),
            };
          });
        }
      } else {
        // Get all ads
        try {
          const data = await AdsAPI.getAllAds(500);
          console.log("All ads API response:", data);

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
                is_active: resolveAdActiveStatus({
                  is_active: ad.is_active,
                  last_seen: ad.last_seen,
                  created_at: ad.created_at,
                  first_seen: ad.first_seen,
                }),
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
                    is_active: resolveAdActiveStatus({
                      is_active: ad.is_active,
                      last_seen: ad.last_seen,
                      created_at: ad.created_at,
                      first_seen: ad.first_seen,
                    }),
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
    } catch (error: unknown) {
      console.error("Trending search error:", error);
      setError(`Trending search failed: ${error instanceof Error ? error.message : String(error)}`);
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

  // All trending ads (no type filter in this section)
  const filteredTrendingAds = trendingAds;

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
    } catch (error: unknown) {
      console.error("Error calculating metrics:", error);
      setError(`Failed to calculate metrics: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsCalculatingMetrics(false);
    }
  };

  // When competitor or Official/Unofficial filter changes, refetch so the API returns the right set (e.g. is_official=true returns only official ads and they are not pushed out by the limit).
  useEffect(() => {
    if (!selectedCompetitor) return;
    const isOfficial =
      liveAdTypeFilter === "official"
        ? true
        : liveAdTypeFilter === "unofficial"
          ? false
          : undefined;
    loadRecentAds(selectedCompetitor, isOfficial);
  }, [liveAdTypeFilter, selectedCompetitor]);

  // Filter ads based on search, platform, and company
  useEffect(() => {
    let filtered = [...ads];

    // Always show only active ads in Live Ad Feed.
    filtered = filtered.filter((ad) => resolveAdActiveStatus(ad));

    // Visibility filter: require minimum impressions or spend so the feed isn't cluttered with tiny ads.
    // When user has selected "Official" or "Unofficial", skip this so they see all ads that match the flag (e.g. 50 official Meta ads that may have no spend/impressions yet).
    if (liveAdTypeFilter === "all") {
      filtered = filtered.filter((ad) => {
        const impressions = parseImpressionValue(ad.impressions);
        if (impressions > 0) return impressions >= MIN_LIVE_AD_IMPRESSIONS;
        const spend = parseSpendValue(ad.spend);
        return spend >= 300;
      });
    }

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

    // Filter by official/unofficial (use backend is_official only; no platform/spend fallback)
    if (liveAdTypeFilter !== "all") {
      filtered = filtered.filter((ad) => {
        const isOfficial = ad?.is_official === true;
        if (liveAdTypeFilter === "official") return isOfficial;
        if (liveAdTypeFilter === "unofficial") return !isOfficial; // false or undefined = unofficial
        return true;
      });
    }

    setFilteredAds(filtered);
    setCurrentPage(1);
  }, [ads, searchQuery, selectedPlatform, selectedCompany, liveAdTypeFilter]);

  // Add competitor handler – then auto-refresh ads for the new competitor
  const handleAddCompetitor = async () => {
    if (!newCompetitor.name.trim()) {
      setError("Competitor name is required");
      return;
    }

    setIsAddingCompetitor(true);
    setAddCompetitorStatus("creating");
    setError(null);

    try {
      const created = await CompetitorsAPI.create(newCompetitor) as { id?: string; name?: string };

      // Auto-refresh ads for the newly added competitor
      if (created?.id) {
        setAddCompetitorStatus("fetching");
        setIsRefreshing(true);
        try {
          await AdsAPI.refreshCompetitor(created.id);
          await new Promise((r) => setTimeout(r, 2500));
          await loadCompetitors();
          await loadRecentAds(created.id);
          setSelectedCompetitor(created.id);
          setSelectedCompany(created.id);
          const list = await CompetitorsAPI.list();
          await calculateFrontendMetrics(list);
        } catch (refreshErr: unknown) {
          console.error("Error refreshing ads for new competitor:", refreshErr);
          // Don't block modal close on refresh failure
        } finally {
          setIsRefreshing(false);
        }
      } else {
        await loadCompetitors();
      }

      setNewCompetitor({
        name: "",
        domain: "",
        industry: "",
        estimated_monthly_spend: 0,
      });
      setShowAddCompetitor(false);
      setError(null);
    } catch (error: unknown) {
      console.error("Error adding competitor:", error);
      setError(error instanceof Error ? error.message : "Failed to add competitor");
    } finally {
      setIsAddingCompetitor(false);
      setAddCompetitorStatus("idle");
    }
  };

  // ============================================
  // ANALYZE / CLONE / TRACK HANDLERS
  // ============================================

  const handleAnalyze = (ad: AdData) => {
    setAnalyzeAd(ad);
  };

  const handleCloneStrategy = (ad: AdData) => {
    setCloneAd(ad);
    setCloneCopied(false);
  };

  const getAdLink = (ad: AdData): string | null => {
    const raw = (ad.destination_url || "").trim();
    if (raw) {
      // If already a Meta ad library permalink, use it as-is.
      if (/facebook\.com\/ads\/library/i.test(raw)) return raw;

      // If this is a Meta/Facebook ad and we have platform ID, prefer ad-library URL over landing page.
      const platform = (ad.platform || "").toLowerCase();
      if ((platform === "meta" || platform === "facebook") && ad.platform_ad_id) {
        return `https://www.facebook.com/ads/library/?id=${encodeURIComponent(ad.platform_ad_id)}`;
      }

      return raw;
    }

    // Fallback for older rows where destination_url stored landing page only / or is missing.
    const platform = (ad.platform || "").toLowerCase();
    if ((platform === "meta" || platform === "facebook") && ad.platform_ad_id) {
      return `https://www.facebook.com/ads/library/?id=${encodeURIComponent(ad.platform_ad_id)}`;
    }

    return null;
  };

  // Build the clone strategy text
  const buildCloneStrategyText = (ad: AdData): string => {
    const spend = calculateAdSpend(ad);
    const impressions = calculateAdImpressions(ad);
    const lifespan = calculateAdLifespan(ad);
    const ctr = 2.5;
    const estimatedClicks = Math.round((impressions * ctr) / 100);
    const cpc = estimatedClicks > 0 ? spend / estimatedClicks : 0;

    return `AD STRATEGY CLONE — ${ad.competitor_name || "Competitor"} (${ad.platform?.toUpperCase() || "UNKNOWN"})
${"=".repeat(60)}

📋 ORIGINAL AD DETAILS
  Headline   : ${ad.headline || "N/A"}
  Platform   : ${ad.platform?.toUpperCase() || "N/A"}
  Format     : ${ad.format || "N/A"}
  Status     : ${ad.is_active ? "Active" : "Paused"}
  First Seen : ${formatDate(ad.first_seen)}
  Last Seen  : ${formatDate(ad.last_seen)}
  Ad Lifespan: ${Math.round(lifespan)} days

📊 PERFORMANCE METRICS
  Est. Spend      : ${formatCurrency(spend)}
  Est. Impressions: ${formatNumber(impressions)}
  Est. CTR        : ${ctr}%
  Est. Clicks     : ${formatNumber(estimatedClicks)}
  Est. CPC        : ${formatCurrency(cpc)}

🎯 AD COPY
${ad.description || ad.full_text || ad.headline || "No copy available."}

🚀 STRATEGY TO REPLICATE
  1. Platform  : Target ${ad.platform?.toUpperCase() || "same platform"} audience
  2. Budget    : Start with ~${formatCurrency(Math.round(spend / Math.max(lifespan, 1))) + "/day"}
  3. Format    : Use ${ad.format || "same format"} creative
  4. Targeting : Match audience of ${ad.competitor_name || "competitor"}
  5. Angle     : Mirror the messaging angle — adapt for your brand
  6. Duration  : Run for at least ${Math.round(lifespan)} days to match lifespan
  7. CTA       : Replicate call-to-action from original ad copy

💡 KEY INSIGHTS
  • This ad has been ${ad.is_active ? "running and still active" : "paused — may have ended naturally"}
  • Estimated daily budget: ${formatCurrency(Math.round(spend / Math.max(lifespan, 1)))}
  • High-performing format on ${ad.platform || "this platform"}: ${ad.format || "image"}
  • Destination: ${ad.destination_url || "N/A"}`;
  };

  const handleCopyCloneStrategy = async (ad: AdData) => {
    const text = buildCloneStrategyText(ad);
    try {
      await navigator.clipboard.writeText(text);
      setCloneCopied(true);
      setTimeout(() => setCloneCopied(false), 2500);
    } catch {
      // Fallback for browsers without clipboard API
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCloneCopied(true);
      setTimeout(() => setCloneCopied(false), 2500);
    }
  };

  // Refresh ads handler - calls backend to refetch from platforms (Meta, Google, etc.)
  const handleRefreshAds = async () => {
    const action = selectedCompetitor ? `refresh competitor ${selectedCompetitor}` : "refresh-all";
    console.log("[Refresh ads] Starting", { action, competitorsCount: competitors.length });
    setIsRefreshing(true);
    setError(null);
    try {
      if (selectedCompetitor) {
        console.log("[Refresh ads] Calling POST /api/ads/refresh/" + selectedCompetitor);
        await AdsAPI.refreshCompetitor(selectedCompetitor);
      } else {
        console.log("[Refresh ads] Calling POST /api/ads/refresh-all");
        await AdsAPI.refreshAll();
      }
      console.log("[Refresh ads] Refetch completed, reloading list...");

      // Wait a moment for backend to process
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Reload data after refresh
      await Promise.all([
        loadRecentAds(selectedCompetitor || undefined),
        loadTrendingAds(),
      ]);

      // Recalculate metrics
      await calculateFrontendMetrics(competitors);
    } catch (error: unknown) {
      console.error("Error refreshing ads:", error);
      setError(error instanceof Error ? error.message : "Failed to refresh ads");
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "") || "http://localhost:8000";
  const PROXY_ALLOWED_DOMAINS = ["cdninstagram.com", "fbcdn.net", "instagram.com"];
  const proxyImageUrl = (url: string | undefined): string => {
    if (!url) return svgPlaceholder("No Image", 300, 200);
    if (url.startsWith("data:")) return url;
    try {
      const host = new URL(url).hostname.toLowerCase();
      if (PROXY_ALLOWED_DOMAINS.some((d) => host.includes(d)))
        return `${API_BASE}/proxy-image?url=${encodeURIComponent(url)}`;
    } catch {
      /* invalid URL */
    }
    return url;
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const renderJSONData = (data: Record<string, unknown> | unknown[], title: string) => {
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
              label={({ name, value }: { name?: string; value?: number }) => `${name ?? ''}: ${value ?? 0}`}
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
            onChange={(e) => setSelectedPeriod(e.target.value as "daily" | "weekly" | "monthly" | "all_time")}
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
            disabled={isRefreshing || competitors.length === 0}
            title={competitors.length === 0 ? "Add a competitor first" : selectedCompetitor ? "Refresh ads for selected competitor" : "Refresh ads for all competitors"}
            className="px-4 py-2.5 bg-[#0ea5e9] hover:bg-[#0284c7] text-white text-sm font-semibold rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRefreshing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Refresh ads
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
          <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl relative overflow-hidden">
            {/* Loading overlay */}
            {isAddingCompetitor && (
              <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-4 rounded-xl">
                <div className="relative">
                  <div className="w-14 h-14 rounded-full border-4 border-gray-100 border-t-black animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Wifi className="w-5 h-5 text-black" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-base font-semibold text-black">
                    {addCompetitorStatus === "creating" ? "Adding competitor…" : "Fetching their ads…"}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {addCompetitorStatus === "creating"
                      ? "Saving competitor to your account"
                      : "Scanning ad platforms — this may take a moment"}
                  </p>
                </div>
              </div>
            )}

            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold text-black">Add New Competitor</h3>
                <button
                  onClick={() => { if (!isAddingCompetitor) { setShowAddCompetitor(false); setError(null); } }}
                  disabled={isAddingCompetitor}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40"
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
                    disabled={isAddingCompetitor}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg text-black placeholder-gray-400 focus:outline-none focus:border-gray-400 text-sm disabled:opacity-60"
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
                    disabled={isAddingCompetitor}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg text-black placeholder-gray-400 focus:outline-none focus:border-gray-400 text-sm disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Industry</label>
                  <input
                    type="text"
                    value={newCompetitor.industry}
                    onChange={(e) => setNewCompetitor({ ...newCompetitor, industry: e.target.value })}
                    disabled={isAddingCompetitor}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg text-black placeholder-gray-400 focus:outline-none focus:border-gray-400 text-sm disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between mt-8">
                <button
                  onClick={() => { setShowAddCompetitor(false); setError(null); }}
                  disabled={isAddingCompetitor}
                  className="px-6 py-2.5 bg-[#0ea5e9] hover:bg-[#0284c7] text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddCompetitor}
                  disabled={!newCompetitor.name.trim() || isAddingCompetitor}
                  className="px-6 py-2.5 bg-black hover:bg-gray-900 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isAddingCompetitor ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {addCompetitorStatus === "creating" ? "Adding…" : "Fetching ads…"}
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Add a competitor
                    </>
                  )}
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
                    <Tooltip contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333", borderRadius: "8px", color: "#fff" }} formatter={(value) => [`$${Number(value).toLocaleString()}`, "Spend"]} />
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
                      <Pie data={platformStats as unknown as Record<string, unknown>[]} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="total_spend" nameKey="platform">
                        {platformStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color || "#0ea5e9"} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333", borderRadius: "8px", color: "#fff" }} formatter={(value) => [`$${Number(value).toLocaleString()}`, "Spend"]} />
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

        {/* ===== ENHANCED TRENDING ADS SECTION ===== */}
        <div className="mb-8">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#2a2a2a]">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-r  rounded-lg">
                    <TrendingUp className="w-5 h-5 text-purple-700" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">
                      Trending Ads & Content
                    </h3>
                    <p className="text-sm text-[#888]">
                      Discover trending ads across all platforms
                    </p>
                  </div>
                </div>
                {showResults && trendingSearchResult && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 bg-purple-700/20 text-purple-400 rounded-full">
                      "{trendingSearchResult.keyword}"
                    </span>
                    <span className="text-xs text-[#666]">
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
                      <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 text-[#666] w-5 h-5" />
                      <input
                        type="text"
                        value={trendingSearchKeyword}
                        onChange={(e) => setTrendingSearchKeyword(e.target.value)}
                        placeholder="Search any keyword to discover trending ads..."
                        className="w-full pl-12 pr-32 py-4 text-lg bg-[#111] border-2 border-[#333] rounded-xl text-white placeholder-[#666] focus:ring-2 focus:ring-purple-700 focus:border-purple-700"
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
                          className="px-6 py-2.5 bg-purple-500 text-gray-100 rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
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
                    <p className="text-sm text-[#666] mt-2 text-center">
                      Press Enter or click Search to discover trending ads
                    </p>
                  </div>

                  {/* Search History & Suggestions */}
                  <div className="max-w-6xl mx-auto">
                    {/* Search History */}
                    {searchHistory.length > 0 && (
                      <div className="mb-8">
                        <div className="flex items-center gap-2 mb-4">
                          <History className="w-5 h-5 text-[#666]" />
                          <h4 className="666666666666666666666font-medium text-white">
                            Recent Searches
                          </h4>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {searchHistory.map((keyword, index) => (
                            <button
                              key={index}
                              onClick={() => handleSuggestionClick(keyword)}
                              className="px-4 py-2.5 bg-[#111] hover:bg-[#222] border border-[#333] text-[#ccc] rounded-lg flex items-center gap-2 transition-colors"
                            >
                              <Clock className="w-4 h-4" />
                              <span>{keyword}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Popular Suggestions */}
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <TrendingUp className="w-5 h-5 text-purple-700" />
                        <h4 className="font-medium text-white">
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
                            className="p-4 bg-gradient-to-br from-[#111] to-[#1a1a1a] hover:from-[#1a1a1a] hover:to-[#222] border border-[#2a2a2a] rounded-xl text-left group transition-all hover:shadow-md hover:border-[#444]"
                          >
                            <div className="flex items-center gap-3 mb-2">
                              <div className="p-2 bg-[#222] rounded-lg group-hover:bg-purple-500/20 transition-colors">
                                <div className="text-purple-500">
                                  {suggestion.icon}
                                </div>
                              </div>
                              <div className="flex-1">
                                <h5 className="font-medium text-white group-hover:text-purple-500">
                                  {suggestion.keyword}
                                </h5>
                                <p className="text-xs text-[#666]">
                                  {suggestion.category}
                                </p>
                              </div>
                            </div>
                            <div className="text-xs text-[#555] flex items-center gap-1">
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
                // Results State: Show trending ads
                <>
                  {isSearchingTrending ? (
                    <div className="py-12 text-center">
                      <div className="w-12 h-12 border-2 border-t-purple-700 border-[#333] rounded-full animate-spin mx-auto"></div>
                      <p className="mt-4 text-[#ccc]">
                        Searching trending content for "{trendingSearchKeyword}"...
                      </p>
                      <p className="text-sm text-[#666] mt-2">
                        Searching across {selectedTrendingPlatforms.length} platforms
                      </p>
                    </div>
                  ) : trendingAds.length > 0 ? (
                    <>
                      {/* Platform Filter */}
                      <div className="mb-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                          <div>
                            <h4 className="font-medium text-white">
                              Trending ads for "{trendingSearchResult?.keyword || trendingSearchKeyword}"
                            </h4>
                            <p className="text-sm text-[#888]">
                              {filteredTrendingAds.length} of {trendingAds.length} results &bull; Sorted by engagement score
                            </p>
                          </div>
                          <div className="flex items-center gap-4 flex-wrap">
                            <div className="flex items-center gap-2">
                            <span className="text-sm text-[#888]">Platforms:</span>
                            <div className="flex gap-2">
                              {["meta", "instagram", "youtube", "tiktok"].map(
                                (platform) => (
                                  <button
                                    key={platform}
                                    onClick={() => toggleTrendingPlatform(platform)}
                                    className={`px-3 py-1.5 text-sm rounded-lg border flex items-center gap-2 ${
                                      selectedTrendingPlatforms.includes(platform)
                                        ? "border-purple-700 bg-purple-700/20 text-purple-400"
                                        : "border-[#333] text-[#888] hover:border-[#555]"
                                    }`}
                                  >
                                    {platformIcons[platform] || (
                                      <Globe className="w-4 h-4" />
                                    )}
                                    <span className="capitalize">
                                      {platform === "meta" ? "Facebook" : platform}
                                    </span>
                                  </button>
                                ),
                              )}
                            </div>
                          </div>
                          </div>
                        </div>
                      </div>

                      {/* Trending Ads Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        {filteredTrendingAds.map((ad, index) => (
                          <div
                            key={ad.id || `${ad.platform}-${index}`}
                            className="bg-[#111] rounded-lg overflow-hidden hover:shadow-md transition-shadow border border-[#2a2a2a] hover:border-[#444]"
                          >
                            {/* Static thumbnail only (no video); Instagram CDN via proxy, same as Live Ad Feed & analyze modal */}
                            <div className="aspect-video bg-[#222] relative overflow-hidden">
                              <img
                                src={
                                  (ad.image_url && !/\.(mp4|webm|ogg|mov)(\?|$)/i.test(ad.image_url) && !/^data:video\//i.test(ad.image_url))
                                    ? (proxyImageUrl(ad.image_url) || ad.image_url)
                                    : (ad.thumbnail && !/\.(mp4|webm|ogg|mov)(\?|$)/i.test(ad.thumbnail) && !/^data:video\//i.test(ad.thumbnail))
                                      ? (proxyImageUrl(ad.thumbnail) || ad.thumbnail)
                                      : svgPlaceholder('Ad', 300, 200)
                                }
                                alt={ad.title}
                                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  const el = e.target as HTMLImageElement;
                                  el.onerror = null;
                                  el.src = svgPlaceholder('Ad', 300, 200);
                                }}
                              />
                              <div className="absolute top-2 left-2">
                                <span className="px-2 py-1 bg-black/70 text-white text-xs rounded flex items-center gap-1">
                                  {platformIcons[ad.platform] || (
                                    <Globe className="w-3 h-3" />
                                  )}
                                  <span className="capitalize">
                                    {ad.platform === "meta" ? "Facebook" : ad.platform}
                                  </span>
                                </span>
                              </div>
                              <div className="absolute top-2 right-2">
                                <span className="px-2 py-1 bg-gradient-to-r from-purple-700 to-purple-900 text-white text-xs rounded font-bold">
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
                                <span className="text-xs font-medium text-white truncate">
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
                                            ? "bg-purple-700"
                                            : "bg-red-500"
                                    }`}
                                  ></div>
                                  <span className="text-xs text-[#888]">
                                    {ad.engagement_score}%
                                  </span>
                                </div>
                              </div>

                              <h4 className="text-sm font-medium text-white line-clamp-2 mb-2 min-h-[2.5rem]">
                                {ad.title || ad.headline || "No title"}
                              </h4>

                              <p className="text-xs text-[#888] line-clamp-2 mb-3">
                                {ad.description || "No description"}
                              </p>

                              {/* Engagement Metrics */}
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-1">
                                    <Eye className="w-3 h-3 text-[#666]" />
                                    <span className="text-xs text-[#888]">
                                      {formatNumber(typeof (ad.views || ad.impressions) === 'number' ? (ad.views || ad.impressions) as number : 0)}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Heart className="w-3 h-3 text-red-400" />
                                    <span className="text-xs text-[#888]">
                                      {formatNumber(typeof ad.likes === 'number' ? ad.likes : 0)}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <MessageCircle className="w-3 h-3 text-blue-400" />
                                    <span className="text-xs text-[#888]">
                                      {formatNumber(typeof ad.comments === 'number' ? ad.comments : 0)}
                                    </span>
                                  </div>
                                </div>
                                {ad.spend &&
                                  typeof ad.spend === "number" &&
                                  ad.spend > 0 && (
                                    <span className="text-xs font-medium text-green-400">
                                      {formatCurrencyShort(ad.spend)}
                                    </span>
                                  )}
                              </div>

                              {/* Actions */}
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-[#666]">
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
                                    className="text-[#0ea5e9] hover:text-[#38bdf8] flex items-center"
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
                      <div className="mt-8 pt-6 border-t border-[#2a2a2a]">
                        <div className="text-center">
                          <button
                            onClick={handleNewSearch}
                            className="px-6 py-3 bg-gradient-to-r from-purple-700 to-purple-900 text-white rounded-lg hover:opacity-90 flex items-center gap-2 mx-auto"
                          >
                            <Search className="w-4 h-4" />
                            <span>New Search</span>
                          </button>
                          <p className="text-sm text-[#666] mt-2">
                            Search for different trending ads
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="py-12 text-center">
                      <div className="w-16 h-16 mx-auto mb-4 bg-[#222] rounded-full flex items-center justify-center">
                        <Search className="w-8 h-8 text-[#666]" />
                      </div>
                      <h4 className="text-lg font-medium text-white mb-2">
                        No results found for "{trendingSearchKeyword}"
                      </h4>
                      <p className="text-[#888] mb-6">
                        Try different keywords or adjust your search
                      </p>
                      <button
                        onClick={handleNewSearch}
                        className="px-6 py-3 bg-gradient-to-r from-purple-700 to-purple-900 text-white rounded-lg hover:opacity-90"
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

        {/* ===== COMPETITORS TABLE ===== */}
        {competitors.length > 0 && (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl mb-8 overflow-hidden">
            <div className="p-5 border-b border-[#2a2a2a]">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-[#0ea5e9]" />
                <h3 className="text-base font-semibold text-white">Competitors Performance</h3>
                <span className="text-xs text-[#555] font-normal">({competitors.length} tracked)</span>
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
                  {competitors.map((comp) => {
                    const summary = metricsSummary.find((m) => m.competitor_id === comp.id);
                    const isNew = !summary;
                    return (
                      <tr
                        key={comp.id}
                        className="hover:bg-[#222] transition-colors cursor-pointer"
                        onClick={() => { setSelectedCompetitor(comp.id); setSelectedCompany(comp.id); }}
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-white">{comp.name}</span>
                            {comp.domain && <span className="text-xs text-[#555]">{comp.domain}</span>}
                            {isNew && (
                              <span className="px-2 py-0.5 text-[10px] font-semibold bg-[#0ea5e9]/15 text-[#0ea5e9] rounded-md border border-[#0ea5e9]/30">
                                Syncing…
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm text-[#ccc]">
                          {isNew ? <span className="text-[#555]">—</span> : summary!.active_ads}
                        </td>
                        <td className="px-5 py-4 text-sm text-[#ccc]">
                          {isNew ? <span className="text-[#555]">—</span> : formatCurrency(summary!.estimated_monthly_spend)}
                        </td>
                        <td className="px-5 py-4 text-sm text-[#ccc]">
                          {isNew ? <span className="text-[#555]">—</span> : formatPercentage(summary!.avg_ctr)}
                        </td>
                        <td className="px-5 py-4">
                          {isNew
                            ? <span className="text-[#555] text-sm">—</span>
                            : <span className={`px-2.5 py-1 text-xs font-medium rounded-lg ${getScoreColor(summary!.risk_score)}`}>{summary!.risk_score}</span>
                          }
                        </td>
                        <td className="px-5 py-4">
                          {isNew
                            ? <span className="text-[#555] text-sm">—</span>
                            : <span className={`px-2.5 py-1 text-xs font-medium rounded-lg ${getScoreColor(summary!.opportunity_score)}`}>{summary!.opportunity_score}</span>
                          }
                        </td>
                      </tr>
                    );
                  })}
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
                  if (e.target.value !== "all") setSelectedCompetitor(e.target.value);
                  else { setSelectedCompetitor(null); loadRecentAds(); }
                }}
              >
                <option value="all">All Companies</option>
                {competitors.map((comp) => (
                  <option key={comp.id} value={comp.id}>{comp.name}</option>
                ))}
              </select>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-[#888]" />
                <div className="flex gap-1">
                  {(["all", "official", "unofficial"] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setLiveAdTypeFilter(type)}
                      className={`px-2.5 py-1 text-xs rounded-lg border transition-colors flex items-center gap-1 ${
                        liveAdTypeFilter === type
                          ? type === "official"
                            ? "border-emerald-500 bg-emerald-500/20 text-emerald-400"
                            : type === "unofficial"
                              ? "border-amber-500 bg-amber-500/20 text-amber-400"
                              : "border-purple-700 bg-purple-700/20 text-purple-400"
                          : "border-[#333] text-[#888] hover:border-[#555]"
                      }`}
                    >
                      {type === "official" && <Sparkles className="w-3 h-3" />}
                      {type === "unofficial" && <Globe className="w-3 h-3" />}
                      <span className="capitalize">{type}</span>
                    </button>
                  ))}
                </div>
              </div>
              <button className="flex items-center gap-1.5 text-sm text-[#888] hover:text-white transition-colors">
                <Lightbulb className="w-4 h-4" />
                Insights
              </button>
            </div>
          </div>

          {/* Ad Cards */}
          <div className="space-y-6">
            {filteredAds.length > 0 ? (
              <>
                {filteredAds
                  .slice((currentPage - 1) * ADS_PER_PAGE, currentPage * ADS_PER_PAGE)
                  .map((ad, index) => (
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
                            onError={(e) => {
                              const el = e.target as HTMLImageElement;
                              el.onerror = null;
                              el.src = svgPlaceholder("Ad", 280, 280);
                            }}
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
                        <p className="text-xs text-[#888] mb-1">{formatDate(ad.last_seen || ad.created_at || ad.first_seen)}</p>
                        {/* Official / Unofficial badge (backend is_official only) */}
                        {(() => {
                          const official = ad.is_official === true;
                          return (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold mb-3 ${
                              official
                                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                            }`}>
                              {official ? <Sparkles className="w-2.5 h-2.5" /> : <Globe className="w-2.5 h-2.5" />}
                              {official ? "Official" : "Unofficial"}
                            </span>
                          );
                        })()}

                        <div className="space-y-3">
                          <div>
                            <p className="text-xs text-[#666] italic">Est. Spend</p>
                            <p className="text-base font-bold text-white">
                              {formatCurrency(calculateAdSpend(ad))}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-[#666] italic">Impressions</p>
                            <p className="text-base font-bold text-white">
                              {formatNumber(calculateAdImpressions(ad))}
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
                          <button
                            onClick={() => handleAnalyze(ad)}
                            className="px-4 py-2 bg-[#0ea5e9] hover:bg-[#0284c7] text-white text-sm font-medium rounded-lg flex items-center gap-1.5 transition-colors">
                            <Eye className="w-3.5 h-3.5" />
                            Analyze
                          </button>
                          <button
                            onClick={() => handleCloneStrategy(ad)}
                            className="px-4 py-2 bg-[#1a1a1a] hover:bg-[#252525] border border-[#333] text-[#ccc] text-sm font-medium rounded-lg flex items-center gap-1.5 transition-colors">
                            <DollarSign className="w-3.5 h-3.5" />
                            Clone Strategy
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

                {/* Pagination Bar */}
                {filteredAds.length > ADS_PER_PAGE && (() => {
                  const totalPages = Math.ceil(filteredAds.length / ADS_PER_PAGE);
                  const pages: (number | "...")[] = [];
                  if (totalPages <= 7) {
                    for (let i = 1; i <= totalPages; i++) pages.push(i);
                  } else {
                    pages.push(1);
                    if (currentPage > 3) pages.push("...");
                    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
                    if (currentPage < totalPages - 2) pages.push("...");
                    pages.push(totalPages);
                  }
                  return (
                    <div className="flex items-center justify-between pt-4 border-t border-[#2a2a2a] mt-2">
                      <p className="text-xs text-[#666]">
                        Showing <span className="text-white font-medium">{(currentPage - 1) * ADS_PER_PAGE + 1}–{Math.min(currentPage * ADS_PER_PAGE, filteredAds.length)}</span> of <span className="text-white font-medium">{filteredAds.length}</span> ads
                      </p>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setCurrentPage((p) => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                          disabled={currentPage === 1}
                          className="w-8 h-8 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] hover:bg-[#252525] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-[#888] hover:text-white transition-colors text-sm">
                          ‹
                        </button>
                        {pages.map((p, i) =>
                          p === "..." ? (
                            <span key={`ellipsis-${i}`} className="w-8 h-8 flex items-center justify-center text-[#555] text-xs">…</span>
                          ) : (
                            <button
                              key={p}
                              onClick={() => { setCurrentPage(p as number); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                              className={`w-8 h-8 rounded-lg border text-sm font-medium transition-colors ${
                                currentPage === p
                                  ? "bg-[#0ea5e9] border-[#0ea5e9] text-white"
                                  : "border-[#2a2a2a] bg-[#1a1a1a] hover:bg-[#252525] text-[#888] hover:text-white"
                              }`}>
                              {p}
                            </button>
                          )
                        )}
                        <button
                          onClick={() => { setCurrentPage((p) => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                          disabled={currentPage === totalPages}
                          className="w-8 h-8 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] hover:bg-[#252525] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-[#888] hover:text-white transition-colors text-sm">
                          ›
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </>
            ) : (
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-5 py-16 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-[#222] rounded-full flex items-center justify-center">
                  <Eye className="w-8 h-8 text-[#444]" />
                </div>
                <h4 className="text-lg font-medium text-white mb-2">No Ads Found</h4>
                <p className="text-[#888] mb-6 max-w-md mx-auto">
                  {searchQuery || selectedPlatform !== "all" || selectedCompany !== "all" || liveAdTypeFilter !== "all"
                    ? "Try adjusting your search or filter criteria"
                    : "Start tracking competitors to see their ads"}
                </p>
                <div className="flex gap-3 justify-center flex-wrap">
                  <button
                    onClick={handleRefreshAds}
                    disabled={isRefreshing || competitors.length === 0}
                    className="px-4 py-2.5 bg-[#0ea5e9] hover:bg-[#0284c7] text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isRefreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    Refresh ads
                  </button>
                  <button
                    onClick={() => { setSearchQuery(""); setSelectedPlatform("all"); setSelectedCompany("all"); setSelectedCompetitor(null); setLiveAdTypeFilter("all"); loadRecentAds(); }}
                    className="px-4 py-2.5 bg-[#222] hover:bg-[#333] border border-[#333] text-[#ccc] rounded-lg transition-colors"
                  >
                    Clear Filters
                  </button>
                  <button
                    onClick={() => setShowAddCompetitor(true)}
                    className="px-4 py-2.5 bg-[#1a1a1a] hover:bg-[#252525] border border-[#333] text-white rounded-lg transition-colors"
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
    {/* ── Analyze Modal ── */}
    {analyzeAd && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        onClick={() => setAnalyzeAd(null)}>
        <div
          className="relative bg-[#111] border border-[#2a2a2a] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
          onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[#2a2a2a]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#0ea5e9]/20 rounded-lg flex items-center justify-center">
                <Eye className="w-4 h-4 text-[#0ea5e9]" />
              </div>
              <div>
                <h2 className="text-white font-semibold text-lg">Ad Analysis</h2>
                <p className="text-[#666] text-xs">{analyzeAd.competitor_name} · {analyzeAd.platform}</p>
              </div>
            </div>
            <button
              onClick={() => setAnalyzeAd(null)}
              className="w-8 h-8 rounded-lg bg-[#1a1a1a] hover:bg-[#252525] border border-[#333] flex items-center justify-center text-[#888] hover:text-white transition-colors">
              ✕
            </button>
          </div>

          {/* Ad Preview - static thumbnail only (no video); category placeholder when missing/broken */}
          {(analyzeAd.image_url || analyzeAd.thumbnail || analyzeAd.video_url) && (
            <div className="mx-6 mt-6 rounded-xl overflow-hidden border border-[#2a2a2a] bg-[#0a0a0a]">
              <img
                src={
                  (analyzeAd.image_url && !/\.(mp4|webm|ogg|mov)(\?|$)/i.test(analyzeAd.image_url) && !/^data:video\//i.test(analyzeAd.image_url))
                    ? proxyImageUrl(analyzeAd.image_url)
                    : (analyzeAd.thumbnail && !/\.(mp4|webm|ogg|mov)(\?|$)/i.test(analyzeAd.thumbnail) && !/^data:video\//i.test(analyzeAd.thumbnail))
                      ? proxyImageUrl(analyzeAd.thumbnail)
                      : svgPlaceholder('Ad', 600, 340)
                }
                alt="Ad creative"
                className="w-full max-h-56 object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const el = e.target as HTMLImageElement;
                  el.onerror = null;
                  el.src = svgPlaceholder('Ad', 600, 340);
                }}
              />
            </div>
          )}

          {/* Metrics Grid */}
          <div className="p-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl p-4">
              <p className="text-[#666] text-xs mb-1">Est. Spend</p>
              <p className="text-white font-bold text-lg">{formatCurrency(calculateAdSpend(analyzeAd))}</p>
            </div>
            <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl p-4">
              <p className="text-[#666] text-xs mb-1">Est. Impressions</p>
              <p className="text-white font-bold text-lg">{formatNumber(calculateAdImpressions(analyzeAd))}</p>
            </div>
            <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl p-4">
              <p className="text-[#666] text-xs mb-1">Ad Lifespan</p>
              <p className="text-white font-bold text-lg">{calculateAdLifespan(analyzeAd).toFixed(2)}d</p>
            </div>
            <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl p-4">
              <p className="text-[#666] text-xs mb-1">Est. CPC</p>
              <p className="text-white font-bold text-lg">
                {formatCurrency(calculateAdImpressions(analyzeAd) > 0 ? calculateAdSpend(analyzeAd) / Math.max(1, calculateAdImpressions(analyzeAd) * 0.02) : 0)}
              </p>
            </div>
            <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl p-4">
              <p className="text-[#666] text-xs mb-1">Format</p>
              <p className="text-white font-bold text-lg capitalize">{analyzeAd.format || "—"}</p>
            </div>
            <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl p-4">
              <p className="text-[#666] text-xs mb-1">Status</p>
              <p className={`font-bold text-lg ${analyzeAd.is_active ? "text-emerald-400" : "text-[#888]"}`}>
                {analyzeAd.is_active ? "Active" : "Inactive"}
              </p>
            </div>
          </div>

          {/* Ad Copy */}
          <div className="px-6 pb-4 space-y-4">
            {analyzeAd.headline && (
              <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl p-4">
                <p className="text-[#666] text-xs mb-2">Headline</p>
                <p className="text-white text-sm font-medium">{analyzeAd.headline}</p>
              </div>
            )}
            {analyzeAd.description && (
              <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl p-4">
                <p className="text-[#666] text-xs mb-2">Description</p>
                <p className="text-[#ccc] text-sm leading-relaxed">{analyzeAd.description}</p>
              </div>
            )}

            {/* AI Insights */}
            <div className="bg-[#0ea5e9]/5 border border-[#0ea5e9]/20 rounded-xl p-4 space-y-3">
              <p className="text-[#0ea5e9] text-xs font-semibold uppercase tracking-wider">AI Insights</p>
              <div className="space-y-2 text-sm text-[#ccc]">
                <p>• <span className="text-white font-medium">Longevity:</span> Running for {calculateAdLifespan(analyzeAd).toFixed(2)} days suggests {calculateAdLifespan(analyzeAd) > 14 ? "strong performance — this ad is working well for them" : "it's still in testing phase"}.</p>
                <p>• <span className="text-white font-medium">Budget Signal:</span> Estimated {formatCurrency(calculateAdSpend(analyzeAd))} in total spend {calculateAdSpend(analyzeAd) > 5000 ? "indicates a high-confidence, scaled campaign" : "suggests a testing or mid-tier budget"}.</p>
                <p>• <span className="text-white font-medium">Reach:</span> ~{formatNumber(calculateAdImpressions(analyzeAd))} impressions puts this ad {calculateAdImpressions(analyzeAd) > 100000 ? "in wide-reach territory" : "in targeted niche reach"}.</p>
                <p>• <span className="text-white font-medium">Action:</span> {calculateAdLifespan(analyzeAd) > 14 && calculateAdSpend(analyzeAd) > 2000 ? "High-confidence signal — consider cloning this strategy." : "Monitor for another week before acting."}</p>
              </div>
            </div>

            {/* Dates */}
            <div className="flex gap-4 text-xs text-[#666]">
              <span>First seen: <span className="text-[#aaa]">{formatDate(analyzeAd.first_seen)}</span></span>
              <span>Last seen: <span className="text-[#aaa]">{formatDate(analyzeAd.last_seen)}</span></span>
            </div>

            {getAdLink(analyzeAd) && (
              <a
                href={getAdLink(analyzeAd) || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-[#0ea5e9] hover:underline">
                View ad link →
              </a>
            )}
          </div>
        </div>
      </div>
    )}

    {/* ── Clone Strategy Modal ── */}
    {cloneAd && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        onClick={() => setCloneAd(null)}>
        <div
          className="relative bg-[#111] border border-[#2a2a2a] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
          onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[#2a2a2a]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <h2 className="text-white font-semibold text-lg">Clone Strategy</h2>
                <p className="text-[#666] text-xs">{cloneAd.competitor_name} · {cloneAd.platform}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCopyCloneStrategy(cloneAd)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 ${
                  cloneCopied
                    ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                    : "bg-[#1a1a1a] hover:bg-[#252525] border-[#333] text-[#ccc]"
                }`}>
                {cloneCopied ? "✓ Copied!" : "Copy All"}
              </button>
              <button
                onClick={() => setCloneAd(null)}
                className="w-8 h-8 rounded-lg bg-[#1a1a1a] hover:bg-[#252525] border border-[#333] flex items-center justify-center text-[#888] hover:text-white transition-colors">
                ✕
              </button>
            </div>
          </div>

          {/* Strategy Content */}
          <div className="p-6 space-y-4">
            <p className="text-[#888] text-sm">
              Use this breakdown to replicate the structure and strategy of this ad in your own campaigns.
            </p>
            <pre className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl p-5 text-xs text-[#ccc] leading-relaxed whitespace-pre-wrap font-mono overflow-x-auto">
              {buildCloneStrategyText(cloneAd)}
            </pre>
            <button
              onClick={() => handleCopyCloneStrategy(cloneAd)}
              className={`w-full py-3 text-sm font-medium rounded-xl border transition-colors flex items-center justify-center gap-2 ${
                cloneCopied
                  ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                  : "bg-[#0ea5e9]/10 hover:bg-[#0ea5e9]/20 border-[#0ea5e9]/30 text-[#0ea5e9]"
              }`}>
              {cloneCopied ? "✓ Copied to clipboard!" : "Copy Strategy to Clipboard"}
            </button>
          </div>
        </div>
      </div>
    )}

    <Footer />
    </>
  );
};

export default AdSurveillance;
