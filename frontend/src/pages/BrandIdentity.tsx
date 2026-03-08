import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { useBrandIdentity } from '../contexts/BrandIdentityContext';
import { Upload, Trash2, FileImage } from 'lucide-react';

const MAX_FILE_SIZE_MB = 5;
const ACCEPT = 'image/*,.png,.jpg,.jpeg,.webp,.svg,.gif';

const BrandIdentity: React.FC = () => {
  const navigate = useNavigate();
  const { assets, addAsset, removeAsset } = useBrandIdentity();
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    setError(null);
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image (PNG, JPG, WebP, SVG, or GIF).');
      return;
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`File must be under ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      addAsset({
        name: file.name,
        type: file.type.includes('svg') || file.name.toLowerCase().endsWith('.svg') ? 'logo' : 'media',
        dataUrl,
        mimeType: file.type,
      });
    };
    reader.readAsDataURL(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d0d' }}>
      <Navigation />

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 32px' }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ color: '#fff', fontSize: 36, fontWeight: 700, marginBottom: 8, fontFamily: "'Montserrat Alternates', sans-serif" }}>
            Brand Identity
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 15, lineHeight: 1.5 }}>
            Upload your logos and brand media. These assets are automatically included in every image and video generation so your creatives stay on-brand.
          </p>
        </div>

        {/* Upload zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? '#00e5d4' : 'rgba(139,111,255,0.6)'}`,
            borderRadius: 16,
            padding: 40,
            textAlign: 'center',
            cursor: 'pointer',
            background: dragOver ? 'rgba(0,229,212,0.06)' : 'rgba(255,255,255,0.02)',
            marginBottom: 24,
          }}
        >
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT}
            onChange={onFileSelect}
            style={{ display: 'none' }}
          />
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'rgba(139,111,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Upload size={28} color="#a78bfa" />
            </div>
          </div>
          <p style={{ color: '#fff', fontSize: 18, fontWeight: 600, marginBottom: 6 }}>
            Drop logos or images here, or click to upload
          </p>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
            PNG, JPG, WebP, SVG, GIF — max {MAX_FILE_SIZE_MB}MB
          </p>
        </div>

        {error && (
          <p style={{ color: '#f87171', fontSize: 14, marginBottom: 16 }}>{error}</p>
        )}

        {/* Asset list */}
        {assets.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <h2 style={{ color: 'rgba(255,255,255,0.9)', fontSize: 20, fontWeight: 600, marginBottom: 16 }}>
              Your brand assets ({assets.length})
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16 }}>
              {assets.map((asset) => (
                <div
                  key={asset.id}
                  style={{
                    background: '#1a1a1a',
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.08)',
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  <div style={{ aspectRatio: '1', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8 }}>
                    <img
                      src={asset.dataUrl}
                      alt={asset.name}
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                    />
                  </div>
                  <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={asset.name}>
                      {asset.name}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeAsset(asset.id); }}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 4,
                        cursor: 'pointer',
                        color: 'rgba(255,255,255,0.5)',
                      }}
                      aria-label="Remove"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div style={{ position: 'absolute', top: 6, left: 6 }}>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      color: asset.type === 'logo' ? '#a78bfa' : '#22d3ee',
                      background: 'rgba(0,0,0,0.6)',
                      padding: '2px 6px',
                      borderRadius: 4,
                    }}>
                      {asset.type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {assets.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: 48,
            background: 'rgba(255,255,255,0.03)',
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <FileImage size={48} color="rgba(255,255,255,0.2)" style={{ marginBottom: 16 }} />
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15 }}>
              No brand assets yet. Upload logos and images above — they’ll be used in every generation.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BrandIdentity;
