// src/components/auto-create/CopyMessagingStep.tsx
import React, { useState, useEffect } from 'react';
import { AUTOCREATE_API_URL } from '../../config';

interface CopyMessagingStepProps {
  campaignId?: string;
  onCopyGenerated?: (data: any) => void;
  selectedGoal?: string | null;
  selectedPlatforms?: string[];
}

interface CopyVariation {
  headline: string;
  body: string;
  cta: string;
  score: number;
  engagement: string;
  color: string;
}

const tones = ['Energetic', 'Professional', 'Friendly', 'Urgent'];

const TONE_COLORS: Record<string, string> = {
  Energetic:    'linear-gradient(135deg,#ff4fcb,#8b6fff)',
  Professional: 'linear-gradient(135deg,#ff4fcb,#8b6fff)',
  Friendly:     'linear-gradient(135deg,#ff4fcb,#8b6fff)',
  Urgent:       'linear-gradient(135deg,#ff4fcb,#8b6fff)',
};

const VARIATION_GRADIENTS = [
  'linear-gradient(135deg,#8b6fff,#c944ff)',
  'linear-gradient(135deg,#00e5d4,#8b6fff)',
  'linear-gradient(135deg,#ff4fcb,#ff7043)',
];

const API_BASE_URL = `${AUTOCREATE_API_URL}/api`;

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
  const [variations, setVariations] = useState<CopyVariation[]>([]);
  const [selectedVariation, setSelectedVariation] = useState<number | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) setUserId(String(token).trim());
  }, []);

  const handleGenerate = async () => {
    if (!campaignMessage.trim()) { setError('Please enter a campaign message.'); return; }
    if (!userId) { setError('Not authenticated. Please log in again.'); return; }

    setIsGenerating(true);
    setError(null);
    setVariations([]);
    setSelectedVariation(null);

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

      const vars: CopyVariation[] = data.data?.variations ?? [];
      setVariations(vars);

      if (onCopyGenerated) {
        onCopyGenerated({ campaignId: cid, variations: vars, tone: selectedTone });
      }
    } catch (err: any) {
      setError(err.message ?? 'An unknown error occurred.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

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

      {/* ── Input row ─────────────────────────────────────────────── */}
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
              minHeight: 200,
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
                background: isGenerating ? '#333' : 'linear-gradient(90deg,#8b6fff,#c944ff)',
                border: 'none', borderRadius: 8,
                padding: '10px 24px',
                color: '#fff', fontWeight: 700, fontSize: 14,
                cursor: isGenerating ? 'wait' : 'pointer',
                opacity: !campaignMessage.trim() ? 0.5 : 1,
                display: 'flex', alignItems: 'center', gap: 8,
                transition: 'background 0.2s',
              }}
            >
              {isGenerating ? (
                <>
                  <span style={{
                    width: 13, height: 13,
                    border: '2px solid rgba(255,255,255,0.25)',
                    borderTopColor: '#fff', borderRadius: '50%',
                    display: 'inline-block',
                    animation: 'spin 0.8s linear infinite',
                  }} />
                  Generating…
                </>
              ) : 'Generate Copy Variations'}
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
                    border: isSelected ? '2px solid transparent' : '2px solid rgba(255,75,203,0.4)',
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
                  } as React.CSSProperties}
                >
                  {tone}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Loading state ──────────────────────────────────────────── */}
      {isGenerating && (
        <div style={{ marginTop: 36, textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 12,
            background: '#131313', border: '1px solid rgba(139,111,255,0.4)',
            borderRadius: 12, padding: '18px 32px',
          }}>
            <span style={{
              width: 20, height: 20,
              border: '2px solid rgba(255,255,255,0.15)',
              borderTopColor: '#8b6fff', borderRadius: '50%',
              display: 'inline-block',
              animation: 'spin 0.8s linear infinite',
            }} />
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15 }}>
              Generating {selectedTone.toLowerCase()} copy variations…
            </span>
          </div>
        </div>
      )}

      {/* ── Variations grid ────────────────────────────────────────── */}
      {variations.length > 0 && !isGenerating && (
        <div style={{ marginTop: 36 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
            <h3 style={{ color: '#fff', fontSize: 20, fontWeight: 700 }}>
              Generated Variations
            </h3>
            <button
              onClick={handleGenerate}
              style={{
                background: 'none', border: '1px solid rgba(139,111,255,0.4)',
                borderRadius: 8, padding: '6px 16px',
                color: '#8b6fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              ↺ Regenerate
            </button>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, marginBottom: 20 }}>
            Select the variation that best fits your campaign
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {variations.map((v, i) => {
              const isSelected = selectedVariation === i;
              const grad = VARIATION_GRADIENTS[i % VARIATION_GRADIENTS.length];
              return (
                <div
                  key={i}
                  onClick={() => setSelectedVariation(isSelected ? null : i)}
                  style={{
                    background: '#131313',
                    border: isSelected ? '2px solid #8b6fff' : '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 14,
                    padding: 24,
                    cursor: 'pointer',
                    transition: 'border-color 0.2s, transform 0.15s',
                    transform: isSelected ? 'translateY(-2px)' : 'none',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {/* top accent bar */}
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: grad }} />

                  {/* header row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Variation {i + 1}
                    </span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {v.engagement && (
                        <span style={{ fontSize: 12, color: '#4ade80', fontWeight: 600, background: 'rgba(74,222,128,0.1)', borderRadius: 20, padding: '2px 8px' }}>
                          {v.engagement}
                        </span>
                      )}
                      {v.score > 0 && (
                        <span style={{ fontSize: 12, color: '#8b6fff', fontWeight: 700, background: 'rgba(139,111,255,0.15)', borderRadius: 20, padding: '2px 8px' }}>
                          {v.score}
                        </span>
                      )}
                    </div>
                  </div>

                  <h4 style={{ color: '#fff', fontSize: 16, fontWeight: 700, marginBottom: 10, lineHeight: 1.4 }}>
                    {v.headline}
                  </h4>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, lineHeight: 1.7, marginBottom: 16 }}>
                    {v.body}
                  </p>

                  <div style={{ display: 'inline-block', background: grad, borderRadius: 20, padding: '6px 16px', color: '#fff', fontSize: 13, fontWeight: 700 }}>
                    {v.cta}
                  </div>

                  {isSelected && (
                    <div style={{
                      position: 'absolute', top: 12, right: 12,
                      width: 22, height: 22, borderRadius: '50%',
                      background: '#8b6fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, color: '#fff', fontWeight: 700,
                    }}>
                      ✓
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {selectedVariation !== null && (
            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  if (onCopyGenerated && selectedVariation !== null) {
                    onCopyGenerated({ campaignId, selectedVariation: variations[selectedVariation], variations, tone: selectedTone });
                  }
                }}
                style={{
                  background: 'linear-gradient(90deg,#8b6fff,#c944ff)',
                  border: 'none', borderRadius: 8,
                  padding: '10px 28px',
                  color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                }}
              >
                Use This Copy →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CopyMessagingStep;