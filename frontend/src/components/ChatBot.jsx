import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Sparkles, ChevronDown } from 'lucide-react';

const API_BASE = 'https://finsight-1-gqzg.onrender.com';

// Simple inline markdown renderer: **bold** and bullet lines
function RenderMessage({ text }) {
  const lines = text.split('\n');
  return (
    <div className="chat-message-body">
      {lines.map((line, i) => {
        if (!line.trim()) return <br key={i} />;
        const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-');
        const content = isBullet ? line.trim().replace(/^[•\-]\s*/, '') : line;
        const parts = content.split(/(\*\*[^*]+\*\*)/g);
        const rendered = parts.map((part, j) =>
          part.startsWith('**') && part.endsWith('**')
            ? <strong key={j}>{part.slice(2, -2)}</strong>
            : part
        );
        return isBullet
          ? <div key={i} style={{ display: 'flex', gap: '6px', marginBottom: '2px' }}><span style={{ color: '#087F8C', flexShrink: 0 }}>•</span><span>{rendered}</span></div>
          : <p key={i} style={{ margin: '0 0 4px 0' }}>{rendered}</p>;
      })}
    </div>
  );
}

const SUGGESTIONS = [
  "What's my total balance?",
  "Any suspicious transactions?",
  "How are my savings goals?",
  "Upcoming bills this month?",
  "Give me financial tips",
];

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm **FinSight Assistant** — your AI financial analyst.\n\nI have live access to your accounts, budgets, anomalies, and goals. Ask me anything about your finances!",
      id: 'welcome',
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasNew, setHasNew] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open, loading]);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 120);
    }
    if (open) setHasNew(false);
  }, [open]);

  async function sendMessage(text) {
    const userText = (text || input).trim();
    if (!userText || loading) return;
    setInput('');

    const userMsg = { role: 'user', content: userText, id: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    const historyToSend = messages
      .filter(m => m.id !== 'welcome')
      .map(m => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText, history: historyToSend }),
      });
      const data = await res.json();
      const reply = data.reply || 'Sorry, I could not get a response.';
      setMessages(prev => [...prev, { role: 'assistant', content: reply, id: Date.now() + 1 }]);
      if (!open) setHasNew(true);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "⚠️ Could not reach the FinSight backend. Please ensure the server is running.",
        id: Date.now() + 1
      }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <>
      <style>{`
        .chatbot-fab {
          position: fixed;
          bottom: 28px;
          right: 28px;
          z-index: 9999;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: #087F8C;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 20px rgba(8,127,140,0.35), 0 2px 8px rgba(0,0,0,0.12);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          color: white;
        }
        .chatbot-fab:hover {
          transform: scale(1.08);
          box-shadow: 0 6px 28px rgba(8,127,140,0.45), 0 3px 12px rgba(0,0,0,0.15);
        }
        .chatbot-fab:active { transform: scale(0.96); }
        .chatbot-badge {
          position: absolute;
          top: -2px;
          right: -2px;
          width: 14px;
          height: 14px;
          background: #EF4444;
          border-radius: 50%;
          border: 2px solid white;
          animation: chatbot-pulse 1.5s ease-in-out infinite;
        }
        @keyframes chatbot-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }
        .chatbot-panel {
          position: fixed;
          bottom: 96px;
          right: 28px;
          z-index: 9998;
          width: 370px;
          max-height: 560px;
          background: #FFFFFF;
          border: 1px solid #E5E7EB;
          border-radius: 16px;
          box-shadow: 0 16px 48px rgba(23,32,51,0.14), 0 4px 16px rgba(0,0,0,0.08);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          transform-origin: bottom right;
          animation: chatbot-open 0.22s cubic-bezier(0.34,1.56,0.64,1);
          font-family: 'Inter', -apple-system, sans-serif;
        }
        @keyframes chatbot-open {
          from { opacity: 0; transform: scale(0.85) translateY(12px); }
          to   { opacity: 1; transform: scale(1)   translateY(0);     }
        }
        .chatbot-header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 16px;
          background: #087F8C;
          color: white;
          flex-shrink: 0;
        }
        .chatbot-header-icon {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: rgba(255,255,255,0.18);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .chatbot-header-info { flex: 1; min-width: 0; }
        .chatbot-header-title { font-weight: 700; font-size: 14px; line-height: 1.2; }
        .chatbot-header-sub { font-size: 11px; opacity: 0.78; margin-top: 1px; display: flex; align-items: center; gap: 4px; }
        .chatbot-online-dot { width: 6px; height: 6px; border-radius: 50%; background: #6EE7B7; flex-shrink: 0; }
        .chatbot-close-btn {
          background: none; border: none; cursor: pointer; color: rgba(255,255,255,0.8);
          padding: 4px; border-radius: 6px; display: flex; align-items: center; justify-content: center;
          transition: background 0.15s;
        }
        .chatbot-close-btn:hover { background: rgba(255,255,255,0.15); color: white; }
        .chatbot-messages {
          flex: 1;
          overflow-y: auto;
          padding: 14px 14px 6px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .chatbot-messages::-webkit-scrollbar { width: 4px; }
        .chatbot-messages::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 4px; }
        .chatbot-bubble {
          max-width: 88%;
          font-size: 13px;
          line-height: 1.5;
          border-radius: 12px;
          padding: 9px 13px;
          word-break: break-word;
        }
        .chatbot-bubble.user {
          background: #087F8C;
          color: white;
          align-self: flex-end;
          border-bottom-right-radius: 4px;
        }
        .chatbot-bubble.assistant {
          background: #F6F7F4;
          color: #172033;
          align-self: flex-start;
          border-bottom-left-radius: 4px;
          border: 1px solid #E5E7EB;
        }
        .chatbot-bubble.assistant strong { color: #087F8C; }
        .chat-message-body p { margin: 0 0 3px; }
        .chatbot-typing {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 10px 14px;
          background: #F6F7F4;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          border-bottom-left-radius: 4px;
          align-self: flex-start;
          width: fit-content;
        }
        .chatbot-typing span {
          width: 6px; height: 6px; border-radius: 50%; background: #9CA3AF;
          animation: chatbot-bounce 1.2s ease-in-out infinite;
        }
        .chatbot-typing span:nth-child(2) { animation-delay: 0.2s; }
        .chatbot-typing span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes chatbot-bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); background: #087F8C; }
        }
        .chatbot-suggestions {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
          padding: 6px 14px 10px;
          flex-shrink: 0;
        }
        .chatbot-suggestion-chip {
          font-size: 11px;
          font-weight: 500;
          padding: 4px 10px;
          border-radius: 20px;
          border: 1px solid #E5E7EB;
          background: white;
          color: #667085;
          cursor: pointer;
          transition: all 0.15s ease;
          white-space: nowrap;
        }
        .chatbot-suggestion-chip:hover {
          background: #F0FAFB;
          border-color: #087F8C;
          color: #087F8C;
        }
        .chatbot-input-row {
          display: flex;
          gap: 8px;
          align-items: flex-end;
          padding: 10px 12px 12px;
          border-top: 1px solid #F3F4F6;
          flex-shrink: 0;
        }
        .chatbot-input {
          flex: 1;
          border: 1.5px solid #E5E7EB;
          border-radius: 10px;
          padding: 8px 12px;
          font-size: 13px;
          font-family: inherit;
          color: #172033;
          background: #FAFAFA;
          resize: none;
          outline: none;
          line-height: 1.45;
          max-height: 80px;
          transition: border-color 0.15s;
        }
        .chatbot-input:focus { border-color: #087F8C; background: white; }
        .chatbot-input::placeholder { color: #9CA3AF; }
        .chatbot-send-btn {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: #087F8C;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          flex-shrink: 0;
          transition: background 0.15s, transform 0.1s;
        }
        .chatbot-send-btn:hover:not(:disabled) { background: #066670; }
        .chatbot-send-btn:active:not(:disabled) { transform: scale(0.93); }
        .chatbot-send-btn:disabled { background: #D1D5DB; cursor: not-allowed; }
        @media (max-width: 480px) {
          .chatbot-panel { width: calc(100vw - 24px); right: 12px; bottom: 84px; }
          .chatbot-fab { bottom: 20px; right: 16px; }
        }
      `}</style>

      {/* FAB */}
      <button
        className="chatbot-fab"
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Close FinSight Assistant' : 'Open FinSight Assistant'}
      >
        {open
          ? <ChevronDown size={22} strokeWidth={2.5} />
          : <MessageCircle size={22} strokeWidth={2.5} />
        }
        {hasNew && !open && <div className="chatbot-badge" />}
      </button>

      {/* Panel */}
      {open && (
        <div className="chatbot-panel" role="dialog" aria-label="FinSight AI Assistant">
          <div className="chatbot-header">
            <div className="chatbot-header-icon">
              <Sparkles size={17} strokeWidth={2} />
            </div>
            <div className="chatbot-header-info">
              <div className="chatbot-header-title">FinSight Assistant</div>
              <div className="chatbot-header-sub">
                <span className="chatbot-online-dot" />
                AI · Live financial data
              </div>
            </div>
            <button className="chatbot-close-btn" onClick={() => setOpen(false)} aria-label="Close">
              <X size={18} />
            </button>
          </div>

          <div className="chatbot-messages">
            {messages.map(msg => (
              <div key={msg.id} className={`chatbot-bubble ${msg.role}`}>
                <RenderMessage text={msg.content} />
              </div>
            ))}
            {loading && (
              <div className="chatbot-typing">
                <span /><span /><span />
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {!loading && messages.length <= 2 && (
            <div className="chatbot-suggestions">
              {SUGGESTIONS.map(s => (
                <button key={s} className="chatbot-suggestion-chip" onClick={() => sendMessage(s)}>
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className="chatbot-input-row">
            <textarea
              ref={inputRef}
              className="chatbot-input"
              rows={1}
              placeholder="Ask about your finances…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={loading}
            />
            <button
              className="chatbot-send-btn"
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              aria-label="Send"
            >
              <Send size={16} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
