// src/pages/AutoCreate.tsx
import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Navigation from '../components/Navigation';
import StepIndicator from '../components/auto-create/StepIndicator';
import CampaignGoalStep from '../components/auto-create/CampaignGoalStep';
import CreativeAssetsStep from '../components/auto-create/CreativeAssetsStep';
import CopyMessagingStep from '../components/auto-create/CopyMessagingStep';
import AudienceStep from '../components/auto-create/AudienceStep';
import BudgetTestingStep from '../components/auto-create/BudgetTestingStep';

export type CampaignGoal = 'awareness' | 'consideration' | 'conversions' | 'retention' | null;

/* accent colours per step, matching the image Next button colours */
const NEXT_COLORS: Record<number, string> = {
  0: '#8b5cf6', // violet-500 – Campaign Goal
  1: '#8b5cf6', // violet-500 – Creative Assets
  2: '#8b5cf6', // violet-500 – Copy & Messaging
  3: '#8b5cf6', // violet-500 – Audience
  4: '#8b5cf6', // violet-500 – Budget & Testing
};

const AutoCreate: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedGoal, setSelectedGoal] = useState<CampaignGoal>(null);
  const [selectedPlatforms] = useState<string[]>(['meta']);

  const steps = [
    { id: 'goal', label: 'Campaign Goal', component: CampaignGoalStep },
    { id: 'creative', label: 'Creative Assets', component: CreativeAssetsStep },
    { id: 'copy', label: 'Copy & Messaging', component: CopyMessagingStep },
    { id: 'audience', label: 'Audience', component: AudienceStep },
    { id: 'budget', label: 'Budget & Testing', component: BudgetTestingStep },
  ];

  const CurrentStepComponent = steps[currentStep].component;

  const getStepProps = () => {
    return { selectedGoal, setSelectedGoal, selectedPlatforms };
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) setCurrentStep(s => s + 1);
  };

  const handlePrevious = () => {
    if (currentStep > 0) setCurrentStep(s => s - 1);
  };

  const accentColor = NEXT_COLORS[currentStep] ?? '#00e5d4';

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d0d', display: 'flex', flexDirection: 'column' }}>
      <Navigation />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: 1200, width: '100%', margin: '0 auto', padding: '0 32px 32px' }}>
        {/* Tab step indicator */}
        <StepIndicator
          steps={steps}
          currentStep={currentStep}
          onStepClick={(i) => { if (i <= currentStep) setCurrentStep(i); }}
        />

        {/* Step content */}
        <div style={{ flex: 1, marginTop: 32 }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.25 }}
              style={{ height: '100%' }}
            >
              <CurrentStepComponent {...getStepProps()} />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 32 }}>
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            style={{
              padding: '10px 28px',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'transparent',
              color: currentStep === 0 ? '#555' : '#fff',
              fontWeight: 600,
              fontSize: 15,
              cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
          >
            Previous
          </button>

          <button
            onClick={handleNext}
            style={{
              padding: '10px 28px',
              borderRadius: 8,
              border: 'none',
              background: accentColor,
              color: '#000',
              fontWeight: 700,
              fontSize: 15,
              cursor: 'pointer',
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            {currentStep === steps.length - 1 ? 'Launch Campaign' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AutoCreate;