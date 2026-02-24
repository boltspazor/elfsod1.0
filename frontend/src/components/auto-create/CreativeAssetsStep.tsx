// src/components/auto-create/CreativeAssetsStep.tsx
import React, { useState, useRef } from 'react';
import { Camera, Video, ArrowLeft } from 'lucide-react';

interface CreativeAssetsStepProps {
  selectedGoal?: string | null;
  selectedPlatforms?: string[];
}

type AssetView = 'select' | 'upload-image' | 'upload-video';

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

/* ─── Upload sub-view ───────────────────────────────────────── */
const UploadView = ({
  type,
  onBack,
}: {
  type: 'image' | 'video';
  onBack: () => void;
}) => {
  const [adType, setAdType] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  };

  return (
    <div>
      {/* Back link */}
      <button
        onClick={onBack}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'none', border: 'none',
          color: 'rgba(255,255,255,0.7)', fontSize: 14, cursor: 'pointer',
          marginBottom: 20,
        }}
      >
        <ArrowLeft size={16} /> Back to Campaigns
      </button>

      <h2 style={{ color: '#fff', fontSize: 26, fontWeight: 700, marginBottom: 28 }}>
        Generate AI Assets for your Campaigns
      </h2>

      {/* Dashed upload area */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
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
        }}
      >
        {/* Icon circle */}
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(255,255,255,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 20,
        }}>
          {type === 'image'
            ? <Camera size={30} color="rgba(255,255,255,0.7)" />
            : <Video size={30} color="rgba(255,255,255,0.7)" />
          }
        </div>

        <h3 style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 10 }}>
          Upload Your Product {type === 'image' ? 'Image' : 'Video'}
        </h3>

        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, textAlign: 'center', marginBottom: 20, maxWidth: 480 }}>
          Upload a clear {type === 'image' ? 'image' : 'video'} of your product. Our AI will generate creative ad variations
          based on your specifications
        </p>

        {/* File type hints */}
        <div style={{ display: 'flex', gap: 48, marginBottom: 28 }}>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: 600 }}>Clear Photo</span>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: 600 }}>
            {type === 'image' ? 'PNG, JPG, WebP' : 'MP4, MOV, WebM'}
          </span>
        </div>

        {/* Ad type input */}
        <div style={{ width: '100%', maxWidth: 560, marginBottom: 8 }}>
          <label style={{ color: '#fff', fontSize: 14, fontWeight: 600, display: 'block', marginBottom: 10 }}>
            What type of advertisements do you want to generate?&nbsp;
            <span style={{ color: '#ff4fcb' }}>*</span>
          </label>
          <input
            value={adType}
            onChange={(e) => setAdType(e.target.value)}
            placeholder="Example: Social media ads, Banner ads, Product showcase...."
            style={{
              width: '100%', padding: '14px 16px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 8, color: '#fff', fontSize: 14,
              boxSizing: 'border-box',
            }}
          />
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 6 }}>
            Be Specific about the kind of advertisements you want to generate (Required)
          </p>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileRef}
          type="file"
          accept={type === 'image' ? 'image/*' : 'video/*'}
          style={{ display: 'none' }}
          onChange={(e) => { if (e.target.files?.[0]) setFile(e.target.files[0]); }}
        />

        <button
          onClick={() => fileRef.current?.click()}
          style={{
            background: 'linear-gradient(90deg,#00e5d4,#8b6fff)',
            border: 'none', borderRadius: 8,
            padding: '12px 32px',
            color: '#fff', fontWeight: 700, fontSize: 15,
            cursor: 'pointer', marginTop: 8,
          }}
        >
          Choose {type === 'image' ? 'Image' : 'Video'}
        </button>

        {file && (
          <p style={{ color: '#4ade80', fontSize: 13, marginTop: 12 }}>✓ {file.name}</p>
        )}

        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, marginTop: 10 }}>
          Or drag and drop here
        </p>
      </div>
    </div>
  );
};

/* ─── Main Component ────────────────────────────────────────── */
const CreativeAssetsStep: React.FC<CreativeAssetsStepProps> = () => {
  const [view, setView] = useState<AssetView>('select');

  if (view === 'upload-image') return <UploadView type="image" onBack={() => setView('select')} />;
  if (view === 'upload-video') return <UploadView type="video" onBack={() => setView('select')} />;

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
          description={
            'Upload an image and generate creative ad variations with AI.\nPerfect for social media posts, banners and product showcase.'
          }
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
          description={
            'Upload an image and create engaging video ads.\nTransform static images into dynamic video content for social media and commercials.'
          }
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