import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import AdCarousel from '../components/AdCarousel';
import AdDetailModal from '../components/AdDetailModal';
import Footer from '../components/Footer';
import AnimatedTileGrid from '../components/AnimatedTileGrid';
import { TrendingAPI, TrendingAd as TrendingAdType } from '../services/adsurv';

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
  /** Fallback when image fails to load */
  thumbnail?: string;
}

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [selectedAd, setSelectedAd] = useState<AdItem | null>(null);
  const [relatedAds, setRelatedAds] = useState<AdItem[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedCategory, _setSelectedCategory] = useState<string>('recommended');
  const [trendingExampleAds, setTrendingExampleAds] = useState<AdItem[]>([]);
  const [cachedByCategory, setCachedByCategory] = useState<Record<string, TrendingAdType[]>>({});
  const [isLoadingCache, setIsLoadingCache] = useState(true);
  const [recommendedFetchedAds, setRecommendedFetchedAds] = useState<AdItem[] | null>(null);
  const [trendingFetchedAds, setTrendingFetchedAds] = useState<AdItem[] | null>(null);
  const [loadingRecommended, setLoadingRecommended] = useState(false);
  const [loadingTrending, setLoadingTrending] = useState(false);
  const [showRecommendedModal, setShowRecommendedModal] = useState(false);
  const [showTrendingModal, setShowTrendingModal] = useState(false);
  // Unified category modal: Fashion, Sports, Food use same pattern as Recommended
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryModalKey, setCategoryModalKey] = useState<'recommended' | 'fashion' | 'sports' | 'food' | 'trending'>('recommended');
  const [categoryFetchedAds, setCategoryFetchedAds] = useState<AdItem[] | null>(null);
  const [loadingCategory, setLoadingCategory] = useState(false);
  // Fetched ads for AdDetailModal "Top Campaign Examples" (by genre when opening from a card)
  const [modalExampleAds, setModalExampleAds] = useState<AdItem[] | null>(null);
  // Recommended: white modal – fetch using hardcoded category keywords (Shoes, Fashion, Food, Sports)
  const [showRecommendedWhiteModal, setShowRecommendedWhiteModal] = useState(false);
  const [recommendedWhiteAds, setRecommendedWhiteAds] = useState<AdItem[] | null>(null);
  const [loadingRecommendedWhite, setLoadingRecommendedWhite] = useState(false);
  // Trending: same white modal + multi-keyword fetch as Recommended
  const [showTrendingWhiteModal, setShowTrendingWhiteModal] = useState(false);
  const [trendingWhiteAds, setTrendingWhiteAds] = useState<AdItem[] | null>(null);
  const [loadingTrendingWhite, setLoadingTrendingWhite] = useState(false);
  const [trendingWhiteModalTitle, setTrendingWhiteModalTitle] = useState('Trending Now');
  // Category-specific ads for main section carousel (food / fashion / sports only)
  const [sectionCategoryAds, setSectionCategoryAds] = useState<Record<string, AdItem[] | null>>({});
  const [loadingSectionCategory, setLoadingSectionCategory] = useState<Record<string, boolean>>({});
  const isLoggedIn = !!localStorage.getItem('token');

  const RECOMMENDED_KEYWORDS = ['Shoes ads', 'Fashion ads', 'Food ads', 'Sports ads'];

  // Map carousel card genres to trending search keywords (aligned with category modal)
  const genreToKeyword: Record<string, string> = {
    'food': 'food restaurant ads',
    'Food': 'food restaurant ads',
    'fashion': 'fashion clothing brands apparel',
    'Fashion': 'fashion clothing brands apparel',
    'Shoes': 'Shoes ads',
    'Tech': 'Tech gadgets',
    'Cars': 'Car commercials',
    'Home Decor': 'Home decor',
    'Fitness': 'Fitness products',
    'Beauty Ads': 'Beauty products',
    'Travel': 'Travel deals',
    'E-commerce': 'E-commerce',
    'Sports': 'Sports ads',
  };

  const formatVotes = (value: number | string | undefined): string => {
    const num = typeof value === 'string' ? parseInt(value) : (value || 0);
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
  };

  // Proxy external image URLs (e.g. Instagram CDN) to avoid ERR_BLOCKED_BY_RESPONSE.NotSameOrigin
  const proxyImageUrl = (url: string | undefined): string => {
    if (!url) return 'https://via.placeholder.com/400x300?text=No+Image';
    if (url.includes('via.placeholder.com')) return url;
    try {
      return 'https://corsproxy.io/?' + encodeURIComponent(url);
    } catch {
      return url;
    }
  };

  const mapTrendingToAdFormat = (items: TrendingAdType[], genre: string) => {
    const categoryPlaceholder = `https://via.placeholder.com/400x300?text=${encodeURIComponent(genre || 'Ad')}`;
    return items.map((item, index) => {
      const rawImage = item.image_url || item.thumbnail || '';
      const rawThumb = item.thumbnail || item.image_url || '';
      const imageUrl = rawImage ? proxyImageUrl(rawImage) : (rawThumb ? proxyImageUrl(rawThumb) : categoryPlaceholder);
      const thumbUrl = rawThumb ? proxyImageUrl(rawThumb) : (rawImage ? proxyImageUrl(rawImage) : categoryPlaceholder);
      return {
      id: item.id || `trending-${index}`,
      title: item.title || item.headline || 'Trending Ad',
      image: imageUrl,
      thumbnail: thumbUrl,
      rating: item.score ? Math.min(item.score / 20, 5).toFixed(1) : '4.5',
      votes: formatVotes(item.views || item.likes || 0),
      tags: [item.platform, ...(item.type ? [item.type] : [])].filter(Boolean) as string[],
      genre,
      engagement: item.score ? `${Math.min(item.score, 100)}%` : 'N/A',
      description: item.description || 'Trending ad content',
      url: item.url,
      platform: item.platform,
      score: item.score,
    };
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Fetch category-specific ads for main section when user is on Food / Fashion / Sports
  useEffect(() => {
    const cat = selectedCategory;
    if (cat !== 'food' && cat !== 'fashion' && cat !== 'sports') return;
    if (sectionCategoryAds[cat] !== undefined) return; // already loaded
    setLoadingSectionCategory((prev) => ({ ...prev, [cat]: true }));
    const keyword = categorySearchKeywords[cat];
    TrendingAPI.search({
      keyword,
      platforms: ['meta', 'instagram', 'youtube'],
      limit_per_platform: 6,
      async_mode: false,
    })
      .then((result) => {
        const raw = result?.top_trending ?? [];
        const mapped = mapTrendingToAdFormat(raw.slice(0, 20), cat);
        const filtered = mapped.filter((ad) => (ad.genre || '').toLowerCase() === cat);
        setSectionCategoryAds((prev) => ({ ...prev, [cat]: filtered.length > 0 ? filtered : mapped }));
      })
      .catch(() => setSectionCategoryAds((prev) => ({ ...prev, [cat]: null })))
      .finally(() => setLoadingSectionCategory((prev) => ({ ...prev, [cat]: false })));
  }, [selectedCategory]);

  // Fetch 24h-cached trending ads once on load (no fetch on category click or card click)
  useEffect(() => {
    let cancelled = false;
    TrendingAPI.getCached()
      .then((data: { categories?: Record<string, TrendingAdType[]> }) => {
        if (!cancelled && data.categories) {
          setCachedByCategory(data.categories);
        }
      })
      .catch(() => { /* use fallback static ads */ })
      .finally(() => { if (!cancelled) setIsLoadingCache(false); });
    return () => { cancelled = true; };
  }, []);

  // Sample data for all ads
  const allAds = [
    // Sports ads
    {
      id: 101,
      title: 'Nike: Just Do It Campaign',
      type: 'PROMOTED',
      image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=500&fit=crop',
      rating: '4.9',
      votes: '256K',
      tags: ['Athletic', 'Motivational'],
      genre: 'Sports'
    },
    // Food ads
    {
      id: 201,
      title: "McDonald's: I'm Lovin' It",
      type: 'PROMOTED',
      image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=500&fit=crop',
      rating: '4.6',
      votes: '298K',
      tags: ['Fast Food', 'Family'],
      genre: 'Food'
    },
    // Fashion ads
    {
      id: 301,
      title: 'Zara: Fast Fashion Leader',
      type: 'PROMOTED',
      image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&h=500&fit=crop',
      rating: '4.7',
      votes: '289K',
      tags: ['Trendy', 'Affordable'],
      genre: 'Fashion'
    },
    // ... other ads
  ];

  // Build carousel ads from cache (mapped to AdItem format) for a given category
  const getCachedAdsForCategory = (category: string): AdItem[] => {
    const raw = cachedByCategory[category] || [];
    return mapTrendingToAdFormat(raw.slice(0, 20), category);
  };

  const handleCardClick = (ad: AdItem) => {
    setSelectedAd(ad);
    document.body.style.overflow = 'hidden';
    const validCategories = ['sports', 'food', 'fashion', 'trending', 'recommended'];
    const category = validCategories.includes((ad.genre || '').toLowerCase())
      ? (ad.genre || 'recommended').toLowerCase()
      : 'recommended';
    const cachedList = getCachedAdsForCategory(category);
    const others = cachedList.filter(item => String(item.id) !== String(ad.id));
    setRelatedAds(others.slice(0, 3));
    setTrendingExampleAds(others.slice(0, 4));
    setModalExampleAds(null);
    // Fetch category-specific ads for "Top Campaign Examples" in the detail modal
    const keyword = genreToKeyword[ad.genre || ''] || genreToKeyword[category] || 'advertising campaigns';
    const minDelay = new Promise<void>(r => setTimeout(r, 400));
    TrendingAPI.search({
      keyword,
      platforms: ['meta', 'instagram', 'youtube'],
      limit_per_platform: 6,
      async_mode: false,
    }).then((result) => {
      const raw = result?.top_trending ?? [];
      return mapTrendingToAdFormat(raw.slice(0, 8), category);
    }).catch(() => [] as AdItem[]).then((ads) => {
      minDelay.then(() => setModalExampleAds(ads));
    });
  };

  const categoryModalTitles: Record<typeof categoryModalKey, string> = {
    recommended: 'Recommended Campaigns',
    fashion: 'Fashion Ads',
    sports: 'Sports Campaigns',
    food: 'Food Campaigns',
    trending: 'Trending Now',
  };

  const categorySearchKeywords: Record<typeof categoryModalKey, string> = {
    recommended: 'advertising campaigns',
    fashion: 'fashion clothing brands apparel',
    sports: 'sports ads athletics',
    food: 'food restaurant ads',
    trending: 'trending ads',
  };

  // Open category modal and fetch ads (Fashion, Sports, Food – single keyword per category)
  const openCategoryModalAndFetch = (key: typeof categoryModalKey) => {
    setCategoryModalKey(key);
    setShowCategoryModal(true);
    setLoadingCategory(true);
    setCategoryFetchedAds(null);
    const minLoaderMs = 800;
    const minDelay = new Promise<void>(r => setTimeout(r, minLoaderMs));
    const keyword = categorySearchKeywords[key];
    Promise.all([
      TrendingAPI.search({
        keyword,
        platforms: ['meta', 'instagram', 'youtube'],
        limit_per_platform: 6,
        async_mode: false,
      }).then((result) => {
        const raw = result?.top_trending ?? [];
        return mapTrendingToAdFormat(raw.slice(0, 20), key);
      }).catch(() => [] as AdItem[]),
      minDelay,
    ]).then(([ads]) => {
      // Only show ads that match this category (genre was set to key)
      const filtered = ads.filter((ad) => (ad.genre || '').toLowerCase() === key.toLowerCase());
      const list = filtered.length > 0 ? filtered : ads;
      setCategoryFetchedAds(list);
      if (list.length > 0) {
        setSelectedAd(list[0]);
        setRelatedAds(list.slice(1, 4));
        setTrendingExampleAds(list.slice(0, 8));
        setShowCategoryModal(false);
        document.body.style.overflow = 'hidden';
      }
    })
      .finally(() => setLoadingCategory(false));
  };

  // Recommended: fetch using hardcoded category names (Shoes, Fashion, Food, Sports), merge results
  const openRecommendedWhiteModal = () => {
    setShowRecommendedWhiteModal(true);
    setRecommendedWhiteAds(null);
    setLoadingRecommendedWhite(true);
    const minLoaderMs = 600;
    const minDelay = new Promise<void>(r => setTimeout(r, minLoaderMs));
    Promise.all(
      RECOMMENDED_KEYWORDS.map((keyword) =>
        TrendingAPI.search({
          keyword,
          platforms: ['meta', 'instagram', 'youtube'],
          limit_per_platform: 3,
          async_mode: false,
        })
          .then((result) => {
            const raw = result?.top_trending ?? [];
            return mapTrendingToAdFormat(raw.slice(0, 5), keyword);
          })
          .catch(() => [] as AdItem[])
      )
    )
      .then((results) => {
        const seen = new Set<string>();
        const merged: AdItem[] = [];
        const maxPerSource = 5;
        for (let i = 0; i < maxPerSource; i++) {
          for (const ads of results) {
            if (ads[i]) {
              const ad = ads[i];
              const key = String(ad.id);
              if (!seen.has(key)) {
                seen.add(key);
                merged.push(ad);
              }
            }
          }
        }
        for (const ads of results) {
          for (const ad of ads) {
            const key = String(ad.id);
            if (!seen.has(key)) {
              seen.add(key);
              merged.push(ad);
            }
          }
        }
        return merged.slice(0, 20);
      })
      .then((ads) => minDelay.then(() => ads))
      .then((ads) => {
        setRecommendedWhiteAds(ads);
        if (ads.length > 0) {
          setSelectedAd(ads[0]);
          setRelatedAds(ads.slice(1, 4));
          setTrendingExampleAds(ads.slice(0, 8));
          setShowRecommendedWhiteModal(false);
          document.body.style.overflow = 'hidden';
        }
      })
      .finally(() => setLoadingRecommendedWhite(false));
  };

  // Trending: mixed fetch (Shoes, Fashion, Food, Sports) when opening generic "Trending"
  const openTrendingWhiteModal = () => {
    setTrendingWhiteModalTitle('Trending Now');
    setShowTrendingWhiteModal(true);
    setTrendingWhiteAds(null);
    setLoadingTrendingWhite(true);
    const minLoaderMs = 600;
    const minDelay = new Promise<void>(r => setTimeout(r, minLoaderMs));
    Promise.all(
      RECOMMENDED_KEYWORDS.map((keyword) =>
        TrendingAPI.search({
          keyword,
          platforms: ['meta', 'instagram', 'youtube'],
          limit_per_platform: 3,
          async_mode: false,
        })
          .then((result) => {
            const raw = result?.top_trending ?? [];
            return mapTrendingToAdFormat(raw.slice(0, 5), keyword);
          })
          .catch(() => [] as AdItem[])
      )
    )
      .then((results) => {
        const seen = new Set<string>();
        const merged: AdItem[] = [];
        const maxPerSource = 5;
        for (let i = 0; i < maxPerSource; i++) {
          for (const ads of results) {
            if (ads[i]) {
              const ad = ads[i];
              const key = String(ad.id);
              if (!seen.has(key)) {
                seen.add(key);
                merged.push(ad);
              }
            }
          }
        }
        for (const ads of results) {
          for (const ad of ads) {
            const key = String(ad.id);
            if (!seen.has(key)) {
              seen.add(key);
              merged.push(ad);
            }
          }
        }
        return merged.slice(0, 20);
      })
      .then((ads) => minDelay.then(() => ads))
      .then((ads) => {
        setTrendingWhiteAds(ads);
        if (ads.length > 0) {
          setSelectedAd(ads[0]);
          setRelatedAds(ads.slice(1, 4));
          setTrendingExampleAds(ads.slice(0, 8));
          setShowTrendingWhiteModal(false);
          document.body.style.overflow = 'hidden';
        }
      })
      .finally(() => setLoadingTrendingWhite(false));
  };

  // When user clicks a specific card in Trending (e.g. "Home Decor Ads"), fetch only that category's ads
  const openTrendingWhiteModalWithGenre = (genre: string, modalTitle: string) => {
    const keyword = genreToKeyword[genre] || genre;
    setTrendingWhiteModalTitle(modalTitle);
    setShowTrendingWhiteModal(true);
    setTrendingWhiteAds(null);
    setLoadingTrendingWhite(true);
    const minLoaderMs = 600;
    const minDelay = new Promise<void>(r => setTimeout(r, minLoaderMs));
    TrendingAPI.search({
      keyword,
      platforms: ['meta', 'instagram', 'youtube'],
      limit_per_platform: 5,
      async_mode: false,
    })
      .then((result) => {
        const raw = result?.top_trending ?? [];
        return mapTrendingToAdFormat(raw.slice(0, 20), genre);
      })
      .catch(() => [] as AdItem[])
      .then((ads) => minDelay.then(() => ads))
      .then((ads) => {
        const filtered = ads.filter((ad) => (ad.genre || '').toLowerCase() === genre.toLowerCase());
        const list = filtered.length > 0 ? filtered : ads;
        setTrendingWhiteAds(list);
        if (list.length > 0) {
          setSelectedAd(list[0]);
          setRelatedAds(list.slice(1, 4));
          setTrendingExampleAds(list.slice(0, 8));
          setShowTrendingWhiteModal(false);
          document.body.style.overflow = 'hidden';
        }
      })
      .finally(() => setLoadingTrendingWhite(false));
  };

  const handleTrendingCardClick = (ad: AdItem) => {
    if (ad.genre && genreToKeyword[ad.genre]) {
      openTrendingWhiteModalWithGenre(ad.genre, ad.title || `${ad.genre} Ads`);
    } else {
      openTrendingWhiteModal();
    }
  };

  const openTrendingAndFetch = () => openTrendingWhiteModal();

  const handleCloseModal = () => {
    setSelectedAd(null);
    document.body.style.overflow = 'auto';
  };

  return (
    <div 
  className="min-h-screen bg-black"
  style={{ fontFamily: "'Montserrat Alternates', sans-serif" }}
>
      <Navigation />
      
      {/* Subtle Background Effects */}
      <div className="pointer-events-none fixed inset-0">
        <div 
          className="absolute h-72 w-72 rounded-full bg-gradient-to-r from-purple-200/30 to-pink-200/30 blur-3xl"
          style={{
            left: `${mousePosition.x / window.innerWidth * 100}%`,
            top: `${mousePosition.y / window.innerHeight * 100}%`,
            transform: 'translate(-50%, -50%)'
          }}
        />
      </div>

        {/* ✅ ADDED: Animated Tile Grid Section */}
      <AnimatedTileGrid />

      {/* Background Effects */}
      <div className="pointer-events-none fixed inset-0">
        <div
          className="absolute h-72 w-72 rounded-full bg-gradient-to-r from-purple-200/30 to-pink-200/30 blur-3xl"
          style={{
            left: `${mousePosition.x / window.innerWidth * 100}%`,
            top: `${mousePosition.y / window.innerHeight * 100}%`,
            transform: 'translate(-50%, -50%)'
          }}
        />
      </div>

     

  {/* Figma Neon Category Pills - Always Visible Gradient
<div className="px-6 py-8 max-w-7xl mx-auto">
  <h3
  className="text-gray-100 mb-8 text-[48px] font-semibold leading-[1] tracking-[-0.03em]"
  style={{ fontFamily: "'Montserrat Alternates', sans-serif" }}
>
  Browse by Category
</h3>

  <div className="flex flex-wrap gap-6">

    {[
      { key: 'recommended', label: 'All Campaigns' },
      { key: 'sports', label: 'Sports' },
      { key: 'food', label: 'Food' },
      { key: 'fashion', label: 'Fashion' },
      { key: 'recommended', label: 'Recommended' },
    ].map((cat, i) => (
      <button
        key={i}
        onClick={() => setSelectedCategory(cat.key)}
        className="
          relative px-10 py-3 rounded-full font-semibold text-white
          bg-[#1f1f1f]
          transition-all duration-300
          hover:scale-105
        "
        style={{
          background: `
            linear-gradient(#1f1f1f, #1f1f1f) padding-box,
            linear-gradient(90deg, #22d3ee, #a855f7, #ec4899) border-box
          `,
          border: '2px solid transparent'
        }}
      >
        {cat.label}
      </button>
    ))}

  </div>
</div> */}

     {/* Dynamic Category Section */}
<section className="px-6 py-12 max-w-7xl mx-auto">
  <div className="mb-8">
    <div className="flex items-center justify-between mb-6">

      {/* Figma Styled Headline */}
      <h2
        className="text-gray-200 text-[48px] font-semibold leading-[1] tracking-[-0.03em]"
        style={{ fontFamily: "'Montserrat Alternates', sans-serif" }}
      >
        {selectedCategory === 'sports' && 'Sports Campaigns'}
        {selectedCategory === 'food' && 'Food Campaigns'}
        {selectedCategory === 'fashion' && 'Fashion Campaigns'}
        {selectedCategory === 'recommended' && 'Recommended Campaigns'}
      </h2>

      {/* Figma Styled Action Text */}
      {/* <button
        className="flex items-center gap-2 text-[18px] font-semibold text-purple-400 hover:text-purple-300 transition-colors"
        style={{ fontFamily: "'Montserrat Alternates', sans-serif" }}
      >
        See All
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button> */}

    </div>

    {/* Recommended: white modal only (Ad Surveillance trending). Others: dark category modal. */}
    {selectedCategory === 'recommended' ? (
      <AdCarousel
        category="recommended"
        onCardClick={openRecommendedWhiteModal}
      />
    ) : selectedCategory === 'fashion' ? (
      <AdCarousel
        category="fashion"
        onCardClick={() => openCategoryModalAndFetch('fashion')}
        ads={sectionCategoryAds.fashion ?? undefined}
      />
    ) : selectedCategory === 'sports' ? (
      <AdCarousel
        category="sports"
        onCardClick={() => openCategoryModalAndFetch('sports')}
        ads={sectionCategoryAds.sports ?? undefined}
      />
    ) : selectedCategory === 'food' ? (
      <AdCarousel
        category="food"
        onCardClick={() => openCategoryModalAndFetch('food')}
        ads={sectionCategoryAds.food ?? undefined}
      />
    ) : (
      <AdCarousel
        category={selectedCategory as 'sports' | 'food' | 'fashion' | 'trending' | 'top' | 'recommended'}
        onCardClick={handleCardClick}
      />
    )}
  </div>
</section>

     {/* Trending Now Section */}
<section className="px-6 py-12 max-w-7xl mx-auto">
  <div className="mb-8">
    <div className="flex items-center justify-between mb-6">

      {/* <h2
        className="text-gray-200 text-[48px] font-semibold leading-[1] tracking-[-0.03em]"
        style={{ fontFamily: "'Montserrat Alternates', sans-serif" }}
      >
        Trending Now
      </h2> */}

      {/* <button
        className="flex items-center gap-2 ml-auto text-[18px] font-semibold text-purple-400 hover:text-purple-300 transition-colors"
        style={{ fontFamily: "'Montserrat Alternates', sans-serif" }}
      >
        See All
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button> */}

    </div>

    {/* Trending: on card click open genre-specific modal (e.g. Home Decor Ads → only home decor ads). */}
    <AdCarousel
      category="trending"
      onCardClick={handleTrendingCardClick}
    />
  </div>
</section>


{/* Top Performers Section */}
{/* <section className="px-6 py-12 max-w-7xl mx-auto">
  <div className="mb-8">
    <div className="flex items-center justify-between mb-6">

      <h2
        className="text-gray-200 text-[48px] font-semibold leading-[1] tracking-[-0.03em]"
        style={{ fontFamily: "'Montserrat Alternates', sans-serif" }}
      >
        Top Performers
      </h2>

      <button
        className="flex items-center gap-2 text-[18px] font-semibold text-purple-400 hover:text-purple-300 transition-colors"
        style={{ fontFamily: "'Montserrat Alternates', sans-serif" }}
      >
        See All
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

    </div>

    <AdCarousel 
      category="top" 
      onCardClick={handleCardClick}
    />
  </div>
</section> */}

      {/* Recommended: white modal – fetch by category keywords (Shoes, Fashion, Food, Sports), no search bar */}
      {showRecommendedWhiteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/60" onClick={() => setShowRecommendedWhiteModal(false)} />
          <div className="relative min-h-screen flex items-center justify-center p-4">
            <div className="relative w-full max-w-6xl bg-white rounded-2xl shadow-2xl overflow-hidden">
              <div className="flex justify-between items-center px-8 py-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900">Recommended Campaigns</h2>
                <button type="button" onClick={() => setShowRecommendedWhiteModal(false)} className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 text-xl">&times;</button>
              </div>
              <div className="p-6">
                {loadingRecommendedWhite ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-4">
                    <div className="w-10 h-10 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                    <p className="text-gray-500">Fetching recommended campaigns…</p>
                  </div>
                ) : recommendedWhiteAds && recommendedWhiteAds.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {recommendedWhiteAds.map((ad) => (
                      <div
                        key={ad.id}
                        className="rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => {
                          const others = recommendedWhiteAds.filter((a) => String(a.id) !== String(ad.id));
                          setRelatedAds(others.slice(0, 3));
                          setTrendingExampleAds(others.slice(0, 4));
                          setSelectedAd(ad);
                          setShowRecommendedWhiteModal(false);
                          document.body.style.overflow = 'hidden';
                        }}
                      >
                        <div className="aspect-video bg-gray-100 relative">
                          <img
                            src={ad.image || ad.thumbnail || `https://via.placeholder.com/400x300?text=${encodeURIComponent(ad.genre || 'Ad')}`}
                            alt={ad.title}
                            className="w-full h-full object-cover"
                            onError={(e) => { const el = e.target as HTMLImageElement; el.src = ad.thumbnail || `https://via.placeholder.com/400x300?text=${encodeURIComponent(ad.genre || 'Ad')}`; }}
                          />
                        </div>
                        <div className="p-3">
                          <h3 className="font-semibold text-gray-900 line-clamp-2 text-sm">{ad.title}</h3>
                          <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                            <span>⭐ {ad.rating} ({ad.votes})</span>
                            {ad.url && (
                              <button
                                type="button"
                                className="text-purple-600 font-medium hover:text-purple-700"
                                onClick={(e) => { e.stopPropagation(); if (ad.url) window.open(ad.url, '_blank', 'noopener,noreferrer'); }}
                              >
                                View Campaign →
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500 text-center py-16">No recommended campaigns right now. Try again later.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trending: white modal – same multi-keyword fetch as Recommended */}
      {showTrendingWhiteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/60" onClick={() => setShowTrendingWhiteModal(false)} />
          <div className="relative min-h-screen flex items-center justify-center p-4">
            <div className="relative w-full max-w-6xl bg-white rounded-2xl shadow-2xl overflow-hidden">
              <div className="flex justify-between items-center px-8 py-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900">{trendingWhiteModalTitle}</h2>
                <button type="button" onClick={() => setShowTrendingWhiteModal(false)} className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 text-xl">&times;</button>
              </div>
              <div className="p-6">
                {loadingTrendingWhite ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-4">
                    <div className="w-10 h-10 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                    <p className="text-gray-500">Fetching campaigns…</p>
                  </div>
                ) : trendingWhiteAds && trendingWhiteAds.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {trendingWhiteAds.map((ad) => (
                      <div
                        key={ad.id}
                        className="rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => {
                          const others = trendingWhiteAds.filter((a) => String(a.id) !== String(ad.id));
                          setRelatedAds(others.slice(0, 3));
                          setTrendingExampleAds(others.slice(0, 4));
                          setSelectedAd(ad);
                          setShowTrendingWhiteModal(false);
                          document.body.style.overflow = 'hidden';
                        }}
                      >
                        <div className="aspect-video bg-gray-100 relative">
                          <img
                            src={ad.image || ad.thumbnail || `https://via.placeholder.com/400x300?text=${encodeURIComponent(ad.genre || 'Ad')}`}
                            alt={ad.title}
                            className="w-full h-full object-cover"
                            onError={(e) => { const el = e.target as HTMLImageElement; el.src = ad.thumbnail || `https://via.placeholder.com/400x300?text=${encodeURIComponent(ad.genre || 'Ad')}`; }}
                          />
                        </div>
                        <div className="p-3">
                          <h3 className="font-semibold text-gray-900 line-clamp-2 text-sm">{ad.title}</h3>
                          <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                            <span>⭐ {ad.rating} ({ad.votes})</span>
                            {ad.url && (
                              <button
                                type="button"
                                className="text-purple-600 font-medium hover:text-purple-700"
                                onClick={(e) => { e.stopPropagation(); if (ad.url) window.open(ad.url, '_blank', 'noopener,noreferrer'); }}
                              >
                                View Campaign →
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500 text-center py-16">No trending campaigns right now. Try again later.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unified category modal: Fashion, Sports, Food (dark) – not used for Recommended or Trending */}
      {showCategoryModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setShowCategoryModal(false)}
        >
          <div className="bg-[#0B0F1A] rounded-[32px] max-w-6xl w-full max-h-[90vh] overflow-auto p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-white">{categoryModalTitles[categoryModalKey]}</h3>
              <button type="button" onClick={() => setShowCategoryModal(false)} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
            </div>
            {loadingCategory ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="w-10 h-10 border-2 border-purple-500/30 border-t-purple-400 rounded-full animate-spin" />
                <p className="text-gray-400">Fetching campaigns…</p>
              </div>
            ) : categoryFetchedAds && categoryFetchedAds.length > 0 ? (
              <AdCarousel
                category={categoryModalKey}
                onCardClick={handleCardClick}
                ads={(() => {
                  const filtered = categoryFetchedAds.filter((ad) => (ad.genre || '').toLowerCase() === categoryModalKey.toLowerCase());
                  return filtered.length > 0 ? filtered : categoryFetchedAds;
                })()}
              />
            ) : (
              <div className="text-gray-400 text-center py-16">No campaigns right now. Try again later.</div>
            )}
          </div>
        </div>
      )}

      {/* Ad Detail Modal */}
      {selectedAd && (
        <AdDetailModal
          ad={selectedAd}
          onClose={handleCloseModal}
          relatedAds={relatedAds}
          trendingExampleAds={modalExampleAds ?? trendingExampleAds}
        />
      )}

      <Footer />
    </div>
  );
};

export default Home;