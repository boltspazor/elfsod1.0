import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import Navigation from '../components/Navigation';
import AdCarousel from '../components/AdCarousel';
import AdDetailModal from '../components/AdDetailModal';
import { AUTOCREATE_API_URL } from '../config';
import { Loader2, ArrowLeft } from 'lucide-react';

interface Campaign {
  id: number;
  campaign_goal?: string;
  budget_amount?: number;
  campaign_duration?: number;
  budget_type?: string;
  campaign_status?: string;
  published_at?: string;
  created_at?: string;
  selected_tests?: string[];
  assets?: string | unknown[]; // JSON string or array of stored creatives
}

interface AdItem {
  id: number | string;
  title: string;
  type?: string | null;
  image: string;
  rating: string;
  votes: string;
  tags: string[];
  genre?: string;
  engagement?: string;
  description?: string;
  url?: string;
  platform?: string;
  score?: number;
}

const formatVotes = (value: number | string | undefined): string => {
  const num = typeof value === 'string' ? parseInt(value, 10) : (value || 0);
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
  return num.toString();
};

const mapApiAdsToAdItem = (ads: Record<string, unknown>[]): AdItem[] => {
  return ads.map((item: Record<string, unknown>, index: number) => ({
    id: (item.id as string) ?? String(index),
    title: (item.title as string) || (item.headline as string) || 'Ad',
    image: (item.image_url as string) || (item.data_uri as string) || (item.thumbnail as string) || 'https://via.placeholder.com/400x300?text=No+Image',
    rating: item.score ? Math.min(Number(item.score) / 20, 5).toFixed(1) : '4.5',
    votes: formatVotes((item.views as number) ?? (item.likes as number)),
    tags: [item.platform, item.type, item.asset_type].filter(Boolean).map(String),
    genre: (item.platform as string) || (item.asset_type as string) || '',
    engagement: item.score ? `${Math.min(Number(item.score), 100)}%` : 'N/A',
    description: (item.description as string) || (item.prompt as string) || '',
    url: item.url as string | undefined,
    platform: item.platform as string | undefined,
    score: item.score as number | undefined,
  }));
};

/** Parse campaign.assets (JSON string or array) and map to AdItem for display. */
function campaignAssetsToAdItems(campaign: Campaign | null): AdItem[] {
  if (!campaign?.assets) return [];
  let list: unknown[] = [];
  if (Array.isArray(campaign.assets)) list = campaign.assets;
  else if (typeof campaign.assets === 'string') {
    try {
      const parsed = JSON.parse(campaign.assets);
      list = Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return mapApiAdsToAdItem(list as Record<string, unknown>[]);
}

const CampaignDetail: React.FC = () => {
  const navigate = useNavigate();
  const { campaignId } = useParams<{ campaignId: string }>();
  const location = useLocation();
  const [campaign, setCampaign] = useState<Campaign | null>(location.state?.campaign ?? null);
  const [campaignLoading, setCampaignLoading] = useState(!location.state?.campaign);
  const [ads, setAds] = useState<AdItem[]>([]);
  const [adsLoading, setAdsLoading] = useState(true);
  const [adsError, setAdsError] = useState<string | null>(null);
  const [selectedAd, setSelectedAd] = useState<AdItem | null>(null);
  const [relatedAds, setRelatedAds] = useState<AdItem[]>([]);
  const [trendingExampleAds, setTrendingExampleAds] = useState<AdItem[]>([]);

  const id = campaignId ? parseInt(campaignId, 10) : null;

  // Load campaign by id to get full data including stored assets (creatives)
  useEffect(() => {
    if (!id) return;
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    setCampaignLoading(true);
    fetch(`${AUTOCREATE_API_URL}/api/campaigns/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data: { success?: boolean; campaign?: Campaign }) => {
        if (data.success && data.campaign) setCampaign(data.campaign);
        else if (location.state?.campaign) setCampaign(location.state.campaign);
        else setCampaign(null);
      })
      .catch(() => {
        if (location.state?.campaign) setCampaign(location.state.campaign);
        else setCampaign(null);
      })
      .finally(() => setCampaignLoading(false));
  }, [id, navigate, location.state?.campaign]);

  // Use stored campaign creatives (assets) as the ads
  useEffect(() => {
    if (!campaign) {
      setAds([]);
      setAdsLoading(false);
      return;
    }
    setAdsLoading(true);
    setAdsError(null);
    const fromAssets = campaignAssetsToAdItems(campaign);
    setAds(fromAssets);
    setAdsLoading(false);
  }, [campaign]);

  const handleCardClick = (ad: AdItem) => {
    setSelectedAd(ad);
    document.body.style.overflow = 'hidden';
    const others = ads.filter((item) => String(item.id) !== String(ad.id));
    setRelatedAds(others.slice(0, 3));
    setTrendingExampleAds(others.slice(0, 4));
  };

  const handleCloseModal = () => {
    setSelectedAd(null);
    document.body.style.overflow = 'auto';
  };

  if (id != null && !campaign && campaignLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0d0d0d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Navigation />
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.7)' }}>
          <Loader2 size={40} className="animate-spin" style={{ display: 'inline-block', marginBottom: 16 }} />
          <p>Loading campaign…</p>
        </div>
      </div>
    );
  }

  if (!campaign && id != null) {
    return (
      <div style={{ minHeight: '100vh', background: '#0d0d0d' }}>
        <Navigation />
        <div style={{ maxWidth: 800, margin: '0 auto', padding: 40, textAlign: 'center' }}>
          <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 24 }}>Campaign not found.</p>
          <button
            onClick={() => navigate('/my-campaigns')}
            style={{
              background: 'linear-gradient(135deg, #00e5d4, #8b6fff)',
              border: 'none',
              borderRadius: 10,
              padding: '12px 24px',
              color: '#000',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Back to My Campaigns
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d0d', fontFamily: "'Montserrat Alternates', sans-serif" }}>
      <Navigation />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 32px' }}>
        <button
          onClick={() => navigate('/my-campaigns')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 24,
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 10,
            padding: '10px 18px',
            color: 'rgba(255,255,255,0.9)',
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={18} />
          Back to My Campaigns
        </button>

        {campaign && (
          <>
            <div
              style={{
                borderRadius: 16,
                padding: '24px',
                marginBottom: 32,
                background: 'linear-gradient(#131313, #131313) padding-box, linear-gradient(135deg, #00e5d4, #8b6fff, #ff4fcb) border-box',
                border: '1px solid transparent',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ color: '#8b6fff', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                  Campaign #{campaign.id}
                </span>
                <span
                  style={{
                    background: 'rgba(0,229,212,0.15)',
                    color: '#00e5d4',
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '4px 12px',
                    borderRadius: 20,
                    border: '1px solid rgba(0,229,212,0.3)',
                    textTransform: 'capitalize',
                  }}
                >
                  {campaign.campaign_status ?? 'draft'}
                </span>
              </div>
              <p style={{ color: '#fff', fontSize: 22, fontWeight: 700, marginBottom: 8, textTransform: 'capitalize' }}>
                {campaign.campaign_goal ?? 'Campaign'} Strategy
              </p>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>
                {campaign.budget_amount != null && (
                  <span>💰 ${campaign.budget_amount.toLocaleString()}{campaign.budget_type === 'daily' ? '/day' : ' total'}</span>
                )}
                {campaign.campaign_duration && <span>📅 {campaign.campaign_duration} days</span>}
              </div>
            </div>

            <h2 style={{ color: '#fff', fontSize: 28, fontWeight: 700, marginBottom: 16 }}>Campaign Ads</h2>

            {adsLoading && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48, color: 'rgba(255,255,255,0.6)' }}>
                <Loader2 size={36} className="animate-spin" style={{ marginRight: 12 }} />
                <span>Fetching ads…</span>
              </div>
            )}

            {adsError && !adsLoading && (
              <div style={{ padding: 24, background: 'rgba(255,70,70,0.1)', borderRadius: 12, color: '#ff8080', marginBottom: 24 }}>
                {adsError}
              </div>
            )}

            {!adsLoading && ads.length === 0 && !adsError && (
              <div style={{ padding: 48, textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
                No ads for this campaign yet. Try again later or check the campaign goal.
              </div>
            )}

            {!adsLoading && ads.length > 0 && (
              <AdCarousel
                category="recommended"
                onCardClick={handleCardClick}
                ads={ads}
              />
            )}
          </>
        )}
      </div>

      {selectedAd && (
        <AdDetailModal
          ad={selectedAd}
          onClose={handleCloseModal}
          relatedAds={relatedAds}
          trendingExampleAds={trendingExampleAds}
        />
      )}
    </div>
  );
};

export default CampaignDetail;
