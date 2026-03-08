/* =====================================================
   ADSURV – Unified Frontend API Service
   Updated: Enhanced with intelligent ad metric calculations based on lifespan
===================================================== */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/* =========================
   Helper Functions (Moved to Top)
========================= */

// Helper function to parse string spend values to numbers
export const parseSpendValue = (spend: string | number | null | undefined): number => {
  if (spend === undefined || spend === null) return 0;
  
  if (typeof spend === 'number') return spend;
  
  const str = String(spend).trim();
  
  // Handle ranges like "$7K - $8K"
  if (str.includes('-')) {
    const parts = str.split('-');
    if (parts.length === 2) {
      const start = parseSpendValue(parts[0].trim());
      const end = parseSpendValue(parts[1].trim());
      return (start + end) / 2; // Return average
    }
  }
  
  // Handle >, < symbols
  const cleanStr = str.replace(/[<>$,\s]/g, '');
  
  // Handle K, M suffixes
  if (cleanStr.toLowerCase().includes('k')) {
    return parseFloat(cleanStr.toLowerCase().replace('k', '')) * 1000;
  }
  if (cleanStr.toLowerCase().includes('m')) {
    return parseFloat(cleanStr.toLowerCase().replace('m', '')) * 1000000;
  }
  
  return parseFloat(cleanStr) || 0;
};

// Helper function to parse impression values
export const parseImpressionValue = (impressions: string | number | null | undefined): number => {
  if (impressions === undefined || impressions === null) return 0;
  
  if (typeof impressions === 'number') return impressions;
  
  const str = String(impressions).trim();
  
  // Handle ranges like "100K - 125K"
  if (str.includes('-')) {
    const parts = str.split('-');
    if (parts.length === 2) {
      const start = parseImpressionValue(parts[0].trim());
      const end = parseImpressionValue(parts[1].trim());
      return (start + end) / 2; // Return average
    }
  }
  
  // Handle >, < symbols
  let cleanStr = str.replace(/[<>$,\s]/g, '');
  
  // If it started with <, return half the value
  if (str.trim().startsWith('<')) {
    const val = parseImpressionValue(cleanStr);
    return val / 2;
  }
  
  // Handle K, M suffixes
  if (cleanStr.toLowerCase().includes('k')) {
    return parseFloat(cleanStr.toLowerCase().replace('k', '')) * 1000;
  }
  if (cleanStr.toLowerCase().includes('m')) {
    return parseFloat(cleanStr.toLowerCase().replace('m', '')) * 1000000;
  }
  
  return parseFloat(cleanStr) || 0;
};

/* =========================
   Types for Metrics
========================= */

export interface PlatformStats {
  platform: string;
  ad_count: number;
  total_spend: number;
  total_impressions?: number;
  active_campaigns?: number;
  avg_ctr: number;
  percentage: number;
  color: string;
  ad_freshness?: number;
}

// FIXED: Made fields optional and added proper types
export interface TrendingAd {
  platform: string;
  id?: string;
  title: string;
  description?: string;
  url?: string;
  image_url?: string;
  thumbnail?: string;
  video_url?: string;
  views?: number | string;
  likes?: number | string;
  comments?: number | string;
  shares?: number | string;
  impressions?: number | string;
  spend?: number | string;
  created_at?: string;
  published_at?: string;
  taken_at?: string;
  score: number;
  rank?: number;
  type?: string;
  channel?: string;
  owner?: string;
  advertiser?: string;
  headline?: string;
  metadata?: Record<string, any>;
  competitor_name?: string;
}

// FIXED: Removed non-existent fields
export interface TrendingSearchResponse {
  task_id?: string | null;
  status: string;
  keyword: string;
  results: Record<string, TrendingAd[]>;
  summary: {
    total_results: number;
    platforms_searched: string[];
    top_score: number;
    average_score: number;
  };
  top_trending: TrendingAd[];
  platform_performance: Record<string, number>;
  error?: string;
}

// NEW: Dashboard metrics from ads table
export interface DashboardMetrics {
  total_competitor_spend: number;
  active_campaigns: number;
  total_impressions: number;
  avg_ctr: number;
  total_competitors: number;
  platform_distribution: Record<string, number>;
  ad_lifespan_days?: number;
  freshness_score?: number;
  recent_ads?: number;
  total_ads?: number;
}

// NEW: Ad data interface from ads table
export interface AdData {
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
  spend: string | number;
  is_active: boolean;
  first_seen: string;
  last_seen: string;
  platform_ad_id?: string;
  created_at?: string;
}

// NEW: Enhanced PlatformStats interface
export interface EnhancedPlatformStats {
  platform: string;
  ad_count: number;
  total_spend: number;
  total_impressions: number;
  active_campaigns: number;
  avg_ctr: number;
  percentage: number;
  color: string;
  ad_freshness: number;
  recent_ads: number;
  avg_lifespan_days: number;
}

// NEW: Competitor interface
export interface Competitor {
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

/* =========================
   Auth Helpers
========================= */

const getToken = (): string | null => localStorage.getItem('token');

const fetchWithAuth = async (
  endpoint: string,
  options: RequestInit = {}
) => {
  const token = getToken();

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { detail?: string | Array<{ loc?: (string | number)[]; msg?: string; type?: string }>; error?: string };
    let message: string;
    if (Array.isArray(err.detail)) {
      message = err.detail.map((d) => d.msg || (d.loc ? `${d.loc.join('.')}: ${d.msg || d.type}` : String(d))).join('; ');
    } else if (typeof err.detail === 'string') {
      message = err.detail;
    } else {
      message = err.error || `API Error: ${res.status}`;
    }
    throw new Error(message || `API Error: ${res.status}`);
  }

  return res.json();
};

/* =====================================================
   USERS
===================================================== */

export const UsersAPI = {
  getMe: () => fetchWithAuth('/api/users/me'),

  updateMe: (data: {
    name?: string;
    business_type?: string;
    industry?: string;
    goals?: string;
  }) =>
    fetchWithAuth('/api/users/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  changePassword: (data: {
    current_password: string;
    new_password: string;
  }) =>
    fetchWithAuth('/api/users/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  stats: () => fetchWithAuth('/api/users/stats'),

  deleteAccount: () =>
    fetchWithAuth('/api/users/account', { method: 'DELETE' }),
};

/* =====================================================
   COMPETITORS
===================================================== */

export const CompetitorsAPI = {
  list: (): Promise<Competitor[]> => fetchWithAuth('/api/competitors/'),

  create: (data: {
    name: string;
    domain?: string;
    industry?: string;
    estimated_monthly_spend?: number;
  }) =>
    fetchWithAuth('/api/competitors/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  delete: (competitor_id: string) =>
    fetchWithAuth(`/api/competitors/${competitor_id}`, {
      method: 'DELETE',
    }),
};

/* =====================================================
   ADS
===================================================== */

export const AdsAPI = {
  refreshCompetitor: (
    competitor_id: string,
    platforms?: string[]
  ) =>
    fetchWithAuth(
      `/api/ads/refresh/${competitor_id}` +
        (platforms ? `?platforms=${platforms.join(',')}` : ''),
      { method: 'POST' }
    ),

  refreshAll: (platforms?: string[]) =>
    fetchWithAuth(
      `/api/ads/refresh-all` +
        (platforms ? `?platforms=${platforms.join(',')}` : ''),
      { method: 'POST' }
    ),

  getCompetitorAds: (
    competitor_id: string,
    platform?: string,
    limit: number = 100
  ): Promise<AdData[]> => {
    const params = new URLSearchParams();
    if (platform) params.append('platform', platform);
    params.append('limit', String(limit));
    
    return fetchWithAuth(`/api/ads/competitor/${competitor_id}?${params}`);
  },

  fetchHistory: (limit = 20, status_filter?: string) => {
    const params = new URLSearchParams();
    params.append('limit', String(limit));
    if (status_filter) params.append('status_filter', status_filter);
    
    return fetchWithAuth(`/api/ads/fetches?${params}`);
  },

  // Get all ads for user's competitors
  getAllAds: (limit: number = 500): Promise<AdData[]> => {
    return fetchWithAuth(`/api/ads/all?limit=${limit}`);
  },

  // Get dashboard metrics from ads table
  getDashboardMetrics: (): Promise<DashboardMetrics> => {
    return fetchWithAuth('/api/ads/dashboard-metrics');
  },

  // Get platform stats from ads table
  getPlatformStats: (): Promise<PlatformStats[]> => {
    return fetchWithAuth('/api/ads/platform-stats');
  }
};

/* =====================================================
   PLATFORMS
===================================================== */

export const PlatformsAPI = {
  fetch: (data: {
    competitor_id: string;
    platforms: string[];
  }) =>
    fetchWithAuth('/api/platforms/fetch', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  fetchSync: (data: {
    competitor_id: string;
    platforms: string[];
  }) =>
    fetchWithAuth('/api/platforms/fetch-sync', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  list: () => fetchWithAuth('/api/platforms/platforms'),

  test: (platform_id: string, query: string = 'nike') =>
    fetchWithAuth(`/api/platforms/platform/${platform_id}/test?query=${query}`),

  status: () => fetchWithAuth('/api/platforms/status'),

  credits: () => fetchWithAuth('/api/platforms/credits'),
};

/* =====================================================
   REMOVED: METRICS API (surv_metrics) - Using ads table instead
===================================================== */

/* =====================================================
   TRENDING - FIXED & ENHANCED
===================================================== */

export const TrendingAPI = {
  search: async (data: {
    keyword: string;
    platforms: string[];
    limit_per_platform?: number;
    async_mode?: boolean;
  }): Promise<TrendingSearchResponse> => {
    // Validate and filter platforms
    const validPlatforms = ['meta', 'reddit', 'linkedin', 'instagram', 'youtube'];
    const filteredPlatforms = data.platforms
      .map(p => p.toLowerCase())
      .filter(platform => validPlatforms.includes(platform));
    
    // Ensure at least one platform
    if (filteredPlatforms.length === 0) {
      throw new Error('At least one valid platform is required');
    }
    
    const payload = {
      keyword: data.keyword.trim(),
      platforms: filteredPlatforms,
      limit_per_platform: data.limit_per_platform || 5,
      async_mode: data.async_mode || false
    };
    
    try {
      const response = await fetchWithAuth('/api/trending/search', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      
      // Process the response to ensure data consistency
      return processTrendingResponse(response);
    } catch (error) {
      console.error('Trending search error:', error);
      throw error;
    }
  },

  /** Get 24h-cached trending ads for home (no auth). category: recommended | sports | food | fashion | trending, or omit for all. */
  getCached: async (category?: string): Promise<{ category?: string; ads?: TrendingAd[]; categories?: Record<string, TrendingAd[]> }> => {
    const url = category
      ? `${BASE_URL}/api/trending/cached?category=${encodeURIComponent(category)}`
      : `${BASE_URL}/api/trending/cached`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Trending cache failed: ${res.status}`);
    return res.json();
  },

  platforms: () => fetchWithAuth('/api/trending/platforms'),

  stats: () => fetchWithAuth('/api/trending/stats'),

  // Helper to get trending ads for competitors
  getTrendingForCompetitors: async (competitorNames: string[]): Promise<TrendingAd[]> => {
    const allTrendingAds: TrendingAd[] = [];
    
    // Limit to 2 competitors to avoid too many API calls
    for (const name of competitorNames.slice(0, 2)) {
      try {
        const result = await TrendingAPI.search({
          keyword: name,
          platforms: ['meta', 'instagram', 'youtube'],
          limit_per_platform: 3,
          async_mode: false
        });
        
        if (result.top_trending && Array.isArray(result.top_trending)) {
          const competitorAds = result.top_trending.slice(0, 3).map((ad: TrendingAd) => ({
            ...ad,
            competitor_name: name
          }));
          allTrendingAds.push(...competitorAds);
        }
      } catch (error) {
        console.error(`Error getting trending for ${name}:`, error);
        // Continue with next competitor
      }
    }
    
    // Sort by score and limit
    return allTrendingAds
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 5);
  }
};

/* =====================================================
   VIDEO ANALYSIS (Reverse Engineering) – user-scoped, all platforms
===================================================== */

/* =====================================================
   BRAND IDENTITY – user-scoped, persisted in DB
===================================================== */

export const BrandIdentityAPI = {
  list: (): Promise<Array<{ id: string; name: string; type: string; dataUrl: string; mimeType?: string }>> =>
    fetchWithAuth('/api/brand-identity/'),
  add: (asset: { name: string; type: string; data_url: string; mime_type?: string }) =>
    fetchWithAuth('/api/brand-identity/', {
      method: 'POST',
      body: JSON.stringify({
        name: asset.name,
        type: asset.type,
        data_url: asset.data_url,
        mime_type: asset.mime_type ?? undefined,
      }),
    }),
  remove: (assetId: string) =>
    fetchWithAuth(`/api/brand-identity/${assetId}`, { method: 'DELETE' }),
};

/* =====================================================
   VIDEO ANALYSIS (Reverse Engineering) – user-scoped, all platforms
===================================================== */

/* =====================================================
   CAMPAIGN ADS – per-campaign ads (fetch if missing, store in DB)
===================================================== */

export const CampaignAdsAPI = {
  get: (campaignId: number | string, goal?: string): Promise<{ ads: unknown[]; source: string }> => {
    const q = goal ? `?goal=${encodeURIComponent(goal)}` : '';
    return fetchWithAuth(`/api/campaign-ads/${campaignId}${q}`);
  },
};

/* =====================================================
   VIDEO ANALYSIS (Reverse Engineering) – user-scoped, all platforms
===================================================== */

export const VideoAnalysisAPI = {
  addAd: (url: string) =>
    fetchWithAuth('/api/video-analysis/add', {
      method: 'POST',
      body: JSON.stringify({ url }),
    }),
  listAds: (): Promise<Array<{
    id: string;
    company: string;
    ad_title: string;
    ad_text: string;
    full_ad_text: string;
    call_to_action: string;
    ad_archive_id: string;
    analyzed_at: string;
    created_at: string;
    analysis: unknown;
    platform?: string;
    source_url?: string;
    status?: string;
  }>> => fetchWithAuth('/api/video-analysis/ads'),
};

/* =====================================================
   REMOVED: SUMMARY METRICS API (sum_metrics) - Using ads table instead
===================================================== */

/* =====================================================
   HELPER FUNCTIONS FOR TRENDING DATA
========================= ============== */

// Process trending response to normalize data types
function processTrendingResponse(response: TrendingSearchResponse): TrendingSearchResponse {
  // Process each platform's results
  const processedResults: Record<string, TrendingAd[]> = {};
  
  for (const [platform, ads] of Object.entries(response.results)) {
    processedResults[platform] = ads.map(ad => normalizeAdData(ad));
  }
  
  // Process top trending
  const processedTopTrending = response.top_trending?.map(ad => normalizeAdData(ad)) || [];
  
  return {
    ...response,
    results: processedResults,
    top_trending: processedTopTrending
  };
}

// Normalize individual ad data
function normalizeAdData(ad: TrendingAd): TrendingAd {
  return {
    ...ad,
    // Convert string numbers to actual numbers
    views: typeof ad.views === 'string' ? parseImpressionValue(ad.views) : ad.views,
    likes: typeof ad.likes === 'string' ? parseImpressionValue(ad.likes) : ad.likes,
    comments: typeof ad.comments === 'string' ? parseImpressionValue(ad.comments) : ad.comments,
    shares: typeof ad.shares === 'string' ? parseImpressionValue(ad.shares) : ad.shares,
    impressions: typeof ad.impressions === 'string' ? parseImpressionValue(ad.impressions) : ad.impressions,
    spend: typeof ad.spend === 'string' ? parseSpendValue(ad.spend) : ad.spend,
    
    // Ensure score is a number
    score: Number(ad.score) || 0,
    
    // Ensure title exists
    title: ad.title || ad.headline || ad.description?.substring(0, 100) || 'Untitled',
  };
}

// Export helper for use in components
export const normalizeTrendingAd = normalizeAdData;

/* =====================================================
   INTELLIGENT AD METRIC CALCULATION HELPERS
   Based on ad lifespan (first_seen, last_seen) and other attributes
===================================================== */

// Helper function to calculate ad spend based on lifespan and platform
// Enhanced helper function to calculate ad spend based on lifespan and platform
export const calculateAdSpend = (ad: AdData): number => {
  // Try to parse actual spend first
  if (ad.spend) {
    const parsedSpend = parseSpendValue(ad.spend);
    if (parsedSpend > 0) return parsedSpend;
    
    // Log for debugging
    console.log(`Ad ${ad.id} spend parsing:`, {
      original: ad.spend,
      parsed: parsedSpend,
      type: typeof ad.spend
    });
  }
  
  // If spend is 0 or null/undefined, estimate based on lifespan
  if (ad.first_seen && ad.last_seen) {
    try {
      const firstSeen = new Date(ad.first_seen);
      const lastSeen = new Date(ad.last_seen);
      const lifespanDays = Math.max(1, (lastSeen.getTime() - firstSeen.getTime()) / (1000 * 60 * 60 * 24));
      
      // Platform-specific daily spend estimates
      const platformDailySpend: Record<string, number> = {
        'meta': 150, 'facebook': 150, 'instagram': 100,
        'youtube': 300, 'linkedin': 200, 'reddit': 50,
        'google': 250, 'tiktok': 120, 'twitter': 80,
        'pinterest': 60
      };
      
      const platform = ad.platform?.toLowerCase() || 'meta';
      const baseDaily = platformDailySpend[platform] || 100;
      
      // Log platform info
      console.log(`Ad ${ad.id} platform calculation:`, {
        platform,
        baseDaily,
        lifespanDays
      });
      
      let multiplier = ad.is_active ? 1.5 : 0.7;
      
      // Adjust for format
      if (ad.format?.toLowerCase().includes('video')) multiplier *= 1.8;
      else if (ad.format?.toLowerCase().includes('carousel')) multiplier *= 1.3;
      else if (ad.format?.toLowerCase().includes('story')) multiplier *= 1.2;
      
      const estimated = baseDaily * lifespanDays * multiplier;
      const cappedEstimate = Math.min(estimated, 1000000); // Cap at $1M
      
      console.log(`Ad ${ad.id} estimated spend:`, {
        estimated,
        cappedEstimate,
        multiplier,
        format: ad.format
      });
      
      return cappedEstimate;
    } catch (error) {
      console.error(`Error calculating spend for ad ${ad.id}:`, error);
      return 0;
    }
  }
  
  console.log(`Ad ${ad.id} no lifespan data, returning 0`);
  return 0;
};

// Helper function to calculate ad impressions
export const calculateAdImpressions = (ad: AdData): number => {
  // Try to parse actual impressions first
  if (ad.impressions) {
    const parsedImpressions = parseImpressionValue(ad.impressions);
    if (parsedImpressions > 0) return parsedImpressions;
  }
  
  // Estimate based on spend if available
  const spend = calculateAdSpend(ad);
  if (spend > 0) {
    // Platform CPM (Cost Per 1000 Impressions) rates
    const platformCpm: Record<string, number> = {
      'meta': 10, 'facebook': 10, 'instagram': 8,
      'youtube': 12, 'linkedin': 15, 'reddit': 6,
      'google': 5, 'tiktok': 7
    };
    
    const cpm = platformCpm[ad.platform?.toLowerCase() || 'meta'] || 10;
    return (spend / cpm) * 1000;
  }
  
  // Estimate based on lifespan
  if (ad.first_seen && ad.last_seen) {
    const firstSeen = new Date(ad.first_seen);
    const lastSeen = new Date(ad.last_seen);
    const lifespanDays = Math.max(1, (lastSeen.getTime() - firstSeen.getTime()) / (1000 * 60 * 60 * 24));
    
    // Platform-specific daily impressions
    const platformDailyImpressions: Record<string, number> = {
      'meta': 5000, 'facebook': 5000, 'instagram': 8000,
      'youtube': 15000, 'linkedin': 3000, 'reddit': 2000,
      'google': 10000, 'tiktok': 12000
    };
    
    const baseDaily = platformDailyImpressions[ad.platform?.toLowerCase() || 'meta'] || 5000;
    let multiplier = ad.is_active ? 1.3 : 1.0;
    
    // Adjust for format
    if (ad.format?.toLowerCase().includes('video')) multiplier *= 1.5;
    else if (ad.format?.toLowerCase().includes('story')) multiplier *= 1.8;
    
    const estimated = baseDaily * lifespanDays * multiplier;
    return Math.min(estimated, 10000000); // Cap at 10M
  }
  
  return 0;
};

// Helper function to check if ad is recent
export const isRecentAd = (ad: AdData, days = 30): boolean => {
  if (!ad.last_seen) return false;
  
  try {
    const lastSeen = new Date(ad.last_seen);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return lastSeen > cutoffDate;
  } catch (error) {
    console.error('Error checking if ad is recent:', error);
    return false;
  }
};

// Helper function to calculate ad lifespan in days
export const calculateAdLifespan = (ad: AdData): number => {
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

/* =====================================================
   ENHANCED FRONTEND CALCULATION HELPERS
   With intelligent estimation based on ad lifespan
===================================================== */

// Enhanced dashboard metrics calculation
export const calculateDashboardMetrics = (ads: AdData[], competitors: Competitor[]): DashboardMetrics => {
  let totalSpend = 0;
  let totalImpressions = 0;
  let activeCampaigns = 0;
  let recentAds = 0;
  let totalLifespan = 0;
  const platformDistribution: Record<string, number> = {};
  
  ads.forEach(ad => {
    // Calculate spend and impressions using intelligent estimation
    const spendValue = calculateAdSpend(ad);
    const impressionValue = calculateAdImpressions(ad);
    
    totalSpend += spendValue;
    totalImpressions += impressionValue;
    
    if (ad.is_active) {
      activeCampaigns += 1;
    }
    
    // Check if ad is recent
    if (isRecentAd(ad)) {
      recentAds += 1;
    }
    
    // Calculate lifespan
    const lifespan = calculateAdLifespan(ad);
    totalLifespan += lifespan;
    
    // Platform distribution
    if (ad.platform) {
      const platform = ad.platform.toLowerCase();
      platformDistribution[platform] = (platformDistribution[platform] || 0) + 1;
    }
  });
  
  // Calculate average CTR with freshness adjustment
  let avg_ctr = 0.02; // Default 2% CTR
  
  if (ads.length > 0) {
    // Adjust CTR based on ad freshness
    const freshnessRatio = recentAds / ads.length;
    avg_ctr = 0.02 + (freshnessRatio * 0.01); // Up to 1% bonus for fresh ads
    avg_ctr = Math.min(avg_ctr, 0.05); // Cap at 5%
  }
  
  // Calculate average lifespan
  const avgLifespanDays = ads.length > 0 ? totalLifespan / ads.length : 0;
  
  // Calculate freshness score
  const freshnessScore = ads.length > 0 ? (recentAds / ads.length) * 100 : 0;
  
  return {
    total_competitor_spend: Math.round(totalSpend),
    active_campaigns: activeCampaigns,
    total_impressions: Math.round(totalImpressions),
    avg_ctr: parseFloat(avg_ctr.toFixed(4)),
    total_competitors: competitors.length,
    platform_distribution: platformDistribution,
    ad_lifespan_days: parseFloat(avgLifespanDays.toFixed(1)),
    freshness_score: parseFloat(freshnessScore.toFixed(1)),
    recent_ads: recentAds,
    total_ads: ads.length
  };
};

// Enhanced platform stats calculation
export const calculatePlatformStats = (ads: AdData[]): EnhancedPlatformStats[] => {
  const platformMap: Record<string, EnhancedPlatformStats> = {};
  
  // Colors for platforms
  const platformColors: Record<string, string> = {
    'meta': '#00C2B3',
    'facebook': '#00C2B3',
    'instagram': '#4A90E2',
    'youtube': '#FF6B6B',
    'linkedin': '#FFD166',
    'reddit': '#9B59B6',
    'tiktok': '#2ECC71',
    'google': '#3498DB',
    'twitter': '#1ABC9C',
    'pinterest': '#E74C3C'
  };
  
  // Calculate totals per platform
  ads.forEach(ad => {
    if (ad.platform) {
      const platform = ad.platform.toLowerCase();
      if (!platformMap[platform]) {
        platformMap[platform] = {
          platform: platform,
          ad_count: 0,
          total_spend: 0,
          total_impressions: 0,
          active_campaigns: 0,
          avg_ctr: 0,
          percentage: 0,
          color: platformColors[platform] || '#3498DB',
          ad_freshness: 0,
          recent_ads: 0,
          avg_lifespan_days: 0
        };
      }
      
      // Calculate spend and impressions for this ad
      const spendValue = calculateAdSpend(ad);
      const impressionValue = calculateAdImpressions(ad);
      const lifespan = calculateAdLifespan(ad);
      
      platformMap[platform].ad_count += 1;
      platformMap[platform].total_spend += spendValue;
      platformMap[platform].total_impressions += impressionValue;
      platformMap[platform].avg_lifespan_days += lifespan;
      
      if (ad.is_active) {
        platformMap[platform].active_campaigns += 1;
      }
      
      // Check if ad is recent
      if (isRecentAd(ad)) {
        platformMap[platform].recent_ads += 1;
        platformMap[platform].ad_freshness += 1;
      }
    }
  });
  
  // Calculate totals and finalize metrics
  const totalAds = ads.length;
  const platformStats: EnhancedPlatformStats[] = [];
  
  Object.keys(platformMap).forEach(platform => {
    const data = platformMap[platform];
    
    // Calculate percentages
    data.percentage = totalAds > 0 ? (data.ad_count / totalAds) * 100 : 0;
    
    // Calculate freshness percentage
    const freshnessPercentage = data.ad_count > 0 ? 
      (data.recent_ads / data.ad_count) * 100 : 0;
    data.ad_freshness = parseFloat(freshnessPercentage.toFixed(1));
    
    // Calculate average lifespan
    data.avg_lifespan_days = data.ad_count > 0 ? 
      parseFloat((data.avg_lifespan_days / data.ad_count).toFixed(1)) : 0;
    
    // Calculate CTR based on platform and freshness
    const platformCtrMap: Record<string, number> = {
      'meta': 0.018,
      'facebook': 0.018,
      'instagram': 0.015,
      'youtube': 0.012,
      'linkedin': 0.025,
      'reddit': 0.008,
      'google': 0.035,
      'tiktok': 0.010
    };
    
    let avg_ctr = platformCtrMap[platform] || 0.02;
    
    // Adjust CTR based on freshness
    if (freshnessPercentage > 50) {
      avg_ctr *= 1.2; // 20% boost for fresh platforms
    }
    
    // Adjust CTR based on platform type
    if (platform === 'linkedin' || platform === 'google') {
      avg_ctr *= 1.1; // Higher CTR for professional/search platforms
    }
    
    data.avg_ctr = parseFloat(avg_ctr.toFixed(4));
    
    platformStats.push(data);
  });
  
  // Sort by total spend (highest first)
  return platformStats.sort((a, b) => b.total_spend - a.total_spend);
};

// Enhanced competitor metrics summary
export interface CompetitorMetricsSummary {
  competitor_id: string;
  competitor_name: string;
  active_ads: number;
  estimated_monthly_spend: number;
  total_impressions: number;
  avg_ctr: number;
  risk_score: number;
  opportunity_score: number;
  freshness_score: number;
  avg_lifespan_days: number;
  last_calculated: string;
}

export const calculateCompetitorMetricsSummary = (ads: AdData[], _competitors: Competitor[]): CompetitorMetricsSummary[] => {
  const competitorMap: Record<string, {
    competitor_id: string;
    competitor_name: string;
    ads: AdData[];
    total_spend: number;
    total_impressions: number;
    active_ads: number;
    recent_ads: number;
    total_lifespan: number;
  }> = {};
  
  // Group ads by competitor
  ads.forEach(ad => {
    if (ad.competitor_id) {
      if (!competitorMap[ad.competitor_id]) {
        competitorMap[ad.competitor_id] = {
          competitor_id: ad.competitor_id,
          competitor_name: ad.competitor_name || `Competitor ${ad.competitor_id.substring(0, 8)}`,
          ads: [],
          total_spend: 0,
          total_impressions: 0,
          active_ads: 0,
          recent_ads: 0,
          total_lifespan: 0
        };
      }
      
      competitorMap[ad.competitor_id].ads.push(ad);
      
      // Calculate intelligent metrics
      const spendValue = calculateAdSpend(ad);
      const impressionValue = calculateAdImpressions(ad);
      const lifespan = calculateAdLifespan(ad);
      
      competitorMap[ad.competitor_id].total_spend += spendValue;
      competitorMap[ad.competitor_id].total_impressions += impressionValue;
      competitorMap[ad.competitor_id].total_lifespan += lifespan;
      
      if (ad.is_active) {
        competitorMap[ad.competitor_id].active_ads += 1;
      }
      
      if (isRecentAd(ad)) {
        competitorMap[ad.competitor_id].recent_ads += 1;
      }
    }
  });
  
  // Calculate metrics for each competitor
  const competitorMetrics = Object.values(competitorMap).map(competitor => {
    const monthlySpend = competitor.total_spend;
    const totalImpressions = competitor.total_impressions;
    const adCount = competitor.ads.length;
    
    // Calculate freshness score
    const freshnessScore = adCount > 0 ? (competitor.recent_ads / adCount) * 100 : 0;
    
    // Calculate average CTR with freshness adjustment
    let avg_ctr = 0.02; // Default
    if (freshnessScore > 50) {
      avg_ctr = 0.025; // Higher CTR for fresh competitors
    }
    
    // Calculate average lifespan
    const avgLifespan = adCount > 0 ? competitor.total_lifespan / adCount : 0;
    
    // Calculate risk score (0-100)
    // Higher spend = higher risk
    const riskScore = Math.min(Math.round(monthlySpend / 1000) + 30, 90);
    
    // Calculate opportunity score (0-100)
    // More active ads, higher spend, and freshness = more opportunity
    const opportunityScore = Math.min(
      Math.round(
        (competitor.active_ads * 5) + 
        (monthlySpend / 2000) + 
        (freshnessScore * 0.5)
      ) + 20,
      95
    );
    
    return {
      competitor_id: competitor.competitor_id,
      competitor_name: competitor.competitor_name,
      active_ads: competitor.active_ads,
      estimated_monthly_spend: Math.round(monthlySpend),
      total_impressions: Math.round(totalImpressions),
      avg_ctr: parseFloat(avg_ctr.toFixed(4)),
      risk_score: riskScore,
      opportunity_score: opportunityScore,
      freshness_score: parseFloat(freshnessScore.toFixed(1)),
      avg_lifespan_days: parseFloat(avgLifespan.toFixed(1)),
      last_calculated: new Date().toISOString()
    };
  });
  
  // Sort by opportunity score (highest first)
  return competitorMetrics.sort((a, b) => b.opportunity_score - a.opportunity_score);
};

/* =====================================================
   EXPORT ALL TYPES AND HELPERS
===================================================== */

export type {
  DashboardMetrics as DashboardMetricsType,
  AdData as AdDataType,
  Competitor as CompetitorType,
  TrendingAd as TrendingAdType,
  TrendingSearchResponse as TrendingSearchResponseType,
  CompetitorMetricsSummary as CompetitorMetricsSummaryType,
  EnhancedPlatformStats as EnhancedPlatformStatsType
};