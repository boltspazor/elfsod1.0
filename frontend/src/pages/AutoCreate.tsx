// src/pages/AutoCreate.tsx
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Navigation from '../components/Navigation';
import StepIndicator from '../components/auto-create/StepIndicator';
import CampaignGoalStep from '../components/auto-create/CampaignGoalStep';
import CreativeAssetsStep from '../components/auto-create/CreativeAssetsStep';
import CopyMessagingStep from '../components/auto-create/CopyMessagingStep';
import AudienceStep from '../components/auto-create/AudienceStep';
import BudgetTestingStep, { BudgetTestingRef } from '../components/auto-create/BudgetTestingStep';
import { AUTOCREATE_API_URL } from '../config';

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
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedGoal, setSelectedGoal] = useState<CampaignGoal>(null);
  const [selectedPlatforms] = useState<string[]>(['meta']);
  const [savedCampaignId, setSavedCampaignId] = useState<string | null>(null);
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const budgetRef = useRef<BudgetTestingRef>(null);

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

  const handleLaunchCampaign = async () => {
    setIsLaunching(true);
    setLaunchError(null);
    try {
      const token = localStorage.getItem('token') ?? '';

      // Step 1: Save budget data and get campaign ID
      let campaignId = savedCampaignId;
      if (!campaignId && budgetRef.current) {
        campaignId = await budgetRef.current.saveAndGetCampaignId();
      }

      if (!campaignId) {
        setLaunchError('Failed to save campaign data. Please try again.');
        setIsLaunching(false);
        return;
      }

      // Step 2: Publish the campaign
      const res = await fetch(`${AUTOCREATE_API_URL}/api/campaigns/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: token, campaign_id: campaignId }),
      });

      const data = await res.json() as { success?: boolean; error?: string };

      if (data.success) {
        navigate(`/?campaign=${campaignId}`);
      } else {
        setLaunchError(data.error ?? 'Failed to publish campaign.');
      }
    } catch {
      setLaunchError('Network error. Please try again.');
    } finally {
      setIsLaunching(false);
    }
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
              {currentStep === steps.length - 1 ? (
                <BudgetTestingStep
                  ref={budgetRef}
                  {...getStepProps()}
                  onSave={(id) => setSavedCampaignId(id)}
                />
              ) : (
                <CurrentStepComponent {...getStepProps()} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Launch error */}
        {launchError && (
          <div style={{
            background: 'rgba(255,70,70,0.12)',
            border: '1px solid rgba(255,70,70,0.4)',
            borderRadius: 8,
            padding: '12px 16px',
            color: '#ff7070',
            fontSize: 14,
            marginTop: 16,
          }}>
            {launchError}
          </div>
        )}

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
            onClick={currentStep === steps.length - 1 ? handleLaunchCampaign : handleNext}
            disabled={isLaunching}
            style={{
              padding: '10px 28px',
              borderRadius: 8,
              border: 'none',
              background: isLaunching ? 'rgba(139,92,246,0.5)' : accentColor,
              color: '#fff',
              fontWeight: 700,
              fontSize: 15,
              cursor: isLaunching ? 'not-allowed' : 'pointer',
              transition: 'opacity 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
            onMouseEnter={e => { if (!isLaunching) e.currentTarget.style.opacity = '0.85'; }}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            {isLaunching && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            )}
            {currentStep === steps.length - 1 ? (isLaunching ? 'Launching...' : 'Launch Campaign') : 'Next'}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default AutoCreate;

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