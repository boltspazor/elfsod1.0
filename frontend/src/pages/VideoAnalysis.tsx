import React, { useEffect, useState } from "react";
import {
  Eye,
  Users,
  Sparkles,
  ExternalLink,
  Loader2,
  AlertTriangle,
  Target,
  Palette,
  Clock,
  Heart,
  Zap,
  TrendingUp,
  BarChart3,
  PlayCircle,
  Type,
  AlertCircle,
  CheckCircle,
  XCircle,
  Percent,
  Layers,
  Award,
} from "lucide-react";
import Navigation from "../components/Navigation";
import Footer from "../components/Footer";
import { VideoAnalysisAPI } from "../services/adsurv";

/* -------------------- Types -------------------- */
interface InfluencerName {
  name: string;
  is_influencer: boolean;
  sources: string[];
}

interface PacingAnalysis {
  scene_count: number;
  duration_sec: number;
  pacing_score: number;
  hook_speed_sec: number;
  avg_scene_duration: number;
}

interface MediaAnalysisItem {
  media_type: string;
  file?: string;
  colors?: string[];
  mood?: string;
  mood_score?: number;
  pacing?: PacingAnalysis;
}

interface ValueProposition {
  urgency: boolean;
  benefits: string[];
}

interface Scores {
  cta_score: number;
  total_score: number;
  visual_score: number;
  text_quality_score: number;
  value_proposition_score: number;
}

interface AdAnalysis {
  scores: Scores;
  has_influencer: boolean;
  media_analysis: MediaAnalysisItem[];
  influencer_count: number;
  influencer_names: InfluencerName[];
  value_proposition: ValueProposition;
}

interface AdData {
  id: string;
  company: string;
  ad_title: string;
  ad_text: string;
  full_ad_text: string;
  call_to_action: string;
  ad_archive_id: string;
  analyzed_at: string;
  created_at: string;
  analysis: AdAnalysis | null;
  search_keyword?: string;
  platform?: string;
  source_url?: string;
  status?: string;
}

/* -------------------- Component -------------------- */ 
const VideoAnalysis: React.FC = () => {
  const [ads, setAds] = useState<AdData[]>([]);
  const [selectedAd, setSelectedAd] = useState<AdData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAds = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Please log in to view your analyzed ads.");
        setAds([]);
        return;
      }
      const data = await VideoAnalysisAPI.listAds();
      const sorted = (data || []).sort((a, b) => {
        const aScore = (a.analysis as { scores?: { total_score?: number } } | null)?.scores?.total_score ?? 0;
        const bScore = (b.analysis as { scores?: { total_score?: number } } | null)?.scores?.total_score ?? 0;
        return bScore - aScore;
      });
      setAds(sorted as AdData[]);
    } catch (err: unknown) {
      console.error("❌ Fetch failed:", err);
      const message = err instanceof Error ? err.message : "Failed to load ads.";
      if (message.includes("401") || message.toLowerCase().includes("unauthorized")) {
        setError("Please log in to view your analyzed ads.");
      } else {
        setError(message);
      }
      setAds([]);
    } finally {
      setLoading(false);
    }
  };

  const renderColorPalette = (colors: string[]) => {
    return (
      <div className="flex gap-2 flex-wrap">
        {colors.map((color, index) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full border-2 border-gray-600 shadow-sm"
              style={{ backgroundColor: color }}
            />
            <span className="text-xs text-gray-400 font-mono">{color}</span>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-cyan-400 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">Loading ads...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="rounded-[32px] p-[1px] bg-gradient-to-r from-cyan-400 via-violet-500 to-pink-500 max-w-md">
          <div className="bg-[#0B0F1A] rounded-[32px] p-6">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-300 text-center">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navigation />

      <div className="min-h-screen bg-black p-6">
        {/* Header */}
        <div className="max-w-7xl mx-auto mb-8">
          <div className="bg-[#0B0F1A] rounded-[32px] p-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
                  {/* <Sparkles className="text-cyan-400" /> */}
                  Ad Intelligence Dashboard
                </h1>
                <p className="text-gray-400">
                  Comprehensive analysis of Facebook ads with AI-powered insights
                </p>
              </div>

              <button
                onClick={fetchAds}
                className="relative rounded-full p-[2px] bg-gradient-to-r from-cyan-400 via-violet-500 to-pink-500 shadow-[0_0_25px_rgba(168,85,247,0.25)]"
              >
                <div className="rounded-full bg-gradient-to-r from-[#2c2c2c] to-[#3a3a3a] px-4 py-2 flex items-center gap-2 text-white text-center">
                  <Refresh className="w-5 h-5" />
                  Refresh
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Cards Grid */}
        {!selectedAd ? (
          <div className="max-w-7xl mx-auto">
            {ads.length === 0 ? (
              <div className="rounded-[32px] p-[1px] bg-gradient-to-r from-cyan-400 via-violet-500 to-pink-500 shadow-[0_0_30px_rgba(168,85,247,0.15)]">
                <div className="bg-[#0B0F1A] rounded-[32px] p-12 text-center">
                  <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400 text-lg">No ads found</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {ads.map((ad) => (
                  <button
                    key={ad.id}
                    onClick={() => setSelectedAd(ad)}
                    className="rounded-[32px] p-[1px] bg-gradient-to-r from-cyan-400 via-violet-500 to-pink-500 hover:shadow-[0_0_30px_rgba(168,85,247,0.3)] transition-all text-left group"
                  >
                    <div className="bg-[#0B0F1A] rounded-[32px] p-6 h-full">
                      {/* Score Badge */}
                      <div className="flex justify-between items-start mb-4">
                        <span className="px-4 py-2 rounded-full text-lg font-bold bg-gradient-to-r from-cyan-400 via-violet-500 to-pink-500 bg-clip-text text-transparent">
                          {ad.analysis?.scores?.total_score || 0}
                        </span>
                        <Sparkles
                          className={`w-5 h-5 ${
                            (ad.analysis?.scores?.total_score ?? 0) >= 80
                              ? "text-emerald-500"
                              : "text-gray-400"
                          }`}
                        />
                      </div>

                      {/* Company */}
                      <div className="mb-2">
                        <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
                          {ad.company}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="text-lg font-bold text-white mb-3 line-clamp-2 group-hover:text-cyan-400 transition-colors">
                        {ad.ad_title || "Untitled Ad"}
                      </h3>

                      {/* Quick Stats */}
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        <div className="bg-black/50 rounded-[32px] p-2 text-center border border-gray-800">
                          <div className="text-xs text-gray-400 mb-1">
                            Visual Quality
                          </div>
                          <div className="font-bold text-sm text-white">
                            {ad.analysis?.scores?.visual_score || 0}/100
                          </div>
                        </div>
                        <div className="bg-black/50 rounded-[32px] p-2 text-center border border-gray-800">
                          <div className="text-xs text-gray-400 mb-1">
                            Text Quality
                          </div>
                          <div className="font-bold text-sm text-white">
                            {ad.analysis?.scores?.text_quality_score || 0}/100
                          </div>
                        </div>
                        <div className="bg-black/50 rounded-[32px] p-2 text-center border border-gray-800">
                          <div className="text-xs text-gray-400 mb-1">
                            CTA Score
                          </div>
                          <div className="font-bold text-sm text-white">
                            {ad.analysis?.scores?.cta_score || 0}/100
                          </div>
                        </div>
                      </div>

                      {/* Badges */}
                      <div className="flex gap-2 flex-wrap mb-3">
                        {ad.analysis?.has_influencer && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                            <Users className="w-3 h-3 inline mr-1" />
                            Influencer
                          </span>
                        )}
                        {ad.analysis?.value_proposition?.urgency && (
                          <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                            <Zap className="w-3 h-3 inline mr-1" />
                            Urgent
                          </span>
                        )}
                        {ad.analysis?.media_analysis?.some(
                          (m) => m.media_type === "video"
                        ) && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                            <PlayCircle className="w-3 h-3 inline mr-1" />
                            Video
                          </span>
                        )}
                      </div>

                      {/* Meta Info */}
                      <div className="text-xs text-gray-500 border-t border-gray-800 pt-3">
                        <div>
                          ID: {(ad.ad_archive_id || "").slice(0, 12)}...
                        </div>
                        <div>
                          {ad.analyzed_at
                            ? new Date(ad.analyzed_at).toLocaleDateString()
                            : "-"}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Detailed View */
          <div className="max-w-7xl mx-auto">
            {/* Back Button */}
            <button
              onClick={() => setSelectedAd(null)}
              className="mb-6 rounded-full p-[2px] bg-gradient-to-r from-cyan-400 via-violet-500 to-pink-500 shadow-[0_0_25px_rgba(168,85,247,0.25)]"
            >
              <div className="rounded-full bg-gradient-to-r from-[#2c2c2c] to-[#3a3a3a] px-4 py-2 flex items-center gap-2 text-white text-center">
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
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Back to All Ads
              </div>
            </button>

            {/* Header Card */}
            <div className="mb-6">
              <div className="bg-[#0B0F1A] rounded-[32px] p-8">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-cyan-400 uppercase tracking-wider mb-2">
                      {selectedAd.company}
                    </div>
                    <h1 className="text-5xl font-bold bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent mb-2">
                      {selectedAd.ad_title}
                    </h1>
                    <div className="text-sm text-gray-400 space-y-1">
                      <div>ID: {selectedAd.ad_archive_id}</div>
                      <div>
                        {selectedAd.analyzed_at
                          ? new Date(selectedAd.analyzed_at).toLocaleString()
                          : "-"}
                      </div>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-400 mb-2">
                      Overall Score
                    </div>
                    <div className="text-5xl font-bold bg-gradient-to-r from-cyan-400 via-violet-500 to-pink-500 bg-clip-text text-transparent">
                      {selectedAd.analysis?.scores?.total_score != null
                        ? `${selectedAd.analysis?.scores?.total_score}/100`
                        : "—"}
                    </div>
                    <a
                      href={`https://www.facebook.com/ads/library/?id=${selectedAd.ad_archive_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-block rounded-full p-[2px] bg-gradient-to-r from-cyan-400 via-violet-500 to-pink-500 shadow-[0_0_25px_rgba(168,85,247,0.25)]"
                    >
                      <div className="rounded-full bg-gradient-to-r from-[#2c2c2c] to-[#3a3a3a] px-4 py-2 flex items-center gap-2 text-sm text-white text-center">
                        <ExternalLink className="w-4 h-4" />
                        View Original
                      </div>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Scores Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <ScoreCard
                title="Visual Quality"
                score={selectedAd.analysis?.scores?.visual_score ?? 0}
                icon={Eye}
                description="Color, mood, and visual appeal"
              />
              <ScoreCard
                title="Text Quality"
                score={selectedAd.analysis?.scores?.text_quality_score ?? 0}
                icon={Type}
                description="Copy effectiveness and clarity"
              />
              <ScoreCard
                title="CTA Strength"
                score={selectedAd.analysis?.scores?.cta_score ?? 0}
                icon={Target}
                description="Call-to-action effectiveness"
              />
              <ScoreCard
                title="Value Proposition"
                score={selectedAd.analysis?.scores?.value_proposition_score ?? 0}
                icon={Award}
                description="Benefits and urgency"
              />
            </div>

            {/* Media Analysis */}
            {(selectedAd.analysis?.media_analysis || []).map((media, idx) => (
              <div
                key={idx}
                className="mb-6"
              >
                <div className="bg-[#0B0F1A] rounded-[32px] p-6">
                 <h2 className="text-2xl font-bold text-white mb-4">
  {media.media_type.charAt(0).toUpperCase() +
    media.media_type.slice(1)}{" "}
  Analysis
</h2>

                  {media.mood && (
                    <div className="mb-4">
                      <MetricCard
                        label="Mood"
                        value={`${media.mood} (${media.mood_score}/100)`}
                        icon={Palette}
                        score={media.mood_score}
                      />
                    </div>
                  )}

                  {/* Color Palette */}
                  {media.colors && media.colors.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                        {/* <Palette className="w-5 h-5 text-cyan-400" /> */}
                        Color Palette
                      </h3>
                      {renderColorPalette(media.colors)}
                    </div>
                  )}

                  {/* Pacing Analysis */}
                  {media.pacing && (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-cyan-400" />
                        Video Pacing Analysis
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <MetricCard
                          label="Scene Count"
                          value={media.pacing.scene_count}
                          icon={Layers}
                        />
                        <MetricCard
                          label="Duration"
                          value={`${media.pacing.duration_sec}s`}
                          icon={Clock}
                        />
                        <MetricCard
                          label="Pacing Score"
                          value={`${media.pacing.pacing_score}/100`}
                          icon={TrendingUp}
                          score={media.pacing.pacing_score}
                        />
                        <MetricCard
                          label="Hook Speed"
                          value={`${media.pacing.hook_speed_sec}s`}
                          icon={Zap}
                        />
                        <MetricCard
                          label="Avg Scene Duration"
                          value={`${media.pacing.avg_scene_duration.toFixed(1)}s`}
                          icon={BarChart3}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Value Proposition */}
            <div className="mb-6">
              <div className="bg-[#0B0F1A] rounded-[32px] p-6">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  
                  Value Proposition Analysis
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div
                    className={`p-4 rounded-[32px] border-2 ${
                      selectedAd.analysis?.value_proposition?.urgency
                        ? "bg-red-950/30 border-red-800"
                        : "bg-black/30 border-gray-800"
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      {selectedAd.analysis?.value_proposition?.urgency ? (
                        <CheckCircle className="w-6 h-6 text-red-500" />
                      ) : (
                        <XCircle className="w-6 h-6 text-gray-400" />
                      )}
                      <h3 className="text-lg font-semibold text-white">
                        Urgency Detected
                      </h3>
                    </div>
                    <p className="text-gray-400">
                      {selectedAd.analysis?.value_proposition?.urgency
                        ? "Yes - creates urgency/scarcity"
                        : "No urgency indicators found"}
                    </p>
                    <div
                      className={`mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${
                        selectedAd.analysis?.value_proposition?.urgency
                          ? "bg-red-900/50 text-red-400"
                          : "bg-gray-800 text-gray-400"
                      }`}
                    >
                      {selectedAd.analysis?.value_proposition?.urgency ? (
                        <Zap className="w-4 h-4" />
                      ) : (
                        <Clock className="w-4 h-4" />
                      )}
                    </div>
                  </div>

                  {(selectedAd.analysis?.value_proposition?.benefits?.length ?? 0) > 0 ? (
                    <div className="p-4 rounded-[32px] border-2 bg-emerald-950/30 border-emerald-800">
                      <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                        <Heart className="w-5 h-5 text-emerald-400" />
                        Key Benefits Identified
                      </h3>
                      <ul className="space-y-2">
                        {(selectedAd.analysis?.value_proposition?.benefits ?? []).map(
                          (benefit, idx) => (
                            <li
                              key={idx}
                              className="flex items-start gap-2 text-gray-300"
                            >
                              <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                              <span>{benefit}</span>
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  ) : (
                    <div className="p-4 rounded-[32px] border-2 bg-black/30 border-gray-800 flex items-center justify-center">
                      <p className="text-gray-500 text-center">
                        No clear benefits identified in this ad
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Influencer Analysis */}
            <div className="mb-6">
              <div className="bg-[#0B0F1A] rounded-[32px] p-6">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  
                  Influencer Analysis
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                  <MetricCard
                    label="Influencer Detection"
                    value={
                      selectedAd.analysis?.has_influencer
                        ? `Found ${selectedAd.analysis?.influencer_count ?? 0} influencer(s)`
                        : "No influencers detected"
                    }
                    icon={Users}
                    className="bg-purple-950/30 border-purple-800"
                  />
                  <MetricCard
                    label="Count"
                    value={selectedAd.analysis?.influencer_count ?? 0}
                    icon={Percent}
                    className="bg-purple-950/30 border-purple-800"
                  />
                </div>

                {selectedAd.analysis?.has_influencer &&
                  (selectedAd.analysis?.influencer_names?.length ?? 0) > 0 && (
                    <div className="mt-4">
                      <h3 className="text-lg font-semibold text-white mb-3">
                        Detected Influencers
                      </h3>
                      <div className="space-y-3">
                        {(selectedAd.analysis?.influencer_names ?? []).map((inf, idx) => (
                          <div
                            key={idx}
                            className="p-4 bg-purple-950/30 rounded-[32px] border border-purple-800"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-bold text-white">
                                {inf.name}
                              </h4>
                              {inf.is_influencer && (
                                <span className="px-3 py-1 bg-purple-600 text-white rounded-full text-xs font-semibold">
                                  INFLUENCER
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-400">
                              Sources: {inf.sources?.join(", ") || "Unknown"}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            </div>

            {/* Ad Content */}
            <div className="mb-6">
              <div className="bg-[#0B0F1A] rounded-[32px] p-6">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  {/* <MessageSquare className="w-6 h-6 text-cyan-400" /> */}
                  Ad Content Analysis
                </h2>

                {selectedAd.full_ad_text && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-white mb-5">
                      Full Ad Text
                    </h3>
                    <div className="bg-black/50 p-4 rounded-[32px] border border-gray-800">
                      <p className="text-gray-300 whitespace-pre-wrap">
                        {selectedAd.full_ad_text}
                      </p>
                    </div>
                  </div>
                )}

                {selectedAd.ad_text && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-white mb-5">
                      Primary Text
                    </h3>
                    <div className="bg-black/50 p-4 rounded-[32px] border border-gray-800">
                      <p className="text-gray-300 whitespace-pre-wrap">
                        {selectedAd.ad_text}
                      </p>
                    </div>
                  </div>
                )}

                {selectedAd.call_to_action && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2 mb-5">
                      {/* <Target className="w-5 h-5 text-cyan-400" /> */}
                      Call to Action
                    </h3>
                    <div className="inline-block rounded-full p-[2px] bg-gradient-to-r from-cyan-400 via-violet-500 to-pink-500 shadow-[0_0_25px_rgba(168,85,247,0.25)]">
                      <div className="rounded-full bg-gradient-to-r from-[#2c2c2c] to-[#3a3a3a] px-6 py-2 font-bold text-lg text-white text-center">
                        {selectedAd.call_to_action}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </>
  );
};

/* -------------------- Helper Components -------------------- */
interface ScoreCardProps {
  title: string;
  score: number;
  icon: any;
  description?: string;
  className?: string;
}

const ScoreCard: React.FC<ScoreCardProps> = ({
  title,
  score,
  icon: Icon,
  description,
  className,
}) => {
  const percentage = score;
  return (
    <div className="rounded-[32px] p-[1px] bg-gradient-to-r from-cyan-400 via-violet-500 to-pink-500 shadow-[0_0_30px_rgba(168,85,247,0.15)]">
      <div className={`bg-[#0B0F1A] rounded-[32px] p-6 ${className || ""}`}>
        <div className="flex items-center justify-between mb-3">
          <Icon className="w-8 h-8 text-cyan-400" />
          <span className="text-2xl font-bold px-3 py-1 rounded-[32px] bg-gradient-to-r from-cyan-400 via-violet-500 to-pink-500 bg-clip-text text-transparent">
            {score}/100
          </span>
        </div>
        <h3 className="text-lg font-bold text-white mb-1">{title}</h3>
        {description && <p className="text-sm text-gray-400 mb-3">{description}</p>}
        <div className="w-full bg-gray-800 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-amber-500" : "bg-red-500"
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
};

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: any;
  className?: string;
  score?: number;
}

const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  icon: Icon,
  className,
}) => {
  return (
    <div className={`bg-black/50 rounded-[32px] p-4 border-2 border-gray-800 ${className || ""}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-5 h-5 text-cyan-400" />
        <span className="text-sm text-gray-400 font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold bg-gradient-to-r from-cyan-400 via-violet-500 to-pink-500 bg-clip-text text-transparent">
        {value}
      </div>
    </div>
  );
};

const Refresh = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
    />
  </svg>
);

export default VideoAnalysis;