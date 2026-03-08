// src/pages/MyCampaigns.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { AUTOCREATE_API_URL } from '../config';

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
  messaging_tone?: string;
}

const MyCampaigns: React.FC = () => {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    fetch(`${AUTOCREATE_API_URL}/api/campaigns/my-campaigns`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then((data: { success?: boolean; campaigns?: Campaign[]; error?: string }) => {
        if (data.success && data.campaigns) {
          setCampaigns(data.campaigns);
        } else {
          setError(data.error ?? 'Failed to load campaigns');
        }
      })
      .catch(() => setError('Network error. Could not load campaigns.'))
      .finally(() => setLoading(false));
  }, [navigate]);

  const filtered = campaigns.filter(c => {
    if (filter === 'published') return c.campaign_status === 'published';
    if (filter === 'draft') return c.campaign_status !== 'published';
    return true;
  });

  const formatDate = (iso?: string) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d0d' }}>
      <Navigation />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 32px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <h1 style={{ color: '#fff', fontSize: 36, fontWeight: 700, marginBottom: 6, fontFamily: "'Montserrat Alternates', sans-serif" }}>
              My Published Ads
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15 }}>
              All campaigns created through the Auto Create flow
            </p>
          </div>

          <button
            onClick={() => navigate('/auto-create')}
            style={{
              background: 'linear-gradient(135deg, #00e5d4, #8b6fff)',
              border: 'none',
              borderRadius: 10,
              padding: '12px 24px',
              color: '#000',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            + Create New Campaign
          </button>
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
          {(['all', 'published', 'draft'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '8px 20px',
                borderRadius: 24,
                border: filter === f ? 'none' : '1px solid rgba(255,255,255,0.15)',
                background: filter === f
                  ? 'linear-gradient(135deg, #00e5d4, #8b6fff)'
                  : 'transparent',
                color: filter === f ? '#000' : 'rgba(255,255,255,0.6)',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {f === 'all' ? `All (${campaigns.length})` : f === 'published'
                ? `Published (${campaigns.filter(c => c.campaign_status === 'published').length})`
                : `Drafts (${campaigns.filter(c => c.campaign_status !== 'published').length})`}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', paddingTop: 60, fontSize: 16 }}>
            Loading campaigns…
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(255,70,70,0.12)',
            border: '1px solid rgba(255,70,70,0.4)',
            borderRadius: 10,
            padding: '16px 20px',
            color: '#ff7070',
            fontSize: 14,
          }}>
            {error}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filtered.length === 0 && (
          <div style={{ textAlign: 'center', paddingTop: 80 }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>📭</div>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 18, marginBottom: 24 }}>
              {filter === 'published' ? 'No published campaigns yet.' : 'No campaigns found.'}
            </p>
            <button
              onClick={() => navigate('/auto-create')}
              style={{
                background: 'linear-gradient(135deg, #00e5d4, #8b6fff)',
                border: 'none',
                borderRadius: 10,
                padding: '12px 28px',
                color: '#000',
                fontWeight: 700,
                fontSize: 15,
                cursor: 'pointer',
              }}
            >
              Create your first campaign
            </button>
          </div>
        )}

        {/* Campaign cards grid */}
        {!loading && !error && filtered.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
            {filtered.map(campaign => (
              <div
                key={campaign.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/my-campaigns/${campaign.id}`, { state: { campaign } })}
                onKeyDown={(e) => e.key === 'Enter' && navigate(`/my-campaigns/${campaign.id}`, { state: { campaign } })}
                style={{
                  borderRadius: 16,
                  padding: '24px',
                  cursor: 'pointer',
                  transition: 'transform 0.15s',
                  background: `linear-gradient(#131313, #131313) padding-box,
                    linear-gradient(135deg, #00e5d4, #8b6fff, #ff4fcb) border-box`,
                  border: '1px solid transparent',
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.015)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
              >
                {/* Top row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <span style={{
                    color: '#8b6fff',
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                  }}>
                    ID #{campaign.id}
                  </span>
                  <span style={{
                    background: campaign.campaign_status === 'published'
                      ? 'rgba(0,229,212,0.15)' : 'rgba(255,255,255,0.08)',
                    color: campaign.campaign_status === 'published' ? '#00e5d4' : 'rgba(255,255,255,0.5)',
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '4px 12px',
                    borderRadius: 20,
                    border: `1px solid ${campaign.campaign_status === 'published' ? 'rgba(0,229,212,0.3)' : 'rgba(255,255,255,0.1)'}`,
                    textTransform: 'capitalize',
                  }}>
                    {campaign.campaign_status ?? 'draft'}
                  </span>
                </div>

                {/* Goal */}
                <p style={{ color: '#fff', fontSize: 18, fontWeight: 700, marginBottom: 6, textTransform: 'capitalize' }}>
                  {campaign.campaign_goal ?? 'Campaign'} Strategy
                </p>

                {/* Metrics */}
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', margin: '12px 0' }}>
                  {campaign.budget_amount != null && (
                    <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>
                      💰 ${campaign.budget_amount.toLocaleString()}
                      {campaign.budget_type === 'daily' ? '/day' : ' total'}
                    </span>
                  )}
                  {campaign.campaign_duration && (
                    <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>
                      📅 {campaign.campaign_duration} days
                    </span>
                  )}
                  {campaign.selected_tests && campaign.selected_tests.length > 0 && (
                    <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>
                      🧪 {campaign.selected_tests.length} test{campaign.selected_tests.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {/* Dates */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 12, marginTop: 12, display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>
                    Created {formatDate(campaign.created_at)}
                  </span>
                  {campaign.published_at && (
                    <span style={{ color: 'rgba(0,229,212,0.7)', fontSize: 12 }}>
                      Published {formatDate(campaign.published_at)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyCampaigns;
