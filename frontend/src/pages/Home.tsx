import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navigation from '../components/Navigation';
import AdCarousel from '../components/AdCarousel';
import AdDetailModal from '../components/AdDetailModal';
import Footer from '../components/Footer';
import AnimatedTileGrid from '../components/AnimatedTileGrid';
import { AUTOCREATE_API_URL } from '../config';
import { TrendingAPI, TrendingAd as TrendingAdType } from '../services/adsurv';

interface PublishedCampaign {
  id: number;
  campaign_goal?: string;
  budget_amount?: number;
  campaign_duration?: number;
  budget_type?: string;
  campaign_status?: string;
  published_at?: string;
  created_at?: string;
  selected_tests?: string[];
}

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
}

const Home: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [selectedAd, setSelectedAd] = useState<AdItem | null>(null);
  const [relatedAds, setRelatedAds] = useState<AdItem[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedCategory, _setSelectedCategory] = useState<string>('recommended');
  const [publishedCampaigns, setPublishedCampaigns] = useState<PublishedCampaign[]>([]);
  const [launchSuccessId, setLaunchSuccessId] = useState<string | null>(null);
  const [trendingExampleAds, setTrendingExampleAds] = useState<AdItem[]>([]);
  const [cachedByCategory, setCachedByCategory] = useState<Record<string, TrendingAdType[]>>({});
  const [isLoadingCache, setIsLoadingCache] = useState(true);
  const isLoggedIn = !!localStorage.getItem('token');

  // Map carousel card genres to trending search keywords
  const genreToKeyword: Record<string, string> = {
    'food': 'Food ads',
    'Food': 'Food ads',
    'Fashion': 'Fashion ads',
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

  const mapTrendingToAdFormat = (items: TrendingAdType[], genre: string) => {
    return items.map((item, index) => ({
      id: item.id || `trending-${index}`,
      title: item.title || item.headline || 'Trending Ad',
      image: item.image_url || item.thumbnail || 'https://via.placeholder.com/400x300?text=No+Image',
      rating: item.score ? Math.min(item.score / 20, 5).toFixed(1) : '4.5',
      votes: formatVotes(item.views || item.likes || 0),
      tags: [item.platform, ...(item.type ? [item.type] : [])].filter(Boolean) as string[],
      genre,
      engagement: item.score ? `${Math.min(item.score, 100)}%` : 'N/A',
      description: item.description || 'Trending ad content',
      url: item.url,
      platform: item.platform,
      score: item.score,
    }));
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const cid = params.get('campaign');
    if (cid) setLaunchSuccessId(cid);
  }, [location.search]);

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

  useEffect(() => {
    if (!isLoggedIn) return;
    const token = localStorage.getItem('token') ?? '';
    fetch(`${AUTOCREATE_API_URL}/api/campaigns/my-campaigns`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then((data: { success?: boolean; campaigns?: PublishedCampaign[] }) => {
        if (data.success && data.campaigns) {
          setPublishedCampaigns(data.campaigns.filter(c => c.campaign_status === 'published'));
        }
      })
      .catch(() => { /* silently ignore */ });
  }, [isLoggedIn]);

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
    // Use cached data only: no dynamic fetch. Related/trending from same category cache.
    const validCategories = ['sports', 'food', 'fashion', 'trending', 'recommended'];
    const category = validCategories.includes((ad.genre || '').toLowerCase())
      ? (ad.genre || 'recommended').toLowerCase()
      : 'recommended';
    const cachedList = getCachedAdsForCategory(category);
    const others = cachedList.filter(item => String(item.id) !== String(ad.id));
    setRelatedAds(others.slice(0, 3));
    setTrendingExampleAds(others.slice(0, 4));
  };

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

      {/* ✅ My Published Campaigns (logged-in only) */}
      {isLoggedIn && (publishedCampaigns.length > 0 || launchSuccessId) && (
        <section className="px-6 py-10 max-w-7xl mx-auto">
          {launchSuccessId && (
            <div style={{
              background: 'rgba(0,229,212,0.10)',
              border: '1px solid rgba(0,229,212,0.4)',
              borderRadius: 12,
              padding: '14px 20px',
              color: '#00e5d4',
              fontSize: 15,
              fontWeight: 600,
              marginBottom: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <span>🚀 Campaign #{launchSuccessId} published successfully!</span>
              <button
                onClick={() => navigate('/my-campaigns')}
                style={{
                  background: '#00e5d4',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 18px',
                  color: '#000',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                View All My Campaigns →
              </button>
            </div>
          )}

          {publishedCampaigns.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-6">
                <h2
                  className="text-gray-100 text-[36px] font-semibold leading-[1] tracking-[-0.03em]"
                  style={{ fontFamily: "'Montserrat Alternates', sans-serif" }}
                >
                  My Published Campaigns
                </h2>
                <button
                  onClick={() => navigate('/my-campaigns')}
                  className="flex items-center gap-2 text-[16px] font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
                  style={{ fontFamily: "'Montserrat Alternates', sans-serif" }}
                >
                  See All
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {publishedCampaigns.slice(0, 3).map(campaign => (
                  <div
                    key={campaign.id}
                    onClick={() => navigate('/my-campaigns')}
                    style={{

                      borderRadius: 16,
                      padding: '20px 24px',
                      cursor: 'pointer',
                      transition: 'transform 0.15s',
                      background: `linear-gradient(#131313, #131313) padding-box,
                        linear-gradient(135deg, #00e5d4, #8b6fff, #ff4fcb) border-box`,
                      border: '1px solid transparent',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.02)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <span style={{ color: '#8b6fff', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                        Campaign #{campaign.id}
                      </span>
                      <span style={{
                        background: 'rgba(0,229,212,0.15)',
                        color: '#00e5d4',
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '3px 10px',
                        borderRadius: 20,
                        border: '1px solid rgba(0,229,212,0.3)',
                      }}>
                        Published
                      </span>
                    </div>
                    <p style={{ color: '#fff', fontSize: 16, fontWeight: 600, marginBottom: 8, textTransform: 'capitalize' }}>
                      {campaign.campaign_goal ?? 'Campaign'} Strategy
                    </p>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 8 }}>
                      {campaign.budget_amount && (
                        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
                          💰 ${campaign.budget_amount.toLocaleString()}
                          {campaign.budget_type === 'daily' ? '/day' : ' total'}
                        </span>
                      )}
                      {campaign.campaign_duration && (
                        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
                          📅 {campaign.campaign_duration} days
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      )}

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

    <AdCarousel 
      category={selectedCategory as 'sports' | 'food' | 'fashion' | 'trending' | 'top' | 'recommended'}
      onCardClick={handleCardClick}
      ads={getCachedAdsForCategory(selectedCategory)}
    />
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

    <AdCarousel 
      category="trending" 
      onCardClick={handleCardClick}
      ads={getCachedAdsForCategory('trending')}
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

      {/* Ad Detail Modal */}
      {selectedAd && (
        <AdDetailModal
          ad={selectedAd}
          onClose={handleCloseModal}
          relatedAds={relatedAds}
          trendingExampleAds={trendingExampleAds}
        />
      )}

      <Footer />
    </div>
  );
};

export default Home;