// src/components/auto-create/StepIndicator.tsx
import React from 'react';

interface Step {
  id: string;
  label: string;
  component: React.ComponentType<any>;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
  onStepClick: (index: number) => void;
}

const ACTIVE_COLORS: Record<string, string> = {
  goal: '#00e5d4',
  creative: '#8b6fff',
  copy: '#c944ff',
  audience: '#00e5d4',
  budget: '#00e5d4',
};

const StepIndicator: React.FC<StepIndicatorProps> = ({ steps, currentStep, onStepClick }) => {
  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: 0 }}>
      {steps.map((step, index) => {
        const isActive = index === currentStep;
        const isClickable = index <= currentStep;
        const accentColor = ACTIVE_COLORS[step.id] ?? '#00e5d4';

        return (
          <button
            key={step.id}
            onClick={() => isClickable && onStepClick(index)}
            disabled={!isClickable}
            style={{
              padding: '16px 28px',
              background: 'transparent',
              border: 'none',
              borderBottom: isActive ? `2px solid ${accentColor}` : '2px solid transparent',
              color: isActive ? '#fff' : 'rgba(255,255,255,0.45)',
              fontWeight: isActive ? 700 : 500,
              fontSize: 15,
              cursor: isClickable ? 'pointer' : 'default',
              whiteSpace: 'nowrap',
              transition: 'color 0.2s, border-color 0.2s',
              marginBottom: -1,  /* overlap the container border */
            }}
          >
            {step.label}
          </button>
        );
      })}
    </div>
  );
};

export default StepIndicator;