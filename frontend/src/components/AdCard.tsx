// src/components/AdCard.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

interface AdCardProps {
  ad: {
    id: number | string;
    title: string;
    type?: string | null;
    image: string;
    rating: string;
    votes: string;
    tags: string[];
    genre?: string;
    url?: string;
    description?: string;
    engagement?: string;
  };
  /** When set, card click opens modal; "View Campaign" opens ad URL. When unset, card click opens URL. */
  onCardClick?: (ad: AdCardProps['ad']) => void;
}

const AdCard: React.FC<AdCardProps> = ({ ad, onCardClick }) => {
  const navigate = useNavigate();

  const handleCardAreaClick = () => {
    if (onCardClick) {
      onCardClick(ad);
    } else {
      if (ad.url) {
        window.open(ad.url, '_blank', 'noopener,noreferrer');
      } else {
        navigate(`/ads/${ad.id}`);
      }
    }
  };

  return (
    <div
      onClick={handleCardAreaClick}
      className="cursor-pointer transition-transform hover:scale-[1.02]"
      style={{
        width: 327,
        height: 500
      }}
    >
      <div
        className="relative overflow-hidden"
        style={{
          width: '100%',
          height: '100%',
          borderRadius: 15,
          background: `
            linear-gradient(#00000059, #00000059),
            url(${ad.image}) center/cover
          `,
          boxShadow: '2px 4px 10px rgba(255,255,255,0.7)'
        }}
      >

        {/* PROMOTED badge */}
        {ad.type && (
          <div
            className="absolute top-4 left-4 px-6 py-2 rounded-full text-black text-sm font-semibold"
            style={{
              backgroundColor: '#6EF3E8',
              fontFamily: "'Montserrat Alternates', sans-serif"
            }}
          >
            PROMOTED
          </div>
        )}

        {/* Rating */}
        <div
          className="absolute top-4 right-4 flex items-center gap-2 text-white text-sm"
          style={{ fontFamily: "'Montserrat Alternates', sans-serif" }}
        >
          ⭐ {ad.rating}/5 ({ad.votes})
        </div>

        {/* Bottom content */}
        <div className="absolute bottom-6 left-6 right-6 text-white">

          <h3
            className="mb-4 text-xl font-semibold"
            style={{ fontFamily: "'Montserrat Alternates', sans-serif" }}
          >
            {ad.title}
          </h3>

          <div className="flex gap-4 flex-wrap">

            {ad.tags.map((tag, idx) => (
              <span
                key={idx}
                className="px-5 py-2 rounded-full text-sm"
                style={{
                  fontFamily: "'Montserrat Alternates', sans-serif",
                  background: `
                    linear-gradient(#1f1f1f, #1f1f1f) padding-box,
                    linear-gradient(90deg,#22d3ee,#a855f7,#ec4899) border-box
                  `,
                  border: '2px solid transparent'
                }}
              >
                {tag}
              </span>
            ))}

          </div>
          {(ad.url || ad.engagement) && (
            <div className="mt-3 flex items-center justify-between">
              {ad.engagement && (
                <span className="text-xs text-white/80">{ad.engagement} engagement</span>
              )}
              {ad.url ? (
                <button
                  type="button"
                  className="text-sm font-semibold text-cyan-400 hover:text-cyan-300"
                  style={{ fontFamily: "'Montserrat Alternates', sans-serif" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(ad.url, '_blank', 'noopener,noreferrer');
                  }}
                >
                  View Campaign →
                </button>
              ) : (
                <span
                  className="text-sm font-semibold text-cyan-400 hover:text-cyan-300"
                  style={{ fontFamily: "'Montserrat Alternates', sans-serif" }}
                >
                  View Campaign →
                </span>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default AdCard;