// src/components/AdCarousel.tsx
import React, { useRef } from 'react';
import AdCard from './AdCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { svgPlaceholder } from '../utils/imageFallback';

interface CarouselAd {
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
  thumbnail?: string;
}

interface AdCarouselProps {
  category: 'sports' | 'food' | 'fashion' | 'trending' | 'top' | 'recommended';
  onCardClick?: (ad: CarouselAd) => void;
  /** When provided, use these ads instead of built-in category ads (e.g. from 24h cache). */
  ads?: CarouselAd[];
}

const AdCarousel: React.FC<AdCarouselProps> = ({ category, onCardClick, ads: adsProp }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Define ads for different categories (fallback when no cached ads)
  const categoryAds = {
    sports: [
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
      {
        id: 102,
        title: 'Adidas: Impossible is Nothing',
        type: null,
        image: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=400&h=500&fit=crop',
        rating: '4.7',
        votes: '189K',
        tags: ['Training', 'Teamwear'],
        genre: 'Sports'
      },
      {
        id: 103,
        title: 'Under Armour: Rule Yourself',
        type: null,
        image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=500&fit=crop',
        rating: '4.8',
        votes: '234K',
        tags: ['Fitness', 'Performance'],
        genre: 'Sports'
      },
      {
        id: 104,
        title: 'Puma: Forever Faster',
        type: null,
        image: 'https://images.unsplash.com/photo-1536922246289-88c42f957773?w=400&h=500&fit=crop',
        rating: '4.6',
        votes: '167K',
        tags: ['Running', 'Speed'],
        genre: 'Sports'
      },
      {
        id: 105,
        title: 'Gatorade: Win From Within',
        type: null,
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=500&fit=crop',
        rating: '4.5',
        votes: '145K',
        tags: ['Hydration', 'Energy'],
        genre: 'Sports'
      },
      {
        id: 106,
        title: 'ESPN: This is SportsCenter',
        type: null,
        image: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400&h=500&fit=crop',
        rating: '4.8',
        votes: '212K',
        tags: ['Broadcast', 'Highlights'],
        genre: 'Sports'
      }
    ],
    food: [
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
      {
        id: 202,
        title: 'KFC: Finger Lickin Good',
        type: null,
        image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=500&fit=crop',
        rating: '4.5',
        votes: '187K',
        tags: ['Fried Chicken', 'Comfort'],
        genre: 'Food'
      },
      {
        id: 203,
        title: 'Starbucks: Third Place',
        type: null,
        image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=500&fit=crop',
        rating: '4.7',
        votes: '234K',
        tags: ['Coffee', 'Ambience'],
        genre: 'Food'
      },
      {
        id: 204,
        title: 'Coca-Cola: Share a Coke',
        type: null,
        image: 'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=400&h=500&fit=crop',
        rating: '4.9',
        votes: '345K',
        tags: ['Beverage', 'Personalized'],
        genre: 'Food'
      },
      {
        id: 205,
        title: 'Domino: Pizza Delivery',
        type: null,
        image: 'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=400&h=500&fit=crop',
        rating: '4.4',
        votes: '178K',
        tags: ['Delivery', 'Fast'],
        genre: 'Food'
      },
      {
        id: 206,
        title: 'Ben & Jerry: Peace, Love & Ice Cream',
        type: null,
        image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=500&fit=crop',
        rating: '4.8',
        votes: '267K',
        tags: ['Dessert', 'Social'],
        genre: 'Food'
      }
    ],
    fashion: [
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
      {
        id: 302,
        title: 'Gucci: Luxury Redefined',
        type: null,
        image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400&h=500&fit=crop',
        rating: '4.9',
        votes: '156K',
        tags: ['Luxury', 'Designer'],
        genre: 'Fashion'
      },
      {
        id: 303,
        title: 'H&M: Conscious Fashion',
        type: null,
        image: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=400&h=500&fit=crop',
        rating: '4.6',
        votes: '234K',
        tags: ['Sustainable', 'Casual'],
        genre: 'Fashion'
      },
      {
        id: 304,
        title: 'Louis Vuitton: Travel in Style',
        type: null,
        image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400&h=500&fit=crop',
        rating: '4.8',
        votes: '189K',
        tags: ['Luxury', 'Travel'],
        genre: 'Fashion'
      },
      {
        id: 305,
        title: 'Uniqlo: LifeWear',
        type: null,
        image: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=400&h=500&fit=crop',
        rating: '4.5',
        votes: '167K',
        tags: ['Minimal', 'Quality'],
        genre: 'Fashion'
      },
      {
        id: 306,
        title: 'Levis: Original Denim',
        type: null,
        image: 'https://images.unsplash.com/photo-1544441893-675973e31985?w=400&h=500&fit=crop',
        rating: '4.7',
        votes: '278K',
        tags: ['Denim', 'Classic'],
        genre: 'Fashion'
      }
    ],
    recommended: [
      {
        id: 2,
        title: 'Fashion Ads',
        type: null,
        image: 'https://res.cloudinary.com/doajtpveg/image/upload/v1769789343/samples/ecommerce/accessories-bag.jpg',
        rating: '4.6',
        votes: '189K',
        tags: ['Fashion'],
        genre: 'Fashion'
      },
      {
        id: 3,
        title: 'Shoes Ads',
        type: null,
        image: 'https://res.cloudinary.com/doajtpveg/image/upload/v1772969453/Screenshot_2026-03-08_165507_gzz0bd.png',
        rating: '4.9',
        votes: '312K',
        tags: ['Shoes', 'Footwear'],
        genre: 'Shoes'
      },
      {
        id: 4,
        title: 'Tech Ads',
        type: null,
        image: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=400&h=500&fit=crop',
        rating: '4.7',
        votes: '267K',
        tags: ['Tech'],
        genre: 'Tech'
      },
      {
        id: 5,
        title: 'Car Ads',
        type: null,
        image: 'https://res.cloudinary.com/doajtpveg/image/upload/v1772969454/Screenshot_2026-03-08_165609_kscjlt.png',
        rating: '4.5',
        votes: '198K',
        tags: ['Cars'],
        genre: 'Cars'
      },
      // {
      //   id: 6,
      //   title: 'User-Generated Content (UGC) Ads',
      //   type: null,
      //   image: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=400&h=500&fit=crop',
      //   rating: '4.8',
      //   votes: '289K',
      //   tags: ['Display', 'Retargeting'],
      //   genre: 'UGC'
      // }
    ],
    trending: [
      {
        id: 7,
        title: 'Home Decor Ads',
        type: 'PROMOTED',
        image: 'https://res.cloudinary.com/doajtpveg/image/upload/v1772969436/Screenshot_2026-03-08_165633_lraz01.png',
        rating: '4.9',
        votes: '345K',
        tags: ['Home Decor'],
        genre: 'Home Decor'
      },
      {
        id: 8,
        title: 'Fitness Ads',
        type: null,
        image: 'https://res.cloudinary.com/doajtpveg/image/upload/v1772969425/Screenshot_2026-03-08_165721_lxvqzy.png',
        rating: '4.8',
        votes: '234K',
        tags: ['Health', 'Fitness'],
        genre: 'Fitness'
      },
      {
        id: 9,
        title: 'Beauty Ads',
        type: null,
        image: 'https://res.cloudinary.com/doajtpveg/image/upload/v1772969418/Screenshot_2026-03-08_165743_ocuyhh.png',
        rating: '4.8',
        votes: '298K',
        tags: ['Beauty', 'Fashion'],
        genre: 'Beauty Ads'
      },
      {
        id: 10,
        title: 'Travel Ads',
        type: null,
        image: 'https://res.cloudinary.com/doajtpveg/image/upload/v1772969444/Screenshot_2026-03-08_165801_apeyhr.png',
        rating: '4.7',
        votes: '267K',
        tags: ['Travel'],
        genre: 'Travel'
      },
      {
        id: 11,
        title: 'E-commerce',
        type: null,
        image: 'https://res.cloudinary.com/doajtpveg/image/upload/v1772969424/Screenshot_2026-03-08_165825_cabq1y.png',
        rating: '4.6',
        votes: '189K',
        tags: ['E-Commerce'],
        genre: 'E-commerce'
      },
      // {
      //   id: 12,
      //   title: 'Tech Ads',
      //   type: null,
      //   image: svgPlaceholder('Tech', 400, 300),
      //   rating: '4.6',
      //   votes: '178K',
      //   tags: ['Technology', 'Electronics'],
      //   genre: 'Tech'
      // },
      // {
      //   id: 12,
      //   title: 'Metaverse Brand Experiences',
      //   type: null,
      //   image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=500&fit=crop',
      //   rating: '4.5',
      //   votes: '156K',
      //   tags: ['Virtual', 'Future'],
      //   genre: 'Metaverse'
      // }
    ],
    top: [
      {
        id: 13,
        title: 'Apple: Shot on iPhone',
        type: 'PROMOTED',
        image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&h=500&fit=crop',
        rating: '4.9',
        votes: '456K',
        tags: ['Photography', 'User-generated'],
        genre: 'Lifestyle'
      },
      {
        id: 14,
        title: 'Dove: Real Beauty',
        type: null,
        image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=500&fit=crop',
        rating: '4.8',
        votes: '389K',
        tags: ['Body Positive', 'Empowerment'],
        genre: 'Drama'
      },
      {
        id: 15,
        title: 'Google: Year in Search',
        type: null,
        image: 'https://images.unsplash.com/photo-1542744095-fcf48d80b0fd?w=400&h=500&fit=crop',
        rating: '4.9',
        votes: '412K',
        tags: ['Data-driven', 'Emotional'],
        genre: 'Documentary'
      },
      {
        id: 16,
        title: 'Always: #LikeAGirl',
        type: null,
        image: 'https://images.unsplash.com/photo-1517299321609-52687d1bc55a?w=400&h=500&fit=crop',
        rating: '4.8',
        votes: '367K',
        tags: ['Empowerment', 'Social'],
        genre: 'Drama'
      },
      {
        id: 17,
        title: 'Airbnb: Belong Anywhere',
        type: null,
        image: 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=400&h=500&fit=crop',
        rating: '4.7',
        votes: '312K',
        tags: ['Travel', 'Community'],
        genre: 'Lifestyle'
      },
      {
        id: 18,
        title: 'Patagonia: Don\'t Buy This Jacket',
        type: null,
        image: 'https://images.unsplash.com/photo-1501555088652-021faa106b9b?w=400&h=500&fit=crop',
        rating: '4.9',
        votes: '289K',
        tags: ['Sustainable', 'Environmental'],
        genre: 'Documentary'
      }
    ]
  };

  // When parent passes ads (e.g. from cache), use them even if empty. Otherwise use built-in category ads.
  const ads = adsProp !== undefined ? adsProp : (categoryAds[category] || categoryAds.recommended);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // Handle card click
  const handleCardClick = (ad: CarouselAd) => {
    if (onCardClick) {
      onCardClick(ad);
    }
  };

  return (
    <div className="relative group">
      <button
        onClick={() => scroll('left')}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-50 -ml-6"
      >
        <ChevronLeft className="w-6 h-6 text-gray-700" />
      </button>
      
      <div 
        ref={scrollRef}
        className="flex space-x-6 overflow-x-auto scrollbar-hide px-4 py-2"
        style={{ scrollbarWidth: 'none' }}
      >
        {ads.map((ad) => (
          <div key={ad.id}>
            <AdCard ad={ad} onCardClick={onCardClick ? () => handleCardClick(ad) : undefined} />
          </div>
        ))}
      </div>

      <button
        onClick={() => scroll('right')}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-50 -mr-6"
      >
        <ChevronRight className="w-6 h-6 text-gray-700" />
      </button>
    </div>
  );
};

export default AdCarousel;