import React, { useState, useEffect, useRef } from 'react';
import { Send, Trash2, MessageSquare, AlertCircle, User, Sparkles } from 'lucide-react';
import { api } from '../lib/api';
import { LoadingState } from '../components/ui/LoadingState';
import { SectionDivider } from '../components/ui/SectionDivider';
import { useAuth } from '../hooks/useAuth';

const EXAMPLE_PROMPTS = [
  'Am I eligible for my target role?',
  'What skills should I improve first?',
  'How should I prepare for a software engineering role?',
  'Explain the placement requirements for my target company.',
  'Analyze my resume strengths and weaknesses.',
];

interface Message {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  error?: boolean;
}

function formatMessage(text: string): string {
  return text
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^#{1,4} (.+)$/gm, (_, t) => `<h3>${t}</h3>`)
    .replace(/^- (.+)$/gm, '<li>$1</li>');
}

export default function Assistant() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.chat.history()
      .then(({ messages: hist }) => {
        setMessages(hist.map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.created_at,
        })));
      })
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const sendMessage = async (text: string) => {
    const msg = text.trim();
    if (!msg || sending) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg, timestamp: new Date().toISOString() }]);
    setSending(true);

    try {
      const { response } = await api.chat.send(msg);
      setMessages(prev => [...prev, { role: 'assistant', content: response, timestamp: new Date().toISOString() }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Unable to reach the placement intelligence service. Please try again.\n\nError: ${(err as Error).message}`,
        timestamp: new Date().toISOString(),
        error: true,
      }]);
    } finally {
      setSending(false);
    }
  };

  const clearHistory = async () => {
    if (!window.confirm('Clear all chat history?')) return;
    await api.chat.clearHistory().catch(() => {});
    setMessages([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-[#2A2A2A] flex items-center justify-between">
        <div>
          <div className="label-deco mb-0.5">Azure AI Foundry — CampusPlacementAgent</div>
          <h1 className="font-heading text-sm text-foreground tracking-wide">AI PLACEMENT ASSISTANT</h1>
        </div>
        {messages.length > 0 && (
          <button onClick={clearHistory} className="btn-ghost !text-xs !py-1.5 !px-3" aria-label="Clear chat history">
            <Trash2 size={11} /> Clear
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {historyLoading ? (
          <LoadingState message="Loading conversation..." size="sm" />
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-5 animate-fade-in">
            <div className="diamond-icon opacity-40"><MessageSquare size={24} className="text-gold" /></div>
            <div className="text-center">
              <div className="heading-sm text-muted text-[11px] mb-1">AI PLACEMENT ASSISTANT</div>
              <p className="text-muted text-xs max-w-xs leading-relaxed">
                Ask me anything about your placement preparation, eligibility, skill gaps, or interview readiness.
              </p>
            </div>
            <div className="w-full max-w-sm space-y-2">
              <div className="label-deco text-center mb-2">Example questions</div>
              {EXAMPLE_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(prompt)}
                  className="w-full text-left deco-card p-2.5 text-muted text-xs hover:text-foreground hover:border-border-gold transition-all"
                >
                  "{prompt}"
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2 animate-slide-up ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <div className={`diamond-icon-sm flex-shrink-0 mt-0.5 ${msg.role === 'user' ? 'border-gold/30' : 'border-[#2A2A2A]'}`}>
                  {msg.role === 'user' ? (
                    <User size={11} className="text-gold" />
                  ) : (
                    <Sparkles size={11} className="text-gold" />
                  )}
                </div>

                {/* Bubble */}
                <div className={msg.role === 'user' ? 'chat-bubble-user' : `chat-bubble-assistant ${msg.error ? 'border-red-800/50' : ''}`}>
                  {msg.role === 'assistant' ? (
                    <div
                      className="prose-deco text-xs"
                      dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                    />
                  ) : (
                    <p className="text-foreground text-xs leading-relaxed">{msg.content}</p>
                  )}
                  {msg.timestamp && (
                    <div className="text-muted text-[9px] mt-1.5 opacity-60">
                      {new Date(msg.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Sending indicator */}
            {sending && (
              <div className="flex gap-2 items-start animate-fade-in">
                <div className="diamond-icon-sm flex-shrink-0 mt-0.5 border-[#2A2A2A]">
                  <Sparkles size={11} className="text-gold" />
                </div>
                <div className="chat-bubble-assistant">
                  <div className="flex gap-1 items-center">
                    {[0, 1, 2].map(i => (
                      <span
                        key={i}
                        className="w-1.5 h-1.5 bg-gold rounded-full animate-glow-pulse"
                        style={{ animationDelay: `${i * 200}ms` }}
                      />
                    ))}
                    <span className="text-muted text-[10px] ml-1">Analyzing...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <SectionDivider className="mx-4 my-0" />

      {/* Input area */}
      <div className="flex-shrink-0 p-4">
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <textarea
              id="chat-input"
              className="input-deco w-full resize-none min-h-[44px] max-h-32 py-2.5 pr-3"
              placeholder="Ask about eligibility, skills, preparation... (Enter to send)"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={sending}
              aria-label="Chat message input"
            />
          </div>
          <button
            id="send-message"
            onClick={() => sendMessage(input)}
            disabled={sending || !input.trim()}
            className="btn-gold !px-3 !py-2.5 !min-h-0 flex-shrink-0"
            aria-label="Send message"
          >
            <Send size={14} />
          </button>
        </div>
        <p className="text-muted text-[10px] mt-1.5 text-center">
          Powered by Azure AI Foundry · CampusPlacementAgent · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
