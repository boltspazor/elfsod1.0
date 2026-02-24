// src/components/auto-create/CopyMessagingStep.tsx
import React, { useState, useEffect } from 'react';

interface CopyMessagingStepProps {
  campaignId?: string;
  onCopyGenerated?: (data: any) => void;
  selectedGoal?: string | null;
  selectedPlatforms?: string[];
}

const tones = ['Energetic', 'Professional', 'Friendly', 'Urgent'];

const TONE_COLORS: Record<string, string> = {
  Energetic: 'linear-gradient(135deg,#ff4fcb,#8b6fff)',
  Professional: 'linear-gradient(135deg,#ff4fcb,#8b6fff)',
  Friendly: 'linear-gradient(135deg,#ff4fcb,#8b6fff)',
  Urgent: 'linear-gradient(135deg,#ff4fcb,#8b6fff)',
};

const API_BASE_URL = 'http://localhost:5050/api';

const CopyMessagingStep: React.FC<CopyMessagingStepProps> = ({
  campaignId: propCampaignId,
  onCopyGenerated,
}) => {
  const [campaignMessage, setCampaignMessage] = useState('');
  const [selectedTone, setSelectedTone] = useState('Energetic');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [campaignId, setCampaignId] = useState<string | null>(propCampaignId || null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) setUserId(String(token).trim());
  }, []);

  const handleGenerate = async () => {
    if (!campaignMessage.trim()) { setError('Please enter a campaign message.'); return; }
    if (!userId) { setError('Not authenticated.'); return; }

    setIsGenerating(true);
    setError(null);
    try {
      const cid = campaignId || crypto.randomUUID();
      if (!campaignId) setCampaignId(cid);

      const res = await fetch(`${API_BASE_URL}/generate-copy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: campaignMessage,
          tone: selectedTone.toLowerCase(),
          user_id: userId,
          campaign_id: cid,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to generate copy');
      if (onCopyGenerated) onCopyGenerated({ campaignId: cid, variations: data.data.variations, tone: selectedTone });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div>
      <h2 style={{ color: '#fff', fontSize: 26, fontWeight: 700, marginBottom: 8 }}>
        AI-Generated Copy &amp; Messaging
      </h2>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, marginBottom: 28 }}>
        Choose what type of assets you would like to generate for your campaign
      </p>

      {error && (
        <div style={{
          background: '#4a1a1a', border: '1px solid #7a2020',
          borderRadius: 8, padding: '12px 16px', marginBottom: 20,
          color: '#f87171', fontSize: 14,
        }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
        {/* Left: Campaign Message */}
        <div style={{
          background: '#131313',
          border: '2px solid #8b6fff',
          borderRadius: 14,
          padding: 28,
          display: 'flex',
          flexDirection: 'column',
        }}>
          <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
            Campaign Message
          </h3>
          <textarea
            value={campaignMessage}
            onChange={e => setCampaignMessage(e.target.value.slice(0, 500))}
            placeholder={`Describe what your campaign is about. Example: "Launching our new running shoes for serious athletes who want maximum performance and comfort."`}
            style={{
              flex: 1,
              minHeight: 280,
              background: '#1a1a1a',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 8,
              padding: '14px 16px',
              color: '#fff',
              fontSize: 14,
              resize: 'none',
              fontFamily: 'inherit',
              lineHeight: 1.6,
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>
              {campaignMessage.length}/500 Characters
            </span>
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !campaignMessage.trim()}
              style={{
                background: 'linear-gradient(90deg,#8b6fff,#c944ff)',
                border: 'none', borderRadius: 8,
                padding: '10px 24px',
                color: '#fff', fontWeight: 700, fontSize: 14,
                cursor: isGenerating ? 'wait' : 'pointer',
                opacity: !campaignMessage.trim() ? 0.5 : 1,
              }}
            >
              {isGenerating ? 'Generating…' : 'Generate Copy Variations'}
            </button>
          </div>
        </div>

        {/* Right: Messaging Tone */}
        <div>
          <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
            Messaging Tone
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {tones.map(tone => {
              const isSelected = selectedTone === tone;
              return (
                <button
                  key={tone}
                  onClick={() => setSelectedTone(tone)}
                  style={{
                    background: '#131313',
                    border: isSelected
                      ? '2px solid transparent'
                      : '2px solid rgba(255,75,203,0.4)',
                    borderRadius: 10,
                    padding: '18px 24px',
                    color: '#fff',
                    fontSize: 16,
                    fontWeight: 600,
                    textAlign: 'left',
                    cursor: 'pointer',
                    backgroundImage: isSelected
                      ? `linear-gradient(#131313,#131313), ${TONE_COLORS[tone]}`
                      : 'none',
                    backgroundOrigin: 'border-box',
                    backgroundClip: isSelected ? 'padding-box, border-box' : undefined,
                    transition: 'border-color 0.2s',
                    position: 'relative',
                  } as React.CSSProperties}
                >
                  {tone}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CopyMessagingStep;