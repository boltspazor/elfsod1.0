// src/pages/CommandCenter.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Zap, Eye, Sparkles, Plus, Mic, Send, Loader2, Trash2, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { GENAI_API_URL } from '../config';
import { useBrandIdentityOptional } from '../contexts/BrandIdentityContext';

/* ─── Types ─────────────────────────────────────────────────── */
interface Message {
  id: number;
  type: 'bot' | 'user';
  content: string;
  timestamp: string;
}

interface ChatSession {
  id: string;          // = session_id from DB
  title: string;
  messages: Message[];
  createdAt: number;
}

/* ─── Helpers ────────────────────────────────────────────────── */
const nowTime = () =>
  new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

function deriveTitle(messages: Message[]): string {
  const first = messages.find(m => m.type === 'user');
  if (!first) return 'New conversation';
  return first.content.length > 40 ? first.content.slice(0, 40) + '…' : first.content;
}

const ACTION_MAP: Record<string, string> = {
  'Analyze Audience Insights': 'analyze_audience',
  'Review Competitor Positioning': 'review_competitors',
  'Generate Creative Concepts for my next Advertisement': 'generate_creatives',
};

/* ─── Simple markdown → JSX renderer ─────────────────────────── */
function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Heading ##
    if (/^#{1,3}\s/.test(line)) {
      const content = line.replace(/^#+\s/, '');
      elements.push(
        <div key={key++} style={{ fontWeight: 800, fontSize: 15, color: '#fff', marginTop: 12, marginBottom: 4 }}>
          {inlineFormat(content)}
        </div>
      );
      continue;
    }

    // Bullet
    if (/^[-*•]\s/.test(line)) {
      elements.push(
        <div key={key++} style={{ display: 'flex', gap: 8, marginBottom: 3, paddingLeft: 4 }}>
          <span style={{ color: '#8b6fff', flexShrink: 0 }}>•</span>
          <span>{inlineFormat(line.replace(/^[-*•]\s/, ''))}</span>
        </div>
      );
      continue;
    }

    // Numbered list
    if (/^\d+\.\s/.test(line)) {
      elements.push(
        <div key={key++} style={{ display: 'flex', gap: 8, marginBottom: 3, paddingLeft: 4 }}>
          <span style={{ color: '#00e5d4', flexShrink: 0 }}>{line.match(/^\d+/)?.[0]}.</span>
          <span>{inlineFormat(line.replace(/^\d+\.\s/, ''))}</span>
        </div>
      );
      continue;
    }

    // Empty line → small gap
    if (line.trim() === '') {
      elements.push(<div key={key++} style={{ height: 6 }} />);
      continue;
    }

    // Normal paragraph
    elements.push(
      <div key={key++} style={{ marginBottom: 3 }}>
        {inlineFormat(line)}
      </div>
    );
  }

  return <>{elements}</>;
}

function inlineFormat(text: string): React.ReactNode {
  // bold **x** and `code`
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (/^\*\*[^*]+\*\*$/.test(part)) {
          return <strong key={i} style={{ color: '#e2e2e2' }}>{part.slice(2, -2)}</strong>;
        }
        if (/^`[^`]+`$/.test(part)) {
          return <code key={i} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 4, padding: '1px 5px', fontSize: 12 }}>{part.slice(1, -1)}</code>;
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </>
  );
}

/* ─── Sub-components ─────────────────────────────────────────── */
const BotAvatar = () => (
  <div style={{
    width: 36, height: 36, borderRadius: '50%',
    background: 'rgba(139,111,255,0.2)',
    border: '1px solid rgba(139,111,255,0.4)',
    flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 16,
  }}>🤖</div>
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
    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(139,111,255,0.15)'; e.currentTarget.style.color = '#fff'; }}
    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; }}
  >
    <Icon size={14} />
    {label}
  </button>
);

/* ─── Main Component ─────────────────────────────────────────── */
const CommandCenter: React.FC = () => {
  const navigate  = useNavigate();
  const { assets: brandAssets, hasAssets } = useBrandIdentityOptional();
  const token      = localStorage.getItem('token') ?? '';
  const authHeader: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  const userName = (() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}').name || 'there'; } catch { return 'there'; }
  })();

  const makeWelcome = (): Message => ({
    id: 1, type: 'bot',
    content: `Welcome Back, ${userName}!\nHow may I help you, Today?\nWhat kind of Advertisement are you looking for?`,
    timestamp: nowTime(),
  });

  const [sessions, setSessions]             = useState<ChatSession[]>([]);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages]             = useState<Message[]>([makeWelcome()]);
  const [inputValue, setInputValue]         = useState('');
  const [isLoading, setIsLoading]           = useState(false);
  const [activeView, setActiveView]         = useState<'chat' | 'analysis'>('chat');
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── Computed stats ─────────────────────────────────────────
  const totalMessages = sessions.reduce((n, s) => n + s.messages.filter(m => m.type === 'user').length, 0)
    + messages.filter(m => m.type === 'user').length;
  const totalCampaigns = sessions.length + (messages.some(m => m.type === 'user') ? 1 : 0);
  const totalSessions = sessions.length;
  const deepCount  = sessions.filter(s => s.messages.filter(m => m.type === 'user').length >= 3).length;
  const perfPct    = totalSessions > 0 ? Math.round((deepCount / totalSessions) * 100) : 0;

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // ── Load history from DB on mount ─────────────────────────
  useEffect(() => {
    if (!token) { setSessionsLoaded(true); return; }
    fetch(`${GENAI_API_URL}/chat/history`, { headers: authHeader })
      .then(r => r.json())
      .then((data: { success?: boolean; sessions?: { session_id: string; title: string; messages: Message[]; created_at: string }[] }) => {
        if (data.success && data.sessions) {
          setSessions(data.sessions.map(s => ({
            id: s.session_id,
            title: s.title,
            messages: s.messages,
            createdAt: new Date(s.created_at).getTime(),
          })));
        }
      })
      .catch(() => { /* silently ignore if backend down */ })
      .finally(() => setSessionsLoaded(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Persist session to DB ──────────────────────────────────
  const persistSession = useCallback((sessionId: string, msgs: Message[]) => {
    if (!token || msgs.filter(m => m.type === 'user').length === 0) return;
    const title = deriveTitle(msgs);
    fetch(`${GENAI_API_URL}/chat/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify({ session_id: sessionId, title, messages: msgs }),
    }).catch(() => { /* silently ignore */ });
    // Update local state too
    setSessions(prev => {
      const exists = prev.some(s => s.id === sessionId);
      if (exists) return prev.map(s => s.id === sessionId ? { ...s, title, messages: msgs } : s);
      return [{ id: sessionId, title, messages: msgs, createdAt: Date.now() }, ...prev];
    });
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load a past session ────────────────────────────────────
  const loadSession = (session: ChatSession) => {
    setActiveSessionId(session.id);
    setMessages(session.messages);
    setActiveView('chat');
  };

  // ── Start fresh ────────────────────────────────────────────
  const newChat = useCallback(() => {
    setActiveSessionId(null);
    setMessages([makeWelcome()]);
    setInputValue('');
    setActiveView('chat');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Delete a session ───────────────────────────────────────
  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions(prev => prev.filter(s => s.id !== id));
    if (token) {
      fetch(`${GENAI_API_URL}/chat/delete/${id}`, {
        method: 'DELETE',
        headers: authHeader,
      }).catch(() => { /* ignore */ });
    }
    if (activeSessionId === id) newChat();
  };

  // ── Send message ───────────────────────────────────────────
  const sendMessage = async (text: string, overrideAction?: string) => {
    if (!text.trim() || isLoading) return;

    const sid = activeSessionId ?? crypto.randomUUID();
    if (!activeSessionId) setActiveSessionId(sid);

    const userMsg: Message = { id: Date.now(), type: 'user', content: text, timestamp: nowTime() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInputValue('');
    setIsLoading(true);

    const typingId = Date.now() + 1;
    setMessages(prev => [...prev, { id: typingId, type: 'bot', content: '__typing__', timestamp: '' }]);

    const action = overrideAction ?? ACTION_MAP[text] ?? 'chat';

    try {
      const body: Record<string, unknown> = {
        message: text, action,
        locale: 'US (en-US), currency $',
        context: {
          brand: 'unknown', product: 'unknown', category: 'unknown',
          market: 'unknown', pricing: 'unknown', objective: 'unknown',
          kpi: 'unknown', budget: 'unknown', timeline: 'unknown',
          stage: 'unknown', channels: 'unknown', competitors: 'unknown',
          constraints: 'none',
        },
      };
      if (hasAssets && brandAssets.length > 0) {
        body.brand_identity_assets = brandAssets.map((a) => ({
          type: a.type,
          name: a.name,
          data_url: a.dataUrl,
        }));
      }
      const res = await fetch(`${GENAI_API_URL}/genai_call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json() as { reply?: string; error?: string };
      const reply = data.reply || data.error || "I couldn't generate a response.";
      const botMsg: Message = { id: Date.now() + 2, type: 'bot', content: reply, timestamp: nowTime() };
      const finalMsgs = [...next, botMsg];
      setMessages(finalMsgs);
      persistSession(sid, finalMsgs);
    } catch {
      const errMsg: Message = {
        id: Date.now() + 2, type: 'bot',
        content: 'Error connecting to the AI server. Please make sure the backend is running on port 5002.',
        timestamp: nowTime(),
      };
      setMessages([...next, errMsg]);
    } finally {
      setIsLoading(false);
      setMessages(prev => prev.filter(m => m.id !== typingId));
    }
  };

  const quickActions: { label: string; icon: React.ElementType; action: string }[] = [
    { label: 'Analyze Audience Insights',                            icon: Zap,      action: 'analyze_audience'   },
    { label: 'Review Competitor Positioning',                        icon: Eye,      action: 'review_competitors' },
    { label: 'Generate Creative Concepts for my next Advertisement', icon: Sparkles, action: 'generate_creatives' },
  ];

  return (
    <div style={{ height: '100vh', background: '#000', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Navigation />

      <div style={{
        flex: 1, minHeight: 0,
        display: 'flex', flexDirection: 'column',
        padding: '4px 40px 10px',
        boxSizing: 'border-box',
      }}>
        <h1 style={{ color: '#fff', fontSize: 30, fontWeight: 800, marginBottom: 2, flexShrink: 0 }}>Command Center</h1>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, marginBottom: 6, flexShrink: 0 }}>
          Chat with your autonomous advertising agent
        </p>
        <div style={{ marginBottom: 14, padding: '8px 12px', background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 8, fontSize: 13, color: 'rgba(251,191,36,0.95)' }}>
          {hasAssets
            ? `Brand identity: Your ${brandAssets.length} brand asset${brandAssets.length !== 1 ? 's' : ''} will be included in every generation request.`
            : 'Brand identity assets (from profile → Brand Identity) are included in every generation when you add them.'}
        </div>

        {/* Two-column layout */}
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
              {[
                { icon: '⚡', label: 'AI - powered', view: 'chat' as const },
                { icon: '◎', label: 'Active', view: 'chat' as const },
                { icon: '❄', label: 'Analysis', view: 'analysis' as const },
              ].map(item => (
                <button key={item.label}
                  onClick={() => setActiveView(item.view)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: activeView === item.view && item.view === 'analysis'
                      ? 'rgba(139,111,255,0.1)' : 'transparent',
                    border: 'none',
                    color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: 500,
                    padding: '7px 8px', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={e => e.currentTarget.style.background = activeView === item.view && item.view === 'analysis' ? 'rgba(139,111,255,0.1)' : 'transparent'}
                >
                  <span style={{ fontSize: 16, opacity: 0.7 }}>{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>

            {/* Generate Advertisement button */}
            <button
              onClick={() => navigate('/auto-create')}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: '#1a1a1a',
                border: '1px solid transparent',
                backgroundImage: 'linear-gradient(#1a1a1a,#1a1a1a), linear-gradient(90deg,#8b6fff,#c944ff)',
                backgroundOrigin: 'border-box',
                backgroundClip: 'padding-box, border-box',
                borderRadius: 10, padding: '10px 0',
                color: '#fff', fontWeight: 700, fontSize: 14,
                cursor: 'pointer', marginBottom: 14,
                transition: 'opacity 0.2s',
              } as React.CSSProperties}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              <Plus size={16} />
              Generate Advertisement
            </button>

            {/* New chat */}
            <button
              onClick={newChat}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8, padding: '7px 10px',
                color: 'rgba(255,255,255,0.6)', fontSize: 13,
                cursor: 'pointer', marginBottom: 12,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <MessageSquare size={14} />
              New Chat
            </button>

            {/* Chat history */}
            <div style={{ marginBottom: 12, flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ color: '#fff', fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Chat history</div>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                {sessions.length === 0 && (
                  <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, padding: '4px 0' }}>No saved conversations yet.</div>
                )}
                {sessions.map(session => (
                  <div
                    key={session.id}
                    onClick={() => loadSession(session)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '6px 8px', borderRadius: 8, cursor: 'pointer',
                      background: activeSessionId === session.id ? 'rgba(139,111,255,0.15)' : 'transparent',
                      border: activeSessionId === session.id ? '1px solid rgba(139,111,255,0.3)' : '1px solid transparent',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => { if (activeSessionId !== session.id) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                    onMouseLeave={e => { if (activeSessionId !== session.id) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      {session.title}
                    </span>
                    <button
                      onClick={e => deleteSession(session.id, e)}
                      title="Delete"
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'rgba(255,255,255,0.25)', padding: '2px 4px',
                        flexShrink: 0, display: 'flex',
                        transition: 'color 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = '#ff7070'}
                      onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.25)'}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Analysis stats */}
            <div>
              <div style={{ color: '#fff', fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Analysis</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 6 }}>
                {/* Messages */}
                <div style={{
                  background: '#111', border: '1px solid rgba(139,111,255,0.45)',
                  borderRadius: 12, padding: '12px',
                  display: 'flex', flexDirection: 'column',
                }}>
                  <div style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>Messages</div>
                  <div style={{
                    fontSize: 36, fontWeight: 900, lineHeight: 1, marginTop: 8,
                    background: 'linear-gradient(135deg,#00e5d4,#8b6fff)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}>{totalMessages}</div>
                </div>

                {/* Performance — spans 2 rows */}
                <div style={{
                  background: '#111', border: '1px solid rgba(139,111,255,0.45)',
                  borderRadius: 12, padding: '12px',
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  gridRow: 'span 2',
                }}>
                  <div style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>Performance</div>
                  <div style={{
                    fontSize: 34, fontWeight: 900, lineHeight: 1,
                    background: 'linear-gradient(135deg,#00e5d4,#8b6fff)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}>{perfPct > 0 ? `+${perfPct}%` : 'N/A'}</div>
                </div>

                {/* Campaigns */}
                <div style={{
                  background: '#111', border: '1px solid rgba(139,111,255,0.45)',
                  borderRadius: 12, padding: '12px',
                  display: 'flex', flexDirection: 'column',
                }}>
                  <div style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>Campaigns</div>
                  <div style={{
                    fontSize: 36, fontWeight: 900, lineHeight: 1, marginTop: 8,
                    background: 'linear-gradient(135deg,#00e5d4,#8b6fff)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}>{totalCampaigns}</div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Chat / Analysis Panel ──────────────────────── */}
          <div style={{
            background: '#111', borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.07)',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
          }}>

            {activeView === 'analysis' ? (
              /* ── Analysis panel ─────────────────────────── */
              <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
                <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 800, marginBottom: 20 }}>Session Analytics</h2>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 28 }}>
                  {[
                    { label: 'Total Messages Sent', value: totalMessages },
                    { label: 'Total Sessions', value: sessions.length },
                    { label: 'Engagement Rate', value: perfPct > 0 ? `${perfPct}%` : 'N/A' },
                  ].map(stat => (
                    <div key={stat.label} style={{
                      background: '#1a1a1a', border: '1px solid rgba(139,111,255,0.35)',
                      borderRadius: 14, padding: '20px 18px',
                    }}>
                      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 700, marginBottom: 10 }}>{stat.label}</div>
                      <div style={{
                        fontSize: 40, fontWeight: 900,
                        background: 'linear-gradient(135deg,#00e5d4,#8b6fff)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                      }}>{stat.value}</div>
                    </div>
                  ))}
                </div>

                <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Conversation History</h3>
                {sessions.length === 0 ? (
                  <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14 }}>No conversations yet. Start chatting to see your history here.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {sessions.map(s => (
                      <div
                        key={s.id}
                        onClick={() => { loadSession(s); setActiveView('chat'); }}
                        style={{
                          background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 10, padding: '12px 16px', cursor: 'pointer',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          transition: 'border-color 0.2s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(139,111,255,0.4)'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                      >
                        <div>
                          <div style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>{s.title}</div>
                          <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 4 }}>
                            {s.messages.filter(m => m.type === 'user').length} messages · {new Date(s.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <span style={{ color: '#8b6fff', fontSize: 12 }}>Open →</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* ── Chat panel ─────────────────────────────── */
              <>
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
                                color: 'rgba(255,255,255,0.85)', fontSize: 14, lineHeight: 1.7,
                                maxWidth: 560,
                              }}>
                                {renderMarkdown(msg.content)}
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
                        onClick={() => sendMessage(a.label, a.action)}
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
                    <button
                      title="New Chat"
                      onClick={newChat}
                      style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: 0, display: 'flex' }}
                    >
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
                      {isLoading
                        ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                        : <Send size={18} />
                      }
                    </button>
                  </div>
                </div>
              </>
            )}
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
