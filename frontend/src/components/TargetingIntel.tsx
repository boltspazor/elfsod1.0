// src/components/TargetingIntel.tsx
import React, { useEffect, useState } from 'react';
import { RefreshCw, Download, Shield, Cpu, Brain } from 'lucide-react';
import TargetingIntelAPI, {
  type TargetingIntelData,
  fetchAllTargetingIntel,
  getAuthUserInfo
} from '../services/targetingIntel';

// ─────────────────────────────────────────────────────────────────────────────
// HBar — horizontal progress bar row
// ─────────────────────────────────────────────────────────────────────────────
const HBar = ({ label, sub, value, max, color }: {
  label: string; sub?: string; value: number; max: number; color: string;
}) => {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="flex items-center gap-3 mb-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1">
          <span className="text-xs text-white font-medium truncate">{label}</span>
          {sub && <span className="text-[10px] text-gray-400">{sub}</span>}
        </div>
      </div>
      <div className="w-16 text-right text-xs text-gray-300 font-semibold shrink-0">
        {value.toFixed(1)}%
      </div>
      <div className="w-48 bg-[#2a2a2a] rounded-full h-1.5 shrink-0">
        <div className="h-1.5 rounded-full transition-all duration-1000"
          style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// NeonCard — cyberpunk gradient border wrapper
// Technique: 1px gradient bg + dark inner div = gradient border
// ─────────────────────────────────────────────────────────────────────────────
const NEON_GRADIENT = 'linear-gradient(135deg, #06B6D4 0%, #A855F7 50%, #EC4899 100%)';
const NEON_GLOW = '0 0 8px rgba(6,182,212,0.3), 0 0 18px rgba(168,85,247,0.15)';
const NEON_GLOW_HO = '0 0 16px rgba(6,182,212,0.6), 0 0 32px rgba(168,85,247,0.4), 0 0 56px rgba(236,72,153,0.2)';

const NeonCard = ({ children, className = '', innerClass = '', radius = '0.75rem' }: {
  children: React.ReactNode;
  className?: string;
  innerClass?: string;
  radius?: string;
}) => (
  <div
    className={`neon-card-wrapper ${className}`}
    style={{
      background: NEON_GRADIENT, padding: '1px', borderRadius: radius,
      boxShadow: NEON_GLOW, transition: 'box-shadow 0.35s ease'
    }}
    onMouseEnter={e => (e.currentTarget.style.boxShadow = NEON_GLOW_HO)}
    onMouseLeave={e => (e.currentTarget.style.boxShadow = NEON_GLOW)}
  >
    <div style={{ background: '#111', borderRadius: `calc(${radius} - 1px)` }}
      className={`w-full h-full ${innerClass}`}>
      {children}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// MetricCard — left panel stat card
// ─────────────────────────────────────────────────────────────────────────────
const MetricCard = ({ title, subtitle, value, color }: {
  title: string; subtitle: string; value: string; color: string;
}) => (
  <NeonCard className="mb-3" innerClass="p-4">
    <div className="font-semibold text-white text-sm mb-1">{title}</div>
    <div className="text-xs text-gray-400 mb-3">{subtitle}</div>
    <div className="text-right text-4xl font-bold" style={{ color }}>{value}</div>
  </NeonCard>
);

// ─────────────────────────────────────────────────────────────────────────────
// RecoCard — AI recommendation card
// ─────────────────────────────────────────────────────────────────────────────
const RecoCard = ({ title, body }: { title: string; body: React.ReactNode }) => (
  <NeonCard innerClass="p-4 flex flex-col gap-2">
    <p className="font-bold text-white text-sm">{title}</p>
    <p className="text-xs text-gray-300 leading-relaxed">{body}</p>
  </NeonCard>
);

// ─────────────────────────────────────────────────────────────────────────────
// GenderBlock — gender distribution row
// ─────────────────────────────────────────────────────────────────────────────
const GenderBlock = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <NeonCard className="mb-2" innerClass="p-3">
    <div className="text-xs text-gray-300 font-medium mb-1">{label}</div>
    <div className="text-3xl font-bold text-right" style={{ color }}>{value}%</div>
  </NeonCard>
);

// ─────────────────────────────────────────────────────────────────────────────
// CostCard — binding strategy cost row
// ─────────────────────────────────────────────────────────────────────────────
const CostCard = ({ title, sub, value, valueColor = '#06B6D4' }: {
  title: string; sub: string; value: string; valueColor?: string;
}) => (
  <NeonCard className="mb-3" innerClass="p-4">
    <div className="font-bold text-white text-sm">{title}</div>
    <div className="text-xs text-gray-500 mt-0.5 mb-3">{sub}</div>
    <div className="text-4xl font-bold text-right" style={{ color: valueColor }}>{value}</div>
  </NeonCard>
);

// ─────────────────────────────────────────────────────────────────────────────
// StatMiniCard — audience shared / engagement rate box
// ─────────────────────────────────────────────────────────────────────────────
const StatMiniCard = ({ value, label, color }: { value: string; label: string; color: string }) => (
  <NeonCard innerClass="p-4 text-center">
    <div className="text-3xl font-bold" style={{ color }}>{value}</div>
    <div className="text-gray-400 text-xs mt-1">{label}</div>
  </NeonCard>
);

// ─────────────────────────────────────────────────────────────────────────────
// Loading Screen
// ─────────────────────────────────────────────────────────────────────────────
const LoadingScreen = ({ userName }: { userName?: string }) => (
  <div className="min-h-screen bg-black flex items-center justify-center">
    <div className="flex flex-col items-center gap-6">
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-full border-4 border-[#222]" />
        <div className="absolute inset-0 rounded-full border-4 border-t-[#06B6D4] border-r-transparent border-b-transparent border-l-transparent animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Brain className="w-7 h-7 text-[#06B6D4]" />
        </div>
      </div>
      <div className="text-center">
        <p className="text-white font-semibold text-lg">Loading Targeting Intelligence</p>
        <p className="text-gray-400 text-sm mt-1">
          {userName ? `Analyzing data for ${userName}` : 'Preparing insights...'}
        </p>
      </div>
      <div className="w-64 h-1 bg-[#222] rounded-full overflow-hidden">
        <div className="h-full rounded-full animate-[loadbar_1.5s_ease-in-out_infinite]"
          style={{ background: NEON_GRADIENT }} />
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// PageNavbar
// ─────────────────────────────────────────────────────────────────────────────
const PageNavbar = ({ userName }: { userName?: string }) => {
  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };
  const navLinks = [
    { label: 'Home', href: '/' },
    { label: 'Command Center', href: '/command-center' },
    { label: 'Targeting Intel', href: '/targeting_intel' },
    { label: 'Ad Surveillance', href: '/ad-surveillance' },
    { label: 'Auto Create', href: '/auto-create' },
    { label: 'Reverse Engineering', href: '#' },
  ];
  return (
    <nav className="bg-black border-b border-[#1a1a1a] sticky top-0 z-50">
      <div className="px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <a href="/" className="text-white font-bold text-xl tracking-tight">ELFSOD</a>
          <div className="flex items-center gap-6">
            {navLinks.map((l) => (
              <a key={l.label} href={l.href}
                className={`text-sm transition-colors ${l.label === 'Targeting Intel' ? 'text-white font-medium' : 'text-gray-400 hover:text-white'
                  }`}>
                {l.label}
              </a>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {userName && <span className="text-gray-300 text-sm">Hello, {userName}</span>}
          <button onClick={handleLogout}
            className="bg-[#1a1a1a] border border-[#333] text-white text-sm px-4 py-1.5 rounded-lg hover:bg-[#252525] transition-colors">
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Bar chart decoration for Binding Strategy
// ─────────────────────────────────────────────────────────────────────────────
const ActivityChart = () => {
  const heights = [20, 15, 10, 8, 9, 25, 40, 65, 80, 70, 60, 55, 50, 60, 70, 75, 80, 90, 85, 60, 45, 35, 30, 22];
  return (
    <div className="bg-[#0d0d0d] rounded-xl p-3 mb-4 h-28 flex items-end gap-0.5 overflow-hidden">
      {heights.map((h, i) => (
        <div key={i} className="flex-1 rounded-t"
          style={{
            height: `${h}%`,
            backgroundColor: (i >= 3 && i <= 5) ? '#22C55E' : (i >= 18 && i <= 20) ? '#EF4444' : '#2a2a2a'
          }} />
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const TargetingIntel: React.FC = () => {
  const [data, setData] = useState<TargetingIntelData | null>(null);
  const [allData, setAllData] = useState<TargetingIntelData[]>([]);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<{ user_id: string; email: string; name: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'demographics' | 'interests' | 'strategy'>('overview');
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected'>('disconnected');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const user = getAuthUserInfo();
    setUserInfo(user);
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const conn = await TargetingIntelAPI.testConnection();
      setConnectionStatus(conn.connected ? 'connected' : 'disconnected');
      const records = await fetchAllTargetingIntel();
      setAllData(records);
      setData(records[0] || null);
    } catch { /* fallback to mock */ }
    finally { setLoading(false); }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleExport = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `targeting-intel-${data.competitor_id}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  // ── Derived display values ───────────────────────────────────────────────
  const ageRange = data?.age_range || '25-34';
  const purchaseIntent = data?.funnel_stage === 'consideration' ? 'High' : 'High';
  const purchaseConf = data?.funnel_score != null ? `${(data.funnel_score * 100).toFixed(1)}% Coincidence` : '62.0% Coincidence';
  const mobileShare = data?.device_distribution?.mobile != null
    ? `${(data.device_distribution.mobile * 100).toFixed(1)}%` : '78.0%';
  const iosShare = data?.device_distribution?.ios != null
    ? `iOS: ${(data.device_distribution.ios * 100).toFixed(1)}%` : 'iOS: 65.0%';
  const peakCpm = data?.estimated_cpm != null ? `$${data.estimated_cpm.toFixed(2)}` : '$15.60';
  const avgCpc = data?.estimated_cpc != null ? `$${data.estimated_cpc.toFixed(2)}` : '$2.60';
  const overallConf = data?.overall_confidence != null ? Math.round(data.overall_confidence * 100) : 76;
  const competitorName = data?.competitor_name || 'Nike';
  const dataSource = data?.raw_analysis?.source || 'AI.MODELED';
  const maleVal = data?.gender_ratio?.male != null ? Math.round(data.gender_ratio.male * 100) : 58;
  const femaleVal = data?.gender_ratio?.female != null ? Math.round(data.gender_ratio.female * 100) : 40;
  const otherVal = data?.gender_ratio?.other != null ? Math.round(data.gender_ratio.other * 100) : 2;
  const lastAnalysis = data?.last_calculated_at
    ? new Date(data.last_calculated_at).toLocaleString() : '1/07/2026, 5:25:47 PM';

  const ageData = [
    { label: '18 - 24', value: 15.0, color: '#F59E0B' },
    { label: '25 - 34', value: 35.0, color: '#22C55E' },
    { label: '35 - 44', value: 28.0, color: '#A855F7' },
    { label: '45 - 54', value: 15.0, color: '#06B6D4' },
    { label: '55+', value: 7.0, color: '#EF4444' },
  ];

  const interestClusters = data?.interest_clusters || ['Fitness & Running', 'Athletic Apparel', 'Health & Wellness', 'Sports Equipment'];
  const interestData = [
    { label: interestClusters[0] || 'Fitness & Running', sub: '(Potential reach: 450.0K)', value: 90, color: '#F59E0B' },
    { label: interestClusters[1] || 'Athletic Apparel', sub: '(Potential reach: 380.0K)', value: 78, color: '#22C55E' },
    { label: interestClusters[2] || 'Health & Wellness', sub: '(Potential reach: 320.0K)', value: 65, color: '#A855F7' },
    { label: interestClusters[3] || 'Sports Equipment', sub: '(Potential reach: 290.0K)', value: 59, color: '#06B6D4' },
  ];

  const tabs = ['Overview', 'Demographics', 'Interests', 'Strategy'];
  const tabKeys = ['overview', 'demographics', 'interests', 'strategy'] as const;

  if (loading) return (
    <>
      <PageNavbar userName={userInfo?.name} />
      <LoadingScreen userName={userInfo?.name} />
    </>
  );

  // ── Page ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-black text-white">
      <PageNavbar userName={userInfo?.name} />

      <div className="px-6 py-6 max-w-[1200px] mx-auto">

        {/* PAGE HEADER */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Targeting Intelligence</h1>
            <p className="text-gray-400 text-sm mt-1">AI-powered audience insights and targeting strategies</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleRefresh} disabled={refreshing}
              className="flex items-center gap-2 border border-[#333] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#1a1a1a] transition-colors">
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button onClick={handleExport}
              className="flex items-center gap-2 bg-[#1a8cff] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#0070e0] transition-colors">
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
          </div>
        </div>

        {/* STATUS BADGES */}
        <div className="flex flex-wrap gap-3 mb-5">
          <div className="flex items-center gap-2 border border-[#333] rounded-lg px-3 py-1.5 bg-[#111]">
            <Shield className="w-3.5 h-3.5 text-gray-300" />
            <span className="text-sm text-white">{userInfo?.name || 'Ravi Kumar'}</span>
            <span className="bg-[#22C55E] text-black text-[10px] font-bold px-2 py-0.5 rounded">Authenticated</span>
          </div>
          <div className="flex items-center gap-2 border border-[#333] rounded-lg px-3 py-1.5 bg-[#111]">
            <div className={`w-1.5 h-1.5 rounded-full ${connectionStatus === 'connected' ? 'bg-green-400' : 'bg-yellow-400'}`} />
            <span className="text-sm text-white">Live Data</span>
            <span className="border border-[#444] text-gray-300 text-[10px] px-2 py-0.5 rounded">{dataSource}</span>
          </div>
          <div className="flex items-center gap-2 border border-[#333] rounded-lg px-3 py-1.5 bg-[#111]">
            <Cpu className="w-3.5 h-3.5 text-gray-300" />
            <span className="text-sm text-white">AI Confidence:</span>
            <span className="text-sm font-bold text-white">{overallConf}%</span>
          </div>
        </div>

        {/* TAB NAVIGATION */}
        <div className="border-b border-[#222] mb-6">
          <div className="flex">
            {tabs.map((tab, i) => {
              const key = tabKeys[i];
              const active = activeTab === key;
              return (
                <button key={tab} onClick={() => setActiveTab(key)}
                  className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${active ? 'border-white text-white' : 'border-transparent text-gray-400 hover:text-white'
                    }`}>
                  {tab}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── OVERVIEW TAB ─────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <>
            {/* Row 1 */}
            <div className="grid grid-cols-3 gap-5 mb-5">
              {/* Left panel */}
              <NeonCard className="col-span-1" innerClass="p-5" radius="1rem">
                <div className="mb-4">
                  <h2 className="text-xl font-bold text-white">{competitorName}</h2>
                  <p className="text-gray-400 text-xs">Targeting Intelligence Analysis</p>
                </div>
                <MetricCard title="Primary Age" subtitle="Age:" value={ageRange} color="#F59E0B" />
                <MetricCard title="Purchase Intent" subtitle={purchaseConf} value={purchaseIntent} color="#06B6D4" />
                <MetricCard title="Mobile Share" subtitle={iosShare} value={mobileShare} color="#F59E0B" />
                <MetricCard title="Peak CPM" subtitle="6pm - 9pm" value={peakCpm} color="#06B6D4" />
              </NeonCard>

              {/* Right panel */}
              <NeonCard className="col-span-2" innerClass="p-5" radius="1rem">
                <h2 className="text-xl font-bold text-white mb-1">AI Recommendations</h2>
                <p className="text-gray-400 text-xs mb-4">Optimized targeting strategies</p>
                <div className="grid grid-cols-2 gap-3">
                  <RecoCard title="Focus Audience" body={<>Prioritize <strong>25-34 age group</strong> with mobile-first approach. iOS users show 65% higher engagement</>} />
                  <RecoCard title="Optimal Timing" body={<>Schedule ads during <strong>3 am - 6 am window</strong> for 40% lower CPC. Avoid peak evening hours for cost efficiency.</>} />
                  <RecoCard title="Interest Targeting" body={<>Allocate <strong>60% of budget</strong> to "Fitness &amp; Running" and "Health &amp; Wellness" interest clusters showing 92%+ affinity.</>} />
                  <RecoCard title="AI Insights" body={<>Focus <strong>60% of budget</strong> on awareness to fill top funnel. Strong retargeting opportunity observed</>} />
                </div>
              </NeonCard>
            </div>

            {/* Row 2: Audience Demographics */}
            <NeonCard className="mb-5" innerClass="p-5" radius="1rem">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-white">Audience Demographics</h2>
                <span className="border border-[#333] text-gray-300 text-xs px-3 py-1 rounded-full">Updated Today</span>
              </div>
              <div className="bg-[#0d0d0d] rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-gray-300 font-medium">Age Distributions</span>
                  <span className="text-xs text-gray-500">Percentage</span>
                </div>
                {ageData.map(item => <HBar key={item.label} label={item.label} value={item.value} max={55} color={item.color} />)}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#0d0d0d] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-300 font-medium">Gender Distribution</span>
                    <span className="text-xs text-gray-500">Percentage</span>
                  </div>
                  <GenderBlock label="Male" value={maleVal} color="#06B6D4" />
                  <GenderBlock label="Female" value={femaleVal} color="#F59E0B" />
                  <GenderBlock label="Others" value={otherVal} color="#A855F7" />
                </div>
                <div className="bg-[#0d0d0d] rounded-xl p-4">
                  <span className="text-sm text-gray-300 font-medium block mb-4">Purchase Intent Analysis</span>
                  <div className="flex items-center justify-center h-[80%]">
                    <div className="text-center">
                      <div className="text-5xl font-bold text-[#06B6D4] mb-2">{purchaseIntent}</div>
                      <div className="text-gray-400 text-sm">{purchaseConf}</div>
                    </div>
                  </div>
                </div>
              </div>
            </NeonCard>

            {/* Row 3: Interest Clusters */}
            <NeonCard className="mb-5" innerClass="p-5" radius="1rem">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-white">Interest Clusters &amp; Analysis</h2>
                <span className="border border-[#333] text-gray-300 text-xs px-3 py-1 rounded-full">Top 6 Clusters</span>
              </div>
              <div className="bg-[#0d0d0d] rounded-xl p-4">
                {interestData.map(item => <HBar key={item.label} label={item.label} sub={item.sub} value={item.value} max={100} color={item.color} />)}
              </div>
            </NeonCard>

            {/* Row 4: Competitor Overlap + Binding Strategy */}
            <div className="grid grid-cols-2 gap-5 mb-5">
              <div className="flex flex-col gap-4">
                {/* Competitor Overlap */}
                <NeonCard innerClass="p-5" radius="1rem">
                  <h2 className="text-base font-bold text-white mb-4">Competitor Overlap</h2>
                  <div className="text-center mb-3">
                    <div className="text-6xl font-bold text-[#06B6D4]">58%</div>
                    <p className="text-gray-400 text-xs mt-1">Branda Overlapping</p>
                  </div>
                  <p className="text-center text-xs text-white font-semibold mb-4">Audience overlaps with similar athletic trends</p>
                  <div className="grid grid-cols-2 gap-3">
                    <StatMiniCard value="42%" label="Audience Shared" color="#06B6D4" />
                    <StatMiniCard value="3.2x" label="Engagement Rate" color="#A855F7" />
                  </div>
                </NeonCard>
                {/* Data Information */}
                <NeonCard innerClass="p-5" radius="1rem">
                  <h2 className="text-base font-bold text-white mb-3">Data Information</h2>
                  <div className="space-y-2 text-xs text-gray-400">
                    {[
                      ['Last Calculated', data?.last_calculated_at ? new Date(data.last_calculated_at).toLocaleDateString() : 'Today'],
                      ['Updated', data?.updated_at ? new Date(data.updated_at).toLocaleDateString() : 'Today'],
                      ['Created', data?.created_at ? new Date(data.created_at).toLocaleDateString() : 'Today'],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span>{k}</span><span className="text-white">{v}</span>
                      </div>
                    ))}
                    <div className="flex justify-between">
                      <span>Analysis Type</span><span className="text-[#06B6D4]">AI Predictive</span>
                    </div>
                  </div>
                </NeonCard>
              </div>

              {/* Binding Strategy */}
              <NeonCard innerClass="p-5" radius="1rem">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-base font-bold text-white">Binding Strategy Analysis</h2>
                  <span className="border border-[#333] text-gray-300 text-xs px-3 py-1 rounded-full">24 hours pattern</span>
                </div>
                <ActivityChart />
                <CostCard title="Peak CPM" sub="6 PM-9 PM" value={peakCpm} valueColor="#06B6D4" />
                <CostCard title="Average CPC" sub="Daily average cost per click!" value={avgCpc} valueColor="#A855F7" />
                <CostCard title="Best Time" sub="Lowest acquisition cost" value="3AM-6AM" valueColor="#A855F7" />
              </NeonCard>
            </div>
          </>
        )}

        {/* ── DEMOGRAPHICS TAB ─────────────────────────────────────────── */}
        {activeTab === 'demographics' && (
          <div className="space-y-5">
            <NeonCard innerClass="p-5" radius="1rem">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-white">Audience Demographics</h2>
                <span className="border border-[#333] text-gray-300 text-xs px-3 py-1 rounded-full">Updated Today</span>
              </div>
              <div className="bg-[#0d0d0d] rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-gray-300 font-medium">Age Distributions</span>
                  <span className="text-xs text-gray-500">Percentage</span>
                </div>
                {ageData.map(item => <HBar key={item.label} label={item.label} value={item.value} max={55} color={item.color} />)}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#0d0d0d] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-300 font-medium">Gender Distribution</span>
                    <span className="text-xs text-gray-500">Percentage</span>
                  </div>
                  <GenderBlock label="Male" value={maleVal} color="#06B6D4" />
                  <GenderBlock label="Female" value={femaleVal} color="#F59E0B" />
                  <GenderBlock label="Others" value={otherVal} color="#A855F7" />
                </div>
                <div className="bg-[#0d0d0d] rounded-xl p-4">
                  <span className="text-sm text-gray-300 font-medium block mb-4">Purchase Intent Analysis</span>
                  <div className="flex items-center justify-center h-40">
                    <div className="text-center">
                      <div className="text-5xl font-bold text-[#06B6D4] mb-2">{purchaseIntent}</div>
                      <div className="text-gray-400 text-sm">{purchaseConf}</div>
                    </div>
                  </div>
                </div>
              </div>
            </NeonCard>
          </div>
        )}

        {/* ── INTERESTS TAB ────────────────────────────────────────────── */}
        {activeTab === 'interests' && (
          <div className="space-y-5">
            <NeonCard innerClass="p-5" radius="1rem">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-white">Interest Clusters &amp; Analysis</h2>
                <span className="border border-[#333] text-gray-300 text-xs px-3 py-1 rounded-full">Top 6 Clusters</span>
              </div>
              <div className="bg-[#0d0d0d] rounded-xl p-4">
                {interestData.map(item => <HBar key={item.label} label={item.label} sub={item.sub} value={item.value} max={100} color={item.color} />)}
              </div>
            </NeonCard>
          </div>
        )}

        {/* ── STRATEGY TAB ─────────────────────────────────────────────── */}
        {activeTab === 'strategy' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-5">
              <NeonCard innerClass="p-5" radius="1rem">
                <h2 className="text-base font-bold text-white mb-4">Competitor Overlap</h2>
                <div className="text-center mb-3">
                  <div className="text-6xl font-bold text-[#06B6D4]">58%</div>
                  <p className="text-gray-400 text-xs mt-1">Branda Overlapping</p>
                </div>
                <p className="text-center text-xs text-white font-semibold mb-4">Audience overlaps with similar athletic trends</p>
                <div className="grid grid-cols-2 gap-3">
                  <StatMiniCard value="42%" label="Audience Shared" color="#06B6D4" />
                  <StatMiniCard value="3.2x" label="Engagement Rate" color="#A855F7" />
                </div>
              </NeonCard>
              <NeonCard innerClass="p-5" radius="1rem">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-base font-bold text-white">Binding Strategy Analysis</h2>
                  <span className="border border-[#333] text-gray-300 text-xs px-3 py-1 rounded-full">24 hours pattern</span>
                </div>
                <ActivityChart />
                <CostCard title="Peak CPM" sub="6 PM-9 PM" value={peakCpm} valueColor="#06B6D4" />
                <CostCard title="Average CPC" sub="Daily average cost per click!" value={avgCpc} valueColor="#A855F7" />
                <CostCard title="Best Time" sub="Lowest acquisition cost" value="3AM-6AM" valueColor="#A855F7" />
              </NeonCard>
            </div>
          </div>
        )}

        {/* ── FOOTER ───────────────────────────────────────────────────── */}
        <div className="border-t border-[#1a1a1a] mt-6 pt-5">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-gray-400 text-xs">
                Targeting Intelligence for {competitorName} - Last Analysis: {lastAnalysis}
              </p>
              <p className="text-gray-400 text-xs mt-1">
                Personalized insights for {userInfo?.name || 'Ravi Kumar'} · {allData.length} competitor{allData.length !== 1 ? 's' : ''} tracked
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={handleRefresh} disabled={refreshing}
                className="flex items-center gap-2 border border-[#333] text-gray-300 text-xs px-3 py-1.5 rounded-lg hover:bg-[#1a1a1a] transition-colors">
                <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh Data
              </button>
              <span className="border border-[#333] text-gray-400 text-xs px-3 py-1.5 rounded-lg">v1 · AI-Powered</span>
            </div>
          </div>
          <div className="text-center mt-4">
            <p className="text-gray-500 text-xs">
              Data last Updated:{' '}
              {data?.updated_at
                ? new Date(data.updated_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                + ' at ' + new Date(data.updated_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                : 'January 7, 2026 at 06:35 PM'}
            </p>
            <p className="text-gray-500 text-xs mt-0.5">AI-Powered insights update every 24 hours</p>
          </div>
        </div>

      </div>

      {/* Global keyframes */}
      <style>{`
        @keyframes loadbar {
          0%   { width: 0%;   margin-left: 0; }
          50%  { width: 60%;  margin-left: 20%; }
          100% { width: 0%;   margin-left: 100%; }
        }
      `}</style>
    </div>
  );
};

export default TargetingIntel;