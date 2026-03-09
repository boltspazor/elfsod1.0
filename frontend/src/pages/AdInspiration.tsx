import React, { useState, useCallback } from 'react';
import Navigation from '../components/Navigation';
import { Search, ExternalLink, Loader2 } from 'lucide-react';
import { AUTOCREATE_API_URL } from '../config';

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
  const [query, setQuery] = useState('');
  const [pins, setPins] = useState<Pin[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

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
    if (orig) return orig;
    const firstKey = pin.images && Object.keys(pin.images)[0];
    const first = firstKey ? (pin.images as Record<string, { url?: string }>)[firstKey]?.url : undefined;
    return first || '';
  };

  const getPinTitle = (pin: Pin): string => {
    return pin.grid_title || pin.title || pin.description || 'Pin';
  };

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
            {loading && !cursor ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Search className="w-5 h-5" />
            )}
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
              {pins.map((pin) => {
                const imgUrl = getPinImageUrl(pin);
                const title = getPinTitle(pin);
                return (
                  <a
                    key={pin.id}
                    href={pin.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block rounded-xl overflow-hidden bg-[#1a1a1a] border border-gray-800 hover:border-gray-600 transition-colors"
                  >
                    <div className="aspect-square bg-gray-800 relative overflow-hidden">
                      {imgUrl ? (
                        <img
                          src={imgUrl}
                          alt={title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-600 text-sm">
                          No image
                        </div>
                      )}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-black/70 text-white text-xs">
                          <ExternalLink className="w-3 h-3" /> Open
                        </span>
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="text-gray-300 text-sm line-clamp-2" title={title}>
                        {title}
                      </p>
                    </div>
                  </a>
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
    </div>
  );
};

export default AdInspiration;
