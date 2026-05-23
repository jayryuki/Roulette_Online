import { useState, useRef, useEffect } from 'react';

interface ChatMessage {
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}

interface ChatBoxProps {
  messages: ChatMessage[];
  onSend: (text: string) => void;
}

export default function ChatBox({ messages, onSend }: ChatBoxProps) {
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
  };

  return (
    <div style={{
      background: 'var(--surface-panel)',
      borderRadius: '10px',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      border: '1px solid var(--border-subtle)',
    }}>
      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0.75rem 0.75rem 0.25rem' }}>
        Chat
      </div>
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '0.5rem 0.75rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
        minHeight: '60px',
        maxHeight: '140px',
      }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ fontSize: '0.75rem' }}>
            <span style={{ color: 'var(--accent-warm)', fontWeight: 600 }}>{msg.senderName}: </span>
            <span style={{ color: 'var(--text-secondary)' }}>{msg.text}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div style={{ display: 'flex', gap: '0.375rem', padding: '0.5rem' }}>
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          maxLength={200}
          placeholder="Chat..."
          style={{
            flex: 1,
            padding: '0.375rem 0.625rem',
            borderRadius: '6px',
            border: '1px solid var(--border-subtle)',
            background: 'var(--surface-panel-raised)',
            color: 'var(--text-primary)',
            fontSize: '0.8125rem',
            outline: 'none',
            fontFamily: "'Inter', sans-serif",
          }}
        />
        <button
          onClick={handleSend}
          style={{
            padding: '0.375rem 0.625rem',
            background: 'var(--accent-warm)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
