import React, { useState, useEffect } from 'react';
import Navigation from '../components/Navigation';
import AdCarousel from '../components/AdCarousel';
import AdDetailModal from '../components/AdDetailModal';
import Footer from '../components/Footer';
import AnimatedTileGrid from '../components/AnimatedTileGrid';

const Home: React.FC = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [selectedAd, setSelectedAd] = useState<any>(null);
  const [relatedAds, setRelatedAds] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('recommended');

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
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

  const handleCardClick = (ad: any) => {
    setSelectedAd(ad);
    
    // Get related ads based on genre
    const filtered = allAds
      .filter(item => item.genre === ad.genre && item.id !== ad.id)
      .sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating))
      .slice(0, 3);
    
    setRelatedAds(filtered);
    document.body.style.overflow = 'hidden';
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

     

  {/* Figma Neon Category Pills - Always Visible Gradient */}
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
</div>

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
      <button
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
      </button>

    </div>

    <AdCarousel 
      category={selectedCategory as any}
      onCardClick={handleCardClick}
    />
  </div>
</section>

     {/* Trending Now Section */}
<section className="px-6 py-12 max-w-7xl mx-auto">
  <div className="mb-8">
    <div className="flex items-center justify-between mb-6">

      <h2
        className="text-gray-200 text-[48px] font-semibold leading-[1] tracking-[-0.03em]"
        style={{ fontFamily: "'Montserrat Alternates', sans-serif" }}
      >
        Trending Now
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
      category="trending" 
      onCardClick={handleCardClick}
    />
  </div>
</section>


{/* Top Performers Section */}
<section className="px-6 py-12 max-w-7xl mx-auto">
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
</section>

      {/* Ad Detail Modal */}
      {selectedAd && (
        <AdDetailModal
          ad={selectedAd}
          onClose={handleCloseModal}
          relatedAds={relatedAds}
        />
      )}

      <Footer />
    </div>
  );
};

export default Home;