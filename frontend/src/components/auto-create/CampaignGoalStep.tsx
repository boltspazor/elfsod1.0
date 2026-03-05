// src/components/auto-create/CampaignGoalStep.tsx
import React, { useState, useEffect } from 'react';
import { CheckCircle } from 'lucide-react';
import { AUTOCREATE_API_URL } from '../../config';

interface CampaignGoalStepProps {
  selectedGoal: 'awareness' | 'consideration' | 'conversions' | 'retention' | null;
  setSelectedGoal: (goal: 'awareness' | 'consideration' | 'conversions' | 'retention') => void;
  selectedPlatforms?: string[];
}

const goals = [
  {
    id: 'awareness' as const,
    title: 'Brand Awareness',
    description: 'Choose the primary objective for your advertising',
    gradient: 'linear-gradient(160deg,#00e5d4 0%,#8b6fff 50%,#ff4fcb 100%)',
  },
  {
    id: 'consideration' as const,
    title: 'Consideration',
    description: 'Drive engagement and clicks',
    gradient: 'linear-gradient(160deg,#00e5d4 0%,#8b6fff 50%,#ff4fcb 100%)',
  },
  {
    id: 'conversions' as const,
    title: 'Conversions',
    description: 'Optimize for sales and signups',
    gradient: 'linear-gradient(160deg,#00e5d4 0%,#8b6fff 50%,#ff4fcb 100%)',
  },
  {
    id: 'retention' as const,
    title: 'Retention',
    description: 'Re-engage existing customers.',
    gradient: 'linear-gradient(160deg,#00e5d4 0%,#8b6fff 50%,#ff4fcb 100%)',
  },
];

/* Bottom-right toggle shape – matching reference image */
const _ToggleIcon = ({ active }: { active: boolean }) => (
  <div style={{
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 10,
    border: `2px solid ${active ? '#ff4fcb' : 'rgba(255,255,255,0.2)'}`,
    background: active ? '#ff4fcb' : 'transparent',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }}>
    {active && (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M4 9l3.5 3.5L14 5.5" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )}
  </div>
);

const CampaignGoalStep: React.FC<CampaignGoalStepProps> = ({
  selectedGoal,
  setSelectedGoal,
  selectedPlatforms = [],
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) setUserId(String(token).trim());
  }, []);

  const handleGoalSelect = async (goalId: typeof goals[number]['id']) => {
    setSelectedGoal(goalId);
    if (!userId) { setError('Not authenticated.'); return; }

    setIsSubmitting(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch(`${AUTOCREATE_API_URL}/api/campaign-goal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: goalId, user_id: userId, platforms: selectedPlatforms }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to save goal');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save goal');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <h2 style={{ color: '#fff', fontSize: 28, fontWeight: 700, marginBottom: 6 }}>
        Select Campaign Goal
      </h2>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, marginBottom: 20 }}>
        Choose the primary objective for your advertising
      </p>

      {/* Success Banner */}
      {success && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: '#1a4a3f', border: '1px solid #2d7460',
          borderRadius: 8, padding: '12px 16px', marginBottom: 24,
          color: '#4ade80', fontSize: 14, fontWeight: 600,
        }}>
          <CheckCircle size={16} />
          Goal Saved Successfully!
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div style={{
          background: '#4a1a1a', border: '1px solid #7a2020',
          borderRadius: 8, padding: '12px 16px', marginBottom: 24,
          color: '#f87171', fontSize: 14,
        }}>
          {error}
        </div>
      )}

      {/* Cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {goals.map(goal => {
          const isSelected = selectedGoal === goal.id;
          return (
            <button
              key={goal.id}
              onClick={() => handleGoalSelect(goal.id)}
              disabled={isSubmitting}
              style={{
                position: 'relative',
                background: 'transparent',
                border: 'none',
                padding: 2,
                borderRadius: 18,
                cursor: isSubmitting ? 'wait' : 'pointer',
              }}
            >
              {/* Gradient border wrapper */}
              <div style={{
                backgroundImage: goal.gradient,
                borderRadius: 18,
                padding: 2,
              }}>
                <div style={{
                  background: '#131313',
                  borderRadius: 16,
                  padding: '24px 20px 64px',
                  minHeight: 300,
                  display: 'flex',
                  flexDirection: 'column',
                  textAlign: 'left',
                  position: 'relative',
                }}>
                  <h3 style={{
                    color: '#fff',
                    fontSize: 22,
                    fontWeight: 700,
                    marginBottom: 12,
                    lineHeight: 1.25,
                  }}>
                    {goal.title}
                  </h3>
                  <p style={{
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: 13,
                    lineHeight: 1.5,
                    marginTop: 'auto',
                  }}>
                    {goal.description}
                  </p>
                </div>
              </div>

              {/* Toggle icon overlapping the card bottom */}
              <div style={{
                position: 'absolute',
                bottom: 12,
                right: 12,
                width: 44,
                height: 44,
                borderRadius: 12,
                border: `2px solid ${isSelected ? '#ff4fcb' : 'rgba(255,255,255,0.2)'}`,
                background: isSelected ? '#ff4fcb' : '#1a1a1a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s, border-color 0.2s',
              }}>
                {isSelected && (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M5 10.5l3.5 3.5L15 7" stroke="#000" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CampaignGoalStep;