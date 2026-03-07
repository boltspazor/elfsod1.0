// src/components/TargetingIntel.tsx
import React, { useEffect, useState } from 'react';
import { RefreshCw, Download, Shield, Cpu, Brain } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
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
// BiddingPatternChart — 24-hour CPM activity bar chart
// ─────────────────────────────────────────────────────────────────────────────
const BiddingPatternChart = ({
  pattern,
  peakHour,
  bestHour,
}: {
  pattern: { hour: number; label: string; value: number }[];
  peakHour: number;
  bestHour: number;
}) => {
  if (!pattern.length) return (
    <div style={{ background: '#0d0d0d', borderRadius: '12px', marginBottom: '16px', height: '140px' }} />
  );
  return (
    <div style={{ background: '#0d0d0d', borderRadius: '12px', marginBottom: '12px', overflow: 'hidden' }}>
      <div style={{ height: '140px', padding: '0 0 0 0' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={pattern}
            margin={{ top: 10, right: 8, left: -28, bottom: 4 }}
            barCategoryGap="12%"
          >
            <XAxis
              dataKey="label"
              tick={{ fill: '#6b7280', fontSize: 8, fontFamily: "'Poppins', sans-serif" }}
              axisLine={false}
              tickLine={false}
              interval={3}
            />
            <YAxis tick={false} axisLine={false} tickLine={false} />
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              formatter={(v) => [`$${Number(v).toFixed(2)} CPM`]}
              labelFormatter={(l) => `Hour: ${l}`}
              contentStyle={{
                background: '#111',
                border: '1px solid #333',
                borderRadius: '8px',
                fontSize: '11px',
                color: '#e5e7eb',
                fontFamily: "'Poppins', sans-serif",
              }}
              labelStyle={{ color: '#9ca3af', marginBottom: '2px' }}
              itemStyle={{ color: '#06B6D4' }}
            />
            <Bar dataKey="value" radius={[2, 2, 0, 0]}>
              {pattern.map((entry, i) => (
                <Cell
                  key={i}
                  fill={
                    entry.hour === peakHour ? '#06B6D4'
                    : entry.hour === bestHour ? '#A855F7'
                    : '#222'
                  }
                  opacity={entry.hour === peakHour || entry.hour === bestHour ? 1 : 0.7}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* legend */}
      <div style={{
        display: 'flex', gap: '16px', justifyContent: 'flex-end',
        padding: '6px 14px 10px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#06B6D4' }} />
          <span style={{ fontSize: '10px', color: '#6b7280' }}>Peak CPM</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#A855F7' }} />
          <span style={{ fontSize: '10px', color: '#6b7280' }}>Best Time (low cost)</span>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// DeviceDistributionChart — horizontal bar chart for device breakdown
// ─────────────────────────────────────────────────────────────────────────────
const DeviceDistributionChart = ({
  dist,
}: {
  dist: { label: string; value: number; color: string }[];
}) => {
  if (!dist.length) return null;
  return (
    <div style={{ background: '#0d0d0d', borderRadius: '12px', padding: '16px', marginTop: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span style={{ fontSize: '13px', color: '#d1d5db', fontWeight: 600 }}>Device Distribution</span>
        <span style={{ fontSize: '11px', color: '#6b7280' }}>Percentage</span>
      </div>
      <ResponsiveContainer width="100%" height={dist.length * 38 + 8}>
        <BarChart
          data={dist}
          layout="vertical"
          margin={{ top: 0, right: 44, left: 0, bottom: 0 }}
          barCategoryGap="28%"
        >
          <XAxis type="number" domain={[0, 100]} tick={false} axisLine={false} tickLine={false} />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fill: '#9ca3af', fontSize: 11, fontWeight: 600, fontFamily: "'Poppins', sans-serif" }}
            axisLine={false}
            tickLine={false}
            width={60}
          />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            formatter={(v) => [`${Number(v).toFixed(1)}%`]}
            contentStyle={{
              background: '#111',
              border: '1px solid #333',
              borderRadius: '8px',
              fontSize: '11px',
              color: '#e5e7eb',
              fontFamily: "'Poppins', sans-serif",
            }}
            labelStyle={{ color: '#9ca3af', marginBottom: '2px' }}
            itemStyle={{ color: '#06B6D4' }}
          />
          <Bar
            dataKey="value"
            radius={[0, 4, 4, 0]}
            label={{ position: 'right', fill: '#6b7280', fontSize: 10, formatter: (v: unknown) => `${Number(v).toFixed(1)}%` }}
            background={{ fill: '#1a1a1a', radius: 4 }}
          >
            {dist.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — derive dynamic display data from backend fields
// ─────────────────────────────────────────────────────────────────────────────

const AGE_BUCKET_CONFIG = [
  { label: '18 - 24', color: '#F59E0B' },
  { label: '25 - 34', color: '#22C55E' },
  { label: '35 - 44', color: '#A855F7' },
  { label: '45 - 54', color: '#06B6D4' },
  { label: '55+',     color: '#EF4444' },
];

/** Build a bell-curve age distribution centred on the backend's primary age range. */
function buildAgeDistribution(
  ageMin: number | null,
  ageMax: number | null,
  ageRange: string | null,
): { label: string; value: number; color: string }[] {
  let primaryIdx = 1; // default: 25-34
  if (ageRange) {
    const r = ageRange.replace(/\s/g, '');
    if (r.startsWith('18') || r.startsWith('13')) primaryIdx = 0;
    else if (r.startsWith('25') || r.startsWith('20') || r.startsWith('18-3')) primaryIdx = 1;
    else if (r.startsWith('35') || r.startsWith('30')) primaryIdx = 2;
    else if (r.startsWith('45') || r.startsWith('40')) primaryIdx = 3;
    else if (r.startsWith('55') || r.includes('+')) primaryIdx = 4;
  } else if (ageMin != null) {
    if (ageMin < 25) primaryIdx = 0;
    else if (ageMin < 35) primaryIdx = 1;
    else if (ageMin < 45) primaryIdx = 2;
    else if (ageMin < 55) primaryIdx = 3;
    else primaryIdx = 4;
  }
  const CURVE = [35, 25, 17, 12, 7];
  const weights = AGE_BUCKET_CONFIG.map((_, i) => CURVE[Math.abs(i - primaryIdx)] ?? 5);
  const total = weights.reduce((a, b) => a + b, 0);
  return AGE_BUCKET_CONFIG.map((b, i) => ({
    label: b.label,
    value: parseFloat(((weights[i] / total) * 100).toFixed(1)),
    color: b.color,
  }));
}

const INTEREST_COLORS = ['#F59E0B', '#22C55E', '#A855F7', '#06B6D4', '#EF4444', '#EC4899'];

/** Build interest bar data from backend clusters and confidence score. */
function buildInterestData(
  clusters: string[] | null | undefined,
  interestConf?: number | null,
): { label: string; sub: string; value: number; color: string }[] {
  const list = clusters?.slice(0, 6) ?? [];
  if (list.length === 0) return [];
  const baseScore = Math.min(95, Math.round((interestConf ?? 0.88) * 100) + 5);
  return list.map((raw, i) => {
    const label = raw.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    const value = Math.max(25, baseScore - i * 9);
    const reachK = Math.round(500 * (value / 100));
    return { label, sub: `(Potential reach: ${reachK}K)`, value, color: INTEREST_COLORS[i % INTEREST_COLORS.length] };
  });
}

/** Generate AI recommendation text from real backend field values. */
function buildRecommendations(d: TargetingIntelData): {
  focusAudience: React.ReactNode;
  optimalTiming: React.ReactNode;
  interestTargeting: React.ReactNode;
  aiInsights: React.ReactNode;
} {
  const ageRng = d.age_range || '25-34';
  const device = d.primary_device || 'mobile';
  const iosSharePct = d.device_distribution?.ios != null
    ? `${(d.device_distribution.ios * 100).toFixed(0)}%` : '65%';
  const mobileSharePct = d.device_distribution?.mobile != null
    ? `${(d.device_distribution.mobile * 100).toFixed(0)}%` : '78%';
  const topInterest = d.interest_clusters?.[0] || 'primary interests';
  const secondInterest = d.interest_clusters?.[1] || 'secondary interests';
  const interestConf = d.confidence_scores?.interest;
  const affinityPct = interestConf ? `${(interestConf * 100).toFixed(0)}%+` : '85%+';
  const budgetPct = interestConf ? Math.min(80, Math.round(interestConf * 80)) : 60;
  const funnelStage = d.funnel_stage || 'awareness';
  const audienceType = d.audience_type || 'broad';
  const biddingStrat = d.bidding_strategy ? d.bidding_strategy.replace(/_/g, ' ') : 'cost cap';
  const audienceInsight =
    audienceType === 'retargeting' ? 'Strong retargeting signals detected' :
    audienceType === 'lookalike'   ? 'Expand reach with lookalike audiences' :
                                     'Top-funnel opportunity with broad audience';
  return {
    focusAudience: (
      <>
        Prioritize <strong>{ageRng} age group</strong> with {device}-first approach.{' '}
        {device === 'mobile'
          ? `iOS users account for ${iosSharePct} of traffic`
          : `${mobileSharePct} mobile penetration detected`}
      </>
    ),
    optimalTiming: (
      <>
        Schedule ads during <strong>off-peak hours</strong> for lower CPC.{' '}
        Current bidding strategy: <strong>{biddingStrat}</strong>.
        Optimise spend toward lowest-cost windows.
      </>
    ),
    interestTargeting: (
      <>
        Allocate <strong>{budgetPct}% of budget</strong> to &ldquo;{topInterest}&rdquo; and &ldquo;{secondInterest}&rdquo;
        {' '}interest clusters showing {affinityPct} affinity.
      </>
    ),
    aiInsights: (
      <>
        Focus on <strong>{funnelStage}</strong> stage targeting. {audienceInsight}
      </>
    ),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// build24HourPattern — synthetic CPM pattern from backend bidding data
// ─────────────────────────────────────────────────────────────────────────────
function build24HourPattern(
  estimatedCpm: number | null | undefined,
  biddingStrategy: string | null | undefined,
  funnelStage: string | null | undefined,
): { hour: number; label: string; value: number }[] {
  const baseCpm = estimatedCpm ?? 15;
  const hourlyMultipliers = [
    0.55, 0.45, 0.40, 0.38, 0.42, 0.52,  // 0–5 AM: low
    0.68, 0.75, 0.82, 0.85, 0.88, 0.90,  // 6–11 AM: rising
    0.92, 0.95, 0.93, 0.90, 0.92, 0.97,  // 12–17 PM: steady high
    1.00, 0.98, 0.95, 0.90, 0.80, 0.70,  // 18–23: peak then decline
  ];
  const adjusted = hourlyMultipliers.map((v, h) => {
    let val = v;
    if (biddingStrategy === 'target_cost' || biddingStrategy === 'cost_cap') {
      val = Math.pow(val, 1.35);
    }
    if (funnelStage === 'conversion') {
      if (h >= 11 && h <= 13) val *= 1.15;
    } else if (funnelStage === 'awareness') {
      if (h >= 20 && h <= 22) val *= 1.1;
    }
    return val;
  });
  const maxMult = Math.max(...adjusted);
  return Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    label: h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`,
    value: parseFloat((baseCpm * (adjusted[h] / maxMult)).toFixed(2)),
  }));
}

/** Derive peak/best hour labels from the 24-hour pattern array. */
function deriveBidTimings(
  pattern: { hour: number; value: number }[],
): { peakHour: number; bestHour: number; peakTimeLabel: string; bestTimeLabel: string } {
  if (!pattern.length) return { peakHour: 18, bestHour: 3, peakTimeLabel: '6 PM-9 PM', bestTimeLabel: '3 AM-6 AM' };
  const maxVal = Math.max(...pattern.map(p => p.value));
  const minVal = Math.min(...pattern.map(p => p.value));
  const peakHour = pattern.find(p => p.value === maxVal)?.hour ?? 18;
  const bestHour = pattern.find(p => p.value === minVal)?.hour ?? 3;
  const fmtRange = (h: number) => {
    const fmt = (n: number) => {
      const m = ((n % 24) + 24) % 24;
      if (m === 0) return '12 AM';
      if (m === 12) return '12 PM';
      return m > 12 ? `${m - 12} PM` : `${m} AM`;
    };
    return `${fmt(h)}-${fmt(h + 3)}`;
  };
  return { peakHour, bestHour, peakTimeLabel: fmtRange(peakHour), bestTimeLabel: fmtRange(bestHour) };
}

/** Build device distribution bar data from backend device_distribution object. */
function buildDeviceDistData(
  dist: { mobile?: number; desktop?: number; tablet?: number; ios?: number; android?: number } | null | undefined,
): { label: string; value: number; color: string }[] {
  if (!dist) return [];
  const items: { label: string; value: number; color: string }[] = [];
  if (dist.mobile != null) items.push({ label: 'Mobile', value: +(dist.mobile * 100).toFixed(1), color: '#06B6D4' });
  if (dist.desktop != null) items.push({ label: 'Desktop', value: +(dist.desktop * 100).toFixed(1), color: '#A855F7' });
  if (dist.tablet != null && dist.tablet > 0.01) items.push({ label: 'Tablet', value: +(dist.tablet * 100).toFixed(1), color: '#F59E0B' });
  if (dist.ios != null && dist.ios > 0.01) items.push({ label: 'iOS', value: +(dist.ios * 100).toFixed(1), color: '#22C55E' });
  if (dist.android != null && dist.android > 0.01) items.push({ label: 'Android', value: +(dist.android * 100).toFixed(1), color: '#EF4444' });
  return items;
}

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
  const purchaseIntent = (() => {
    if (data?.funnel_stage === 'conversion') return 'High';
    if (data?.funnel_stage === 'consideration') return 'Medium';
    if (data?.funnel_stage === 'awareness') return 'Low';
    if (data?.funnel_score != null) {
      if (data.funnel_score >= 0.7) return 'High';
      if (data.funnel_score >= 0.45) return 'Medium';
      return 'Low';
    }
    return 'High';
  })();
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

  // Dynamic distributions — built from backend fields
  const ageData = buildAgeDistribution(data?.age_min ?? null, data?.age_max ?? null, data?.age_range ?? null);
  const interestData = buildInterestData(data?.interest_clusters, data?.confidence_scores?.interest);
  const recommendations = data ? buildRecommendations(data) : null;

  // ROAS / engagement rate stat card
  const roasDisplay = data?.estimated_roas != null
    ? `${data.estimated_roas.toFixed(1)}x`
    : data?.engagement_rate != null
      ? `${(data.engagement_rate * 100).toFixed(1)}%`
      : '4.0x';
  const roasLabel = data?.estimated_roas != null ? 'Est. ROAS' : 'Engagement Rate';

  // 24-hour bidding pattern chart + derived timings
  const hourlyPattern = build24HourPattern(data?.estimated_cpm, data?.bidding_strategy, data?.funnel_stage);
  const bidTimings = deriveBidTimings(hourlyPattern);
  const peakTimeLabel = bidTimings.peakTimeLabel;
  const bestTimeLabel = bidTimings.bestTimeLabel;

  // Device distribution chart data
  const deviceDistData = buildDeviceDistData(data?.device_distribution);

  // Competitor overlap — derived from demographic + interest confidence scores
  const _demographicConf = data?.confidence_scores?.demographic ?? null;
  const _interestConf = data?.confidence_scores?.interest ?? null;
  const competitorOverlapPct = (_demographicConf != null && _interestConf != null)
    ? `${Math.round(((_demographicConf + _interestConf) / 2) * 100)}%`
    : '58%';
  const audienceSharedPct = data?.confidence_scores?.geographic != null
    ? `${Math.round(data.confidence_scores.geographic * 100)}%`
    : (_demographicConf != null ? `${Math.round(_demographicConf * 100)}%` : '42%');
  const overlapBrandsText = allData.length > 0
    ? `${allData.length} Brand${allData.length !== 1 ? 's' : ''} Overlapping`
    : 'Brand Overlapping';
  const overlapDescText = data?.primary_interests?.[0]
    ? `Audience overlaps with ${data.primary_interests[0].replace(/_/g, ' ')} trends`
    : data?.interest_clusters?.[0]
      ? `Audience overlaps with ${data.interest_clusters[0].replace(/_/g, ' ')} trends`
      : 'Audience overlaps with similar interest trends';

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
                    subtitle={peakTimeLabel}
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
                      body={recommendations?.focusAudience}
                    />
                    <RecoCard
                      title="Optimal Timing"
                      body={recommendations?.optimalTiming}
                    />
                    <RecoCard
                      title="Interest Targeting"
                      body={recommendations?.interestTargeting}
                    />
                    <RecoCard
                      title="AI Insights"
                      body={recommendations?.aiInsights}
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

              {/* Row 3: Device Distribution + Interest Clusters */}
              {deviceDistData.length > 0 && (
                <NeonCard className="mb-5" innerClass="p-5" radius="1rem">
                  <h2 className="text-lg font-bold text-white mb-1">Device Distribution</h2>
                  <p className="text-gray-500 text-xs mb-3">Platform breakdown by device type</p>
                  <DeviceDistributionChart dist={deviceDistData} />
                </NeonCard>
              )}

              {/* Row 4: Interest Clusters */}
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
                      }}>{competitorOverlapPct}</div>
                      <p className="text-gray-400 text-xs mt-1">{overlapBrandsText}</p>
                    </div>
                    <p className="text-center text-xs text-white font-semibold mb-4">{overlapDescText}</p>
                    <div className="grid grid-cols-2 gap-3">
                      <StatMiniCard value={audienceSharedPct} label="Audience Shared" color="#06B6D4" />
                      <StatMiniCard value={roasDisplay} label={roasLabel} color="#A855F7" />
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
                  <BiddingPatternChart pattern={hourlyPattern} peakHour={bidTimings.peakHour} bestHour={bidTimings.bestHour} />
                  <CostCard title="Peak CPM" sub={peakTimeLabel} value={peakCpm} valueColor="#06B6D4" />
                  <CostCard title="Average CPC" sub="Daily average cost per click!" value={avgCpc} valueColor="#A855F7" />
                  <CostCard title="Best Time" sub="Lowest acquisition cost" value={bestTimeLabel} valueColor="#A855F7" />
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
                {deviceDistData.length > 0 && (
                  <DeviceDistributionChart dist={deviceDistData} />
                )}
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
                    }}>{competitorOverlapPct}</div>
                    <p className="text-gray-400 text-xs mt-1">{overlapBrandsText}</p>
                  </div>
                  <p className="text-center text-xs text-white font-semibold mb-4">{overlapDescText}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <StatMiniCard value={audienceSharedPct} label="Audience Shared" color="#06B6D4" />
                    <StatMiniCard value={roasDisplay} label={roasLabel} color="#A855F7" />
                  </div>
                </NeonCard>
                <NeonCard innerClass="p-5" radius="1rem">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-base font-bold text-white">Binding Strategy Analysis</h2>
                    <span className="border border-[#333] text-gray-300 text-xs px-3 py-1 rounded-full">24 hours pattern</span>
                  </div>
                  <BiddingPatternChart pattern={hourlyPattern} peakHour={bidTimings.peakHour} bestHour={bidTimings.bestHour} />
                  <CostCard title="Peak CPM" sub={peakTimeLabel} value={peakCpm} valueColor="#06B6D4" />
                  <CostCard title="Average CPC" sub="Daily average cost per click!" value={avgCpc} valueColor="#A855F7" />
                  <CostCard title="Best Time" sub="Lowest acquisition cost" value={bestTimeLabel} valueColor="#A855F7" />
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