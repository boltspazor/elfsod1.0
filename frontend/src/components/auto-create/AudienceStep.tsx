// AudienceStep.tsx
import { useState, useEffect } from 'react';
import { Users, TrendingUp, MapPin, Search, Save, AlertCircle, CheckCircle,Heart, Loader, Dumbbell, Trophy, Shirt, Cpu, Briefcase } from 'lucide-react';
import { motion } from 'framer-motion';
import { AUTOCREATE_API_URL } from '../../config';

interface Interest {
  id: string;
  label: string;
  description: string;
  audience_size: string;
  growth_rate: string;
}

interface Location {
  code: string;
  name: string;
  users: string;
  growth: string;
  regions?: string[];
}

interface Insights {
  estimated_audience: string;
  engagement_multiplier: string;
  average_age: string;
  peak_activity: string;
  device_preference: string;
}

interface AudienceStepProps {
  campaignId?: string;
  onSave?: (campaignId: string) => void;
  initialData?: {
    demographics?: string[];
    selected_interests?: Interest[];
    age_range_min?: number;
    age_range_max?: number;
    target_locations?: Location[];
  };
}

const AudienceStep = ({ campaignId, onSave, initialData }: AudienceStepProps) => {
  const [selectedDemographics, setSelectedDemographics] = useState<string[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<Interest[]>([]);
  const [ageRange, setAgeRange] = useState<[number, number]>([25, 45]);
  const [targetLocations, setTargetLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [presetInterests, setPresetInterests] = useState<Interest[]>([]);
  const [presetLocations, setPresetLocations] = useState<Location[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  // Get token from localStorage
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
    } else {
      setError('Not authenticated. Please login first.');
    }
  }, []);

  // Load initial data if provided
  useEffect(() => {
    if (initialData) {
      setSelectedDemographics(initialData.demographics || []);
      setSelectedInterests(initialData.selected_interests || []);
      setAgeRange([
        initialData.age_range_min || 25,
        initialData.age_range_max || 45
      ]);
      setTargetLocations(initialData.target_locations || []);
    }
  }, [initialData]);

  // Load preset data
  useEffect(() => {
    loadPresetData();
  }, []);

  const loadPresetData = async () => {
    setDataLoading(true);
    try {
      console.log('Loading preset data...');
      
      const [interestsRes, locationsRes] = await Promise.all([
        fetch(`${AUTOCREATE_API_URL}/api/audience/preset-interests`),
        fetch(`${AUTOCREATE_API_URL}/api/audience/preset-locations`)
      ]);

      const interestsData = await interestsRes.json();
      const locationsData = await locationsRes.json();

      console.log('Interests data:', interestsData);
      console.log('Locations data:', locationsData);

      setPresetInterests(interestsData.interests || []);
      setPresetLocations(locationsData.locations || []);
    } catch (error) {
      console.error('Error loading preset data:', error);
      setError('Failed to load preset data. Using fallback data.');
      
      // Fallback data
      setPresetInterests([
        {
          id: "fitness",
          label: "Fitness & Wellness",
          description: "Health-conscious users interested in exercise, nutrition, and wellness",
          audience_size: "2.3M users",
          growth_rate: "+18%"
        },
        {
          id: "sports",
          label: "Sports & Athletics",
          description: "Active sports enthusiasts, athletes, and sports fans",
          audience_size: "3.1M users",
          growth_rate: "+22%"
        },
        {
          id: "fashion",
          label: "Fashion & Style",
          description: "Fashion-forward individuals interested in trends and apparel",
          audience_size: "4.5M users",
          growth_rate: "+15%"
        },
        {
          id: "technology",
          label: "Technology & Gadgets",
          description: "Tech enthusiasts and early adopters of new technology",
          audience_size: "3.8M users",
          growth_rate: "+25%"
        }
      ]);
      
      setPresetLocations([
        {
          code: "IN",
          name: "India",
          users: "580M",
          growth: "+24%",
          regions: ["Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Kolkata"]
        },
        {
          code: "US",
          name: "United States",
          users: "330M",
          growth: "+8%",
          regions: ["New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia"]
        },
        {
          code: "UK",
          name: "United Kingdom",
          users: "68M",
          growth: "+5%",
          regions: ["London", "Manchester", "Birmingham", "Leeds", "Glasgow", "Liverpool"]
        }
      ]);
    } finally {
      setDataLoading(false);
    }
  };

  const demographics = [
    { id: 'male', label: 'Male', percentage: '45%' },
    { id: 'female', label: 'Female', percentage: '55%' },
    { id: 'all', label: 'All Genders', percentage: '100%' }
  ];

  const toggleDemographic = (id: string) => {
    let newDemographics: string[];
    if (id === 'all') {
      newDemographics = ['all'];
    } else {
      newDemographics = selectedDemographics.includes(id)
        ? selectedDemographics.filter(d => d !== id && d !== 'all')
        : [...selectedDemographics.filter(d => d !== 'all'), id];
    }
    setSelectedDemographics(newDemographics);
  };

  const toggleInterest = (interest: Interest) => {
    setSelectedInterests(prev => {
      const exists = prev.find(item => item.id === interest.id);
      if (exists) {
        return prev.filter(item => item.id !== interest.id);
      } else {
        return [...prev, interest];
      }
    });
  };

  const toggleLocation = (location: Location) => {
    setTargetLocations(prev => {
      const exists = prev.find(item => item.name === location.name);
      if (exists) {
        return prev.filter(item => item.name !== location.name);
      } else {
        return [...prev, location];
      }
    });
  };

  const getAudienceInsights = async () => {
    if (!token) {
      setError('Not authenticated. Please login first.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${AUTOCREATE_API_URL}/api/audience/insights`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          demographics: selectedDemographics,
          age_range_min: ageRange[0],
          age_range_max: ageRange[1],
          selected_interests: selectedInterests,
          target_locations: targetLocations
        })
      });

      const data = await response.json();
      if (data.success) {
        setInsights(data.insights);
      } else {
        setError(data.error || 'Failed to get insights');
      }
    } catch (error) {
      console.error('Error getting insights:', error);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const saveAudienceData = async () => {
    if (!token) {
      setError('Not authenticated. Please login first.');
      return;
    }

    if (!selectedDemographics.length) {
      setError('Please select at least one demographic');
      return;
    }

    if (!selectedInterests.length) {
      setError('Please select at least one interest');
      return;
    }

    if (!targetLocations.length) {
      setError('Please select at least one location');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);
    
    try {
      const payload: {
        demographics: string[];
        age_range_min: number;
        age_range_max: number;
        selected_interests: Interest[];
        target_locations: Location[];
        user_id: string | null;
        campaign_id?: string;
      } = {
        demographics: selectedDemographics,
        age_range_min: ageRange[0],
        age_range_max: ageRange[1],
        selected_interests: selectedInterests,
        target_locations: targetLocations,
        user_id: token
      };

      // Add campaign_id if we have one
      if (campaignId) {
        payload.campaign_id = campaignId;
      }

      const response = await fetch(`${AUTOCREATE_API_URL}/api/audience/targeting`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccess(true);
        if (onSave) {
          onSave(data.campaign_id);
        }
        // Get fresh insights after saving
        getAudienceInsights();
      } else {
        setError(data.error || 'Failed to save audience data');
      }
    } catch (error) {
      console.error('Error saving audience data:', error);
      setError('Failed to connect to server');
    } finally {
      setSaving(false);
    }
  };

  const filteredLocations = presetLocations.filter(location =>
    location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (location.regions && location.regions.some((region: string) => 
      region.toLowerCase().includes(searchTerm.toLowerCase())
    ))
  );

  const selectedLocationNames = targetLocations.map(loc => loc.name).join(', ');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Audience Targeting</h2>
          <p className="text-white">Define your target audience and demographics for optimal campaign performance</p>
        </div>
        <div className="rounded-[32px] p-[1px] bg-gradient-to-r from-cyan-400 via-violet-500 to-pink-500">
          <motion.button
            onClick={saveAudienceData}
            disabled={saving || !token}
            className="px-6 py-3 bg-gray-900 text-white rounded-[32px] font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <Loader className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            {saving ? 'Saving...' : 'Save Audience'}
          </motion.button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 animate-fade-in">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-red-800 font-medium">Error</p>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3 animate-fade-in">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <p className="text-emerald-800 font-medium">Audience targeting saved successfully!</p>
        </div>
      )}

      {/* Demographics Section */}
      <div className="mb-5">
        <div className="bg-gray-900 rounded-[32px] p-8">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Users className="w-6 h-6 text-cyan-400" />
            Demographics
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {demographics.map((demo) => (
              <div key={demo.id} className="rounded-[32px] p-[1px] bg-gradient-to-r from-cyan-400 via-violet-500 to-pink-500">
                <motion.button
                  onClick={() => toggleDemographic(demo.id)}
                  className={`w-full p-4 rounded-[32px] transition-all ${
                    selectedDemographics.includes(demo.id)
                      ? 'bg-gradient-to-br from-cyan-900 to-teal-900'
                      : 'bg-gray-800 hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">{demo.label}</span>
                    <span className="text-sm text-cyan-400 font-medium">{demo.percentage}</span>
                  </div>
                </motion.button>
              </div>
            ))}
          </div>

          {/* Age Range */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-white mb-3">
              Age Range: {ageRange[0]} - {ageRange[1]} years
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="18"
                max="65"
                value={ageRange[0]}
                onChange={(e) => setAgeRange([parseInt(e.target.value), ageRange[1]])}
                className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
              <input
                type="range"
                min="18"
                max="65"
                value={ageRange[1]}
                onChange={(e) => setAgeRange([ageRange[0], parseInt(e.target.value)])}
                className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>
          </div>
        </div>
      </div>

     {/* Interests Section */}
<div className="mb-5">
  <div className="bg-gray-900 rounded-[32px] p-8">
    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
      <Heart className="w-6 h-6 text-cyan-400" />
      Interests & Behaviors
    </h3>

    {dataLoading ? (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    ) : presetInterests.length === 0 ? (
      <div className="text-center py-12 text-white">
        No interests available. Please check your connection.
      </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {presetInterests.map((interest) => {
          
          // ✅ Proper Icon Mapping (No Logic Changed)
          let Icon;
          if (interest.label.toLowerCase().includes("fitness")) Icon = Dumbbell;
          else if (interest.label.toLowerCase().includes("sports")) Icon = Trophy;
          else if (interest.label.toLowerCase().includes("fashion")) Icon = Shirt;
          else if (interest.label.toLowerCase().includes("tech")) Icon = Cpu;
          else Icon = Briefcase;

          const isSelected = selectedInterests.some(
            (item) => item.id === interest.id
          );

          return (
            <div
              key={interest.id}
              className="rounded-[32px] bg-gradient-to-r from-cyan-400 via-violet-500 to-pink-500 p-[1px] overflow-hidden"
            >
              <motion.button
                onClick={() => toggleInterest(interest)}
                className={`w-full h-full p-6 rounded-[30px] text-left transition-colors duration-200 ${
                  isSelected
                    ? "bg-[#111827]"
                    : "bg-[#1F2937] hover:bg-[#243040]"
                }`}
              >
                <div className="flex items-start gap-4">
                  
                  {/* Icon Box */}
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Icon className="w-8 h-8 text-cyan-400" />
                  </div>

                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h4 className="font-semibold text-white mb-1">
                        {interest.label}
                      </h4>
                      <span className="text-sm font-medium text-emerald-400">
                        {interest.growth_rate}
                      </span>
                    </div>

                    <p className="text-sm text-gray-300 mb-2">
                      {interest.description}
                    </p>

                    <p className="text-xs text-gray-400">
                      Audience: {interest.audience_size}
                    </p>
                  </div>

                  {/* Selected Check */}
                  {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-cyan-600 flex items-center justify-center flex-shrink-0">
                      <svg
                        className="w-4 h-4 text-white"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  )}
                </div>
              </motion.button>
            </div>
          );
        })}
      </div>
    )}
  </div>
</div>

      {/* Locations Section */}
      <div className="mb-7">
        <div className="bg-gray-900 rounded-[32px] p-8">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <MapPin className="w-6 h-6 text-cyan-400" />
            Geographic Targeting
          </h3>
          
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search countries, cities, or regions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent placeholder-gray-400"
              />
            </div>
          </div>

          {targetLocations.length > 0 && (
            <div className="mb-6 p-4 bg-cyan-900/30 rounded-xl border border-cyan-500">
              <h4 className="text-sm font-medium text-white mb-2">Selected Locations:</h4>
              <p className="text-cyan-400 font-medium">{selectedLocationNames}</p>
            </div>
          )}

          {dataLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-8 h-8 animate-spin text-cyan-400" />
            </div>
          ) : filteredLocations.length === 0 ? (
            <div className="text-center py-12 text-white">
              No locations found matching "{searchTerm}"
            </div>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
              {filteredLocations.map((location) => (
                <div key={location.code} className="rounded-[32px] p-[1px] bg-gradient-to-r from-cyan-400 via-violet-500 to-pink-500">
                  <motion.button
                    onClick={() => toggleLocation(location)}
                    className={`w-full p-4 rounded-[32px] transition-colors text-left ${
                      targetLocations.some(loc => loc.name === location.name)
                        ? 'bg-gradient-to-br from-cyan-900 to-teal-900'
                        : 'bg-gray-800 hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center">
                          <MapPin className="w-6 h-6 text-cyan-400" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-white">{location.name}</h4>
                          <p className="text-sm text-gray-300">{location.users} potential reach</p>
                          <p className="text-xs text-gray-400">
                            {location.regions && location.regions.length > 0 
                              ? `${location.regions.slice(0, 2).join(', ')}...`
                              : 'Major cities available'
                            }
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-emerald-400 text-sm font-medium">{location.growth}</span>
                        <p className="text-xs text-gray-300">growth</p>
                      </div>
                    </div>
                  </motion.button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

{/* Insights Button */}
<div className="flex justify-center mt-6">
  <div className="inline-block rounded-[32px] p-[1.5px] bg-gradient-to-r from-cyan-400 via-violet-500 to-pink-500">
    <motion.button
      type="button"
      onClick={() => getAudienceInsights()}
      disabled={loading || !selectedDemographics.length || !token}
      className="px-10 py-4 bg-black text-white rounded-[30px] font-medium flex items-center gap-3 justify-center disabled:bg-black disabled:text-white disabled:cursor-not-allowed"
    >
      {loading ? (
        <Loader className="w-5 h-5 animate-spin text-white" />
      ) : (
        <TrendingUp className="w-5 h-5 text-white" />
      )}
      {loading ? "Analyzing..." : "Get AI Audience Insights"}
    </motion.button>
  </div>
</div>

      {/* AI Insights */}
      {insights && (
        <div className="rounded-[32px] p-[1px] bg-gradient-to-r from-cyan-400 via-violet-500 to-pink-500 mt-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-900 rounded-[32px] p-6"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>

              <div className="flex-1">
                <h4 className="text-lg font-semibold text-white mb-2">
                  AI Audience Insights
                </h4>

                <p className="text-gray-300 mb-3">
                  Based on your selections, we've identified an audience of{' '}
                  <strong className="text-cyan-400">
                    {insights.estimated_audience} users
                  </strong>{' '}
                  with high purchase intent. This audience has shown{' '}
                  <strong className="text-cyan-400">
                    {insights.engagement_multiplier}x higher engagement
                  </strong>{' '}
                  with similar campaigns.
                </p>

                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-gray-800 rounded-full text-sm text-white border border-cyan-500">
                    Avg. Age: {insights.average_age}
                  </span>

                  <span className="px-3 py-1 bg-gray-800 rounded-full text-sm text-white border border-cyan-500">
                    Peak Activity: {insights.peak_activity}
                  </span>

                  <span className="px-3 py-1 bg-gray-800 rounded-full text-sm text-white border border-cyan-500">
                    Device: {insights.device_preference}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default AudienceStep;