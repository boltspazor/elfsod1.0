import React from 'react';
import { X, Star, Clock, Globe, Award, Play, Users, TrendingUp, Loader2 } from 'lucide-react';

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
}

interface AdDetailModalProps {
  ad: AdItem;
  onClose: () => void;
  relatedAds: AdItem[];
  trendingExampleAds?: AdItem[];
  isLoadingTrending?: boolean;
}

const AdDetailModal: React.FC<AdDetailModalProps> = ({ ad, onClose, relatedAds, trendingExampleAds, isLoadingTrending }) => {
  // Example ads for each genre (these would be fetched from your backend)
  const getExampleAdsForGenre = (genre: string) => {
    const exampleAdsMap: Record<string, any[]> = {
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
        },
        {
          id: 103,
          title: 'Coca-Cola: Family Bonds',
          image: 'https://images.unsplash.com/photo-1562907550-096d3bf9b25c?w=400&h=300&fit=crop',
          rating: '4.7',
          votes: '128K',
          engagement: '92%',
          description: 'Connecting generations through moments'
        },
        {
          id: 104,
          title: 'Toyota: Journey Home',
          image: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400&h=300&fit=crop',
          rating: '4.6',
          votes: '118K',
          engagement: '90%',
          description: 'Emotional road trip stories'
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
        },
        {
          id: 203,
          title: 'Skittles: Taste the Rainbow',
          image: 'https://images.unsplash.com/photo-1522163182402-834f871fd851?w=400&h=300&fit=crop',
          rating: '4.9',
          votes: '201K',
          engagement: '97%',
          description: 'Absurd and colorful humor'
        },
        {
          id: 204,
          title: 'Geico: 15 Minutes Save You',
          image: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=400&h=300&fit=crop',
          rating: '4.6',
          votes: '145K',
          engagement: '91%',
          description: 'Insurance made hilarious'
        }
      ],
      'Lifestyle': [
        {
          id: 301,
          title: 'Lululemon: Everyday Athlete',
          image: 'https://images.unsplash.com/photo-1594736797933-d010d5c6d5e4?w=400&h=300&fit=crop',
          rating: '4.8',
          votes: '178K',
          engagement: '93%',
          description: 'Activewear for daily life'
        },
        {
          id: 302,
          title: 'Airbnb: Live Anywhere',
          image: 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=400&h=300&fit=crop',
          rating: '4.9',
          votes: '195K',
          engagement: '96%',
          description: 'Authentic travel experiences'
        },
        {
          id: 303,
          title: 'Whole Foods: Healthy Living',
          image: 'https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=400&h=300&fit=crop',
          rating: '4.7',
          votes: '162K',
          engagement: '92%',
          description: 'Organic lifestyle promotion'
        },
        {
          id: 304,
          title: 'Patagonia: Outdoor Culture',
          image: 'https://images.unsplash.com/photo-1501555088652-021faa106b9b?w=400&h=300&fit=crop',
          rating: '4.8',
          votes: '187K',
          engagement: '94%',
          description: 'Sustainable adventure lifestyle'
        }
      ],
      'UGC': [
        {
          id: 401,
          title: 'GoPro: User Adventures',
          image: 'https://images.unsplash.com/photo-1520962880247-cfaf541c8724?w=400&h=300&fit=crop',
          rating: '4.9',
          votes: '234K',
          engagement: '98%',
          description: 'Real customer action footage'
        },
        {
          id: 402,
          title: 'Amazon: Customer Stories',
          image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=300&fit=crop',
          rating: '4.8',
          votes: '189K',
          engagement: '95%',
          description: 'Real people, real reviews'
        },
        {
          id: 403,
          title: 'TripAdvisor: Traveler Tales',
          image: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=300&fit=crop',
          rating: '4.7',
          votes: '176K',
          engagement: '93%',
          description: 'Authentic travel experiences shared'
        },
        {
          id: 404,
          title: 'Etsy: Maker Spotlights',
          image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop',
          rating: '4.8',
          votes: '165K',
          engagement: '94%',
          description: 'Artisan stories and creations'
        }
      ],
      'Luxury': [
        {
          id: 501,
          title: 'Rolex: Timeless Legacy',
          image: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=400&h=300&fit=crop',
          rating: '4.9',
          votes: '89K',
          engagement: '88%',
          description: 'Heritage and craftsmanship'
        },
        {
          id: 502,
          title: 'Louis Vuitton: Journey',
          image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400&h=300&fit=crop',
          rating: '4.8',
          votes: '78K',
          engagement: '86%',
          description: 'Travel in luxury and style'
        },
        {
          id: 503,
          title: 'Mercedes-Benz: S-Class',
          image: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=400&h=300&fit=crop',
          rating: '4.7',
          votes: '95K',
          engagement: '87%',
          description: 'The epitome of automotive luxury'
        },
        {
          id: 504,
          title: 'Chanel: Haute Couture',
          image: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=400&h=300&fit=crop',
          rating: '4.9',
          votes: '82K',
          engagement: '89%',
          description: 'Fashion as an art form'
        }
      ],
      'Documentary': [
        {
          id: 601,
          title: 'National Geographic: Our Planet',
          image: 'https://images.unsplash.com/photo-1610878180933-123728745d22?w=400&h=300&fit=crop',
          rating: '4.9',
          votes: '245K',
          engagement: '97%',
          description: 'Environmental awareness series'
        },
        {
          id: 602,
          title: 'Google: Year in Search',
          image: 'https://images.unsplash.com/photo-1542744095-fcf48d80b0fd?w=400&h=300&fit=crop',
          rating: '4.8',
          votes: '198K',
          engagement: '96%',
          description: 'Annual search trends documentary'
        },
        {
          id: 603,
          title: 'Nike: Breaking2',
          image: 'https://images.unsplash.com/photo-1552674605-db6ffd8facb5?w=400&h=300&fit=crop',
          rating: '4.7',
          votes: '187K',
          engagement: '94%',
          description: 'Elite marathon attempt'
        },
        {
          id: 604,
          title: 'Patagonia: DamNation',
          image: 'https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=400&h=300&fit=crop',
          rating: '4.8',
          votes: '156K',
          engagement: '93%',
          description: 'Environmental documentary series'
        }
      ]
    };

    return exampleAdsMap[genre] || exampleAdsMap['Drama'];
  };

  const genre = ad.genre || 'Drama';

  const exampleAds = (trendingExampleAds && trendingExampleAds.length > 0)
    ? trendingExampleAds
    : getExampleAdsForGenre(genre);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative w-full max-w-6xl bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center hover:bg-black/50 transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          {/* Hero Section */}
          <div className="relative h-96">
            <img
              src={ad.image}
              alt={ad.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
            
            {/* Play Trailer Button */}
            <button className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors group">
              <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center group-hover:scale-110 transition-transform">
                <Play className="w-8 h-8 text-black ml-1" />
              </div>
            </button>
          </div>

          {/* Content */}
          <div className="px-8 py-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">
                  {ad.title}
                </h1>
                <div className="flex items-center gap-4 text-gray-600">
                  <div className="flex items-center gap-1">
                    <Star className="w-5 h-5 text-yellow-500 fill-current" />
                    <span className="font-bold">{ad.rating}</span>
                    <span className="text-gray-500">({ad.votes} votes)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-5 h-5" />
                    <span>2h 15m</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Globe className="w-5 h-5" />
                    <span>Global Campaign</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-5 h-5" />
                    <span className="font-medium text-purple-600">{genre}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors">
                  Book Campaign
                </button>
                <button className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors">
                  Watch Trailer
                </button>
              </div>
            </div>

            {/* Offers Section */}
            <div className="mb-8 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl">
              <h3 className="text-lg font-semibold mb-3 text-gray-900">Top offers for you</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 border-2 border-gray-400 rounded flex items-center justify-center">
                    <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                  </div>
                  <span className="text-gray-700">YES Private Debit Card Offer</span>
                  <button className="ml-auto text-purple-600 font-medium hover:text-purple-700">
                    Tap to view details →
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 border-2 border-green-500 rounded flex items-center justify-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  </div>
                  <span className="text-gray-700">Buy 1 get 1 movie ticket free + 50% off on non...</span>
                  <button className="ml-auto text-purple-600 font-medium hover:text-purple-700">
                    Tap to view details →
                  </button>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-3 gap-8">
              {/* Left Column - Example Ads (Replacing Cast) */}
              <div className="col-span-2">
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-6 h-6 text-purple-600" />
                    <h2 className="text-2xl font-bold text-gray-900">
                      Top {genre} Campaign Examples
                    </h2>
                  </div>
                  {isLoadingTrending && (
                    <div className="flex items-center gap-2 mb-4 text-gray-500">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Fetching trending {genre} ads...</span>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    {exampleAds.map((exampleAd) => (
                      <div 
                        key={exampleAd.id} 
                        className="group cursor-pointer overflow-hidden rounded-xl bg-white shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                        onClick={() => {
                          if (exampleAd.url) {
                            window.open(exampleAd.url, '_blank', 'noopener,noreferrer');
                          } else {
                            window.open(`/ads/${exampleAd.id}`, '_blank');
                          }
                        }}
                      >
                        {/* Ad Image */}
                        <div className="relative h-48 overflow-hidden">
                          <img
                            src={exampleAd.image}
                            alt={exampleAd.title}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          {/* Rating Badge */}
                          <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-black/80 px-3 py-1.5 backdrop-blur-sm">
                            <Star className="w-4 h-4 text-yellow-400 fill-current" />
                            <span className="text-sm font-bold text-white">{exampleAd.rating}</span>
                          </div>
                          {/* Engagement Badge */}
                          <div className="absolute bottom-3 left-3">
                            <div className="rounded-full bg-green-500/90 px-3 py-1 backdrop-blur-sm">
                              <span className="text-xs font-semibold text-white">
                                {exampleAd.engagement} engagement
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Ad Info */}
                        <div className="p-4">
                          <h3 className="mb-2 font-bold text-gray-900 line-clamp-1">
                            {exampleAd.title}
                          </h3>
                          <p className="mb-3 text-sm text-gray-600 line-clamp-2">
                            {exampleAd.description}
                          </p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 text-sm text-gray-500">
                              <Users className="w-4 h-4" />
                              <span>{exampleAd.votes} votes</span>
                            </div>
                            <button className="text-sm font-medium text-purple-600 hover:text-purple-700">
                              View Campaign →
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Campaign Statistics */}
                <div className="mb-8">
                  <h3 className="text-xl font-bold mb-4 text-gray-900">Campaign Performance</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-blue-50 rounded-xl">
                      <div className="text-2xl font-bold text-blue-600 mb-1">24.5M</div>
                      <div className="text-sm text-gray-600">Total Impressions</div>
                    </div>
                    <div className="p-4 bg-green-50 rounded-xl">
                      <div className="text-2xl font-bold text-green-600 mb-1">3.2M</div>
                      <div className="text-sm text-gray-600">Engagements</div>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-xl">
                      <div className="text-2xl font-bold text-purple-600 mb-1">12.8%</div>
                      <div className="text-sm text-gray-600">Conversion Rate</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Related Ads & Info */}
              <div>
                <h2 className="text-2xl font-bold mb-4 text-gray-900">Similar Campaigns</h2>
                {isLoadingTrending && relatedAds.length === 0 && (
                  <div className="flex items-center gap-2 mb-4 text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Loading...</span>
                  </div>
                )}
                <div className="space-y-4 mb-8">
                  {relatedAds.map((relatedAd) => (
                    <div 
                      key={relatedAd.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                      onClick={() => {
                        if (relatedAd.url) {
                          window.open(relatedAd.url, '_blank', 'noopener,noreferrer');
                        }
                      }}
                    >
                      <img
                        src={relatedAd.image}
                        alt={relatedAd.title}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                      <div>
                        <div className="font-semibold text-gray-900 line-clamp-1">
                          {relatedAd.title}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Star className="w-4 h-4 text-yellow-500 fill-current" />
                          {relatedAd.rating}
                          <span className="text-gray-400">({relatedAd.votes})</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {relatedAd.tags.slice(0, 2).join(', ')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Campaign Details */}
                <div className="mb-8 p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <Award className="w-6 h-6 text-amber-600" />
                    <h3 className="font-bold text-gray-900">Campaign Details</h3>
                  </div>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                      <span className="font-medium">Duration:</span> 3 months
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                      <span className="font-medium">Platforms:</span> Digital, Social, TV
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                      <span className="font-medium">Target Audience:</span> 18-45 years
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                      <span className="font-medium">Budget Range:</span> $500K - $2M
                    </li>
                  </ul>
                </div>

                {/* Quick Actions */}
                <div className="space-y-3">
                  <button className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:opacity-90 transition-opacity">
                    Download Media Kit
                  </button>
                  <button className="w-full py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-semibold hover:opacity-90 transition-opacity">
                    Request Proposal
                  </button>
                  <button className="w-full py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:border-gray-400 transition-colors">
                    Share Campaign
                  </button>
                </div>
              </div>
            </div>

            {/* About Section */}
            <div className="mt-8 p-6 bg-gray-50 rounded-xl">
              <h3 className="text-xl font-bold mb-3 text-gray-900">About {genre} Campaigns</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                {genre} campaigns are designed to {getGenreDescription(genre)}. 
                These campaigns typically achieve higher engagement rates by connecting with audiences 
                on an emotional level and delivering memorable brand experiences.
              </p>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="p-3 bg-white rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-1">Best For</h4>
                  <p className="text-sm text-gray-600">{getBestForGenre(genre)}</p>
                </div>
                <div className="p-3 bg-white rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-1">Average ROI</h4>
                  <p className="text-sm text-gray-600">{getAverageROI(genre)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper functions for genre descriptions
const getGenreDescription = (genre: string): string => {
  const descriptions: Record<string, string> = {
    'Drama': 'tell compelling stories that evoke deep emotions and create lasting brand connections',
    'Comedy': 'use humor and wit to entertain audiences while delivering brand messages in a memorable way',
    'Lifestyle': 'showcase products and services within the context of everyday life and aspirational scenarios',
    'UGC': 'leverage authentic user-generated content to build trust and community around the brand',
    'Luxury': 'create exclusive, high-end brand experiences that emphasize quality and prestige',
    'Documentary': 'present factual, informative content that educates audiences while building brand authority'
  };
  return descriptions[genre] || 'create impactful brand experiences';
};

const getBestForGenre = (genre: string): string => {
  const bestFor: Record<string, string> = {
    'Drama': 'Brand storytelling, emotional connection, long-term loyalty',
    'Comedy': 'Viral potential, brand personality, audience engagement',
    'Lifestyle': 'Product placement, influencer marketing, social media',
    'UGC': 'Authenticity, community building, social proof',
    'Luxury': 'Premium positioning, exclusivity, high-value customers',
    'Documentary': 'Thought leadership, B2B marketing, educational content'
  };
  return bestFor[genre] || 'Various marketing objectives';
};

const getAverageROI = (genre: string): string => {
  const roi: Record<string, string> = {
    'Drama': '4.8x - Higher brand recall and emotional connection',
    'Comedy': '3.9x - Strong social sharing and engagement',
    'Lifestyle': '4.2x - Effective for product consideration',
    'UGC': '5.1x - Excellent trust building and conversion',
    'Luxury': '3.5x - Premium positioning and exclusivity',
    'Documentary': '4.5x - Strong authority and trust building'
  };
  return roi[genre] || '3.5x - 5.0x depending on execution';
};

export default AdDetailModal;