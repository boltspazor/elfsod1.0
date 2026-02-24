// src/pages/CommandCenter.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Zap, Eye, Sparkles, Plus, Mic, Send, Loader2 } from 'lucide-react';
import Navigation from '../components/Navigation';

/* ─── Types ─────────────────────────────────────────────────── */
interface Message {
  id: number;
  type: 'bot' | 'user';
  content: string;
  timestamp: string;
}

/* ─── Helpers ────────────────────────────────────────────────── */
const now = () =>
  new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

/* Avatar circles */
const BotAvatar = () => (
  <div style={{
    width: 36, height: 36, borderRadius: '50%',
    background: 'rgba(255,255,255,0.12)',
    border: '1px solid rgba(255,255,255,0.2)',
    flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 16,
  }}>👤</div>
);

const UserAvatar = () => (
  <div style={{
    width: 36, height: 36, borderRadius: '50%',
    background: 'rgba(255,255,255,0.12)',
    border: '1px solid rgba(255,255,255,0.2)',
    flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 16,
  }}>👤</div>
);

/* Typing dots */
const TypingDots = () => (
  <div style={{ display: 'flex', gap: 5, padding: '10px 14px' }}>
    {[0, 1, 2].map(i => (
      <div key={i} style={{
        width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.5)',
        animation: 'pulse 1.4s ease-in-out infinite',
        animationDelay: `${i * 0.2}s`,
      }} />
    ))}
  </div>
);

/* Stat card */
const StatCard = ({ label, value, tall = false }: { label: string; value: string; tall?: boolean }) => (
  <div style={{
    background: '#111', border: '1px solid rgba(139,111,255,0.45)',
    borderRadius: 12, padding: '12px 12px', flex: 1,
    display: 'flex', flexDirection: 'column',
    justifyContent: tall ? 'space-between' : 'flex-start',
    minHeight: tall ? 0 : undefined,
  }}>
    <div style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>{label}</div>
    <div style={{
      fontSize: tall ? 42 : 36, fontWeight: 900, lineHeight: 1, marginTop: 8,
      background: 'linear-gradient(135deg,#00e5d4,#8b6fff)',
      WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
    }}>{value}</div>
  </div>
);

/* Quick action chip */
const ActionChip = ({ icon: Icon, label, onClick }: { icon: React.ElementType; label: string; onClick: () => void }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex', alignItems: 'center', gap: 6,
      background: 'transparent',
      border: '1px solid rgba(255,255,255,0.18)',
      borderRadius: 20, padding: '7px 14px',
      color: 'rgba(255,255,255,0.75)', fontSize: 13,
      cursor: 'pointer', whiteSpace: 'nowrap',
      transition: 'background 0.15s, color 0.15s',
    }}
    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff'; }}
    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; }}
  >
    <Icon size={14} />
    {label}
  </button>
);

/* ─── Main Component ─────────────────────────────────────────── */
const CommandCenter: React.FC = () => {
  const userName = (() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}').name || 'Ravi'; } catch { return 'Ravi'; }
  })();

  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      type: 'bot',
      content: `Welcome Back, ${userName}!\nHow may I help you, Today?\nWhat kind of Advertisement are you looking for?`,
      timestamp: '9.00 AM',
    },
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now(),
      type: 'user',
      content: text,
      timestamp: now(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    // Placeholder typing indicator message id
    const typingId = Date.now() + 1;
    setMessages(prev => [...prev, { id: typingId, type: 'bot', content: '__typing__', timestamp: '' }]);

    try {
      const res = await fetch('http://127.0.0.1:5002/genai_call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          action: 'chat',
          locale: 'US (en-US), currency $',
          context: { brand: 'unknown', product: 'unknown', category: 'unknown', market: 'unknown', pricing: 'unknown', objective: 'unknown', kpi: 'unknown', budget: 'unknown', timeline: 'unknown', stage: 'unknown', channels: 'unknown', competitors: 'unknown', constraints: 'none' },
        }),
      });
      const data = await res.json();
      const reply = data.reply || "I couldn't generate a response.";
      setMessages(prev => prev.filter(m => m.id !== typingId).concat({ id: Date.now() + 2, type: 'bot', content: reply, timestamp: now() }));
    } catch {
      setMessages(prev => prev.filter(m => m.id !== typingId).concat({ id: Date.now() + 2, type: 'bot', content: 'Error connecting to the server. Please make sure the backend is running.', timestamp: now() }));
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = [
    { label: 'Analyze Audience Insights', icon: Zap },
    { label: 'Review Competitor Positioning', icon: Eye },
    { label: 'Generate Creative Concepts for my next Advertisement', icon: Sparkles },
  ];

  const sideNavItems = [
    { icon: '⚡', label: 'AI - powered' },
    { icon: '◎', label: 'Active' },
    { icon: '❄', label: 'Analysis' },
    { icon: '＋', label: 'New Project' },
  ];

  const chatHistory = [
    'Engaging Advertisement for my company',
    'Funny Advertisement for Elfsod',
  ];

  return (
    <div style={{ height: '100vh', background: '#000', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Navigation />

      {/* Content area fills the rest */}
      <div style={{
        flex: 1, minHeight: 0,
        display: 'flex', flexDirection: 'column',
        padding: '4px 40px 10px',
        boxSizing: 'border-box',
      }}>
        {/* Page title */}
        <h1 style={{ color: '#fff', fontSize: 30, fontWeight: 800, marginBottom: 2, flexShrink: 0 }}>Command Center</h1>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, marginBottom: 14, flexShrink: 0 }}>
          Chat with your autonomous advertising agent
        </p>

        {/* Two-column layout — grows to fill remaining height */}
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 14, flex: 1, minHeight: 0 }}>

          {/* ── Left Sidebar ──────────────────────────────── */}
          <div style={{
            background: '#111', borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.07)',
            display: 'flex', flexDirection: 'column',
            padding: '14px 14px', gap: 0,
            overflowY: 'auto',
          }}>
            {/* Nav items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 12 }}>
              {sideNavItems.map(item => (
                <button key={item.label} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: 'transparent', border: 'none',
                  color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: 500,
                  padding: '7px 8px', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                  transition: 'background 0.15s',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={{ fontSize: 16, opacity: 0.7 }}>{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>

            {/* Generate button */}
            <button style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: '#1a1a1a',
              border: '1px solid transparent',
              backgroundImage: 'linear-gradient(#1a1a1a,#1a1a1a), linear-gradient(90deg,#8b6fff,#c944ff)',
              backgroundOrigin: 'border-box',
              backgroundClip: 'padding-box, border-box',
              borderRadius: 10, padding: '10px 0',
              color: '#fff', fontWeight: 700, fontSize: 14,
              cursor: 'pointer', marginBottom: 14,
            } as React.CSSProperties}>
              <Plus size={16} />
              Generate Advertisement
            </button>

            {/* Chat history */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: '#fff', fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Chat history</div>
              {chatHistory.map(item => (
                <button key={item} style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  background: 'transparent', border: 'none',
                  color: 'rgba(255,255,255,0.55)', fontSize: 13,
                  padding: '5px 0', cursor: 'pointer',
                  transition: 'color 0.15s',
                }}
                  onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.55)'}
                >
                  {item}
                </button>
              ))}
            </div>

            {/* Analysis section */}
            <div>
              <div style={{ color: '#fff', fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Analysis</div>
              {/* 2-col grid: left stacks Messages+Campaigns, right is tall Performance */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 6, flex: 1, minHeight: 0 }}>
                <StatCard label="Messages" value="127" />
                <div style={{ gridRow: 'span 2', display: 'flex' }}>
                  <StatCard label="Performance" value="+24%" tall />
                </div>
                <StatCard label="Campaigns" value="24" />
              </div>
            </div>
          </div>

          {/* ── Chat Area ─────────────────────────────────── */}
          <div style={{
            background: '#111', borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.07)',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
          }}>
            {/* Messages scroll area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '28px 28px 0' }}>
              {messages.map(msg => {
                if (msg.type === 'bot') {
                  return (
                    <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginBottom: 24 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
                        <BotAvatar />
                        {msg.content === '__typing__' ? (
                          <div style={{ background: '#1e1e1e', borderRadius: '0 14px 14px 14px', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <TypingDots />
                          </div>
                        ) : (
                          <div style={{
                            background: '#1e1e1e', borderRadius: '0 14px 14px 14px',
                            border: '1px solid rgba(255,255,255,0.08)',
                            padding: '14px 18px',
                            color: '#fff', fontSize: 14, lineHeight: 1.7,
                            maxWidth: 520, whiteSpace: 'pre-line',
                          }}>
                            {msg.content}
                          </div>
                        )}
                      </div>
                      {msg.timestamp && (
                        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 6, marginLeft: 48 }}>
                          {msg.timestamp}
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
                      <div style={{
                        background: '#fff', borderRadius: '14px 14px 0 14px',
                        padding: '14px 18px',
                        color: '#111', fontSize: 14, lineHeight: 1.7,
                        maxWidth: 520,
                      }}>
                        {msg.content}
                      </div>
                      <UserAvatar />
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 6, marginRight: 48 }}>
                      {msg.timestamp}
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Quick Actions */}
            <div style={{ padding: '14px 28px 10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 600, marginBottom: 10, letterSpacing: '0.05em' }}>
                Quick Actions
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {quickActions.map(a => (
                  <ActionChip
                    key={a.label}
                    icon={a.icon}
                    label={a.label}
                    onClick={() => sendMessage(a.label)}
                  />
                ))}
              </div>
            </div>

            {/* Input bar */}
            <div style={{ padding: '12px 20px 20px' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: '#1a1a1a', borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '10px 16px',
              }}>
                <button style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: 0, display: 'flex' }}>
                  <Plus size={18} />
                </button>
                <input
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(inputValue); } }}
                  placeholder="Type something here.."
                  disabled={isLoading}
                  style={{
                    flex: 1, background: 'transparent', border: 'none',
                    color: '#fff', fontSize: 14, outline: 'none',
                  }}
                />
                <button style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: 0, display: 'flex' }}>
                  <Mic size={18} />
                </button>
                <button
                  onClick={() => sendMessage(inputValue)}
                  disabled={!inputValue.trim() || isLoading}
                  style={{
                    background: 'none', border: 'none',
                    color: inputValue.trim() && !isLoading ? '#00e5d4' : 'rgba(255,255,255,0.2)',
                    cursor: inputValue.trim() && !isLoading ? 'pointer' : 'default',
                    padding: 0, display: 'flex', transition: 'color 0.2s',
                  }}
                >
                  {isLoading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={18} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,80%,100%{opacity:.3} 40%{opacity:1} }
        @keyframes spin  { to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
};

export default CommandCenter;