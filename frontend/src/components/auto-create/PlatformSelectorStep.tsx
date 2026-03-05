// src/components/auto-create/PlatformSelectorStep.tsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Facebook, Globe, Linkedin, Twitter, ChevronRight } from 'lucide-react';

interface PlatformSelectorStepProps {
  onPlatformSelect: (platforms: string[]) => void;
}

const PlatformSelectorStep: React.FC<PlatformSelectorStepProps> = ({ onPlatformSelect }) => {
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);

  const platforms = [
    {
      id: 'meta',
      name: 'Meta',
      description: 'Facebook & Instagram ads',
      icon: Facebook,
      color: 'from-blue-600 to-blue-700',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-700'
    },
    {
      id: 'google',
      name: 'Google',
      description: 'Search, Display & YouTube ads',
      icon: Globe,
      color: 'from-green-500 to-blue-500',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-700'
    },
    {
      id: 'linkedin',
      name: 'LinkedIn',
      description: 'Professional network ads',
      icon: Linkedin,
      color: 'from-blue-700 to-blue-800',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-700'
    },
    {
      id: 'twitter',
      name: 'X (Twitter)',
      description: 'Promoted posts & trends',
      icon: Twitter,
      color: 'from-black to-gray-800',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      textColor: 'text-gray-700'
    }
  ];

  const handlePlatformToggle = (platformId: string) => {
    setSelectedPlatforms(prev => {
      const newSelection = prev.includes(platformId)
        ? prev.filter(id => id !== platformId)
        : [...prev, platformId];
      
      // Call the callback with updated selection
      onPlatformSelect(newSelection);
      return newSelection;
    });
  };

  const _handleContinue = () => {
    if (selectedPlatforms.length > 0) {
      // The onPlatformSelect callback is already called when platforms change
      // You can add additional logic here if needed
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8"
    >
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-slate-800 mb-3">
          Where do you want to publish your ad?
        </h1>
        <p className="text-slate-600 text-lg max-w-2xl mx-auto">
          Select one or more platforms. We'll optimize your campaign for each selected platform.
        </p>
      </div>

      {/* Platform Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {platforms.map((platform) => {
          const isSelected = selectedPlatforms.includes(platform.id);
          const Icon = platform.icon;

          return (
            <motion.button
              key={platform.id}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handlePlatformToggle(platform.id)}
              className={`relative rounded-xl border-2 p-6 text-left transition-all duration-200 ${
                isSelected
                  ? `border-cyan-500 bg-gradient-to-br ${platform.color} text-white shadow-lg scale-105`
                  : `${platform.borderColor} ${platform.bgColor} hover:border-cyan-300 hover:shadow-md`
              }`}
            >
              {/* Selection Indicator */}
              {isSelected && (
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center">
                  <div className="w-4 h-4 bg-white rounded-full"></div>
                </div>
              )}

              {/* Platform Icon */}
              <div className={`w-16 h-16 rounded-2xl mb-4 flex items-center justify-center ${
                isSelected 
                  ? 'bg-white/20 backdrop-blur-sm' 
                  : `${platform.bgColor} ${platform.textColor}`
              }`}>
                <Icon className="w-8 h-8" />
              </div>

              {/* Platform Name */}
              <h3 className={`text-xl font-bold mb-2 ${
                isSelected ? 'text-white' : platform.textColor
              }`}>
                {platform.name}
              </h3>

              {/* Platform Description */}
              <p className={`text-sm ${isSelected ? 'text-white/90' : 'text-slate-600'}`}>
                {platform.description}
              </p>

              {/* Selected Indicator */}
              {isSelected && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4 flex items-center gap-2 text-sm font-medium text-white/90"
                >
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                  Selected
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Selection Summary */}
      {selectedPlatforms.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-cyan-50 to-teal-50 border border-cyan-200 rounded-xl p-6 mb-8"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-cyan-800 text-lg mb-1">
                Great choice! Ready for the next step
              </h3>
              <p className="text-cyan-700">
                You've selected {selectedPlatforms.length} platform{selectedPlatforms.length > 1 ? 's' : ''}:{' '}
                {selectedPlatforms.map(id => 
                  platforms.find(p => p.id === id)?.name
                ).join(', ')}
              </p>
            </div>
            
            <div className="flex items-center gap-3 text-cyan-700">
              <span className="font-semibold">Next:</span>
              <span className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-cyan-300">
                Campaign Goal <ChevronRight className="w-4 h-4" />
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Instructions */}
      <div className="text-center text-slate-500 text-sm">
        <p>
          💡 <span className="font-semibold">Pro tip:</span> Select multiple platforms to reach wider audiences. 
          We'll tailor creatives and messaging for each platform automatically.
        </p>
      </div>
    </motion.div>
  );
};

export default PlatformSelectorStep;