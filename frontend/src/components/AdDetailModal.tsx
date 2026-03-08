import React from 'react';
import { X, Star, Play, Users, TrendingUp } from 'lucide-react';

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
  thumbnail?: string;
}

interface AdDetailModalProps {
  ad: AdItem;
  onClose: () => void;
  relatedAds: AdItem[];
  trendingExampleAds?: AdItem[];
}

const AdDetailModal: React.FC<AdDetailModalProps> = ({ ad, onClose, relatedAds, trendingExampleAds }) => {
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
  const genreLower = (typeof genre === 'string' ? genre : '').toLowerCase();
  const isFashion = genreLower === 'fashion';

  const exampleAds = (trendingExampleAds && trendingExampleAds.length > 0)
    ? trendingExampleAds
    : getExampleAdsForGenre(genre);

  // Hardcoded campaign names as modal title (from category keywords)
  const HARDCODED_CAMPAIGN_NAMES = ['Shoes ads', 'Fashion ads', 'Food ads', 'Sports ads'];
  const isKnownCampaign = typeof genre === 'string' && HARDCODED_CAMPAIGN_NAMES.includes(genre);
  const modalTitle = isKnownCampaign
    ? genre
    : genreLower === 'recommended'
      ? 'Recommended Campaigns'
      : genreLower === 'trending'
        ? 'Trending Now'
        : isFashion
          ? 'Fashion Ads'
          : ad.title;
  const sectionTitle = isKnownCampaign || isFashion ? modalTitle : `Top ${genre} Campaign Examples`;

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

          {/* Hero Section - always show image or thumbnail */}
          <div className="relative h-96 bg-gray-200">
            <img
              src={ad.image || ad.thumbnail || 'https://via.placeholder.com/800x400?text=No+Image'}
              alt={ad.title}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).src = ad.thumbnail || 'https://via.placeholder.com/800x400?text=No+Image'; }}
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
            {/* Header: title = hardcoded campaign name; View Campaign → opens actual ad on platform */}
            <div className="mb-6">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                {modalTitle}
              </h1>
              <div className="flex items-center gap-4 text-gray-600 flex-wrap">
                <div className="flex items-center gap-1">
                  <Star className="w-5 h-5 text-yellow-500 fill-current" />
                  <span className="font-bold">{ad.rating}</span>
                  <span className="text-gray-500">({ad.votes} votes)</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-5 h-5" />
                  <span className="font-medium text-purple-600">{genre}</span>
                </div>
                {ad.url && (
                  <button
                    type="button"
                    className="text-purple-600 font-semibold hover:text-purple-700 hover:underline"
                    onClick={() => window.open(ad.url, '_blank', 'noopener,noreferrer')}
                  >
                    View Campaign →
                  </button>
                )}
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
                      {sectionTitle}
                    </h2>
                  </div>
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
                        {/* Ad Image - always show image or thumbnail */}
                        <div className="relative h-48 overflow-hidden bg-gray-200">
                          <img
                            src={exampleAd.image || exampleAd.thumbnail || 'https://via.placeholder.com/400x300?text=No+Image'}
                            alt={exampleAd.title}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            onError={(e) => { (e.target as HTMLImageElement).src = exampleAd.thumbnail || 'https://via.placeholder.com/400x300?text=No+Image'; }}
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
                            <button
                              type="button"
                              className="text-sm font-medium text-purple-600 hover:text-purple-700"
                              onClick={(e) => {
                                e.stopPropagation();
                                const url = exampleAd.url || `${window.location.origin}/ads/${exampleAd.id}`;
                                window.open(url, '_blank', 'noopener,noreferrer');
                              }}
                            >
                              View Campaign →
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column - Related Ads */}
              <div>
                <h2 className="text-2xl font-bold mb-4 text-gray-900">Similar Campaigns</h2>
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
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-200 shrink-0">
                        <img
                          src={relatedAd.image || relatedAd.thumbnail || 'https://via.placeholder.com/64?text=Ad'}
                          alt={relatedAd.title}
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).src = relatedAd.thumbnail || 'https://via.placeholder.com/64?text=Ad'; }}
                        />
                      </div>
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdDetailModal;