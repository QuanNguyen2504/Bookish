'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/lib/store/auth-store';

interface Message {
  id: number;
  role: 'user' | 'bot';
  text: string;
}

interface HistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

/* ─── Parse markdown đơn giản → HTML ─────────────────────────────────────── */
function parseMarkdown(text: string): string {
  const lines = text.split('\n');
  const result: string[] = [];
  let inList = false;

  for (const raw of lines) {
    let line = raw
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>');

    if (/^[-•] /.test(line)) {
      if (!inList) { result.push('<ul>'); inList = true; }
      result.push('<li>' + line.replace(/^[-•] /, '') + '</li>');
    } else {
      if (inList) { result.push('</ul>'); inList = false; }
      if (line.trim() === '') {
        result.push('<br/>');
      } else {
        result.push('<p>' + line + '</p>');
      }
    }
  }
  if (inList) result.push('</ul>');
  return result.join('');
}




const INITIAL_MESSAGE: Message = {
  id: 0,
  role: 'bot',
  text: 'Xin chào! Tôi là trợ lý của Bookish 📚 Tôi có thể giúp bạn tìm sách, tư vấn đọc sách hoặc hỗ trợ đặt hàng. Bạn cần gì không?',
};

const QUICK_QUESTIONS = [
  'Gợi ý sách hay cho tôi',
  'Sách kỹ năng sống nào tốt?',
  'Cách đặt hàng như thế nào?',
  'Thanh toán bằng những cách nào?',
];

/* ─── Icon sách + bong bóng chat ─────────────────────────────────────────── */
function ChatBubbleIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Gáy sách */}
      <rect x="5" y="5" width="3" height="18" rx="1.5" fill="white" opacity="0.6"/>
      {/* Thân sách */}
      <rect x="7.5" y="5" width="13" height="18" rx="2" fill="white"/>
      {/* Dòng chữ */}
      <rect x="10" y="9" width="8" height="1.5" rx="0.75" fill="#0071e3"/>
      <rect x="10" y="12" width="6" height="1.5" rx="0.75" fill="#0071e3" opacity="0.45"/>
      <rect x="10" y="15" width="7" height="1.5" rx="0.75" fill="#0071e3" opacity="0.25"/>
      {/* Bong bóng chat */}
      <circle cx="23" cy="23" r="7" fill="white"/>
      <path d="M16.5 29.5q1.5-2 1.5-3.5c0 0-1.5-.6-1.5-2.5 0-2.1 2.1-3.8 4.7-3.8s4.7 1.7 4.7 3.8-2.1 3.8-4.7 3.8c-.7 0-1.4-.12-2-.35z" fill="#0071e3"/>
      <circle cx="19.5" cy="23" r="0.85" fill="white"/>
      <circle cx="21.5" cy="23" r="0.85" fill="white"/>
      <circle cx="23.5" cy="23" r="0.85" fill="white"/>
    </svg>
  );
}

/* ─── Avatar bot kiểu Apple Intelligence ──────────────────────────────────── */
function BotAvatar() {
  return (
    <div style={{
      width: 30, height: 30, borderRadius: '50%', flexShrink: 0, marginTop: 2,
      background: 'linear-gradient(135deg, #0071e3 0%, #34aadc 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 1px 4px rgba(0,113,227,0.35)',
    }}>
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
        <path d="M10 3C6.13 3 3 6.13 3 10c0 1.55.47 2.99 1.27 4.19l-.93 2.79 2.87-.91A6.97 6.97 0 0 0 10 17c3.87 0 7-3.13 7-7s-3.13-7-7-7Z" fill="white"/>
        <circle cx="7.5" cy="10" r="1" fill="#0071e3"/>
        <circle cx="10" cy="10" r="1" fill="#0071e3"/>
        <circle cx="12.5" cy="10" r="1" fill="#0071e3"/>
      </svg>
    </div>
  );
}

export function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const historyRef = useRef<HistoryItem[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    setMessages([INITIAL_MESSAGE]);
    setOpen(false);
    setInput('');
    historyRef.current = [];
  }, [user?.username]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300);
  }, [open]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { id: Date.now(), role: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    const historySnapshot = [...historyRef.current];
    try {
      const res = await fetch(`${API_BASE}/api/chatbot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: text,
          history: historySnapshot,
          isFirstMessage: true,
        }),
      });
      const data = await res.json();
      const botReply: string = data.reply ?? 'Xin lỗi, tôi không thể trả lời lúc này.';
      setMessages((prev) => [...prev, { id: Date.now() + 1, role: 'bot', text: botReply }]);
      historyRef.current.push({ role: 'user', content: text });
      historyRef.current.push({ role: 'assistant', content: botReply });
      if (historyRef.current.length > 20) historyRef.current = historyRef.current.slice(-20);
    } catch {
      setMessages((prev) => [...prev, { id: Date.now() + 1, role: 'bot', text: 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại!' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        .bookish-chatbot * { box-sizing: border-box; }

        /* Nút mở chat */
        .chat-trigger {
          position: fixed;
          bottom: 28px;
          right: 28px;
          z-index: 9999;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: #0071e3;
          color: white;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 20px rgba(0,113,227,0.45), 0 1px 4px rgba(0,0,0,0.12);
          transition: background 0.18s, transform 0.18s, box-shadow 0.18s;
          outline: none;
        }
        .chat-trigger:hover {
          background: #0077ed;
          transform: scale(1.06);
          box-shadow: 0 6px 28px rgba(0,113,227,0.55);
        }
        .chat-trigger:active { transform: scale(0.97); }

        /* Dot online */
        .chat-trigger-dot {
          position: absolute;
          top: 3px; right: 3px;
          width: 11px; height: 11px;
          background: #30d158;
          border-radius: 50%;
          border: 2px solid white;
        }

        /* Cửa sổ chat */
        .chat-window {
          position: fixed;
          bottom: 96px;
          right: 28px;
          z-index: 9998;
          width: 320px;
          max-height: 82vh;
          display: flex;
          flex-direction: column;
          border-radius: 20px;
          overflow: hidden;
          background: rgba(255,255,255,0.92);
          backdrop-filter: blur(40px) saturate(180%);
          -webkit-backdrop-filter: blur(40px) saturate(180%);
          border: 1px solid rgba(0,0,0,0.1);
          box-shadow:
            0 2px 2px rgba(0,0,0,0.04),
            0 8px 16px rgba(0,0,0,0.08),
            0 24px 48px rgba(0,0,0,0.10),
            0 0 0 0.5px rgba(0,0,0,0.06);
          font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif;
        }

        /* Header */
        .chat-header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 16px 13px;
          border-bottom: 1px solid rgba(0,0,0,0.07);
          background: rgba(249,249,251,0.95);
          flex-shrink: 0;
        }
        .chat-header-avatar {
          width: 36px; height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, #0071e3 0%, #34aadc 100%);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 1px 6px rgba(0,113,227,0.3);
        }
        .chat-header-info { flex: 1; }
        .chat-header-name {
          font-size: 13.5px;
          font-weight: 600;
          color: #1d1d1f;
          letter-spacing: -0.01em;
          line-height: 1.2;
        }
        .chat-header-status {
          font-size: 11.5px;
          color: #30d158;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 4px;
          margin-top: 1px;
        }
        .chat-header-status::before {
          content: '';
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #30d158;
          display: inline-block;
        }
        .chat-close {
          width: 28px; height: 28px;
          border-radius: 50%;
          background: rgba(0,0,0,0.06);
          border: none;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          color: #6e6e73;
          transition: background 0.15s, color 0.15s;
          flex-shrink: 0;
        }
        .chat-close:hover { background: rgba(0,0,0,0.1); color: #1d1d1f; }

        /* Messages area */
        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px 14px 8px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          min-height: 0;
          scroll-behavior: smooth;
        }
        .chat-messages::-webkit-scrollbar { width: 4px; }
        .chat-messages::-webkit-scrollbar-track { background: transparent; }
        .chat-messages::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.12); border-radius: 4px; }

        /* Bubble */
        .msg-row {
          display: flex;
          gap: 7px;
          align-items: flex-end;
        }
        .msg-row.user { flex-direction: row-reverse; }
        .bubble {
          max-width: 76%;
          padding: 10px 13px;
          border-radius: 18px;
          font-size: 14px;
          line-height: 1.5;
          letter-spacing: -0.01em;
          word-break: break-word;
        }
        .bubble.bot {
          background: #f2f2f7;
          color: #1d1d1f;
          border-bottom-left-radius: 5px;
        }
        .bubble.user {
          background: #0071e3;
          color: white;
          border-bottom-right-radius: 5px;
        }

        /* Typing dots */
        .typing-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: #aeaeb2;
          animation: typingBounce 1s infinite ease-in-out;
        }
        .typing-dot:nth-child(2) { animation-delay: 0.15s; }
        .typing-dot:nth-child(3) { animation-delay: 0.30s; }
        @keyframes typingBounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }

        /* Quick questions */
        .quick-wrap {
          padding: 4px 14px 12px;
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          flex-shrink: 0;
        }
        .quick-btn {
          font-size: 12.5px;
          padding: 6px 12px;
          border-radius: 100px;
          background: rgba(0,113,227,0.08);
          color: #0071e3;
          border: 1px solid rgba(0,113,227,0.18);
          cursor: pointer;
          font-family: inherit;
          transition: background 0.15s, border-color 0.15s;
          letter-spacing: -0.01em;
          font-weight: 500;
        }
        .quick-btn:hover { background: rgba(0,113,227,0.14); border-color: rgba(0,113,227,0.3); }

        /* Input area */
        .chat-input-wrap {
          padding: 10px 12px 12px;
          border-top: 1px solid rgba(0,0,0,0.07);
          background: rgba(249,249,251,0.95);
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }
        .chat-input {
          flex: 1;
          padding: 9px 14px;
          border-radius: 100px;
          background: rgba(0,0,0,0.05);
          border: 1px solid rgba(0,0,0,0.08);
          font-size: 14px;
          font-family: inherit;
          color: #1d1d1f;
          outline: none;
          transition: border-color 0.15s, background 0.15s;
          letter-spacing: -0.01em;
        }
        .chat-input::placeholder { color: #aeaeb2; }
        .chat-input:focus {
          border-color: rgba(0,113,227,0.4);
          background: white;
        }
        .chat-send {
          width: 34px; height: 34px;
          border-radius: 50%;
          background: #0071e3;
          border: none;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          color: white;
          flex-shrink: 0;
          transition: background 0.15s, transform 0.12s;
        }
        .chat-send:hover:not(:disabled) { background: #0077ed; transform: scale(1.05); }
        .chat-send:active:not(:disabled) { transform: scale(0.95); }
        .chat-send:disabled { background: #c7c7cc; cursor: not-allowed; }

        /* Markdown trong bubble bot */
        .bubble.bot p { margin: 0 0 6px; }
        .bubble.bot p:last-child { margin-bottom: 0; }
        .bubble.bot ul {
          margin: 4px 0 6px;
          padding-left: 16px;
          list-style: none;
        }
        .bubble.bot ul:last-child { margin-bottom: 0; }
        .bubble.bot li {
          position: relative;
          padding-left: 10px;
          margin-bottom: 3px;
          line-height: 1.5;
        }
        .bubble.bot li::before {
          content: '•';
          position: absolute;
          left: 0;
          color: #0071e3;
          font-weight: 700;
        }
        .bubble.bot strong { font-weight: 600; color: #1d1d1f; }
        .bubble.bot em { font-style: italic; opacity: 0.85; }

        @media (max-width: 420px) {
          .chat-window { width: calc(100vw - 20px); right: 10px; bottom: 88px; }
          .chat-trigger { right: 16px; bottom: 20px; }
        }
      `}</style>

      <div className="bookish-chatbot">
        {/* ── Nút mở / đóng ── */}
        <motion.button
          className="chat-trigger"
          onClick={() => setOpen((v) => !v)}
          whileTap={{ scale: 0.94 }}
          aria-label={open ? 'Đóng chat' : 'Mở chat hỗ trợ'}
        >
          <AnimatePresence mode="wait" initial={false}>
            {open ? (
              <motion.span key="close"
                initial={{ rotate: -45, opacity: 0, scale: 0.7 }}
                animate={{ rotate: 0, opacity: 1, scale: 1 }}
                exit={{ rotate: 45, opacity: 0, scale: 0.7 }}
                transition={{ duration: 0.18 }}>
                <X size={22} strokeWidth={2.5} />
              </motion.span>
            ) : (
              <motion.span key="chat"
                initial={{ rotate: 45, opacity: 0, scale: 0.7 }}
                animate={{ rotate: 0, opacity: 1, scale: 1 }}
                exit={{ rotate: -45, opacity: 0, scale: 0.7 }}
                transition={{ duration: 0.18 }}>
                <ChatBubbleIcon size={26} />
              </motion.span>
            )}
          </AnimatePresence>
          {!open && <span className="chat-trigger-dot" />}
        </motion.button>

        {/* ── Cửa sổ chat ── */}
        <AnimatePresence>
          {open && (
            <motion.div
              className="chat-window"
              initial={{ opacity: 0, y: 14, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 14, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            >
              {/* Header */}
              <div className="chat-header">
                <div className="chat-header-avatar">
                  <ChatBubbleIcon size={20} />
                </div>
                <div className="chat-header-info">
                  <div className="chat-header-name">Trợ lý Bookish</div>
                  <div className="chat-header-status">Đang hoạt động</div>
                </div>
                <button className="chat-close" onClick={() => setOpen(false)} aria-label="Đóng">
                  <X size={14} strokeWidth={2.5} />
                </button>
              </div>

              {/* Messages */}
              <div className="chat-messages">
                {messages.map((msg, i) => (
                  <motion.div
                    key={msg.id}
                    className={`msg-row ${msg.role === 'user' ? 'user' : ''}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: i === messages.length - 1 ? 0 : 0 }}
                  >
                    {msg.role === 'bot' && <BotAvatar />}
                    <div
                      className={`bubble ${msg.role === 'user' ? 'user' : 'bot'}`}
                      {...(msg.role === 'bot'
                        ? { dangerouslySetInnerHTML: { __html: parseMarkdown(msg.text) } }
                        : { children: msg.text }
                      )}
                    />
                  </motion.div>
                ))}

                {/* Typing indicator */}
                {loading && (
                  <motion.div className="msg-row"
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                    <BotAvatar />
                    <div className="bubble bot" style={{ padding: '12px 14px', display: 'flex', gap: 5 }}>
                      <div className="typing-dot" />
                      <div className="typing-dot" />
                      <div className="typing-dot" />
                    </div>
                  </motion.div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Quick questions — chỉ hiện lúc mới mở */}
              {messages.length <= 1 && (
                <div className="quick-wrap">
                  {QUICK_QUESTIONS.map((q) => (
                    <button key={q} className="quick-btn" onClick={() => sendMessage(q)}>
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              <div className="chat-input-wrap">
                <input
                  ref={inputRef}
                  type="text"
                  className="chat-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
                  placeholder="Nhập câu hỏi..."
                  disabled={loading}
                  autoComplete="off"
                />
                <button
                  className="chat-send"
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || loading}
                  aria-label="Gửi"
                >
                  {loading
                    ? <Loader2 size={15} className="animate-spin" />
                    : <Send size={15} strokeWidth={2.2} />
                  }
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}