// src/services/targetingIntel.ts

/* =====================================================
   TARGETING INTEL – API Service
===================================================== */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/* =========================
   Auth Helpers
========================= */

const getToken = (): string | null => localStorage.getItem('token');

const getUserInfo = (): { user_id: string; email: string; name: string } | null => {
  const token = getToken();
  if (!token) return null;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      user_id: payload.user_id,
      email: payload.email,
      name: payload.name || payload.email.split('@')[0]
    };
  } catch {
    return null;
  }
};

const fetchWithAuth = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<any> => {
  const token = getToken();

  console.log('🎯 Targeting Intel API Call:', { 
    endpoint, 
    hasToken: !!token,
    method: options.method || 'GET'
  });

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const errorMsg = err.detail?.[0]?.msg || err.detail || err.error || 'API Error';
    console.error('🎯 API Error:', { endpoint, status: res.status, error: errorMsg });
    throw new Error(errorMsg);
  }

  const data = await res.json();
  console.log('🎯 API Success:', { endpoint, success: data.success !== false });
  return data;
};

/* =========================
   TypeScript Interfaces
========================= */

export interface GenderRatio {
  male?: number;
  female?: number;
  other?: number;
  [key: string]: number | undefined;
}

export interface Geography {
  [country: string]: {
    percentage: number;
    spend?: number;
  };
}

export interface ConfidenceScores {
  demographic?: number;
  geographic?: number;
  interest?: number;
  income?: number;
  device?: number;
  funnel?: number;
  bidding?: number;
  [key: string]: number | undefined;
}

export interface DeviceDistribution {
  mobile?: number;
  desktop?: number;
  tablet?: number;
  ios?: number;
  android?: number;
  [key: string]: number | undefined;
}

export interface RawAnalysis {
  [key: string]: any;
}

export interface TargetingIntelData {
  // Core identifiers
  id: string;
  competitor_id: string;
  user_id: string;
  competitor_name?: string; // Not in schema but useful for display
  
  // Demographics
  age_min: number | null;
  age_max: number | null;
  age_range: string | null;
  gender_ratio: GenderRatio | null;
  primary_gender: string | null;
  
  // Geography
  geography: Geography | null;
  primary_location: string | null;
  
  // Interests
  interest_clusters: string[] | null;
  primary_interests: string[] | null;
  
  // Income & Devices
  income_level: string | null;
  income_score: number | null;
  device_distribution: DeviceDistribution | null;
  primary_device: string | null;
  
  // Funnel & Audience
  funnel_stage: string | null;
  funnel_score: number | null;
  audience_type: string | null;
  audience_size: string | null;
  
  // Bidding & Performance
  bidding_strategy: string | null;
  bidding_confidence: number | null;
  content_type: string | null;
  call_to_action: string | null;
  estimated_cpm: number | null;
  estimated_cpc: number | null;
  estimated_roas: number | null;
  engagement_rate: number | null;
  
  // Confidence & Metadata
  confidence_scores: ConfidenceScores | null;
  overall_confidence: number | null;
  is_active: boolean | null;
  
  // Timestamps
  created_at: string;
  updated_at: string | null;
  last_calculated_at: string | null;
  
  // Raw data
  raw_analysis: RawAnalysis | null;
}

export interface CalculateIntelRequest {
  competitor_ids?: string[];
  force_recalculate?: boolean;
}

export interface CalculateIntelResponse {
  success: boolean;
  total_competitors: number;
  calculated: number;
  failed: number;
  results: any[];
}

export interface DashboardInsights {
  aggregated_data?: any;
  recommendations?: string[];
  top_competitors?: TargetingIntelData[];
  [key: string]: any;
}

/* =========================
   Mock Data (Fallback)
========================= */

const mockTargetingIntelData: TargetingIntelData = {
  id: 'mock-1',
  competitor_id: '11111111-1111-1111-1111-111111111111',
  user_id: '22222222-2222-2222-2222-222222222222',
  competitor_name: 'Nike',
  
  // Demographics
  age_min: 25,
  age_max: 34,
  age_range: '25-34',
  gender_ratio: { male: 0.58, female: 0.40, other: 0.02 },
  primary_gender: 'male',
  
  // Geography
  geography: {
    'United States': { percentage: 45, spend: 18200 },
    'United Kingdom': { percentage: 22, spend: 8900 },
    'Canada': { percentage: 15, spend: 6100 },
    'Australia': { percentage: 10, spend: 4000 },
    'Germany': { percentage: 8, spend: 3200 }
  },
  primary_location: 'United States',
  
  // Interests
  interest_clusters: ['Fitness & Running', 'Athletic Apparel', 'Health & Wellness'],
  primary_interests: ['Fitness', 'Running', 'Sports'],
  
  // Income & Devices
  income_level: 'middle',
  income_score: 0.75,
  device_distribution: { mobile: 0.78, desktop: 0.22, ios: 0.65, android: 0.35 },
  primary_device: 'mobile',
  
  // Funnel & Audience
  funnel_stage: 'consideration',
  funnel_score: 0.68,
  audience_type: 'warm',
  audience_size: 'large',
  
  // Bidding & Performance
  bidding_strategy: 'cost_cap',
  bidding_confidence: 0.82,
  content_type: 'video',
  call_to_action: 'shop_now',
  estimated_cpm: 12.5,
  estimated_cpc: 2.16,
  estimated_roas: 4.2,
  engagement_rate: 0.045,
  
  // Confidence & Metadata
  confidence_scores: {
    demographic: 0.85,
    geographic: 0.78,
    interest: 0.92,
    income: 0.65,
    device: 0.88,
    funnel: 0.72,
    bidding: 0.82
  },
  overall_confidence: 0.75,
  is_active: true,
  
  // Timestamps
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  last_calculated_at: new Date().toISOString(),
  
  // Raw data
  raw_analysis: {
    source: 'AI_MODELED',
    model_version: '1.2.0',
    last_updated: new Date().toISOString()
  }
};

/* =========================
   Data Normalization Functions
========================= */

/**
 * Normalize database data to match TypeScript interface
 */
function normalizeTargetingData(dbData: any): TargetingIntelData {
  if (!dbData) {
    console.warn('⚠️ No data to normalize, returning mock data');
    return mockTargetingIntelData;
  }

  // Helper function to safely parse JSON fields
  const safeParse = (field: any, defaultValue: any = null) => {
    if (typeof field === 'string') {
      try {
        return JSON.parse(field);
      } catch {
        return defaultValue;
      }
    }
    return field || defaultValue;
  };

  const normalizedData: TargetingIntelData = {
    ...mockTargetingIntelData, // Start with mock as fallback
    
    // Core identifiers
    id: dbData.id || mockTargetingIntelData.id,
    competitor_id: dbData.competitor_id || mockTargetingIntelData.competitor_id,
    user_id: dbData.user_id || mockTargetingIntelData.user_id,
    competitor_name: dbData.competitor_name || mockTargetingIntelData.competitor_name,
    
    // Demographics
    age_min: dbData.age_min ?? mockTargetingIntelData.age_min,
    age_max: dbData.age_max ?? mockTargetingIntelData.age_max,
    age_range: dbData.age_range || mockTargetingIntelData.age_range,
    gender_ratio: safeParse(dbData.gender_ratio, mockTargetingIntelData.gender_ratio),
    primary_gender: dbData.primary_gender || mockTargetingIntelData.primary_gender,
    
    // Geography
    geography: safeParse(dbData.geography, mockTargetingIntelData.geography),
    primary_location: dbData.primary_location || mockTargetingIntelData.primary_location,
    
    // Interests
    interest_clusters: safeParse(dbData.interest_clusters, mockTargetingIntelData.interest_clusters),
    primary_interests: safeParse(dbData.primary_interests, mockTargetingIntelData.primary_interests),
    
    // Income & Devices
    income_level: dbData.income_level || mockTargetingIntelData.income_level,
    income_score: dbData.income_score ?? mockTargetingIntelData.income_score,
    device_distribution: safeParse(dbData.device_distribution, mockTargetingIntelData.device_distribution),
    primary_device: dbData.primary_device || mockTargetingIntelData.primary_device,
    
    // Funnel & Audience
    funnel_stage: dbData.funnel_stage || mockTargetingIntelData.funnel_stage,
    funnel_score: dbData.funnel_score ?? mockTargetingIntelData.funnel_score,
    audience_type: dbData.audience_type || mockTargetingIntelData.audience_type,
    audience_size: dbData.audience_size || mockTargetingIntelData.audience_size,
    
    // Bidding & Performance
    bidding_strategy: dbData.bidding_strategy || mockTargetingIntelData.bidding_strategy,
    bidding_confidence: dbData.bidding_confidence ?? mockTargetingIntelData.bidding_confidence,
    content_type: dbData.content_type || mockTargetingIntelData.content_type,
    call_to_action: dbData.call_to_action || mockTargetingIntelData.call_to_action,
    estimated_cpm: dbData.estimated_cpm ?? mockTargetingIntelData.estimated_cpm,
    estimated_cpc: dbData.estimated_cpc ?? mockTargetingIntelData.estimated_cpc,
    estimated_roas: dbData.estimated_roas ?? mockTargetingIntelData.estimated_roas,
    engagement_rate: dbData.engagement_rate ?? mockTargetingIntelData.engagement_rate,
    
    // Confidence & Metadata
    confidence_scores: safeParse(dbData.confidence_scores, mockTargetingIntelData.confidence_scores),
    overall_confidence: dbData.overall_confidence ?? mockTargetingIntelData.overall_confidence,
    is_active: dbData.is_active ?? mockTargetingIntelData.is_active,
    
    // Timestamps
    created_at: dbData.created_at || mockTargetingIntelData.created_at,
    updated_at: dbData.updated_at || mockTargetingIntelData.updated_at,
    last_calculated_at: dbData.last_calculated_at || mockTargetingIntelData.last_calculated_at,
    
    // Raw data
    raw_analysis: safeParse(dbData.raw_analysis, mockTargetingIntelData.raw_analysis)
  };

  console.log('✅ Normalized data for:', normalizedData.competitor_name || normalizedData.competitor_id);
  return normalizedData;
}

/* =========================
   API Functions
========================= */

/**
 * Calculate targeting intelligence for competitors
 */
export async function calculateTargetingIntel(
  request: CalculateIntelRequest = {}
): Promise<CalculateIntelResponse> {
  try {
    console.log('🎯 Calculating targeting intelligence...');
    
    const response = await fetchWithAuth('/api/targ-intel/calculate', {
      method: 'POST',
      body: JSON.stringify(request)
    });
    
    console.log('✅ Targeting intelligence calculation completed:', response);
    return response;
    
  } catch (error: any) {
    console.error('Error calculating targeting intelligence:', error);
    throw error;
  }
}

/**
 * Calculate targeting intelligence for a specific competitor
 */
export async function calculateCompetitorTargetingIntel(
  competitorId: string,
  forceRecalculate: boolean = false
): Promise<TargetingIntelData> {
  try {
    console.log(`🎯 Calculating targeting for competitor ${competitorId}...`);
    
    const url = `/api/targ-intel/calculate/${competitorId}?force_recalculate=${forceRecalculate}`;
    const response = await fetchWithAuth(url, { method: 'POST' });
    
    console.log('✅ Competitor targeting calculation completed');
    return normalizeTargetingData(response);
    
  } catch (error: any) {
    console.error(`Error calculating targeting for competitor ${competitorId}:`, error);
    throw error;
  }
}

/**
 * Get targeting intelligence for a specific competitor
 */
export async function fetchTargetingIntelByCompetitorId(
  competitorId: string
): Promise<TargetingIntelData | null> {
  const token = getToken();

  if (!token) {
    console.warn(`🎯 No auth token, using mock data`);
    return mockTargetingIntelData;
  }

  try {
    console.log(`🎯 Fetching targeting for competitor ${competitorId}`);
    
    const response = await fetchWithAuth(`/api/targ-intel/competitor/${competitorId}`);
    
    console.log(`✅ Successfully fetched targeting for competitor`);
    return normalizeTargetingData(response);
    
  } catch (error: any) {
    console.error(`Error fetching targeting for competitor ${competitorId}:`, error.message || error);
    return null;
  }
}

/**
 * Get targeting intelligence for all user's competitors
 */
export async function fetchAllTargetingIntel(
  includeInactive: boolean = false
): Promise<TargetingIntelData[]> {
  const token = getToken();

  if (!token) {
    console.log('🎯 No auth token, using demo data');
    return [mockTargetingIntelData];
  }

  try {
    console.log('🎯 Fetching all targeting intelligence...');
    
    const url = `/api/targ-intel/all?include_inactive=${includeInactive}`;
    const response = await fetchWithAuth(url);
    
    if (Array.isArray(response)) {
      console.log(`✅ Found ${response.length} targeting records`);
      return response.map(item => ({
        ...normalizeTargetingData(item),
        competitor_name: item.competitor_name || `Competitor ${item.competitor_id?.substring(0, 8)}`
      }));
    }
    console.warn('⚠️ No targeting data array returned');
    return [];
  } catch (error: any) {
    console.error('Error fetching all targeting intelligence:', error.message || error);
    return [];
  }
}

/**
 * Get targeting intelligence dashboard
 */
export async function fetchTargetingDashboard(): Promise<DashboardInsights> {
  try {
    console.log('🎯 Fetching targeting dashboard...');
    
    const response = await fetchWithAuth('/api/targ-intel/dashboard');
    
    console.log('✅ Dashboard data fetched');
    return response;
    
  } catch (error: any) {
    console.error('Error fetching targeting dashboard:', error);
    return {};
  }
}

/**
 * Delete targeting intelligence for a competitor
 */
export async function deleteTargetingIntel(
  competitorId: string
): Promise<boolean> {
  try {
    console.log(`🎯 Deleting targeting for competitor ${competitorId}...`);
    
    await fetchWithAuth(`/api/targ-intel/${competitorId}`, {
      method: 'DELETE'
    });
    
    console.log(`✅ Targeting deleted for competitor ${competitorId}`);
    return true;
    
  } catch (error: any) {
    console.error(`Error deleting targeting for competitor ${competitorId}:`, error);
    return false;
  }
}

/**
 * Refresh all targeting intelligence
 */
export async function refreshAllTargetingIntel(): Promise<boolean> {
  try {
    console.log('🎯 Refreshing all targeting intelligence...');
    
    await fetchWithAuth('/api/targ-intel/refresh-all', {
      method: 'POST'
    });
    
    console.log('✅ All targeting intelligence refreshed');
    return true;
    
  } catch (error: any) {
    console.error('Error refreshing all targeting intelligence:', error);
    return false;
  }
}

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  const token = getToken();
  if (!token) return false;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = payload.exp * 1000;
    return Date.now() < exp && payload.user_id && payload.email;
  } catch {
    return false;
  }
};

/**
 * Get user info
 */
export const getAuthUserInfo = getUserInfo;

/**
 * Test targeting intelligence service connection
 */
export async function testTargetingIntelConnection(): Promise<{
  connected: boolean;
  authenticated: boolean;
  userHasData: boolean;
  error?: string;
}> {
  const token = getToken();
  
  if (!token) {
    return {
      connected: false,
      authenticated: false,
      userHasData: false,
      error: 'Not authenticated'
    };
  }

  try {
    // First try to connect to health endpoint
    try {
      const healthResponse = await fetch(`${BASE_URL}/health`);
      if (!healthResponse.ok) {
        return {
          connected: false,
          authenticated: true,
          userHasData: false,
          error: 'Targeting intelligence service not running'
        };
      }
    } catch {
      return {
        connected: false,
        authenticated: true,
        userHasData: false,
        error: 'Cannot connect to targeting intelligence service'
      };
    }

    // Try to fetch user's targeting data
    const response = await fetchAllTargetingIntel();
    
    return {
      connected: true,
      authenticated: true,
      userHasData: response.length > 0
    };
  } catch (error: any) {
    console.error('Error testing connection:', error);
    return {
      connected: false,
      authenticated: !!token,
      userHasData: false,
      error: error.message || 'Connection test failed'
    };
  }
}

/**
 * Fetch user's competitors (same backend as targeting intel)
 */
export async function fetchCompetitors(): Promise<Array<{ id: string; name: string; domain?: string }>> {
  try {
    const response = await fetchWithAuth('/api/competitors/');
    if (Array.isArray(response)) return response;
    return [];
  } catch (e) {
    console.error('Error fetching competitors:', e);
    return [];
  }
}

/* =========================
   Export API Object
========================= */

export const TargetingIntelAPI = {
  calculate: calculateTargetingIntel,
  calculateCompetitor: calculateCompetitorTargetingIntel,
  getByCompetitor: fetchTargetingIntelByCompetitorId,
  getAll: fetchAllTargetingIntel,
  getDashboard: fetchTargetingDashboard,
  getCompetitors: fetchCompetitors,
  delete: deleteTargetingIntel,
  refreshAll: refreshAllTargetingIntel,
  testConnection: testTargetingIntelConnection,
  isAuthenticated,
  getUserInfo: getAuthUserInfo
};

export default TargetingIntelAPI;