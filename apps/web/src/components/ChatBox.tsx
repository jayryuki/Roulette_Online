// apps/web/src/components/ChatBox.tsx

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
    <div className="bg-gray-800 rounded-xl flex flex-col h-full">
      <h3 className="text-sm font-semibold text-gray-300 p-3 pb-1">Chat</h3>
      <div className="flex-1 overflow-y-auto p-3 pt-1 space-y-1 min-h-[80px] max-h-[200px]">
        {messages.map((msg, i) => (
          <div key={i} className="text-xs">
            <span className="text-blue-400 font-semibold">{msg.senderName}: </span>
            <span className="text-gray-300">{msg.text}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-1 p-2 pt-0">
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          maxLength={200}
          placeholder="Chat..."
          className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={handleSend}
          className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded"
        >
          Send
        </button>
      </div>
    </div>
  );
}
