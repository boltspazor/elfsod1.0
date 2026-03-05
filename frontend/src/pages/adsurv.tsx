// app/components/AdSurveillance.tsx
'use client';

import { useState, useEffect } from 'react';
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
  Download
} from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import SplashScreen from '@/components/SplashScreen';

// TypeScript interfaces based on your schema
interface SummaryMetrics {
  id: string;
  period_start_date: string;
  period_end_date: string;
  total_competitor_spend: number;
  active_campaigns_count: number;
  total_impressions: number;
  average_ctr: number;
  platform_distribution: Record<string, number>;
  top_performers: Array<any>;
  spend_by_industry: Record<string, number>;
  created_at: string;
  updated_at: string;
}

interface DailyMetrics {
  id: string;
  date: string;
  competitor_id: string;
  campaign_id: string;
  ad_id: string;
  daily_spend: number;
  daily_impressions: number;
  daily_clicks: number;
  daily_ctr: number;
  spend_lower_bound: number;
  spend_upper_bound: number;
  impressions_lower_bound: number;
  impressions_upper_bound: number;
  created_at: string;
  updated_at: string;
  competitor?: {
    id: string;
    name: string;
  };
  advertisement?: Advertisement;
}

interface Advertisement {
  id: string;
  unique_ad_identifier: string;
  page_name: string;
  ad_creative_body: string;
  publisher_platforms: string[];
  platform_status: string;
  ad_creative_link_title: string;
}

interface AdCardData extends DailyMetrics {
  competitor_name: string;
  ad_title: string;
  ad_body: string;
  platform: string;
  status: string;
  variants: number;
  ab_tests: number;
}

interface PlatformSpendData {
  platform: string;
  spend: number;
  percentage: number;
  color: string;
}

const AdSurveillance = () => {
  const [summaryData, setSummaryData] = useState<SummaryMetrics | null>(null);
  const [dailyMetrics, setDailyMetrics] = useState<AdCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSplash, setShowSplash] = useState(true);
  
  // Chart data state
  const [spendTrendData, _setSpendTrendData] = useState<number[]>([26000, 19500, 13000, 6500, 0, 0, 0]);
  const [platformDistribution, _setPlatformDistribution] = useState<PlatformSpendData[]>([
    { platform: 'Meta', spend: 45300, percentage: 36.5, color: '#00C2B3' },
    { platform: 'Google', spend: 38900, percentage: 31.3, color: '#4A90E2' },
    { platform: 'TikTok', spend: 24700, percentage: 19.9, color: '#FF6B6B' },
    { platform: 'LinkedIn', spend: 15400, percentage: 12.4, color: '#FFD166' },
  ]);

  // Fetch summary metrics
  const fetchSummaryMetrics = async () => {
    try {
      // Replace with your actual API endpoint
      const response = await fetch('/api/summary-metrics?period=' + selectedPeriod);
      if (response.ok) {
        const data = await response.json();
        setSummaryData(data);
      }
    } catch (error) {
      console.error('Error fetching summary metrics:', error);
      // Fallback mock data
      setSummaryData({
        id: 'mock-1',
        period_start_date: new Date().toISOString(),
        period_end_date: new Date().toISOString(),
        total_competitor_spend: 124300,
        active_campaigns_count: 1247,
        total_impressions: 12400000,
        average_ctr: 0.0342,
        platform_distribution: {},
        top_performers: [],
        spend_by_industry: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  };

  // Fetch daily metrics with advertisement data
  const fetchDailyMetrics = async () => {
    try {
      // Replace with your actual API endpoint
      const response = await fetch('/api/daily-metrics?date=' + new Date().toISOString().split('T')[0]);
      if (response.ok) {
        const data = await response.json();
        
        // Transform data to match AdCardData interface
        const transformedData: AdCardData[] = data.map((metric: DailyMetrics) => ({
          ...metric,
          competitor_name: metric.competitor?.name || 'Unknown Competitor',
          ad_title: metric.advertisement?.ad_creative_link_title || 'Untitled Ad',
          ad_body: metric.advertisement?.ad_creative_body || 'No description available',
          platform: metric.advertisement?.publisher_platforms?.[0] || 'Meta',
          status: metric.advertisement?.platform_status || 'ACTIVE',
          variants: 4, // You'll need to calculate this from your data
          ab_tests: 2, // You'll need to calculate this from your data
        }));
        
        setDailyMetrics(transformedData.slice(0, 5)); // Show top 5
      }
    } catch (error) {
      console.error('Error fetching daily metrics:', error);
      // Fallback mock data
      setDailyMetrics([
        {
          id: '1',
          date: new Date().toISOString(),
          competitor_id: 'comp-1',
          campaign_id: 'camp-1',
          ad_id: 'ad-1',
          daily_spend: 3420,
          daily_impressions: 234500,
          daily_clicks: 8911,
          daily_ctr: 0.038,
          spend_lower_bound: 3278,
          spend_upper_bound: 3562,
          impressions_lower_bound: 225000,
          impressions_upper_bound: 244000,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          competitor_name: 'Nike Running',
          ad_title: 'Run Like Never Before - 40% Off',
          ad_body: 'Experience the latest Nike running shoes with 40% discount for a limited time',
          platform: 'Meta',
          status: 'ACTIVE',
          variants: 4,
          ab_tests: 2
        },
        {
          id: '2',
          date: new Date().toISOString(),
          competitor_id: 'comp-2',
          campaign_id: 'camp-2',
          ad_id: 'ad-2',
          daily_spend: 2890,
          daily_impressions: 187600,
          daily_clicks: 5440,
          daily_ctr: 0.029,
          spend_lower_bound: 2760,
          spend_upper_bound: 3020,
          impressions_lower_bound: 180000,
          impressions_upper_bound: 195200,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          competitor_name: 'Adidas Performance',
          ad_title: 'Unleash Your Potential',
          ad_body: 'Adidas performance gear for athletes who want to push their limits',
          platform: 'Google',
          status: 'ACTIVE',
          variants: 6,
          ab_tests: 3
        },
        {
          id: '3',
          date: new Date().toISOString(),
          competitor_id: 'comp-3',
          campaign_id: 'camp-3',
          ad_id: 'ad-3',
          daily_spend: 4560,
          daily_impressions: 456700,
          daily_clicks: 23748,
          daily_ctr: 0.052,
          spend_lower_bound: 4410,
          spend_upper_bound: 4710,
          impressions_lower_bound: 447000,
          impressions_upper_bound: 466500,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          competitor_name: 'Under Armour',
          ad_title: 'Train Smarter Not Harder',
          ad_body: 'Advanced training equipment and apparel for serious athletes',
          platform: 'Meta',
          status: 'ACTIVE',
          variants: 3,
          ab_tests: 1
        }
      ]);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchSummaryMetrics(), fetchDailyMetrics()]);
      setLoading(false);
    };
    
    loadData();
  }, [selectedPeriod]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (trend < 0) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return null;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-500';
      case 'PAUSED': return 'bg-yellow-500';
      case 'ENDED': return 'bg-gray-500';
      default: return 'bg-blue-500';
    }
  };

  if (loading) {
    return (
      <>
        <SplashScreen visible={showSplash} onComplete={() => setShowSplash(false)} duration={1500} />
        <Navigation />
        <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-t-blue-500 border-gray-200 rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading surveillance data...</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
    <SplashScreen visible={showSplash} onComplete={() => setShowSplash(false)} duration={1500} />
    <Navigation />
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Competitor Ad Surveillance</h1>
            <p className="text-gray-600 mt-2">Real-time intelligence across all advertising platforms</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search campaigns or competitors..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
            >
              <option value="1d">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center">
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Summary Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Competitor Spend */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex items-center text-green-500">
              {getTrendIcon(18)}
              <span className="ml-1 text-sm font-semibold">18%</span>
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">
            {summaryData ? formatCurrency(summaryData.total_competitor_spend) : '$124.3K'}
          </h3>
          <p className="text-gray-600 mt-1">Total Competitor Spend</p>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">vs previous period</p>
          </div>
        </div>

        {/* Active Campaigns */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <Target className="w-6 h-6 text-green-600" />
            </div>
            <div className="flex items-center text-green-500">
              {getTrendIcon(12)}
              <span className="ml-1 text-sm font-semibold">12%</span>
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">
            {summaryData ? formatNumber(summaryData.active_campaigns_count) : '1,247'}
          </h3>
          <p className="text-gray-600 mt-1">Active Campaigns</p>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">across all platforms</p>
          </div>
        </div>

        {/* Total Impressions */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Eye className="w-6 h-6 text-purple-600" />
            </div>
            <div className="flex items-center text-red-500">
              {getTrendIcon(-3)}
              <span className="ml-1 text-sm font-semibold">3%</span>
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">
            {summaryData ? formatNumber(summaryData.total_impressions) : '12.4M'}
          </h3>
          <p className="text-gray-600 mt-1">Total Impressions</p>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">combined reach</p>
          </div>
        </div>

        {/* Average CTR */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-orange-100 rounded-lg">
              <MousePointer className="w-6 h-6 text-orange-600" />
            </div>
            <div className="flex items-center text-green-500">
              {getTrendIcon(7)}
              <span className="ml-1 text-sm font-semibold">7%</span>
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">
            {summaryData ? formatPercentage(summaryData.average_ctr) : '3.42%'}
          </h3>
          <p className="text-gray-600 mt-1">Avg. CTR</p>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">industry benchmark</p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Spend Trend Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">7-Day Competitor Spend Trend</h2>
            <div className="flex items-center space-x-2">
              <button className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-lg">Daily</button>
              <button className="px-3 py-1 text-sm text-gray-600 rounded-lg hover:bg-gray-100">Weekly</button>
              <button className="px-3 py-1 text-sm text-gray-600 rounded-lg hover:bg-gray-100">Monthly</button>
            </div>
          </div>
          <div className="h-64">
            <div className="flex items-end h-48 space-x-2 mt-8">
              {spendTrendData.map((value, index) => {
                const height = (value / 26000) * 100;
                const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                return (
                  <div key={index} className="flex flex-col items-center flex-1">
                    <div
                      className="w-full bg-gradient-to-t from-blue-500 to-blue-300 rounded-t-lg"
                      style={{ height: `${height}%` }}
                    />
                    <span className="mt-2 text-sm text-gray-600">{days[index]}</span>
                    <span className="text-xs text-gray-500 mt-1">
                      ${(value / 1000).toFixed(0)}K
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Platform Distribution */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Spend by Platform</h2>
          <div className="space-y-4">
            {platformDistribution.map((platform) => (
              <div key={platform.platform} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div
                    className="w-3 h-3 rounded-full mr-3"
                    style={{ backgroundColor: platform.color }}
                  />
                  <span className="text-gray-700">{platform.platform}</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">{formatCurrency(platform.spend)}</div>
                  <div className="text-sm text-gray-500">{platform.percentage.toFixed(1)}%</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Platform Spend</span>
              <span className="font-semibold text-gray-900">
                {formatCurrency(platformDistribution.reduce((sum, p) => sum + p.spend, 0))}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Live Ad Feed */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Live Ad Feed</h2>
          <div className="flex items-center space-x-4">
            <button className="flex items-center text-gray-600 hover:text-gray-900">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </button>
            <button className="flex items-center text-gray-600 hover:text-gray-900">
              <BarChart3 className="w-4 h-4 mr-2" />
              Insights
            </button>
          </div>
        </div>
        
        <div className="divide-y divide-gray-100">
          {dailyMetrics.map((ad) => (
            <div key={ad.id} className="p-6 hover:bg-gray-50 transition-colors">
              {/* Ad Header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white font-semibold">
                      {ad.competitor_name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold text-gray-900">{ad.competitor_name}</h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(ad.status)} text-white`}>
                          {ad.platform}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          ad.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 
                          ad.status === 'PAUSED' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {ad.status}
                        </span>
                      </div>
                      <p className="text-gray-900 font-medium mt-1">{ad.ad_title}</p>
                    </div>
                  </div>
                </div>
                <button className="text-gray-400 hover:text-gray-600">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>

              {/* Ad Body */}
              <p className="text-gray-600 mb-6">{ad.ad_body}</p>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-500">Daily Spend</p>
                  <p className="font-semibold text-gray-900">{formatCurrency(ad.daily_spend)}</p>
                  <p className="text-xs text-gray-500">
                    ${ad.spend_lower_bound?.toFixed(0) || '~'} - ${ad.spend_upper_bound?.toFixed(0) || '~'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Impressions</p>
                  <p className="font-semibold text-gray-900">{formatNumber(ad.daily_impressions)}</p>
                  <p className="text-xs text-gray-500">
                    {ad.impressions_lower_bound ? formatNumber(ad.impressions_lower_bound) : '~'} - {ad.impressions_upper_bound ? formatNumber(ad.impressions_upper_bound) : '~'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">CTR</p>
                  <p className="font-semibold text-gray-900">{formatPercentage(ad.daily_ctr)}</p>
                  <p className="text-xs text-gray-500">industry avg: 2.1%</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Variants</p>
                  <p className="font-semibold text-gray-900">{ad.variants} creatives</p>
                  <p className="text-xs text-gray-500">A/B testing</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">A/B Tests</p>
                  <p className="font-semibold text-gray-900">{ad.ab_tests} active</p>
                  <p className="text-xs text-gray-500">in progress</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                  <PlayCircle className="w-4 h-4 mr-2" />
                  Analyze
                </button>
                <button className="flex items-center px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors">
                  <Copy className="w-4 h-4 mr-2" />
                  Clone Strategy
                </button>
                <button className="flex items-center px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors">
                  <Eye className="w-4 h-4 mr-2" />
                  Track
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-6 text-center text-gray-500 text-sm">
        <p>Data updated in real-time • Last refresh: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
        <p className="mt-1">Monitoring {dailyMetrics.length} active ads across {platformDistribution.length} platforms</p>
      </div>
    </div>
    <Footer />
    </>
  );
};

export default AdSurveillance;