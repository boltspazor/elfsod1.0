// src/components/auto-create/CreativeAssetsStep.tsx
import React, { useState, useRef } from 'react';
import { Camera, Video, ArrowLeft, Loader2 } from 'lucide-react';
import { AUTOCREATE_API_URL } from '../../config';

interface CreativeAssetsStepProps {
  selectedGoal?: string | null;
  selectedPlatforms?: string[];
}

type AssetView = 'select' | 'upload-image' | 'upload-video';

interface GeneratedAsset {
  type: 'image' | 'video';
  url: string;
}

const API = `${AUTOCREATE_API_URL}/api`;

// ─── Helper: file → base64 data URI ───────────────────────────
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── Helper: poll task until done ─────────────────────────────
async function pollTask(taskId: string): Promise<void> {
  const token = localStorage.getItem('token') ?? '';
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const res = await fetch(`${API}/check-status/${taskId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) continue;
    const data = await res.json();
    if (data.status === 'completed') return;
    if (data.status === 'failed') throw new Error('Generation task failed');
  }
  throw new Error('Generation timed out after 3 minutes');
}

/* ─── Big choice card ───────────────────────────────────────── */
const AssetCard = ({
  icon,
  title,
  description,
  bullets,
  buttonLabel,
  buttonColor,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  bullets: string[];
  buttonLabel: string;
  buttonColor: string;
  onClick: () => void;
}) => (
  <div style={{
    background: '#131313',
    border: '1px solid rgba(139,111,255,0.5)',
    borderRadius: 16,
    padding: '40px 36px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    flex: 1,
  }}>
    {/* Circle icon */}
    <div style={{
      width: 80, height: 80, borderRadius: '50%',
      background: 'rgba(255,255,255,0.07)',
      border: '1px solid rgba(255,255,255,0.15)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      marginBottom: 24,
    }}>
      {icon}
    </div>

    <h3 style={{ color: '#fff', fontSize: 22, fontWeight: 700, marginBottom: 14 }}>{title}</h3>

    <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
      {description}
    </p>

    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px', width: '100%', textAlign: 'left' }}>
      {bullets.map(b => (
        <li key={b} style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14, marginBottom: 8, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <span style={{ color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>·</span>
          {b}
        </li>
      ))}
    </ul>

    <button
      onClick={onClick}
      style={{
        background: buttonColor,
        border: 'none',
        borderRadius: 8,
        padding: '12px 32px',
        color: '#fff',
        fontWeight: 700,
        fontSize: 15,
        cursor: 'pointer',
        marginTop: 'auto',
      }}
    >
      {buttonLabel}
    </button>
  </div>
);

/* ─── Upload + Generate sub-view ───────────────────────────── */
const UploadView = ({
  type,
  selectedGoal,
  onBack,
}: {
  type: 'image' | 'video';
  selectedGoal?: string | null;
  onBack: () => void;
}) => {
  const [adType, setAdType]     = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile]         = useState<File | null>(null);

  const [isUploading, setIsUploading]   = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress]         = useState('');
  const [error, setError]               = useState<string | null>(null);
  const [assets, setAssets]             = useState<GeneratedAsset[]>([]);

  const fileRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  };

  const handleGenerate = async () => {
    if (!file) { setError('Please choose a file first.'); return; }
    if (!adType.trim()) { setError('Please describe the type of ads you want to generate.'); return; }

    const token      = localStorage.getItem('token') ?? '';
    const campaignId = crypto.randomUUID();

    try {
      setError(null);
      setAssets([]);

      // Step 1 — convert to base64
      setIsUploading(true);
      setProgress('Uploading image…');
      const base64 = await fileToBase64(file);

      // Step 2 — upload-image
      const uploadRes = await fetch(`${API}/upload-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          image_data:  base64,
          filename:    file.name,
          ad_type:     adType.trim(),
          user_id:     token,
          campaign_id: campaignId,
        }),
      });

      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? `Upload failed (${uploadRes.status})`);
      }

      const uploadData = await uploadRes.json() as { campaign_id?: string };
      const cid = uploadData.campaign_id ?? campaignId;
      setIsUploading(false);

      // Step 3 — generate-assets
      setIsGenerating(true);
      setProgress('Starting AI generation…');

      const genRes = await fetch(`${API}/generate-assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          campaign_id:   cid,
          asset_type:    type,
          user_id:       token,
          campaign_goal: selectedGoal ?? 'awareness',
          ad_type:       adType.trim(),
        }),
      });

      if (!genRes.ok) {
        const err = await genRes.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? `Generation failed (${genRes.status})`);
      }

      const genData = await genRes.json() as { task_ids?: string[] };
      const taskIds = genData.task_ids ?? [];

      // Step 4 — poll tasks
      if (taskIds.length > 0) {
        setProgress(`Generating ${type === 'image' ? 'images' : 'videos'} (this can take 1–2 min)…`);
        await Promise.all(taskIds.map(id => pollTask(id)));
      }

      // Step 5 — fetch results
      setProgress('Fetching results…');
      const resultRes = await fetch(`${API}/get-generated-assets/${cid}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!resultRes.ok) throw new Error(`Failed to fetch results (${resultRes.status})`);

      const resultData = await resultRes.json() as { assets?: Record<string, string>[] };
      const raw = resultData.assets ?? [];

      const parsed: GeneratedAsset[] = raw
        .map(a => ({
          type: (a['asset_type'] === 'video' ? 'video' : 'image') as 'image' | 'video',
          url:  a['video_url'] ?? a['image_url'] ?? a['data_uri'] ?? '',
        }))
        .filter(a => a.url);

      setAssets(parsed);
      setProgress('');
      setIsGenerating(false);

      if (parsed.length === 0) {
        setError('Generation completed but no assets were returned. Ensure the backend has a valid RUNWAY_API_KEY.');
      }
    } catch (err: unknown) {
      setIsUploading(false);
      setIsGenerating(false);
      setProgress('');
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    }
  };

  const busy = isUploading || isGenerating;

  return (
    <div>
      {/* Back */}
      <button
        onClick={onBack}
        disabled={busy}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'none', border: 'none',
          color: 'rgba(255,255,255,0.7)', fontSize: 14,
          cursor: busy ? 'not-allowed' : 'pointer',
          marginBottom: 20, opacity: busy ? 0.5 : 1,
        }}
      >
        <ArrowLeft size={16} /> Back
      </button>

      <h2 style={{ color: '#fff', fontSize: 26, fontWeight: 700, marginBottom: 28 }}>
        Generate AI {type === 'image' ? 'Images' : 'Videos'} for your Campaigns
      </h2>

      {/* ── Upload area (hidden once we have results) ──── */}
      {assets.length === 0 && (
        <>
          {/* Drag-and-drop zone */}
          <div
            role="button"
            tabIndex={0}
            aria-label="Drop file here or click to choose"
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click(); }}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${dragOver ? '#00e5d4' : '#8b6fff'}`,
              borderRadius: 16,
              padding: '48px 40px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              background: 'transparent',
              transition: 'border-color 0.2s',
              marginBottom: 24,
            }}
          >
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 20,
            }}>
              {type === 'image'
                ? <Camera size={30} color="rgba(255,255,255,0.7)" />
                : <Video   size={30} color="rgba(255,255,255,0.7)" />}
            </div>

            <h3 style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 10 }}>
              Upload Your Product {type === 'image' ? 'Image' : 'Video'}
            </h3>

            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, textAlign: 'center', marginBottom: 20, maxWidth: 480 }}>
              Upload a clear {type === 'image' ? 'image' : 'video'} of your product.
              Our AI will generate creative ad variations based on your specifications.
            </p>

            <div style={{ display: 'flex', gap: 48, marginBottom: 28 }}>
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: 600 }}>Clear Photo</span>
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: 600 }}>
                {type === 'image' ? 'PNG, JPG, WebP' : 'MP4, MOV, WebM'}
              </span>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept={type === 'image' ? 'image/*' : 'video/*'}
              style={{ display: 'none' }}
              onChange={e => { if (e.target.files?.[0]) setFile(e.target.files[0]); }}
            />

            <button
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              style={{
                background: 'linear-gradient(90deg,#00e5d4,#8b6fff)',
                border: 'none', borderRadius: 8,
                padding: '12px 32px', color: '#fff',
                fontWeight: 700, fontSize: 15,
                cursor: busy ? 'not-allowed' : 'pointer',
                marginTop: 8,
              }}
            >
              Choose {type === 'image' ? 'Image' : 'Video'}
            </button>

            {file && (
              <p style={{ color: '#4ade80', fontSize: 13, marginTop: 12 }}>
                ✓ {file.name}
              </p>
            )}

            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, marginTop: 10 }}>
              Or drag and drop here
            </p>
          </div>

          {/* Ad type */}
          <div style={{ marginBottom: 24 }}>
            <label
              htmlFor="creative-ad-type"
              style={{ color: '#fff', fontSize: 14, fontWeight: 600, display: 'block', marginBottom: 10 }}
            >
              What type of advertisements do you want to generate?
              {' '}<span style={{ color: '#ff4fcb' }}>*</span>
            </label>
            <input
              id="creative-ad-type"
              value={adType}
              onChange={e => setAdType(e.target.value)}
              placeholder="Example: Social media ads, Banner ads, Product showcase…"
              style={{
                width: '100%', padding: '14px 16px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 8, color: '#fff', fontSize: 14,
                boxSizing: 'border-box',
              }}
            />
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 6 }}>
              Be specific about the kind of advertisements you want to generate (Required)
            </p>
          </div>

          {/* Error banner */}
          {error && (
            <div style={{
              background: 'rgba(255,70,70,0.12)',
              border: '1px solid rgba(255,70,70,0.4)',
              borderRadius: 8, padding: '12px 16px',
              color: '#ff7070', fontSize: 14, marginBottom: 20,
            }}>
              {error}
            </div>
          )}

          {/* Progress banner */}
          {busy && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: 'rgba(139,111,255,0.12)',
              border: '1px solid rgba(139,111,255,0.35)',
              borderRadius: 8, padding: '14px 16px',
              color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: 20,
            }}>
              <Loader2 size={18} style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />
              {progress}
            </div>
          )}

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={busy || !file || !adType.trim()}
            style={{
              background: busy || !file || !adType.trim()
                ? 'rgba(255,255,255,0.1)'
                : 'linear-gradient(90deg,#8b6fff,#c944ff)',
              border: 'none', borderRadius: 8,
              padding: '14px 40px',
              color: busy || !file || !adType.trim() ? 'rgba(255,255,255,0.35)' : '#fff',
              fontWeight: 700, fontSize: 16,
              cursor: busy || !file || !adType.trim() ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 10,
            }}
          >
            {busy && <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />}
            {isUploading ? 'Uploading…' : isGenerating ? 'Generating…' : `Generate ${type === 'image' ? 'Images' : 'Videos'}`}
          </button>
        </>
      )}

      {/* ── Results ─────────────────────────────────────── */}
      {assets.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <h3 style={{ color: '#fff', fontSize: 20, fontWeight: 700 }}>
              Generated {type === 'image' ? 'Images' : 'Videos'} ({assets.length})
            </h3>
            <button
              onClick={() => { setAssets([]); setFile(null); setError(null); }}
              style={{
                background: 'rgba(139,111,255,0.2)',
                border: '1px solid rgba(139,111,255,0.4)',
                borderRadius: 8, padding: '8px 20px',
                color: '#fff', fontSize: 14, cursor: 'pointer',
              }}
            >
              Generate New
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
            {assets.map((asset, idx) => (
              <div
                key={idx}
                style={{
                  background: '#131313',
                  border: '1px solid rgba(139,111,255,0.35)',
                  borderRadius: 12, overflow: 'hidden',
                }}
              >
                {asset.type === 'video' ? (
                  <video src={asset.url} controls style={{ width: '100%', maxHeight: 220, objectFit: 'cover' }} />
                ) : (
                  <img src={asset.url} alt={`Generated asset ${idx + 1}`} style={{ width: '100%', maxHeight: 220, objectFit: 'cover' }} />
                )}
                <div style={{ padding: '10px 14px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
                    {asset.type === 'video' ? 'Video' : 'Image'} {idx + 1}
                  </span>
                  <a
                    href={asset.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'block', marginTop: 8, color: '#8b6fff', fontSize: 13, textDecoration: 'none' }}
                  >
                    Open full size ↗
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

/* ─── Main Component ────────────────────────────────────────── */
const CreativeAssetsStep: React.FC<CreativeAssetsStepProps> = ({ selectedGoal }) => {
  const [view, setView] = useState<AssetView>('select');

  if (view === 'upload-image') {
    return <UploadView type="image" selectedGoal={selectedGoal} onBack={() => setView('select')} />;
  }
  if (view === 'upload-video') {
    return <UploadView type="video" selectedGoal={selectedGoal} onBack={() => setView('select')} />;
  }

  return (
    <div>
      <h2 style={{ color: '#fff', fontSize: 26, fontWeight: 700, marginBottom: 8 }}>
        Generate AI Assets for your Campaigns
      </h2>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, marginBottom: 32 }}>
        Choose what type of assets you would like to generate for your campaign
      </p>

      <div style={{ display: 'flex', gap: 24 }}>
        <AssetCard
          icon={<Camera size={32} color="rgba(255,255,255,0.8)" />}
          title="Generate Images"
          description="Upload an image and generate creative ad variations with AI. Perfect for social media posts, banners and product showcase."
          bullets={[
            'Generate 5+ image variants.',
            'Style transfer and enhancements.',
            'Optimized for different ad formats.',
          ]}
          buttonLabel="Generate Image"
          buttonColor="linear-gradient(90deg,#00e5d4,#8b6fff)"
          onClick={() => setView('upload-image')}
        />

        <AssetCard
          icon={<Video size={32} color="rgba(255,255,255,0.8)" />}
          title="Generate Videos"
          description="Upload an image and create engaging video ads. Transform static images into dynamic video content for social media and commercials."
          bullets={[
            'Image-to-video generation',
            'Motion effects and animations',
            'Video Ad templates',
          ]}
          buttonLabel="Generate Videos"
          buttonColor="linear-gradient(90deg,#8b6fff,#c944ff)"
          onClick={() => setView('upload-video')}
        />
      </div>
    </div>
  );
};

export default CreativeAssetsStep;