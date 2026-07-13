'use client';

import { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { toggleChat, closeChat } from '@/features/ui/uiSlice';

/* Styled components used here because this component has animated open/close state
   and a complex layered structure that would require many Tailwind conditional strings */

const Popup = styled.div<{ $open: boolean }>`
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: var(--chat-popup-w);
  height: var(--chat-popup-h);
  max-height: calc(100vh - 48px);
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 14px;
  box-shadow: 0 16px 40px rgba(20, 24, 28, 0.22);
  display: ${({ $open }) => ($open ? 'flex' : 'none')};
  flex-direction: column;
  z-index: 50;
  overflow: hidden;

  @media (max-width: 480px) {
    width: calc(100vw - 24px);
    right: 12px;
    bottom: 12px;
    height: 70vh;
  }
`;

const Fab = styled.button<{ $open: boolean }>`
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: var(--chat-fab-size);
  height: var(--chat-fab-size);
  border-radius: 50%;
  background: var(--ink);
  color: #fff;
  border: none;
  display: ${({ $open }) => ($open ? 'none' : 'flex')};
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 6px 20px rgba(20, 24, 28, 0.25);
  z-index: 50;

  &:hover {
    background: #232a30;
  }

  @media (max-width: 480px) {
    right: 16px;
    bottom: 16px;
  }
`;

interface Message {
  id: number;
  text: string;
  time: string;
  fromUser: boolean;
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: 1,
    text: 'Group liquidity is ₹42.8 Cr. Company 2 shows a projected deficit in 14 days — action recommended.',
    time: '11:18 IST',
    fromUser: false,
  },
];

export default function ChatPopup() {
  const dispatch = useAppDispatch();
  const chatOpen = useAppSelector((s) => s.ui.chatOpen);
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [recording, setRecording] = useState(false);
  const railBodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (railBodyRef.current) {
      railBodyRef.current.scrollTop = railBodyRef.current.scrollHeight;
    }
  }, [messages]);

  function sendMessage() {
    const text = input.trim();
    if (!text) return;
    const now = new Date();
    const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }) + ' IST · You';
    setMessages((prev) => [...prev, { id: Date.now(), text, time, fromUser: true }]);
    setInput('');
  }

  return (
    <>
      <Fab $open={chatOpen} onClick={() => dispatch(toggleChat())}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
        </svg>
        <span
          style={{
            position: 'absolute',
            top: -2,
            right: -2,
            background: 'var(--alert)',
            color: '#fff',
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
            borderRadius: 10,
            padding: '1px 6px',
            border: '2px solid var(--paper)',
          }}
        >
          1
        </span>
      </Fab>

      <Popup $open={chatOpen}>
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-[14px] border-b border-line flex-shrink-0">
          <div className="w-[7px] h-[7px] rounded-full bg-verified flex-shrink-0" />
          <span className="text-[11px] uppercase tracking-[0.07em] font-bold text-ink-soft whitespace-nowrap">
            Apex AI
          </span>
          <span className="bg-alert text-white text-[10px] font-mono rounded-[10px] px-[7px] py-px">1</span>
          <div className="flex-1" />
          <button
            onClick={() => dispatch(closeChat())}
            className="w-[22px] h-[22px] border border-line rounded-[6px] bg-paper flex items-center justify-center cursor-pointer text-ink-soft"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div ref={railBodyRef} className="flex-1 overflow-y-auto p-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className="bg-paper border border-line rounded-[10px] p-[12px_14px] text-[13px] leading-[1.5] mb-2"
            >
              {msg.text}
              <span className="block text-[10px] text-ink-faint font-mono mt-1.5">{msg.time}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 pb-4 pt-3 border-t border-line flex-shrink-0">
          <div className="flex gap-1.5 items-center bg-paper border border-line rounded-[10px] p-[6px_6px_6px_12px]">
            <input
              className="flex-1 border-none bg-transparent text-xs font-display outline-none text-ink placeholder:text-ink-faint"
              placeholder="Ask Apex anything…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            />
            <button
              onClick={() => setRecording((r) => !r)}
              title={recording ? 'Recording… click to stop' : 'Voice note'}
              className={`w-7 h-7 rounded-lg border border-line bg-surface flex items-center justify-center cursor-pointer text-ink-soft flex-shrink-0 ${recording ? 'text-alert border-alert/40' : ''}`}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/>
              </svg>
            </button>
            <button
              onClick={sendMessage}
              className="w-7 h-7 rounded-lg border-none bg-ink text-paper flex items-center justify-center cursor-pointer flex-shrink-0"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
              </svg>
            </button>
          </div>
          <p className="text-[10px] text-ink-faint text-center mt-2 font-mono">
            Apex AI · responses are synthesized from uploaded data only
          </p>
        </div>
      </Popup>
    </>
  );
}
