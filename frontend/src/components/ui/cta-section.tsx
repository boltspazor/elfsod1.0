"use client";
import { ArrowRight, Play } from 'lucide-react';
import { StatefulButton } from './stateful-button';

interface CTASectionProps {
  onGetStarted?: () => void;
  onWatchDemo?: () => void;
}

export const CTASection = ({ onWatchDemo }: CTASectionProps) => {
  const handleGetStarted = async () => {
    // Simulate API call
    return new Promise((resolve) => {
      setTimeout(resolve, 3000);
    });
  };

  const handleWatchDemo = () => {
    // Open demo video or modal
    console.log("Watch demo clicked");
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Horizontal divider line */}
      <div className="relative mb-12">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200/60"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="bg-gradient-to-br from-slate-50 to-cyan-50 px-4 text-slate-500 text-sm">
            Ready to transform your marketing?
          </span>
        </div>
      </div>

      {/* CTA Buttons - Centered and properly spaced */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 px-4">
        {/* Get Started Button */}
        <StatefulButton
          onClick={handleGetStarted}
          variant="gradient"
          className="min-w-[220px] px-8 py-4 text-lg font-semibold shadow-lg shadow-cyan-500/30 hover:shadow-xl hover:shadow-cyan-500/40"
        >
          Get Started for free
          <ArrowRight className="w-5 h-5 ml-2" />
        </StatefulButton>

        {/* Watch Demo Button */}
        <button
          onClick={onWatchDemo || handleWatchDemo}
          className="group flex items-center gap-3 px-6 py-4 border-2 border-slate-200 text-slate-700 rounded-xl font-medium hover:border-cyan-300 hover:bg-cyan-50/50 transition-all duration-300 min-w-[200px]"
        >
          <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center group-hover:bg-cyan-100 transition-colors">
            <Play className="w-5 h-5 text-slate-600 group-hover:text-cyan-600" />
          </div>
          <div className="text-left">
            <div className="font-semibold">Watch Demo</div>
            <div className="text-sm text-slate-500">See it in action</div>
          </div>
        </button>
      </div>
    </div>
  );
};