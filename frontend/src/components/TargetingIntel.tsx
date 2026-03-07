// src/components/TargetingIntel.tsx
import React, { useEffect, useState } from 'react';
import { RefreshCw, Download, Shield, Cpu, Brain } from 'lucide-react';
import TargetingIntelAPI, {
  type TargetingIntelData,
  fetchAllTargetingIntel,
  fetchCompetitors,
  getAuthUserInfo
} from '../services/targetingIntel';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import SplashScreen from '@/components/SplashScreen';

// ─────────────────────────────────────────────────────────────────────────────
// HBar — horizontal progress bar row
// ─────────────────────────────────────────────────────────────────────────────
const HBar = ({ label, sub, value, max, color }: {
  label: string; sub?: string; value: number; max: number; color: string;
}) => {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '18px' }}>
      {/* Left spacer — creates empty left half like reference */}
      <div style={{ flex: 1 }} />
      {/* Right cluster: indicator + label + percentage + bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0 }} />
        <div style={{ minWidth: 60, flexShrink: 0 }}>
          <span style={{ fontSize: '12px', color: '#fff', fontWeight: 600, whiteSpace: 'nowrap' }}>{label}</span>
          {sub && <span style={{ fontSize: '10px', color: '#6b7280', marginLeft: 4, whiteSpace: 'nowrap' }}>{sub}</span>}
        </div>
        <div style={{ width: 44, textAlign: 'right', fontSize: '13px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
          {value.toFixed(1)}%
        </div>
        <div style={{ width: 200, background: '#2a2a2a', borderRadius: 999, height: 4, flexShrink: 0 }}>
          <div style={{ width: `${pct}%`, height: 4, borderRadius: 999, background: color, transition: 'width 1s ease' }} />
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// NeonCard — cyberpunk gradient border wrapper (used for right panel & lower sections)
// ─────────────────────────────────────────────────────────────────────────────
const NEON_GRADIENT = 'linear-gradient(135deg, #06B6D4 0%, #A855F7 50%, #EC4899 100%)';


const NeonCard = ({ children, className = '', innerClass = '', radius = '0.75rem' }: {
  children: React.ReactNode;
  className?: string;
  innerClass?: string;
  radius?: string;
}) => (
  <div
    className={`neon-card-wrapper ${className}`}
    style={{
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: radius,
      background: '#111',
    }}
  >
    <div className={`w-full h-full ${innerClass}`}>
      {children}
    </div>
  </div>
);


// ─────────────────────────────────────────────────────────────────────────────
// MetricCard — dark card inside the light left panel
// Each card has a dark (#1a1a1a) background, title at top-left, value at bottom-right
// ─────────────────────────────────────────────────────────────────────────────
const MetricCard = ({
  title,
  subtitle,
  value,
  gradient = false,
  solidColor,
}: {
  title: string;
  subtitle: string;
  value: string;
  gradient?: boolean;
  solidColor?: string;
}) => (
  <div
    style={{
      background: '#111',
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '12px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      minHeight: '110px'
    }}
  >
    <div style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>
      {title}
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '16px' }}>
      <div style={{ color: '#6b7280', fontSize: '12px', paddingBottom: '4px' }}>{subtitle}</div>
      <div
        style={{
          fontSize: '3rem',
          fontWeight: 800,
          lineHeight: 1,
          ...(gradient
            ? {
              background: 'linear-gradient(90deg, #06B6D4 0%, #A855F7 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              display: 'inline-block',
            }
            : { color: solidColor || '#06B6D4' }),
        }}
      >
        {value}
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// RecoCard — AI recommendation card (dark border, rounded, inside right panel)
// ─────────────────────────────────────────────────────────────────────────────
const RecoCard = ({ title, body }: { title: string; body: React.ReactNode }) => (
  <div
    style={{
      border: '1px solid rgba(255,255,255,0.55)',
      borderRadius: '14px',
      padding: '20px 18px 18px',
      background: '#111',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end',
      minHeight: '190px',
      gap: '8px',
    }}
  >
    <p style={{ fontWeight: 700, color: '#fff', fontSize: '15px', margin: 0 }}>{title}</p>
    <p style={{ color: '#9ca3af', fontSize: '13px', lineHeight: 1.6, margin: 0 }}>{body}</p>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// GenderBlock
// ─────────────────────────────────────────────────────────────────────────────
const GenderBlock = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <NeonCard className="mb-2" innerClass="" radius="0.5rem">
    <div style={{ padding: '10px 14px 12px' }}>
      <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>{label}</div>
      <div style={{ fontSize: '2rem', fontWeight: 800, textAlign: 'right', color }}>{value}%</div>
    </div>
  </NeonCard>
);

// ─────────────────────────────────────────────────────────────────────────────
// CostCard
// ─────────────────────────────────────────────────────────────────────────────
const CostCard = ({ title, sub, value, valueColor = '#06B6D4' }: {
  title: string; sub: string; value: string; valueColor?: string;
}) => (
  <NeonCard className="mb-3" innerClass="">
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '16px 18px',
    }}>
      <div>
        <div style={{ fontWeight: 700, color: '#fff', fontSize: '15px' }}>{title}</div>
        <div style={{ fontSize: '11px', color: '#6b7280', marginTop: 3 }}>{sub}</div>
      </div>
      <div style={{
        fontSize: '2.4rem', fontWeight: 800, color: valueColor,
        letterSpacing: '-0.5px',
      }}>{value}</div>
    </div>
  </NeonCard>
);

// ─────────────────────────────────────────────────────────────────────────────
// StatMiniCard
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
// Bar chart for Binding Strategy
// ─────────────────────────────────────────────────────────────────────────────
const ActivityChart = () => (
  <div style={{
    background: '#0d0d0d', borderRadius: '12px',
    marginBottom: '16px', height: '112px',
  }} />
);

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const TargetingIntel: React.FC = () => {
  const [data, setData] = useState<TargetingIntelData | null>(null);
  const [allData, setAllData] = useState<TargetingIntelData[]>([]);
  const [competitors, setCompetitors] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedCompetitorId, setSelectedCompetitorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<{ user_id: string; email: string; name: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'demographics' | 'interests' | 'strategy'>('overview');
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected'>('disconnected');
  const [refreshing, setRefreshing] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [lastCalculateMessage, setLastCalculateMessage] = useState<string | null>(null);

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
      const [records, comps] = await Promise.all([
        fetchAllTargetingIntel(),
        fetchCompetitors(),
      ]);
      setAllData(records);
      setCompetitors(comps);
      if (records.length > 0) {
        const selectedId = selectedCompetitorId && records.some(r => r.competitor_id === selectedCompetitorId)
          ? selectedCompetitorId
          : records[0].competitor_id;
        setSelectedCompetitorId(selectedId);
        setData(records.find(r => r.competitor_id === selectedId) || records[0]);
      } else {
        setData(null);
        if (comps.length > 0 && !selectedCompetitorId) setSelectedCompetitorId(comps[0].id);
      }
    } catch {
      setAllData([]);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleCompetitorChange = (competitorId: string) => {
    setSelectedCompetitorId(competitorId);
    const record = allData.find(r => r.competitor_id === competitorId);
    setData(record || null);
  };

  const handleCalculateAll = async () => {
    setCalculating(true);
    setLastCalculateMessage(null);
    try {
      const result = await TargetingIntelAPI.refreshAll();
      if (result.message) setLastCalculateMessage(result.message);
      if (result.total_competitors === 0) {
        setLastCalculateMessage('No active competitors found. Add competitors in Ad Surveillance and ensure they are active.');
      } else if (result.calculated !== undefined && result.calculated === 0 && (result.failed ?? 0) > 0 && result.results?.length) {
        const errors = result.results.filter(r => !r.success).map(r => `${r.competitor_name}: ${r.error || 'failed'}`).join('; ');
        setLastCalculateMessage(errors || result.message || 'Calculation failed for all competitors.');
      }
      await new Promise(r => setTimeout(r, 1500));
      await loadData();
    } catch (e) {
      console.error('Calculate targeting failed:', e);
      setLastCalculateMessage(e instanceof Error ? e.message : 'Calculation failed');
    } finally {
      setCalculating(false);
    }
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
      <SplashScreen visible={true} duration={1500} />
      <Navigation />
      <LoadingScreen userName={userInfo?.name} />
      <Footer />
    </>
  );

  // ── Page ─────────────────────────────────────────────────────────────────
  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-black text-white" style={{ fontFamily: "'Poppins', sans-serif" }}>

        <div className="px-6 py-6 max-w-[1200px] mx-auto">

          {/* PAGE HEADER */}
          <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
            <div>
              <h1 className="text-3xl font-bold text-white">Targeting Intelligence</h1>
              <p className="text-gray-400 text-sm mt-1">AI-powered audience insights and targeting strategies</p>
            </div>
            {competitors.length > 0 && (
              <select
                value={selectedCompetitorId || ''}
                onChange={(e) => handleCompetitorChange(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #333',
                  background: '#111',
                  color: '#fff',
                  fontSize: '14px',
                  minWidth: '180px',
                }}
              >
                {allData.length > 0
                  ? allData.map((r) => (
                      <option key={r.competitor_id} value={r.competitor_id}>
                        {r.competitor_name || r.competitor_id?.slice(0, 8)}
                      </option>
                    ))
                  : competitors.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
              </select>
            )}
            <div className="flex gap-2">
              {/* Refresh — outlined white button */}
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  border: '1px solid #555', borderRadius: '8px',
                  background: 'transparent', color: '#fff',
                  fontSize: '13px', fontWeight: 500,
                  padding: '7px 14px', cursor: 'pointer',
                }}
              >
                <RefreshCw style={{ width: 14, height: 14 }} className={refreshing ? 'animate-spin' : ''} />
                Refresh
              </button>
              {/* Export — teal/cyan filled button */}
              <button
                onClick={handleExport}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  border: 'none', borderRadius: '8px',
                  background: '#0ea5e9', color: '#fff',
                  fontSize: '13px', fontWeight: 500,
                  padding: '7px 14px', cursor: 'pointer',
                }}
              >
                <Download style={{ width: 14, height: 14 }} />
                Export
              </button>
            </div>
          </div>

          {/* EMPTY STATE: No targeting data yet */}
          {!loading && !data && (
            <div style={{
              background: '#111',
              border: '1px solid #333',
              borderRadius: '16px',
              padding: '48px 32px',
              textAlign: 'center',
              marginBottom: '24px',
            }}>
              <Brain style={{ width: 48, height: 48, color: '#444', margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>
                No targeting intelligence yet
              </h3>
              <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '24px', maxWidth: '420px', margin: '0 auto 24px' }}>
                {competitors.length === 0
                  ? 'Add competitors in Ad Surveillance first, then refresh their ads. After that you can calculate targeting intelligence here.'
                  : 'Calculate targeting intelligence for your competitors. This may take a minute.'}
              </p>
              {lastCalculateMessage && (
                <p style={{ color: '#facc15', fontSize: '13px', marginBottom: '16px', maxWidth: '480px', margin: '0 auto 16px' }}>
                  {lastCalculateMessage}
                </p>
              )}
              {competitors.length > 0 && (
                <button
                  onClick={handleCalculateAll}
                  disabled={calculating}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#0ea5e9',
                    color: '#fff',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: calculating ? 'wait' : 'pointer',
                    opacity: calculating ? 0.8 : 1,
                  }}
                >
                  {calculating ? (
                    <>
                      <RefreshCw style={{ width: 16, height: 16 }} className="animate-spin" />
                      Calculating…
                    </>
                  ) : (
                    <>
                      <Cpu style={{ width: 16, height: 16 }} />
                      Calculate targeting intelligence
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* STATUS BADGES, TABS & CONTENT — only when we have data */}
          {data && (
          <>
          <div className="flex flex-wrap gap-3 mb-5">
            {/* Ravi Kumar / Authenticated */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              border: '1px solid #333', borderRadius: '8px',
              padding: '6px 12px', background: '#111',
            }}>
              <Shield style={{ width: 14, height: 14, color: '#9ca3af' }} />
              <span style={{ fontSize: '13px', color: '#fff' }}>{userInfo?.name || 'Ravi Kumar'}</span>
              <span style={{
                background: '#22C55E', color: '#000',
                fontSize: '10px', fontWeight: 700,
                padding: '2px 7px', borderRadius: '4px',
              }}>Authenticated</span>
            </div>
            {/* Live Data */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              border: '1px solid #333', borderRadius: '8px',
              padding: '6px 12px', background: '#111',
            }}>
              <div style={{
                width: 7, height: 7, borderRadius: '50%',
                background: connectionStatus === 'connected' ? '#4ade80' : '#facc15',
              }} />
              <span style={{ fontSize: '13px', color: '#fff' }}>Live Data</span>
              <span style={{
                border: '1px solid #444', color: '#d1d5db',
                fontSize: '10px', padding: '2px 7px', borderRadius: '4px',
              }}>{dataSource}</span>
            </div>
            {/* AI Confidence */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              border: '1px solid #333', borderRadius: '8px',
              padding: '6px 12px', background: '#111',
            }}>
              <Cpu style={{ width: 14, height: 14, color: '#9ca3af' }} />
              <span style={{ fontSize: '13px', color: '#fff' }}>AI Confidence:</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{overallConf}%</span>
            </div>
          </div>

          {/* TAB NAVIGATION */}
          <div style={{ borderBottom: '1px solid #222', marginBottom: '24px' }}>
            <div style={{ display: 'flex' }}>
              {tabs.map((tab, i) => {
                const key = tabKeys[i];
                const active = activeTab === key;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(key)}
                    style={{
                      padding: '10px 20px',
                      fontSize: '14px',
                      fontWeight: 500,
                      background: 'none',
                      border: 'none',
                      borderBottom: active ? '2px solid #fff' : '2px solid transparent',
                      color: active ? '#fff' : '#6b7280',
                      cursor: 'pointer',
                      transition: 'color 0.2s',
                    }}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── OVERVIEW TAB ─────────────────────────────────────────────── */}
          {activeTab === 'overview' && (
            <>
              {/* Row 1: Left light panel + Right dark AI panel */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', marginBottom: '20px' }}>

                {/* LEFT PANEL — light gray background */}
                <div style={{
                  background: '#d4d4d4',
                  borderRadius: '14px',
                  padding: '20px',
                }}>
                  <div style={{ marginBottom: '16px' }}>
                    <h2 style={{ fontSize: '32px', fontWeight: 800, color: '#111', margin: 0, textTransform: 'lowercase', lineHeight: 1 }}>{competitorName}</h2>
                    <p style={{ fontSize: '13px', color: '#555', margin: '4px 0 0' }}>Targeting Intelligence Analysis</p>
                  </div>

                  {/* Primary Age — gradient text */}
                  <MetricCard
                    title="Primary Age"
                    subtitle="Age:"
                    value={ageRange}
                    gradient={true}
                  />

                  {/* Purchase Intent — gradient text */}
                  <MetricCard
                    title="Purchase Intent"
                    subtitle={purchaseConf}
                    value={purchaseIntent}
                    gradient={true}
                  />

                  {/* Mobile Share — gradient text */}
                  <MetricCard
                    title="Mobile Share"
                    subtitle={iosShare}
                    value={mobileShare}
                    gradient={true}
                  />

                  {/* Peak CPM — gradient text */}
                  <MetricCard
                    title="Peak CPM"
                    subtitle="6pm - 9pm"
                    value={peakCpm}
                    gradient={true}
                  />
                </div>

                {/* RIGHT PANEL — dark with AI Recommendations */}
                <div style={{
                  background: '#111',
                  borderRadius: '14px',
                  border: '1px solid #222',
                  padding: '20px',
                }}>
                  <h2 style={{ fontSize: '20px', fontWeight: 400, color: '#fff', margin: '0 0 4px' }}>AI Recommendations</h2>
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 16px' }}>Optimized targeting strategies</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <RecoCard
                      title="Focus Audience"
                      body={<>Prioritize <strong>25-34 age group</strong> with mobile-first approach. iOS users show 65% higher engagement</>}
                    />
                    <RecoCard
                      title="Optimal Timing"
                      body={<>Schedule ads during <strong>3 am - 6 am window</strong> for 40% lower CPC. Avoid peak evening hours for cost efficiency.</>}
                    />
                    <RecoCard
                      title="Interest Targeting"
                      body={<>Allocate <strong>60% of budget</strong> to "Fitness &amp; Running" and "Health &amp; Wellness" interest clusters showing 92%+ affinity.</>}
                    />
                    <RecoCard
                      title="AI Insights"
                      body={<>Focus <strong>60% of budget</strong> on awareness to fill top funnel. Strong retargeting opportunity observed</>}
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: Audience Demographics */}
              <NeonCard className="mb-5" innerClass="p-5" radius="1rem">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-bold text-white">Audience Demographics</h2>
                  {/* Solid teal "Updated Today" pill */}
                  <span style={{
                    background: '#0d9488',
                    color: '#fff',
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '4px 12px',
                    borderRadius: '999px',
                  }}>Updated Today</span>
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
                      <div style={{
                        fontSize: '3.75rem', fontWeight: 800, textAlign: 'center',
                        background: 'linear-gradient(90deg, #06B6D4 0%, #A855F7 100%)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                      }}>58%</div>
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
                  <span style={{
                    background: '#0d9488', color: '#fff',
                    fontSize: '11px', fontWeight: 600,
                    padding: '4px 12px', borderRadius: '999px',
                  }}>Updated Today</span>
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
                    <div style={{
                      fontSize: '3.75rem', fontWeight: 800, textAlign: 'center',
                      background: 'linear-gradient(90deg, #06B6D4 0%, #A855F7 100%)',
                      WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                    }}>58%</div>
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
          </>
          )}

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
      <Footer />
    </>
  );
};

export default TargetingIntel;