// GenerateAdPopup.tsx - FIXED VERSION with immediate image display
import React, { useState, useEffect } from 'react';
import { colors } from '../styles/colors';
import { IMAGE_GEN_API_URL } from '../config';
import { useBrandIdentityOptional } from '../contexts/BrandIdentityContext';
import { svgPlaceholder } from '../utils/imageFallback';

interface GenerateAdPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const GenerateAdPopup: React.FC<GenerateAdPopupProps> = ({ isOpen, onClose }) => {
  const { assets: brandAssets, hasAssets } = useBrandIdentityOptional();
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [_debugInfo, setDebugInfo] = useState<string>('');
  const [imageHistory, setImageHistory] = useState<Array<{ url: string, prompt: string, timestamp: Date }>>([]);
  const [_isLoadingHistory, _setIsLoadingHistory] = useState(false);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<string>('16:9');
  const [selectedStyle, setSelectedStyle] = useState<string>('photorealistic');
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [negativePrompt, setNegativePrompt] = useState('');

  // NEW STATES for immediate display
  const [generationStatus, setGenerationStatus] = useState<'idle' | 'generating' | 'cloudfront_ready' | 'downloading' | 'local_ready'>('idle');
  const [_taskId, setTaskId] = useState<string | null>(null);
  const [cloudfrontUrl, setCloudfrontUrl] = useState<string | null>(null);
  const [localPollInterval, setLocalPollInterval] = useState<ReturnType<typeof setInterval> | null>(null);

  // Load image history from localStorage on component mount
  useEffect(() => {
    if (isOpen) {
      const savedHistory = localStorage.getItem('adGenerationHistory');
      if (savedHistory) {
        try {
          const parsedHistory = JSON.parse(savedHistory);
          setImageHistory(parsedHistory.slice(0, 5)); // Keep only last 5
        } catch (err) {
          console.error('Error loading history:', err);
        }
      }
    }

    // Cleanup interval on unmount
    return () => {
      if (localPollInterval) {
        clearInterval(localPollInterval);
      }
    };
  }, [isOpen, localPollInterval]);

  if (!isOpen) return null;

  // Aspect ratio options
  const aspectRatios = [
    { value: '1:1', label: 'Square (1:1)', icon: '⬜', runway_ratio: '1024:1024' },
    { value: '16:9', label: 'Wide (16:9)', icon: '📺', runway_ratio: '1344:768' },
    { value: '9:16', label: 'Portrait (9:16)', icon: '📱', runway_ratio: '768:1344' },
    { value: '4:5', label: 'Facebook (4:5)', icon: '👍', runway_ratio: '832:1248' },
    { value: '1344:768', label: 'Landscape (1344:768)', icon: '🌄', runway_ratio: '1344:768' },
  ];

  // Style options
  const styleOptions = [
    { value: 'photorealistic', label: 'Photorealistic', icon: '📷' },
    { value: 'illustration', label: 'Illustration', icon: '🎨' },
    { value: 'anime', label: 'Anime', icon: '🌸' },
    { value: 'digital_art', label: 'Digital Art', icon: '🖥️' },
    { value: 'minimalist', label: 'Minimalist', icon: '⚫' },
    { value: 'vintage', label: 'Vintage', icon: '📜' },
    { value: 'futuristic', label: 'Futuristic', icon: '🚀' },
  ];

  // Start polling for local image
  const _startPollingLocalImage = (taskId: string) => {
    console.log(`🚀 Starting polling for local image with task_id: ${taskId}`);

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`${IMAGE_GEN_API_URL}/check_local_image/${taskId}`);
        const data = await response.json();

        console.log('Local image check response:', data);

        if (data.success && data.status === 'available_locally') {
          // Local image is ready!
          clearInterval(pollInterval);
          setGenerationStatus('local_ready');

          // Add timestamp to prevent caching
          const timestamp = new Date().getTime();
          const localUrl = `${data.local_url}?t=${timestamp}`;

          setGeneratedImage(localUrl);
          console.log('✅ Local image loaded:', localUrl);

          // Save to history
          const newHistoryItem = {
            url: localUrl,
            cloudfront_url: cloudfrontUrl,
            prompt: prompt,
            task_id: taskId,
            timestamp: new Date(),
          };

          const updatedHistory = [newHistoryItem, ...imageHistory].slice(0, 5);
          setImageHistory(updatedHistory);
          localStorage.setItem('adGenerationHistory', JSON.stringify(updatedHistory));
        }
      } catch (err) {
        console.error('Error polling for local image:', err);
      }
    }, 2000); // Poll every 2 seconds

    setLocalPollInterval(pollInterval);
  };

  // NEW: Load image with progressive enhancement
  const _loadImageProgressively = async (imageUrl: string, taskId: string): Promise<string> => {
    console.log('🔍 Starting progressive image load for:', imageUrl);

    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        console.log('✅ Image loaded successfully:', imageUrl);
        resolve(imageUrl);
      };

      img.onerror = async () => {
        console.log('🔄 CloudFront URL failed, checking for local copy...');

        try {
          // Check if local copy exists
          const response = await fetch(`${IMAGE_GEN_API_URL}/check_local_image/${taskId}`);
          const data = await response.json();

          if (data.success && data.status === 'available_locally') {
            const localUrl = `${data.local_url}?t=${new Date().getTime()}`;
            console.log('✅ Found local copy:', localUrl);

            const localImg = new Image();
            localImg.onload = () => resolve(localUrl);
            localImg.onerror = () => reject(new Error('Both CloudFront and local URLs failed'));
            localImg.src = localUrl;
          } else {
            reject(new Error('Image failed to load and no local copy found'));
          }
        } catch (err) {
          reject(new Error('Failed to check local image'));
        }
      };

      // Start loading
      img.src = imageUrl;

      // Set timeout for loading
      setTimeout(() => {
        if (!img.complete) {
          console.log('⏱️ Image loading taking too long, user can see CloudFront URL at least');
          // Don't reject, let it continue loading
        }
      }, 3000); // 3 second timeout
    });
  };

  // UPDATED handleGenerate function
  // UPDATED handleGenerate function - Simplified version
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a description for your ad');
      return;
    }

    setIsGenerating(true);
    setGenerationStatus('generating');
    setError(null);
    setGeneratedImage(null);
    setDebugInfo('');
    setTaskId(null);

    // Clear any existing interval
    if (localPollInterval) {
      clearInterval(localPollInterval);
    }

    try {
      console.log('Sending prompt:', prompt);
      console.log('Selected aspect ratio:', selectedAspectRatio);
      console.log('Selected style:', selectedStyle);

      // Construct enhanced prompt
      const enhancedPrompt = `${prompt}`;

      const body: Record<string, unknown> = {
        message: enhancedPrompt,
        aspect_ratio: selectedAspectRatio,
        style: selectedStyle,
        negative_prompt: negativePrompt,
      };
      if (brandAssets.length > 0) {
        body.brand_identity_assets = brandAssets.map((a) => ({
          type: a.type,
          name: a.name,
          data_url: a.dataUrl,
        }));
      }

      const response = await fetch(`${IMAGE_GEN_API_URL}/image_gen`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Full response data:', data);

      if (!response.ok) {
        const errorMessage = data.error || data.message || `Failed to generate image (Status: ${response.status})`;
        console.error('API Error:', data);
        throw new Error(errorMessage);
      }

      // Handle response - USE LOCAL URL IMMEDIATELY
      if (data.success) {
        setTaskId(data.task_id);

        // Show the local image immediately with timestamp to prevent caching
        if (data.image_url) {
          const timestamp = new Date().getTime();
          const imageUrl = `${data.image_url}?t=${timestamp}`;

          setGeneratedImage(imageUrl);
          setGenerationStatus('local_ready');
          setIsGenerating(false);

          console.log('🚀 Immediately showing local image:', imageUrl);

          // Save to history
          const newHistoryItem = {
            url: imageUrl,
            cloudfront_url: data.cloudfront_url,
            prompt: prompt,
            task_id: data.task_id,
            timestamp: new Date(),
          };

          const updatedHistory = [newHistoryItem, ...imageHistory].slice(0, 5);
          setImageHistory(updatedHistory);
          localStorage.setItem('adGenerationHistory', JSON.stringify(updatedHistory));
        } else if (data.data_uri) {
          // If local URL fails, use data URI
          setGeneratedImage(data.data_uri);
          setGenerationStatus('local_ready');
          setIsGenerating(false);
        } else {
          throw new Error('No image URL received from server');
        }
      } else {
        throw new Error(data.error || 'No image URL received from server');
      }
    } catch (err) {
      console.error('Error generating ad:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate advertisement. Please check your connection and try again.';
      setError(errorMessage);
      setGenerationStatus('idle');
      setIsGenerating(false);

      setDebugInfo(`Error details: ${errorMessage}\n\nPlease check:\n1. Is the backend running on port 5002?\n2. Check browser console for CORS errors\n3. Try visiting http://localhost:5002/debug`);
    }
  };

  // Add a function to get status message
  const getStatusMessage = () => {
    switch (generationStatus) {
      case 'generating':
        return 'AI is generating your image...';
      case 'cloudfront_ready':
        return 'Image generated! Loading from CloudFront...';
      case 'downloading':
        return 'Downloading local copy...';
      case 'local_ready':
        return 'Image ready!';
      default:
        return '';
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isGenerating && !generatedImage) {
      e.preventDefault();
      handleGenerate();
    }
  };

  const handleReset = () => {
    setPrompt('');
    setGeneratedImage(null);
    setError(null);
    setNegativePrompt('');
    setIsGenerating(false);
    setGenerationStatus('idle');
    setTaskId(null);
    setCloudfrontUrl(null);

    // Clear interval
    if (localPollInterval) {
      clearInterval(localPollInterval);
    }
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const loadFromHistory = (imageUrl: string, historyPrompt: string) => {
    setGeneratedImage(imageUrl);
    setPrompt(historyPrompt);
    setGenerationStatus('local_ready');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Prompt copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleQuickPrompt = (quickPrompt: string) => {
    setPrompt(quickPrompt);
  };

  const quickPrompts = [
    "A modern tech startup office with diverse team collaborating",
    "Eco-friendly product packaging on a clean white background",
    "Fitness app interface showing workout progress charts",
    "Luxury watch with elegant typography and minimal design",
    "Food delivery service with happy customers enjoying meals"
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      {/* Popup Container */}
      <div className="relative w-[90vw] max-w-6xl h-auto max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden my-8">
        {/* Header */}
        <div className="px-8 py-6 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className={`text-2xl font-bold ${colors.neutral.textDark} mb-1`}>
                Generate Advertisement
              </h2>
              <p className={`text-sm ${colors.neutral.textLight}`}>
                {generatedImage ? 'Your ad has been generated!' : 'Describe your ad and let AI create it for you'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {generatedImage && (
                <button
                  onClick={handleReset}
                  className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 transition-colors text-sm font-medium text-slate-700 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Ad
                </button>
              )}
              <button
                onClick={handleClose}
                className="w-10 h-10 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition-colors flex items-center justify-center"
                disabled={isGenerating}
              >
                <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Brand identity notice */}
        <div className="px-8 py-3 bg-amber-50 border-b border-amber-200 flex items-center gap-2 text-amber-800 text-sm">
          <span className="font-medium">Brand identity:</span>
          {hasAssets ? (
            <span>Your {brandAssets.length} brand asset{brandAssets.length !== 1 ? 's' : ''} (logos/media) will be included in this generation.</span>
          ) : (
            <span>Upload logos and media in <strong>Brand Identity</strong> (profile menu) to include them in generations.</span>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 p-8 overflow-y-auto bg-gradient-to-br from-slate-50/50 to-white">
          <div className="max-w-6xl mx-auto">

            {/* NEW: Progressive Loading States */}
            {(isGenerating || generationStatus === 'cloudfront_ready' || generationStatus === 'downloading') && (
              <div className="mb-8">
                <div className="bg-white rounded-xl border-2 border-slate-200 shadow-lg overflow-hidden mb-4">
                  {/* Image placeholder with CloudFront URL if available */}
                  {cloudfrontUrl ? (
                    <div className="relative w-full aspect-video bg-gradient-to-br from-slate-100 to-slate-200 flex flex-col items-center justify-center">
                      {/* Show CloudFront image immediately */}
                      <img
                        src={cloudfrontUrl}
                        alt="Generated Advertisement (CloudFront)"
                        className="w-full h-auto max-h-[60vh] object-contain opacity-80"
                        onLoad={() => console.log('CloudFront image loaded')}
                        onError={() => console.log('CloudFront image still loading')}
                      />

                      {/* Loading overlay */}
                      <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center">
                        <div className="relative">
                          <div className="w-16 h-16 rounded-full border-4 border-slate-200 border-t-slate-700 animate-spin"></div>
                          <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-transparent border-r-slate-500 animate-spin" style={{ animationDuration: '1.5s' }}></div>
                        </div>

                        <h3 className={`text-lg font-semibold ${colors.neutral.textDark} mt-6 mb-2`}>
                          {generationStatus === 'cloudfront_ready' ? 'Image Generated!' : 'Generating Your Advertisement'}
                        </h3>

                        <p className={`text-sm ${colors.neutral.textLight} text-center max-w-md mb-4`}>
                          {generationStatus === 'cloudfront_ready'
                            ? 'CloudFront image is loading. Downloading local copy for faster access...'
                            : 'Our AI is crafting your perfect ad. This may take 30-60 seconds...'}
                        </p>

                        {/* Progress indicators */}
                        <div className="flex items-center gap-2 mb-4">
                          <div className={`w-3 h-3 rounded-full ${generationStatus !== 'idle' ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                          <div className={`w-3 h-3 rounded-full ${generationStatus === 'cloudfront_ready' || generationStatus === 'downloading' || generationStatus === 'local_ready' ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                          <div className={`w-3 h-3 rounded-full ${generationStatus === 'downloading' || generationStatus === 'local_ready' ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                          <div className={`w-3 h-3 rounded-full ${generationStatus === 'local_ready' ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                        </div>

                        {/* Status labels */}
                        <div className="flex justify-between w-64 text-xs text-slate-500">
                          <span>Started</span>
                          <span>AI Processing</span>
                          <span>CloudFront</span>
                          <span>Local Copy</span>
                        </div>

                        {/* If we have CloudFront URL, show it */}
                        {cloudfrontUrl && (
                          <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-xs text-blue-700 mb-1">
                              <span className="font-medium">Pro Tip:</span> CloudFront image is already available!
                            </p>
                            <button
                              onClick={() => window.open(cloudfrontUrl, '_blank')}
                              className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                            >
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                              Open CloudFront image in new tab
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    // No CloudFront URL yet - show spinner
                    <div className="w-full aspect-video bg-gradient-to-br from-slate-100 to-slate-200 flex flex-col items-center justify-center">
                      <div className="relative">
                        <div className="w-24 h-24 rounded-full border-4 border-slate-200 border-t-slate-700 animate-spin"></div>
                        <div className="absolute inset-0 w-24 h-24 rounded-full border-4 border-transparent border-r-slate-500 animate-spin" style={{ animationDuration: '1.5s' }}></div>
                      </div>
                      <h3 className={`text-xl font-semibold ${colors.neutral.textDark} mt-8 mb-2`}>
                        Generating Your Advertisement
                      </h3>
                      <p className={`text-sm ${colors.neutral.textLight} text-center max-w-md`}>
                        Our AI is crafting your perfect ad. This may take 30-60 seconds...
                      </p>
                      <div className="mt-6 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-slate-400 animate-pulse"></div>
                        <div className="w-2 h-2 rounded-full bg-slate-400 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-2 h-2 rounded-full bg-slate-400 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Status bar */}
                <div className="p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">Status: {getStatusMessage()}</span>
                    <span className="text-xs text-slate-500">Using RunwayML</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-300"
                      style={{
                        width: generationStatus === 'generating' ? '30%' :
                          generationStatus === 'cloudfront_ready' ? '70%' :
                            generationStatus === 'downloading' ? '90%' :
                              '100%'
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            )}

            {/* Generated Image Display - Final state */}
            {generatedImage && generationStatus === 'local_ready' && !isGenerating && (
              <div className="mb-8">
                <div className="bg-white rounded-xl border-2 border-slate-200 shadow-lg overflow-hidden mb-4">
                  <img
                    src={generatedImage}
                    alt="Generated Advertisement"
                    className="w-full h-auto max-h-[60vh] object-contain"
                    onLoad={() => console.log('Final image loaded successfully')}
                  />
                </div>

                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-emerald-900 mb-1">Ad generated successfully!</h4>
                      <p className="text-sm text-slate-600">Prompt: "{prompt}"</p>
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => copyToClipboard(prompt)}
                          className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Copy prompt
                        </button>
                        {cloudfrontUrl && (
                          <button
                            onClick={() => window.open(cloudfrontUrl, '_blank')}
                            className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            Open original
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <a
                      href={generatedImage}
                      download="generated-ad.png"
                      className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 transition-colors text-sm font-medium text-slate-700 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download
                    </a>
                    <button
                      onClick={() => navigator.clipboard.writeText(generatedImage)}
                      className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 transition-colors text-sm font-medium text-slate-700 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy Image URL
                    </button>
                    <button
                      onClick={handleReset}
                      className="px-5 py-2 rounded-lg bg-gradient-to-r from-slate-700 to-slate-900 text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Generate New
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Error State */}
            {error && !isGenerating && !generatedImage && (
              <div className="mb-6">
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 mb-3">
                  <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h4 className="text-sm font-semibold text-red-900 mb-1">Generation Failed</h4>
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleReset}
                    className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 transition-colors text-sm font-medium text-slate-700"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={() => setError(null)}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-slate-700 to-slate-900 text-white text-sm font-semibold shadow-md"
                  >
                    Continue Editing
                  </button>
                </div>
              </div>
            )}

            {/* Input Form - Only show if not generating and no image */}
            {!isGenerating && !generatedImage && (
              <div className="space-y-6">
                {/* Quick Prompts */}
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <h3 className={`text-sm font-semibold ${colors.neutral.textDark} mb-3 flex items-center gap-2`}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    Quick Prompts
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {quickPrompts.map((quickPrompt, index) => (
                      <button
                        key={index}
                        onClick={() => handleQuickPrompt(quickPrompt)}
                        className="px-3 py-2 text-sm rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors"
                      >
                        {quickPrompt.length > 50 ? quickPrompt.substring(0, 50) + '...' : quickPrompt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Generation Settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Aspect Ratio Selection */}
                  <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <h3 className={`text-sm font-semibold ${colors.neutral.textDark} mb-3 flex items-center gap-2`}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                      </svg>
                      Aspect Ratio
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                      {aspectRatios.map((ratio) => (
                        <button
                          key={ratio.value}
                          onClick={() => setSelectedAspectRatio(ratio.value)}
                          className={`p-2 rounded-lg border text-sm flex flex-col items-center gap-1 ${selectedAspectRatio === ratio.value
                            ? 'border-slate-700 bg-slate-700 text-white'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                        >
                          <span className="text-lg">{ratio.icon}</span>
                          <span>{ratio.label.split(' ')[0]}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Style Selection */}
                  <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <h3 className={`text-sm font-semibold ${colors.neutral.textDark} mb-3 flex items-center gap-2`}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                      </svg>
                      Style
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {styleOptions.map((style) => (
                        <button
                          key={style.value}
                          onClick={() => setSelectedStyle(style.value)}
                          className={`px-3 py-1.5 rounded-lg border text-sm flex items-center gap-2 ${selectedStyle === style.value
                            ? 'border-slate-700 bg-slate-700 text-white'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                        >
                          <span>{style.icon}</span>
                          <span>{style.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Advanced Settings Toggle */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setIsAdvancedMode(!isAdvancedMode)}
                    className="text-sm text-slate-600 hover:text-slate-800 flex items-center gap-2"
                  >
                    <svg className={`w-4 h-4 transition-transform ${isAdvancedMode ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    Advanced Settings
                  </button>
                  <div className="text-xs text-slate-500">
                    Aspect Ratio: {aspectRatios.find(r => r.value === selectedAspectRatio)?.label} • Style: {styleOptions.find(s => s.value === selectedStyle)?.label}
                  </div>
                </div>

                {/* Advanced Settings */}
                {isAdvancedMode && (
                  <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Negative Prompt (What to avoid)
                      </label>
                      <input
                        type="text"
                        value={negativePrompt}
                        onChange={(e) => setNegativePrompt(e.target.value)}
                        placeholder="blurry, text, watermark, low quality..."
                        className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                )}

                {/* Main Prompt Input */}
                <div className="bg-white rounded-xl border-2 border-slate-200 shadow-lg overflow-hidden">
                  <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200">
                    <h3 className={`text-lg font-semibold ${colors.neutral.textDark} flex items-center gap-2`}>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Describe Your Advertisement
                    </h3>
                    <p className="text-sm text-slate-600 mt-1">
                      Be specific about colors, mood, objects, and setting for best results
                    </p>
                  </div>

                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Example: Create a Facebook ad for our new eco-friendly water bottle. Target audience: environmentally conscious millennials. Use natural green colors, show the product in a forest setting, with sunlight filtering through trees..."
                    className="w-full px-6 py-4 text-base text-slate-700 placeholder-slate-400 focus:outline-none resize-none min-h-[200px]"
                    rows={6}
                  />

                  {/* Input Footer */}
                  <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className={`text-sm ${prompt.length > 0 ? 'text-emerald-600 font-medium' : 'text-slate-500'}`}>
                        {prompt.length} characters
                      </span>
                      <div className="hidden md:flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${prompt.length > 10 ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                        <div className={`w-2 h-2 rounded-full ${prompt.length > 30 ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                        <div className={`w-2 h-2 rounded-full ${prompt.length > 50 ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleClose}
                        className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 transition-colors text-sm font-medium text-slate-700"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleGenerate}
                        disabled={!prompt.trim() || prompt.length < 10}
                        className="px-6 py-2 rounded-lg bg-gradient-to-r from-slate-700 to-slate-900 text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 hover:scale-105"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span>Generate Advertisement</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Hint */}
                <p className="text-xs text-slate-500 text-center">
                  Press Enter to generate or Shift + Enter for a new line • Minimum 10 characters required
                </p>

                {/* History Section */}
                {imageHistory.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 p-4 mt-6">
                    <h3 className={`text-sm font-semibold ${colors.neutral.textDark} mb-3 flex items-center gap-2`}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Recent Generations
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      {imageHistory.map((item, index) => (
                        <div key={index} className="group relative cursor-pointer" onClick={() => loadFromHistory(item.url, item.prompt)}>
                          <div className="aspect-video rounded-lg overflow-hidden border border-slate-200 group-hover:border-slate-400 transition-colors">
                            <img
                              src={item.url}
                              alt="Generated ad"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              onError={(e) => {
                                e.currentTarget.src = svgPlaceholder('Image Expired', 300, 200);
                              }}
                            />
                          </div>
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                            <span className="text-white text-xs text-center px-2">Click to reuse</span>
                          </div>
                          <p className="text-xs text-slate-600 truncate mt-1 px-1">
                            {item.prompt.substring(0, 30)}...
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GenerateAdPopup;