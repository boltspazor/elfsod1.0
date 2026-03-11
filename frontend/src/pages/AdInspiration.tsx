import React, { useState, useCallback } from 'react';
import Navigation from '../components/Navigation';
import { Search, Loader2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { AUTOCREATE_API_URL } from '../config';
import { svgPlaceholder } from '../utils/imageFallback';

interface PinImage {
  width?: number;
  height?: number;
  url: string;
}

interface Pin {
  id: string;
  url: string;
  description?: string;
  title?: string;
  grid_title?: string;
  link?: string;
  images?: {
    orig?: PinImage;
    [key: string]: PinImage | undefined;
  };
}

interface PinterestResponse {
  success?: boolean;
  pins?: Pin[];
  cursor?: string;
}

const AdInspiration: React.FC = () => {
  const [query, setQuery]       = useState('');
  const [pins, setPins]         = useState<Pin[]>([]);
  const [cursor, setCursor]     = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  // Lightbox state
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const openLightbox = (idx: number) => {
    setLightboxIdx(idx);
    document.body.style.overflow = 'hidden';
  };
  const closeLightbox = () => {
    setLightboxIdx(null);
    document.body.style.overflow = '';
  };
  const prevPin = () => setLightboxIdx((i) => (i !== null && i > 0 ? i - 1 : i));
  const nextPin = () => setLightboxIdx((i) => (i !== null && i < pins.length - 1 ? i + 1 : i));

  // Keyboard navigation
  React.useEffect(() => {
    if (lightboxIdx === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') prevPin();
      if (e.key === 'ArrowRight') nextPin();
    };
    globalThis.addEventListener('keydown', onKey);
    return () => globalThis.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxIdx]);

  const doSearch = useCallback(async (searchQuery: string, nextCursor?: string | null) => {
    const q = searchQuery.trim();
    if (!q) return;
    setError(null);
    setLoading(true);
    try {
      const params = new URLSearchParams({ query: q });
      if (nextCursor) params.set('cursor', nextCursor);
      const res = await fetch(`${AUTOCREATE_API_URL}/api/pinterest/search?${params}`);
      const data: PinterestResponse = await res.json();
      if (!res.ok) {
        setError((data as { error?: string }).error || 'Search failed');
        if (!nextCursor) setPins([]);
        return;
      }
      const list = data.pins || [];
      if (nextCursor) {
        setPins((prev) => [...prev, ...list]);
      } else {
        setPins(list);
      }
      setCursor(data.cursor || null);
      setSearched(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
      if (!nextCursor) setPins([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCursor(null);
    doSearch(query);
  };

  const loadMore = () => {
    if (cursor && query.trim()) doSearch(query, cursor);
  };

  const getPinImageUrl = (pin: Pin): string => {
    const orig = pin.images?.orig?.url;
    const raw = orig ?? (() => {
      const firstKey = pin.images && Object.keys(pin.images)[0];
      return firstKey
        ? (pin.images as Record<string, { url?: string }>)[firstKey]?.url
        : undefined;
    })();
    if (!raw) return '';
    // Proxy through our backend so the browser never hits Pinterest CDN directly.
    // Direct requests to i.pinimg.com get 302-redirected to pinterest.com by Pinterest's servers.
    return `${AUTOCREATE_API_URL}/api/pinterest/image-proxy?url=${encodeURIComponent(raw)}`;
  };

  const getPinTitle = (pin: Pin): string => {
    return pin.grid_title || pin.title || pin.description || 'Pin';
  };

  const activeLightboxPin = lightboxIdx !== null && lightboxIdx >= 0 ? pins[lightboxIdx] : null;

  return (
    <div className="min-h-screen bg-[#0d0d0d]">
      <Navigation />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="text-white text-3xl font-bold mb-2 font-['Montserrat_Alternates',sans-serif]">
          Ad Inspiration
        </h1>
        <p className="text-gray-400 text-sm mb-8">
          Search Pinterest for design inspiration for your ads.
        </p>

        <form onSubmit={handleSubmit} className="flex gap-3 mb-10">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Italian Pot Roast, fashion ads, product photography"
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-[#1a1a1a] border border-gray-700 text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 rounded-xl bg-[#ff5b8d] hover:bg-[#ff7a9e] text-white font-semibold flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {loading && !cursor ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            Search
          </button>
        </form>

        {error && (
          <div className="mb-6 py-3 px-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        {searched && !loading && pins.length === 0 && !error && (
          <p className="text-gray-500 text-center py-12">No pins found. Try a different search.</p>
        )}

        {pins.length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {pins.map((pin, idx) => {
                const imgUrl = getPinImageUrl(pin);
                const title = getPinTitle(pin);
                return (
                  <button
                    key={pin.id}
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); openLightbox(idx); }}
                    className="group text-left block rounded-xl overflow-hidden bg-[#1a1a1a] border border-gray-800 hover:border-[#ff5b8d] transition-colors focus:outline-none focus:ring-2 focus:ring-[#ff5b8d]"
                  >
                    <div className="aspect-square bg-gray-800 relative overflow-hidden">
                      {imgUrl ? (
                        <img
                          src={imgUrl}
                          alt={title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => { (e.target as HTMLImageElement).src = svgPlaceholder(title.slice(0, 12), 400, 400); }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-600 text-sm">No image</div>
                      )}
                      {/* hover overlay */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-white text-sm font-semibold tracking-wide">View Full</span>
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="text-gray-300 text-sm line-clamp-2" title={title}>{title}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {cursor && (
              <div className="mt-8 flex justify-center">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="px-6 py-3 rounded-xl bg-[#1f1f1f] hover:bg-[#2a2a2a] text-white font-medium flex items-center gap-2 disabled:opacity-60 transition-colors"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                  Load more
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Fullscreen Lightbox ─────────────────────────────────── */}
      {activeLightboxPin && (
        /* Backdrop — clicking the dark area closes the lightbox */
        <button
          type="button"
          aria-label="Close lightbox"
          className="fixed inset-0 z-[9999] flex items-center justify-center w-full border-0 p-0 cursor-default"
          style={{ background: 'rgba(0,0,0,0.92)' }}
          onClick={closeLightbox}
        >
          {/* Modal panel — e.stopPropagation prevents the backdrop button from firing */}
          <div
            className="relative flex flex-col md:flex-row max-w-5xl w-full mx-4 bg-[#111] rounded-2xl overflow-hidden shadow-2xl cursor-auto"
            style={{ maxHeight: '92vh' }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            role="none"
          >
            {/* Close */}
            <button
              type="button"
              onClick={closeLightbox}
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Prev */}
            {lightboxIdx !== null && lightboxIdx > 0 && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); prevPin(); }}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {/* Next */}
            {lightboxIdx !== null && lightboxIdx < pins.length - 1 && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); nextPin(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-colors"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}

            {/* Image */}
            <div className="flex-1 bg-black flex items-center justify-center min-h-[300px] overflow-hidden" style={{ maxHeight: '92vh' }}>
              {getPinImageUrl(activeLightboxPin) ? (
                <img
                  src={getPinImageUrl(activeLightboxPin)}
                  alt={getPinTitle(activeLightboxPin)}
                  className="max-w-full max-h-full object-contain"
                  style={{ maxHeight: '92vh' }}
                  onError={(e) => { (e.target as HTMLImageElement).src = svgPlaceholder('No Image', 600, 600); }}
                />
              ) : (
                <div className="w-72 h-72 flex items-center justify-center text-gray-500">No image</div>
              )}
            </div>

            {/* Info panel */}
            <div className="w-full md:w-72 shrink-0 flex flex-col p-6 gap-4 overflow-y-auto">
              <h2 className="text-white font-bold text-lg leading-snug">
                {getPinTitle(activeLightboxPin)}
              </h2>
              {activeLightboxPin.description &&
                activeLightboxPin.description !== getPinTitle(activeLightboxPin) && (
                  <p className="text-gray-400 text-sm leading-relaxed">
                    {activeLightboxPin.description}
                  </p>
                )}

              {/* counter */}
              <p className="text-gray-600 text-xs mt-auto">
                {(lightboxIdx ?? -1) + 1} / {pins.length}
              </p>
            </div>
          </div>
        </button>
      )}
    </div>
  );
};

export default AdInspiration;
