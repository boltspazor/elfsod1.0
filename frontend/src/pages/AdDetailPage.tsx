// src/pages/AdDetailPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, Clock, Globe, Award, Play, Users, TrendingUp, ArrowLeft, Share2, Bookmark, ChevronRight, Heart, Target, BarChart3, TrendingUp as TrendingUpIcon, Users as UsersIcon } from 'lucide-react';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';

const AdDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ad, setAd] = useState<any>(null);
  const [exampleAds, setExampleAds] = useState<any[]>([]);
  const [relatedAds, setRelatedAds] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  // Complete sample data including sports, food, fashion
  const allAds = [
    // Sports ads
    {
      id: 101,
      title: 'Nike: Just Do It Campaign',
      type: 'PROMOTED',
      image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=600&fit=crop',
      rating: '4.9',
      votes: '256K',
      tags: ['Athletic', 'Motivational'],
      genre: 'Sports',
      description: 'Iconic sports campaign inspiring athletes worldwide to push their limits and achieve greatness',
      duration: '3h 15m',
      platform: 'Global Sports Network',
      budget: '$1.5M - $3M',
      audience: 'Ages 18-35, Sports Enthusiasts',
      roi: '5.2x'
    },
    {
      id: 102,
      title: 'Adidas: Impossible is Nothing',
      type: null,
      image: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800&h=600&fit=crop',
      rating: '4.7',
      votes: '189K',
      tags: ['Training', 'Teamwear'],
      genre: 'Sports',
      description: 'Empowering athletes to overcome obstacles through innovative sportswear technology',
      duration: '2h 45m',
      platform: 'Sports & Fitness',
      budget: '$800K - $2M',
      audience: 'Professional Athletes',
      roi: '4.8x'
    },
    // Food ads
    {
      id: 201,
      title: "McDonald's: I'm Lovin' It",
      type: 'PROMOTED',
      image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&h=600&fit=crop',
      rating: '4.6',
      votes: '298K',
      tags: ['Fast Food', 'Family'],
      genre: 'Food',
      description: 'Global campaign celebrating family moments and delicious fast-food experiences',
      duration: '2h 30m',
      platform: 'National TV & Digital',
      budget: '$2M - $5M',
      audience: 'Families, Ages 5-50',
      roi: '3.9x'
    },
    {
      id: 202,
      title: 'Starbucks: Third Place',
      type: null,
      image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&h=600&fit=crop',
      rating: '4.7',
      votes: '234K',
      tags: ['Coffee', 'Ambience'],
      genre: 'Food',
      description: 'Creating the third place between work and home through premium coffee experiences',
      duration: '1h 45m',
      platform: 'Social Media & Lifestyle',
      budget: '$1.2M - $2.5M',
      audience: 'Urban Professionals',
      roi: '4.1x'
    },
    // Fashion ads
    {
      id: 301,
      title: 'Zara: Fast Fashion Leader',
      type: 'PROMOTED',
      image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&h=600&fit=crop',
      rating: '4.7',
      votes: '289K',
      tags: ['Trendy', 'Affordable'],
      genre: 'Fashion',
      description: 'Revolutionizing fast fashion with weekly collections and accessible style',
      duration: '2h 15m',
      platform: 'Fashion & Lifestyle',
      budget: '$1.8M - $3.2M',
      audience: 'Fashion-Conscious 18-30',
      roi: '4.3x'
    },
    {
      id: 302,
      title: 'Gucci: Luxury Redefined',
      type: null,
      image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&h=600&fit=crop',
      rating: '4.9',
      votes: '156K',
      tags: ['Luxury', 'Designer'],
      genre: 'Fashion',
      description: 'Pushing boundaries of luxury fashion with bold designs and artistic collaborations',
      duration: '3h 00m',
      platform: 'High-End Fashion',
      budget: '$3M - $6M',
      audience: 'Luxury Consumers',
      roi: '3.8x'
    },
    // Original categories
    {
      id: 1,
      title: 'Emotional / Storytelling Ads',
      type: 'PROMOTED',
      image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&h=600&fit=crop',
      rating: '4.8',
      votes: '234K',
      tags: ['Digital', 'Social'],
      genre: 'Drama',
      description: 'Compelling emotional narratives that connect brands with audiences on a deep level',
      duration: '2h 15m',
      platform: 'Global Campaign',
      budget: '$500K - $2M',
      audience: 'Ages 25-55',
      roi: '4.8x'
    },
    {
      id: 2,
      title: 'Humorous / Comedy Ads',
      type: null,
      image: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&h=600&fit=crop',
      rating: '4.6',
      votes: '189K',
      tags: ['Video', 'Display'],
      genre: 'Comedy',
      description: 'Light-hearted and funny campaigns that entertain while delivering brand messages',
      duration: '1h 45m',
      platform: 'Social Media',
      budget: '$300K - $1.5M',
      audience: 'Ages 18-40',
      roi: '3.9x'
    }
  ];

  useEffect(() => {
    const fetchAdData = () => {
      setIsLoading(true);
      
      // Simulate API call
      setTimeout(() => {
        const adId = parseInt(id || '0');
        const foundAd = allAds.find(ad => ad.id === adId);
        if (foundAd) {
          setAd(foundAd);
          
          // Get example ads for this genre
          const examples = getExampleAdsForGenre(foundAd.genre);
          setExampleAds(examples);
          
          // Get related ads (excluding current)
          const related = allAds.filter(item => 
            item.genre === foundAd.genre && item.id !== foundAd.id
          ).slice(0, 3);
          setRelatedAds(related);
          
          // Check if ad is saved from localStorage
          const savedAds = JSON.parse(localStorage.getItem('savedAds') || '[]');
          setIsSaved(savedAds.includes(foundAd.id));
        }
        setIsLoading(false);
      }, 500);
    };

    fetchAdData();
  }, [id]);

  const handleBookCampaign = () => {
    // Navigate to booking page with ad details
    navigate('/booking', { 
      state: { 
        adId: ad.id,
        adTitle: ad.title,
        adBudget: ad.budget,
        adGenre: ad.genre,
        adImage: ad.image,
        adDescription: ad.description
      } 
    });
  };

  const handleSaveAd = () => {
    const savedAds = JSON.parse(localStorage.getItem('savedAds') || '[]');
    
    if (isSaved) {
      // Remove from saved
      const updatedSavedAds = savedAds.filter((id: number) => id !== ad.id);
      localStorage.setItem('savedAds', JSON.stringify(updatedSavedAds));
      setIsSaved(false);
      
      // Show toast notification
      showNotification('Campaign removed from saved items');
    } else {
      // Add to saved
      savedAds.push(ad.id);
      localStorage.setItem('savedAds', JSON.stringify(savedAds));
      setIsSaved(true);
      
      // Show toast notification
      showNotification('Campaign saved successfully');
    }
  };

  const handleShareAd = async () => {
    if (navigator.share && ad) {
      try {
        setIsSharing(true);
        await navigator.share({
          title: ad.title,
          text: `Check out this amazing ${ad.genre} campaign: ${ad.title}`,
          url: window.location.href,
        });
        showNotification('Campaign shared successfully!');
      } catch (error) {
        // User cancelled share or share failed
        if (error instanceof Error && error.name !== 'AbortError') {
          copyToClipboard();
        }
      } finally {
        setIsSharing(false);
      }
    } else {
      // Fallback: Copy to clipboard
      copyToClipboard();
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href)
      .then(() => {
        showNotification('Link copied to clipboard!');
      })
      .catch(() => {
        showNotification('Failed to copy link. Please try again.');
      });
  };

  const showNotification = (message: string) => {
    // Create toast notification
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-slate-800 text-white px-6 py-3 rounded-lg shadow-lg z-50 transform translate-x-0 animate-slide-in';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('animate-slide-out');
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, 3000);
  };

  const getExampleAdsForGenre = (genre: string) => {
    const exampleAdsMap: Record<string, any[]> = {
      'Sports': [
        {
          id: 103,
          title: 'Under Armour: Rule Yourself',
          image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop',
          rating: '4.8',
          votes: '234K',
          engagement: '94%',
          description: 'High-performance training gear for serious athletes'
        },
        {
          id: 104,
          title: 'Puma: Forever Faster',
          image: 'https://images.unsplash.com/photo-1536922246289-88c42f957773?w=400&h=300&fit=crop',
          rating: '4.6',
          votes: '167K',
          engagement: '91%',
          description: 'Speed and performance-focused athletic campaigns'
        },
        {
          id: 105,
          title: 'Gatorade: Win From Within',
          image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop',
          rating: '4.5',
          votes: '145K',
          engagement: '89%',
          description: 'Hydration and sports nutrition for peak performance'
        }
      ],
      'Food': [
        {
          id: 203,
          title: 'KFC: Finger Lickin Good',
          image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop',
          rating: '4.5',
          votes: '187K',
          engagement: '92%',
          description: 'Iconic fried chicken campaigns loved worldwide'
        },
        {
          id: 204,
          title: 'Coca-Cola: Share a Coke',
          image: 'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=400&h=300&fit=crop',
          rating: '4.9',
          votes: '345K',
          engagement: '96%',
          description: 'Personalized beverage marketing creating connections'
        },
        {
          id: 205,
          title: 'Domino: Pizza Delivery',
          image: 'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=400&h=300&fit=crop',
          rating: '4.4',
          votes: '178K',
          engagement: '88%',
          description: 'Fast and reliable pizza delivery campaigns'
        }
      ],
      'Fashion': [
        {
          id: 303,
          title: 'H&M: Conscious Fashion',
          image: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=400&h=300&fit=crop',
          rating: '4.6',
          votes: '234K',
          engagement: '93%',
          description: 'Sustainable fashion for the conscious consumer'
        },
        {
          id: 304,
          title: 'Louis Vuitton: Travel in Style',
          image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400&h=300&fit=crop',
          rating: '4.8',
          votes: '189K',
          engagement: '95%',
          description: 'Luxury travel and fashion combined seamlessly'
        },
        {
          id: 305,
          title: 'Uniqlo: LifeWear',
          image: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=400&h=300&fit=crop',
          rating: '4.5',
          votes: '167K',
          engagement: '90%',
          description: 'Minimalist clothing for everyday excellence'
        }
      ],
      'Drama': [
        {
          id: 101,
          title: 'Nike: Never Stop Dreaming',
          image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=300&fit=crop',
          rating: '4.9',
          votes: '156K',
          engagement: '98%',
          description: 'Emotional storytelling through sports achievements'
        },
        {
          id: 102,
          title: 'Apple: The Underdogs',
          image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&h=300&fit=crop',
          rating: '4.8',
          votes: '142K',
          engagement: '95%',
          description: 'Heartwarming stories of innovation'
        }
      ],
      'Comedy': [
        {
          id: 201,
          title: 'Old Spice: The Man Your Man',
          image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop',
          rating: '4.8',
          votes: '189K',
          engagement: '96%',
          description: 'Hilarious takes on masculinity'
        },
        {
          id: 202,
          title: 'Doritos: Super Bowl Laughs',
          image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop',
          rating: '4.7',
          votes: '167K',
          engagement: '94%',
          description: 'Funny snack time scenarios'
        }
      ]
    };

    return exampleAdsMap[genre] || exampleAdsMap['Sports'];
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <Navigation />
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-600">Loading campaign details...</p>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!ad) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <Navigation />
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="text-center py-20">
            <h1 className="text-4xl font-bold text-slate-800 mb-4">Campaign Not Found</h1>
            <p className="text-slate-600 mb-8">The campaign you're looking for doesn't exist.</p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-teal-600 text-white rounded-lg font-semibold hover:from-cyan-600 hover:to-teal-700 transition-all"
            >
              Back to Home
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Get appropriate colors and icons based on genre
  const getGenreTheme = (genre: string) => {
    const themes: Record<string, { gradient: string, icon: React.ReactNode, bgGradient: string }> = {
      'Sports': {
        gradient: 'from-blue-500 to-cyan-600',
        icon: '🏈',
        bgGradient: 'from-blue-900 to-cyan-900'
      },
      'Food': {
        gradient: 'from-orange-500 to-red-600',
        icon: '🍔',
        bgGradient: 'from-orange-900 to-red-900'
      },
      'Fashion': {
        gradient: 'from-pink-500 to-rose-600',
        icon: '👗',
        bgGradient: 'from-pink-900 to-rose-900'
      },
      'Drama': {
        gradient: 'from-purple-500 to-indigo-600',
        icon: '🎭',
        bgGradient: 'from-purple-900 to-indigo-900'
      },
      'Comedy': {
        gradient: 'from-yellow-500 to-amber-600',
        icon: '😂',
        bgGradient: 'from-yellow-900 to-amber-900'
      }
    };
    return themes[genre] || themes['Sports'];
  };

  const theme = getGenreTheme(ad.genre);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white overflow-visible">
      <style>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes slide-out {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
        .animate-slide-out {
          animation: slide-out 0.3s ease-in forwards;
        }
      `}</style>
      
      <Navigation />
      
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-slate-900 to-slate-800">
        <div className="absolute inset-0">
          <img
            src={ad.image || ad.thumbnail || `https://via.placeholder.com/800x400?text=${encodeURIComponent(ad.genre || 'Ad')}`}
            alt={ad.title}
            className="w-full h-full object-cover opacity-20"
            onError={(e) => { const el = e.target as HTMLImageElement; el.src = ad.thumbnail || `https://via.placeholder.com/800x400?text=${encodeURIComponent(ad.genre || 'Ad')}`; }}
          />
        </div>
        
        <div className="relative max-w-7xl mx-auto px-6 py-12">
          {/* Back Button */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-white mb-8 hover:opacity-80 transition-opacity"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Campaigns
          </button>
          
          <div className="grid md:grid-cols-3 gap-8 items-start">
            {/* Left Column - Main Info */}
            <div className="md:col-span-2">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl">{theme.icon}</span>
                    <h1 className="text-5xl font-bold text-white">{ad.title}</h1>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-white/80">
                    <div className="flex items-center gap-1">
                      <Star className="w-5 h-5 text-yellow-400 fill-current" />
                      <span className="font-bold">{ad.rating}/5</span>
                      <span className="text-white/60">({ad.votes} votes)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-5 h-5" />
                      <span>{ad.duration}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Globe className="w-5 h-5" />
                      <span>{ad.platform}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-5 h-5" />
                      <span className="font-medium text-white bg-white/20 px-2 py-1 rounded-full">
                        {ad.genre}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Promoted Badge */}
                {ad.type && (
                  <div className={`rounded-full bg-gradient-to-r ${theme.gradient} px-4 py-2`}>
                    <span className="text-sm font-semibold text-white">{ad.type}</span>
                  </div>
                )}
              </div>
              
              {/* Action Buttons */}
              <div className="flex flex-wrap gap-4 mb-8">
                <button 
                  onClick={handleBookCampaign}
                  className={`flex items-center gap-3 px-8 py-4 rounded-xl bg-gradient-to-r ${theme.gradient} text-white font-semibold hover:opacity-90 transition-all shadow-lg hover:shadow-xl`}
                >
                  <Play className="w-5 h-5" />
                  Book This Campaign
                </button>
                <button 
                  onClick={handleShareAd}
                  disabled={isSharing}
                  className="flex items-center gap-3 px-6 py-4 rounded-xl bg-white/20 backdrop-blur-sm text-white font-semibold hover:bg-white/30 transition-all border border-white/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Share2 className="w-5 h-5" />
                  {isSharing ? 'Sharing...' : 'Share'}
                </button>
                <button 
                  onClick={handleSaveAd}
                  className={`flex items-center gap-3 px-6 py-4 rounded-xl font-semibold transition-all border ${
                    isSaved 
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200' 
                      : 'bg-white/20 backdrop-blur-sm border-white/30 text-white hover:bg-white/30'
                  }`}
                >
                  <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-emerald-300 text-emerald-300' : ''}`} />
                  {isSaved ? 'Saved' : 'Save'}
                </button>
              </div>
              
              {/* Description */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-white/20">
                <h3 className="text-2xl font-bold text-white mb-4">Campaign Description</h3>
                <p className="text-white/90 leading-relaxed">{ad.description}</p>
                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <Target className="w-5 h-5 text-white/70" />
                    <div>
                      <p className="text-white/70 text-sm">Target Audience</p>
                      <p className="text-white font-medium">{ad.audience}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <TrendingUpIcon className="w-5 h-5 text-white/70" />
                    <div>
                      <p className="text-white/70 text-sm">Expected ROI</p>
                      <p className="text-emerald-300 font-bold">{ad.roi}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right Column - Quick Info */}
            <div className="space-y-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <h3 className="text-xl font-bold text-white mb-4">Campaign Details</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-white/70 text-sm mb-1">Budget Range</p>
                    <p className="text-white font-semibold text-lg">{ad.budget}</p>
                  </div>
                  <div>
                    <p className="text-white/70 text-sm mb-1">Target Duration</p>
                    <p className="text-white font-semibold text-lg">3-6 months</p>
                  </div>
                  <div>
                    <p className="text-white/70 text-sm mb-1">Best For</p>
                    <p className="text-white font-semibold text-lg">{getBestForGenre(ad.genre)}</p>
                  </div>
                  <div>
                    <p className="text-white/70 text-sm mb-1">Success Rate</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
                        <div 
                          className={`h-full bg-gradient-to-r ${theme.gradient}`}
                          style={{ width: getSuccessRate(ad.genre) }}
                        ></div>
                      </div>
                      <span className="text-white font-semibold">{getSuccessRate(ad.genre)}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className={`bg-gradient-to-br ${theme.gradient.replace('to-', 'to-')}/20 backdrop-blur-sm rounded-2xl p-6 border ${theme.gradient.replace('from-', 'border-').split(' ')[0]}/30`}>
                <div className="flex items-center gap-3 mb-4">
                  <Award className="w-6 h-6 text-white" />
                  <h3 className="text-xl font-bold text-white">Industry Awards</h3>
                </div>
                <ul className="space-y-3">
                  {getAwardsForGenre(ad.genre).map((award: string, index: number) => (
                    <li key={index} className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${theme.gradient}`}></div>
                      <span className="text-white/90">{award}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="bg-gradient-to-br from-emerald-500/20 to-teal-500/20 backdrop-blur-sm rounded-2xl p-6 border border-emerald-500/30">
                <div className="flex items-center gap-3 mb-4">
                  <BarChart3 className="w-6 h-6 text-emerald-300" />
                  <h3 className="text-xl font-bold text-white">Quick Stats</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-white/70">Engagement Rate</span>
                    <span className="text-emerald-300 font-bold">{getEngagementRate(ad.genre)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/70">Conversion Rate</span>
                    <span className="text-emerald-300 font-bold">{getConversionRate(ad.genre)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/70">Client Satisfaction</span>
                    <span className="text-emerald-300 font-bold">{getClientSatisfaction(ad.genre)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Example Ads Section */}
        <div className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <TrendingUp className={`w-8 h-8 ${getTextColor(ad.genre)}`} />
              <h2 className="text-3xl font-bold text-slate-800">Top {ad.genre} Campaigns</h2>
            </div>
            <button className={`${getTextColor(ad.genre)} font-semibold hover:opacity-80 flex items-center gap-2`}>
              View All
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {exampleAds.map((exampleAd) => (
              <div 
                key={exampleAd.id} 
                className="group bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 cursor-pointer border border-slate-200"
                onClick={() => navigate(`/ads/${exampleAd.id}`)}
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={exampleAd.image}
                    alt={exampleAd.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-4 right-4">
                    <div className="px-3 py-1 rounded-full bg-emerald-500 text-white text-sm font-bold">
                      {exampleAd.engagement} engagement
                    </div>
                  </div>
                  <div className="absolute bottom-4 left-4 flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-400 fill-current" />
                    <span className="font-bold text-white">{exampleAd.rating}</span>
                    <span className="text-white/80">({exampleAd.votes})</span>
                  </div>
                </div>
                
                <div className="p-6">
                  <h3 className="text-lg font-bold text-slate-800 mb-2 line-clamp-1">{exampleAd.title}</h3>
                  <p className="text-slate-600 mb-4 text-sm line-clamp-2">{exampleAd.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                      {ad.genre}
                    </span>
                    <span className="text-slate-500 text-sm flex items-center gap-1">
                      Details <ChevronRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-slate-800 mb-8">{ad.genre} Campaign Performance</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 border border-blue-200">
              <div className="flex items-center gap-3 mb-4">
                <UsersIcon className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-blue-800 text-sm">Average Reach</p>
                  <p className="text-2xl font-bold text-blue-900">{getAverageReach(ad.genre)}</p>
                </div>
              </div>
              <p className="text-blue-700 text-sm">Per campaign cycle</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-6 border border-emerald-200">
              <div className="flex items-center gap-3 mb-4">
                <Heart className="w-8 h-8 text-emerald-600" />
                <div>
                  <p className="text-emerald-800 text-sm">Engagement Rate</p>
                  <p className="text-2xl font-bold text-emerald-900">{getEngagementRate(ad.genre)}</p>
                </div>
              </div>
              <p className="text-emerald-700 text-sm">Above industry average</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-2xl p-6 border border-purple-200">
              <div className="flex items-center gap-3 mb-4">
                <Target className="w-8 h-8 text-purple-600" />
                <div>
                  <p className="text-purple-800 text-sm">Conversion Rate</p>
                  <p className="text-2xl font-bold text-purple-900">{getConversionRate(ad.genre)}</p>
                </div>
              </div>
              <p className="text-purple-700 text-sm">High intent audience</p>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-200">
              <div className="flex items-center gap-3 mb-4">
                <TrendingUpIcon className="w-8 h-8 text-amber-600" />
                <div>
                  <p className="text-amber-800 text-sm">ROI Multiplier</p>
                  <p className="text-2xl font-bold text-amber-900">{getROIMultiplier(ad.genre)}</p>
                </div>
              </div>
              <p className="text-amber-700 text-sm">Average return</p>
            </div>
          </div>
        </div>

        {/* Related Campaigns */}
        <div className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-slate-800">Similar {ad.genre} Campaigns</h2>
            <button onClick={() => navigate('/')} className="text-cyan-600 font-semibold hover:text-cyan-700 flex items-center gap-2">
              Browse More
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {relatedAds.map((relatedAd) => (
              <div 
                key={relatedAd.id}
                className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group border border-slate-200"
                onClick={() => navigate(`/ads/${relatedAd.id}`)}
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={relatedAd.image}
                    alt={relatedAd.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 right-3">
                    <div className="px-2 py-1 rounded-full bg-black/80 backdrop-blur-sm text-white text-xs font-bold">
                      {relatedAd.rating}/5
                    </div>
                  </div>
                  <div className="absolute bottom-3 left-3">
                    <span className="px-2 py-1 rounded-full bg-white/90 backdrop-blur-sm text-slate-700 text-xs font-medium">
                      {relatedAd.genre}
                    </span>
                  </div>
                </div>
                
                <div className="p-5">
                  <h3 className="font-bold text-slate-800 mb-2 line-clamp-1">{relatedAd.title}</h3>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-cyan-600 text-sm font-medium">{relatedAd.genre}</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-500 text-sm">{relatedAd.votes} votes</span>
                  </div>
                  <p className="text-slate-600 text-sm mb-4 line-clamp-2">{relatedAd.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {relatedAd.tags.slice(0, 2).map((tag: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl p-8 border border-slate-200">
          <h2 className="text-3xl font-bold text-slate-800 mb-8">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-slate-800 mb-3">What makes {ad.genre} campaigns effective?</h3>
              <p className="text-slate-600">
                {getGenreDescription(ad.genre)} This approach has been proven to increase brand recall by {getBrandRecall(ad.genre)} 
                and engagement rates by {getEngagementImprovement(ad.genre)} compared to traditional advertising methods.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-slate-800 mb-3">What is the typical timeline for {ad.genre} campaigns?</h3>
              <p className="text-slate-600">
                Most {ad.genre} campaigns run for 3-6 months, with planning taking 2-4 weeks, production taking 
                4-6 weeks, and the campaign run lasting 8-12 weeks. We recommend a minimum 3-month commitment 
                for optimal results.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-slate-800 mb-3">What kind of results can I expect from {ad.genre} campaigns?</h3>
              <p className="text-slate-600">
                Based on historical data, {ad.genre} campaigns typically achieve an average ROI of {getAverageROI(ad.genre)}, 
                with engagement rates between {getEngagementRange(ad.genre)} and conversion rates of {getConversionRange(ad.genre)}. 
                Exact results depend on your specific industry and target audience.
              </p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

// Helper functions (keep these the same as before)
const getGenreDescription = (genre: string): string => {
  const descriptions: Record<string, string> = {
    'Sports': 'Sports campaigns are highly effective because they tap into human emotions of competition, achievement, and community. They connect brands with active lifestyles and aspirational goals.',
    'Food': 'Food campaigns excel by appealing to senses and emotions. They create cravings, nostalgia, and social connections that drive immediate action and long-term brand loyalty.',
    'Fashion': 'Fashion campaigns succeed by showcasing style, identity, and self-expression. They connect brands with cultural trends and personal aspirations, creating desire and social validation.',
    'Drama': 'Drama campaigns create deep emotional connections with audiences through compelling storytelling that resonates on a personal level.',
    'Comedy': 'Comedy campaigns use humor to make brands more relatable and memorable while creating shareable content.'
  };
  return descriptions[genre] || descriptions['Sports'];
};

const getBestForGenre = (genre: string): string => {
  const bestFor: Record<string, string> = {
    'Sports': 'Sports brands, athletic wear, fitness apps',
    'Food': 'Restaurants, beverages, food delivery',
    'Fashion': 'Apparel, accessories, beauty brands',
    'Drama': 'Brand building & emotional connection',
    'Comedy': 'Viral potential & audience engagement'
  };
  return bestFor[genre] || 'Various marketing objectives';
};

const getSuccessRate = (genre: string): string => {
  const rates: Record<string, string> = {
    'Sports': '92%',
    'Food': '88%',
    'Fashion': '85%',
    'Drama': '90%',
    'Comedy': '87%'
  };
  return rates[genre] || '85%';
};

const getAwardsForGenre = (genre: string): string[] => {
  const awards: Record<string, string[]> = {
    'Sports': ['Sports Emmy Awards', 'Cannes Lions Sports', 'ESPY Advertising Awards'],
    'Food': ['Food & Beverage Awards', 'Cannes Lions Food', 'Marketing Excellence Awards'],
    'Fashion': ['Fashion Marketing Awards', 'Luxury Advertising Awards', 'Design Excellence Awards'],
    'Drama': ['Cannes Lions', 'Webby Awards', 'Clio Awards'],
    'Comedy': ['Comedy Advertising Awards', 'Viral Marketing Awards', 'Social Media Excellence']
  };
  return awards[genre] || awards['Sports'];
};

const getTextColor = (genre: string): string => {
  const colors: Record<string, string> = {
    'Sports': 'text-blue-600',
    'Food': 'text-orange-600',
    'Fashion': 'text-pink-600',
    'Drama': 'text-purple-600',
    'Comedy': 'text-yellow-600'
  };
  return colors[genre] || 'text-blue-600';
};

const getEngagementRate = (genre: string): string => {
  const rates: Record<string, string> = {
    'Sports': '4.2%',
    'Food': '3.8%',
    'Fashion': '4.5%',
    'Drama': '4.8%',
    'Comedy': '4.1%'
  };
  return rates[genre] || '4.0%';
};

const getConversionRate = (genre: string): string => {
  const rates: Record<string, string> = {
    'Sports': '11.5%',
    'Food': '14.2%',
    'Fashion': '9.8%',
    'Drama': '12.6%',
    'Comedy': '10.3%'
  };
  return rates[genre] || '11.0%';
};

const getClientSatisfaction = (genre: string): string => {
  const rates: Record<string, string> = {
    'Sports': '96%',
    'Food': '94%',
    'Fashion': '92%',
    'Drama': '95%',
    'Comedy': '93%'
  };
  return rates[genre] || '94%';
};

const getAverageReach = (genre: string): string => {
  const reach: Record<string, string> = {
    'Sports': '18.5M',
    'Food': '24.2M',
    'Fashion': '15.8M',
    'Drama': '20.1M',
    'Comedy': '22.4M'
  };
  return reach[genre] || '20.0M';
};

const getROIMultiplier = (genre: string): string => {
  const roi: Record<string, string> = {
    'Sports': '5.2x',
    'Food': '4.1x',
    'Fashion': '4.3x',
    'Drama': '4.8x',
    'Comedy': '3.9x'
  };
  return roi[genre] || '4.5x';
};

const getBrandRecall = (genre: string): string => {
  const recall: Record<string, string> = {
    'Sports': '47%',
    'Food': '52%',
    'Fashion': '45%',
    'Drama': '56%',
    'Comedy': '48%'
  };
  return recall[genre] || '50%';
};

const getEngagementImprovement = (genre: string): string => {
  const improvement: Record<string, string> = {
    'Sports': '68%',
    'Food': '72%',
    'Fashion': '65%',
    'Drama': '75%',
    'Comedy': '70%'
  };
  return improvement[genre] || '70%';
};

const getAverageROI = (genre: string): string => {
  const roi: Record<string, string> = {
    'Sports': '5.2x',
    'Food': '4.1x',
    'Fashion': '4.3x',
    'Drama': '4.8x',
    'Comedy': '3.9x'
  };
  return roi[genre] || '4.5x';
};

const getEngagementRange = (genre: string): string => {
  const range: Record<string, string> = {
    'Sports': '3.8-5.2%',
    'Food': '3.2-4.5%',
    'Fashion': '4.0-5.5%',
    'Drama': '4.5-6.0%',
    'Comedy': '3.5-4.8%'
  };
  return range[genre] || '3.5-5.0%';
};

const getConversionRange = (genre: string): string => {
  const range: Record<string, string> = {
    'Sports': '8-15%',
    'Food': '10-18%',
    'Fashion': '7-12%',
    'Drama': '9-16%',
    'Comedy': '8-13%'
  };
  return range[genre] || '8-15%';
};

export default AdDetailPage;