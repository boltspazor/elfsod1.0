import { useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

/* ─── Data ──────────────────────────────────────────────────── */

const steps = [
  {
    id: 'industry',
    question: 'What industry do you primarily serve?',
    options: [
      { label: 'E-Commerce & Retail' },
      { label: 'Technology & SaaS' },
      { label: 'Healthcare &  Wellness' },
      { label: 'Real Estate' },
      { label: 'Foods & Beverages' },
      { label: 'Fashion & Beauty' },
      { label: 'Education' },
      { label: 'Finance & Insurance' },
    ],
  },
  {
    id: 'businessType',
    question: 'What type of marketing business do you run?',
    options: [
      { label: 'Digital Marketing Agency' },
      { label: 'Social Media Marketing' },
      { label: 'Content Marketing' },
      { label: 'Email Marketing' },
      { label: 'SEO/SEM Services' },
      { label: 'Influencer Marketing' },
      { label: 'Brand Strategy' },
      { label: 'Freelancer Marketer' },
    ],
  },
  {
    id: 'goals',
    question: 'What is your primary goal with our platform?',
    options: [
      { label: 'Generate more leads' },
      { label: 'Improve\ncampaign performance' },
      { label: 'Automate\nMarketing Instance' },
      { label: 'Better Understanding\nof Analytics' },
      { label: 'Create Engaging Content' },
      { label: 'Manage Multiple Clients' },
      { label: 'Scale My Business' },
      { label: 'Learning New\nMarketing Services' },
    ],
  },
];

/* ─── Gradient border colours ───────────────────────────────── */
const GRADIENT = 'linear-gradient(to bottom, #00e5d4, #8b6fff, #ff4fcb)';

/* ─── CheckerBoard placeholder ─────────────────────────────── */
const CheckerBoard = () => (
  <div
    style={{
      flex: 1,
      backgroundImage:
        'linear-gradient(45deg, #ccc 25%, transparent 25%),' +
        'linear-gradient(-45deg, #ccc 25%, transparent 25%),' +
        'linear-gradient(45deg, transparent 75%, #ccc 75%),' +
        'linear-gradient(-45deg, transparent 75%, #ccc 75%)',
      backgroundSize: '20px 20px',
      backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
      backgroundColor: '#fff',
    }}
  />
);

/* ─── Option Card ────────────────────────────────────────────── */
const OptionCard = ({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex',
      flexDirection: 'column',
      background: selected
        ? 'linear-gradient(135deg,rgba(0,229,212,0.25),rgba(139,111,255,0.25))'
        : '#2a2a2e',
      border: selected ? '2px solid #8b6fff' : '2px solid #3a3a3e',
      borderRadius: 16,
      overflow: 'hidden',
      cursor: 'pointer',
      transition: 'border-color 0.2s, transform 0.2s',
      aspectRatio: '3/4',
      minWidth: 0,
    }}
    onMouseEnter={e => {
      (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.02)';
    }}
    onMouseLeave={e => {
      (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
    }}
  >
    <CheckerBoard />
    <div
      style={{
        padding: '6px 8px',
        fontSize: 11,
        fontWeight: 500,
        color: selected ? '#fff' : '#ccc',
        textAlign: 'left',
        whiteSpace: 'pre-line',
        lineHeight: 1.3,
        flexShrink: 0,
      }}
    >
      {label}
    </div>
  </button>
);

/* ─── Side Strip ─────────────────────────────────────────────── */
const SideStrip = ({
  stepNumber,
  onClick,
}: {
  stepNumber: number;
  onClick: () => void;
}) => (
  <div
    onClick={onClick}
    style={{
      width: 68,
      flexShrink: 0,
      borderRadius: 20,
      padding: 2,
      background: GRADIENT,
      cursor: 'pointer',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-end',
      paddingBottom: 12,
    }}
  >
    <div
      style={{
        width: '100%',
        height: '100%',
        borderRadius: 18,
        background: '#1a1a1e',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        paddingBottom: 14,
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: '50%',
          border: '2px solid rgba(255,255,255,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 15,
          fontWeight: 700,
          color: '#fff',
          fontFamily: "'Space Mono', monospace",
        }}
      >
        {String(stepNumber).padStart(2, '0')}
      </div>
    </div>
  </div>
);

/* ─── Main Panel ─────────────────────────────────────────────── */
const MainPanel = ({
  step,
  stepNumber,
  selected,
  onSelect,
}: {
  step: (typeof steps)[number];
  stepNumber: number;
  selected: string;
  onSelect: (v: string) => void;
}) => (
  <div
    style={{
      flex: 1,
      borderRadius: 20,
      padding: 2,
      background: GRADIENT,
      display: 'flex',
      flexDirection: 'column',
      minWidth: 0,
    }}
  >
    <div
      style={{
        flex: 1,
        borderRadius: 18,
        background: '#1a1a1e',
        display: 'flex',
        flexDirection: 'column',
        padding: '18px 18px 0 18px',
      }}
    >
      {/* 4 × 2 grid */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: 'repeat(4,1fr)',
          gridTemplateRows: 'repeat(2,1fr)',
          gap: 10,
          minHeight: 0,
        }}
      >
        {step.options.map(opt => (
          <OptionCard
            key={opt.label}
            label={opt.label}
            selected={selected === opt.label}
            onClick={() => onSelect(opt.label)}
          />
        ))}
      </div>

      {/* Footer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '18px 0 18px',
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 15,
            fontWeight: 700,
            color: '#fff',
            fontFamily: "'Space Mono', monospace",
            flexShrink: 0,
          }}
        >
          {String(stepNumber).padStart(2, '0')}
        </div>
        <span
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: '#fff',
            fontFamily: "'Space Mono', monospace",
            lineHeight: 1.3,
          }}
        >
          {step.question}
        </span>
      </div>
    </div>
  </div>
);

/* ─── Page ───────────────────────────────────────────────────── */

const OnboardingPage = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleNext = () => {
    if (!answers[steps[currentStep].id]) {
      setError('Please select an option to continue');
      return;
    }
    setError('');
    if (currentStep < steps.length - 1) {
      setCurrentStep(s => s + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep(s => s - 1);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      if (!token) { setError('Auth token missing. Please sign up again.'); return; }

      const payload = {
        industry: answers['industry'],
        businessType: answers['businessType'],
        goals: answers['goals'],
      };

      const res = await fetch('http://localhost:5003/complete-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('user', JSON.stringify(data.user));
        setTimeout(() => { window.location.href = '/'; }, 800);
      } else {
        setError(data.error || 'Failed to complete onboarding');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  /* left / right step indices */
  const leftSteps = steps.slice(0, currentStep);
  const rightSteps = steps.slice(currentStep + 1);

  return (
    <div
      style={{
        height: '100vh',
        background: '#111114',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px 24px',
        boxSizing: 'border-box',
        fontFamily: "'Inter', 'Space Mono', sans-serif",
      }}
    >
      {/* ── Row of panels ──────────────────────────────────── */}
      <div
        style={{
          width: '100%',
          maxWidth: 1100,
          flex: 1,
          minHeight: 0,
          display: 'flex',
          gap: 10,
        }}
      >
        {/* Left strips — previous steps */}
        {leftSteps.map((_, i) => (
          <SideStrip
            key={i}
            stepNumber={i + 1}
            onClick={() => setCurrentStep(i)}
          />
        ))}

        {/* Active panel */}
        <MainPanel
          step={steps[currentStep]}
          stepNumber={currentStep + 1}
          selected={answers[steps[currentStep].id] || ''}
          onSelect={val =>
            setAnswers(prev => ({ ...prev, [steps[currentStep].id]: val }))
          }
        />

        {/* Right strips — upcoming steps */}
        {rightSteps.map((_, i) => (
          <SideStrip
            key={currentStep + 1 + i}
            stepNumber={currentStep + 2 + i}
            onClick={() => {
              /* only allow going forward if current is answered */
              if (answers[steps[currentStep].id]) {
                setCurrentStep(currentStep + 1 + i);
              }
            }}
          />
        ))}
      </div>

      {/* ── Error ─────────────────────────────────────────── */}
      {error && (
        <p style={{ color: '#ff6b6b', marginTop: 12, fontSize: 13, fontWeight: 600 }}>
          {error}
        </p>
      )}

      {/* ── Navigation arrows ─────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          marginTop: 20,
        }}
      >
        <button
          onClick={handlePrev}
          disabled={currentStep === 0}
          style={{
            background: 'none',
            border: 'none',
            cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
            color: currentStep === 0 ? '#444' : '#fff',
            fontSize: 22,
            display: 'flex',
            alignItems: 'center',
            transition: 'color 0.2s',
          }}
        >
          <ArrowLeft size={24} />
        </button>
        <button
          onClick={handleNext}
          disabled={isSubmitting}
          style={{
            background: 'none',
            border: 'none',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            color: '#fff',
            fontSize: 22,
            display: 'flex',
            alignItems: 'center',
            transition: 'color 0.2s',
          }}
        >
          {isSubmitting ? (
            <span style={{ fontSize: 13 }}>Saving…</span>
          ) : (
            <ArrowRight size={24} />
          )}
        </button>
      </div>

      {/* ── Skip ──────────────────────────────────────────── */}
      <button
        onClick={() => { window.location.href = '/'; }}
        style={{
          marginTop: 12,
          background: 'none',
          border: 'none',
          color: '#666',
          fontSize: 13,
          cursor: 'pointer',
          textDecoration: 'underline',
        }}
      >
        Skip for now
      </button>
    </div>
  );
};

export default OnboardingPage;