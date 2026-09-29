import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send, Trash2, MessageSquare, User, Sparkles,
  Volume2, VolumeX, Globe, ChevronDown,
} from 'lucide-react';
import { api } from '../lib/api';
import { LoadingState } from '../components/ui/LoadingState';
import { SectionDivider } from '../components/ui/SectionDivider';
import { useAuth } from '../hooks/useAuth';

// ─── Language Registry ────────────────────────────────────────────────────────
interface LangOption { code: string; aiName: string; label: string; flag: string; }

const LANGUAGES: LangOption[] = [
  { code: 'auto',  aiName: 'auto',              label: 'Auto Detect', flag: '🌐' },
  { code: 'en-IN', aiName: 'English',           label: 'English',     flag: '🇺🇸' },
  { code: 'hi-IN', aiName: 'Hindi (हिंदी)',     label: 'Hindi',       flag: '🇮🇳' },
  { code: 'te-IN', aiName: 'Telugu (తెలుగు)',   label: 'Telugu',      flag: '🇮🇳' },
  { code: 'ta-IN', aiName: 'Tamil (தமிழ்)',     label: 'Tamil',       flag: '🇮🇳' },
  { code: 'kn-IN', aiName: 'Kannada (ಕನ್ನಡ)',   label: 'Kannada',     flag: '🇮🇳' },
  { code: 'ml-IN', aiName: 'Malayalam (മലയാളം)',label: 'Malayalam',   flag: '🇮🇳' },
  { code: 'bn-IN', aiName: 'Bengali (বাংলা)',   label: 'Bengali',     flag: '🇮🇳' },
  { code: 'gu-IN', aiName: 'Gujarati (ગુજરાતી)',label: 'Gujarati',    flag: '🇮🇳' },
  { code: 'pa-IN', aiName: 'Punjabi (ਪੰਜਾਬੀ)',  label: 'Punjabi',     flag: '🇮🇳' },
  { code: 'mr-IN', aiName: 'Marathi (मराठी)',   label: 'Marathi',     flag: '🇮🇳' },
  { code: 'ur-PK', aiName: 'Urdu (اردو)',       label: 'Urdu',        flag: '🇵🇰' },
  { code: 'ar-SA', aiName: 'Arabic (العربية)',  label: 'Arabic',      flag: '🇸🇦' },
  { code: 'fr-FR', aiName: 'French (Français)', label: 'French',      flag: '🇫🇷' },
  { code: 'es-ES', aiName: 'Spanish (Español)', label: 'Spanish',     flag: '🇪🇸' },
  { code: 'de-DE', aiName: 'German (Deutsch)',  label: 'German',      flag: '🇩🇪' },
  { code: 'pt-BR', aiName: 'Portuguese',        label: 'Portuguese',  flag: '🇧🇷' },
  { code: 'ru-RU', aiName: 'Russian (Русский)', label: 'Russian',     flag: '🇷🇺' },
  { code: 'zh-CN', aiName: 'Chinese (中文)',     label: 'Chinese',     flag: '🇨🇳' },
  { code: 'ja-JP', aiName: 'Japanese (日本語)',  label: 'Japanese',    flag: '🇯🇵' },
  { code: 'ko-KR', aiName: 'Korean (한국어)',    label: 'Korean',      flag: '🇰🇷' },
  { code: 'th-TH', aiName: 'Thai (ภาษาไทย)',    label: 'Thai',        flag: '🇹🇭' },
];

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
  detectedLang?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMessage(text: string): string {
  return text
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^#{1,4} (.+)$/gm, (_, t) => `<h3>${t}</h3>`)
    .replace(/^- (.+)$/gm, '<li>$1</li>');
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function detectLanguage(text: string): string {
  const scores: Record<string, number> = {};
  const scripts = [
    { lang: 'te-IN', regex: /[\u0C00-\u0C7F]/g },
    { lang: 'hi-IN', regex: /[\u0900-\u097F]/g },
    { lang: 'ta-IN', regex: /[\u0B80-\u0BFF]/g },
    { lang: 'kn-IN', regex: /[\u0C80-\u0CFF]/g },
    { lang: 'ml-IN', regex: /[\u0D00-\u0D7F]/g },
    { lang: 'bn-IN', regex: /[\u0980-\u09FF]/g },
    { lang: 'gu-IN', regex: /[\u0A80-\u0AFF]/g },
    { lang: 'pa-IN', regex: /[\u0A00-\u0A7F]/g },
    { lang: 'ur-PK', regex: /[\u0600-\u06FF]/g },
    { lang: 'zh-CN', regex: /[\u4E00-\u9FFF\u3400-\u4DBF]/g },
    { lang: 'ja-JP', regex: /[\u3040-\u30FF\u31F0-\u31FF]/g },
    { lang: 'ko-KR', regex: /[\uAC00-\uD7AF\u1100-\u11FF]/g },
    { lang: 'ru-RU', regex: /[\u0400-\u04FF]/g },
    { lang: 'th-TH', regex: /[\u0E00-\u0E7F]/g },
    { lang: 'he-IL', regex: /[\u0590-\u05FF]/g },
    { lang: 'el-GR', regex: /[\u0370-\u03FF]/g },
  ];
  for (const { lang, regex } of scripts) {
    const m = text.match(regex);
    if (m) scores[lang] = (scores[lang] || 0) + m.length;
  }
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (!sorted.length || sorted[0][1] < 5) {
    const lower = text.toLowerCase();
    if (/\b(le|la|les|des|est|avec|pour|dans)\b/.test(lower)) return 'fr-FR';
    if (/\b(el|la|los|las|que|con|para|como)\b/.test(lower)) return 'es-ES';
    if (/\b(der|die|das|und|ist|mit|von)\b/.test(lower)) return 'de-DE';
    if (/\b(e|o|a|os|as|com|para|que)\b/.test(lower)) return 'pt-BR';
    return 'en-IN';
  }
  return sorted[0][0];
}

function pickVoice(lang: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const base = lang.split('-')[0];
  return (
    voices.find(v => v.lang === lang && (v.name.includes('Google') || v.name.includes('Neural') || v.name.includes('Natural'))) ||
    voices.find(v => v.lang === lang) ||
    voices.find(v => v.lang.startsWith(base)) ||
    voices.find(v => v.lang.startsWith('en')) ||
    voices[0]
  );
}

/** Split mixed-script text into per-script segments for accurate TTS */
function segmentByScript(text: string, primaryLang: string): Array<{ text: string; lang: string }> {
  const segments: Array<{ text: string; lang: string }> = [];
  const scriptMap = [
    { regex: /[\u0A00-\u0A7F]+/, lang: 'pa-IN' },
    { regex: /[\u0900-\u097F]+/, lang: 'hi-IN' },
    { regex: /[\u0C00-\u0C7F]+/, lang: 'te-IN' },
    { regex: /[\u0B80-\u0BFF]+/, lang: 'ta-IN' },
    { regex: /[\u0C80-\u0CFF]+/, lang: 'kn-IN' },
    { regex: /[\u0D00-\u0D7F]+/, lang: 'ml-IN' },
    { regex: /[\u0980-\u09FF]+/, lang: 'bn-IN' },
    { regex: /[\u0A80-\u0AFF]+/, lang: 'gu-IN' },
    { regex: /[\u0600-\u06FF]+/, lang: 'ar-SA' },
    { regex: /[\u4E00-\u9FFF]+/, lang: 'zh-CN' },
    { regex: /[\u3040-\u30FF]+/, lang: 'ja-JP' },
    { regex: /[\uAC00-\uD7AF]+/, lang: 'ko-KR' },
    { regex: /[\u0400-\u04FF]+/, lang: 'ru-RU' },
    { regex: /[\u0E00-\u0E7F]+/, lang: 'th-TH' },
  ];
  let currentLang = primaryLang;
  let currentText = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    let charLang: string | null = null;
    for (const { regex, lang } of scriptMap) {
      if (regex.test(char)) { charLang = lang; break; }
    }
    if (!charLang) charLang = primaryLang.startsWith('en') ? 'en-IN' : primaryLang;
    if (charLang === currentLang) {
      currentText += char;
    } else {
      if (currentText.trim()) segments.push({ text: currentText, lang: currentLang });
      currentLang = charLang;
      currentText = char;
    }
  }
  if (currentText.trim()) segments.push({ text: currentText, lang: currentLang });
  return segments;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Assistant() {
  useAuth();
  const [messages, setMessages]         = useState<Message[]>([]);
  const [input, setInput]               = useState('');
  const [sending, setSending]           = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);

  // TTS
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Language
  const [selectedLang, setSelectedLang] = useState<LangOption>(LANGUAGES[0]);
  const [langOpen, setLangOpen]         = useState(false);
  const langRef     = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  // Load history
  useEffect(() => {
    api.chat.history()
      .then(({ messages: hist }) => {
        setMessages(hist.map((m: any) => ({
          id: m.id, role: m.role, content: m.content, timestamp: m.created_at,
        })));
      })
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  // Cleanup TTS on unmount
  useEffect(() => {
    return () => { window.speechSynthesis?.cancel(); };
  }, []);

  // Close lang dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── TTS ────────────────────────────────────────────────────────────────────

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
    setSpeakingIndex(null);
    utteranceRef.current = null;
  }, []);

  const speakMessage = useCallback((text: string, index: number) => {
    if (!text?.trim()) return;
    if (speakingIndex === index) { stopSpeaking(); return; }
    window.speechSynthesis.cancel();

    const clean      = stripHtml(formatMessage(text));
    const primaryLang = selectedLang.code !== 'auto' ? selectedLang.code : detectLanguage(clean);

    const doSpeak = () => {
      const segments = segmentByScript(clean, primaryLang);
      let segIdx = 0;
      setSpeakingIndex(index);

      const speakNext = () => {
        if (segIdx >= segments.length) { setSpeakingIndex(null); return; }
        const seg = segments[segIdx++];
        if (!seg.text.trim()) { speakNext(); return; }

        const utt = new SpeechSynthesisUtterance(seg.text);
        utt.lang    = seg.lang;
        utt.rate    = 0.92;
        utt.pitch   = 1;
        utt.volume  = 1;
        const voice = pickVoice(seg.lang);
        if (voice) utt.voice = voice;
        utt.onend   = speakNext;
        utt.onerror = speakNext;
        utteranceRef.current = utt;
        window.speechSynthesis.speak(utt);
      };
      speakNext();
    };

    if (window.speechSynthesis.getVoices().length > 0) {
      doSpeak();
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        doSpeak();
        window.speechSynthesis.onvoiceschanged = null;
      };
    }
  }, [speakingIndex, stopSpeaking, selectedLang]);

  // ── Send ──────────────────────────────────────────────────────────────────

  const sendMessage = async (text: string) => {
    const msg = text.trim();
    if (!msg || sending) return;

    stopSpeaking();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg, timestamp: new Date().toISOString() }]);
    setSending(true);

    const langForAI = selectedLang.code !== 'auto' ? selectedLang.aiName : undefined;

    try {
      const { response } = await api.chat.send(msg, langForAI);
      const detectedLang = detectLanguage(response);
      setMessages(prev => [...prev, {
        role: 'assistant', content: response,
        timestamp: new Date().toISOString(), detectedLang,
      }]);
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
    stopSpeaking();
    await api.chat.clearHistory().catch(() => {});
    setMessages([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-[#2A2A2A] flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="label-deco mb-0.5">Azure AI Foundry — CampusPlacementAgent</div>
          <h1 className="font-heading text-sm text-foreground tracking-wide">AI PLACEMENT ASSISTANT</h1>
          <p className="text-muted text-[10px] mt-0.5">Ask anything about placement</p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">

          {/* Language Selector */}
          <div ref={langRef} className="relative">
            <button
              onClick={() => setLangOpen(o => !o)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 border border-[#2A2A2A] hover:border-gold/40 rounded text-[11px] text-muted hover:text-foreground transition-all"
              aria-label="Select response language"
            >
              <Globe size={11} className="text-gold" />
              <span>{selectedLang.flag} {selectedLang.label}</span>
              <svg width="10" height="10" viewBox="0 0 10 10" className={`transition-transform ${langOpen ? 'rotate-180' : ''}`}>
                <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
              </svg>
            </button>

            {langOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 w-44 bg-[#0D0D0D] border border-[#2A2A2A] rounded shadow-xl max-h-64 overflow-y-auto">
                {LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => { setSelectedLang(lang); setLangOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-[11px] flex items-center gap-2 hover:bg-[#1A1A1A] transition-colors
                      ${selectedLang.code === lang.code ? 'text-gold' : 'text-muted hover:text-foreground'}`}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.label}</span>
                    {selectedLang.code === lang.code && <span className="ml-auto text-gold">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {messages.length > 0 && (
            <button onClick={clearHistory} className="btn-ghost !text-xs !py-1.5 !px-3" aria-label="Clear chat history">
              <Trash2 size={11} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {historyLoading ? (
          <LoadingState message="Loading conversation..." size="sm" />
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-5 animate-fade-in">
            <div className="diamond-icon opacity-40"><MessageSquare size={24} className="text-gold" /></div>
            <div className="text-center space-y-1.5">
              <div className="heading-sm text-muted text-[11px]">MULTILINGUAL AI ASSISTANT</div>
              <p className="text-muted text-xs max-w-xs leading-relaxed">
                Type your question in any language. Select a language from the{' '}
                <span className="text-gold">🌐</span> menu to get responses in that language.
              </p>
              <div className="flex items-center justify-center gap-3 mt-2 flex-wrap">
                {ttsSupported && (
                  <span className="flex items-center gap-1 text-[10px] text-muted">
                    <Volume2 size={9} className="text-gold" /> Listen to responses
                  </span>
                )}
                <span className="flex items-center gap-1 text-[10px] text-muted">
                  <Globe size={9} className="text-gold" /> {LANGUAGES.length - 1} languages
                </span>
              </div>
            </div>

            {/* Example prompts */}
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
              <div key={i} className={`flex gap-2 animate-slide-up ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>

                {/* Avatar */}
                <div className={`diamond-icon-sm flex-shrink-0 mt-0.5 ${msg.role === 'user' ? 'border-gold/30' : 'border-[#2A2A2A]'}`}>
                  {msg.role === 'user'
                    ? <User size={11} className="text-gold" />
                    : <Sparkles size={11} className={`text-gold ${speakingIndex === i ? 'animate-pulse' : ''}`} />
                  }
                </div>

                {/* Bubble + controls */}
                <div className={`flex-1 min-w-0 ${msg.role === 'user' ? 'flex flex-col items-end' : ''}`}>
                  <div className={
                    msg.role === 'user'
                      ? 'chat-bubble-user'
                      : `chat-bubble-assistant ${msg.error ? 'border-red-800/50' : ''} ${speakingIndex === i ? 'border-gold/20' : ''}`
                  }>
                    {msg.role === 'assistant' ? (
                      <div className="prose-deco text-xs" dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }} />
                    ) : (
                      <p className="text-foreground text-xs leading-relaxed">{msg.content}</p>
                    )}

                    {msg.timestamp && (
                      <div className="text-muted text-[9px] mt-1.5 opacity-60">
                        {new Date(msg.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>

                  {/* Speak button — AI messages only */}
                  {msg.role === 'assistant' && !msg.error && ttsSupported && (
                    <div className="flex items-center gap-2 mt-1.5 ml-1">
                      <button
                        onClick={() => speakMessage(msg.content, i)}
                        aria-label={speakingIndex === i ? 'Stop speaking' : 'Read aloud'}
                        title={speakingIndex === i ? 'Stop' : 'Listen to this response'}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] transition-all duration-200 border
                          ${speakingIndex === i
                            ? 'border-gold/60 text-gold bg-gold/10 animate-pulse'
                            : 'border-[#2A2A2A] text-muted hover:text-gold hover:border-gold/40 hover:bg-gold/5'
                          }`}
                      >
                        {speakingIndex === i
                          ? <><VolumeX size={10} /><span>Stop</span></>
                          : <><Volume2 size={10} /><span>Speak</span></>
                        }
                      </button>
                      {msg.detectedLang && msg.detectedLang !== 'en-IN' && (
                        <span className="text-[9px] text-muted flex items-center gap-0.5 opacity-60">
                          <Globe size={8} />
                          {LANGUAGES.find(l => l.code === msg.detectedLang)?.label || msg.detectedLang}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Thinking indicator */}
            {sending && (
              <div className="flex gap-2 items-start animate-fade-in">
                <div className="diamond-icon-sm flex-shrink-0 mt-0.5 border-[#2A2A2A]">
                  <Sparkles size={11} className="text-gold animate-pulse" />
                </div>
                <div className="chat-bubble-assistant">
                  <div className="flex gap-1 items-center">
                    {[0, 1, 2].map(i => (
                      <span key={i} className="w-1.5 h-1.5 bg-gold rounded-full animate-glow-pulse"
                        style={{ animationDelay: `${i * 200}ms` }} />
                    ))}
                    <span className="text-muted text-[10px] ml-1">
                      {selectedLang.code !== 'auto' ? `Responding in ${selectedLang.label}...` : 'Thinking...'}
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <SectionDivider className="mx-4 my-0" />

      {/* Input Bar */}
      <div className="flex-shrink-0 p-4">
        <div className="flex gap-2 items-end">

          {/* Text input */}
          <div className="flex-1 relative">
            <textarea
              id="chat-input"
              className="input-deco w-full resize-none min-h-[44px] max-h-32 py-2.5 pr-3 text-[13px]"
              placeholder={
                selectedLang.code !== 'auto'
                  ? `Type in ${selectedLang.label}... (Enter to send)`
                  : 'Ask in any language — Hindi, Telugu, English, Arabic...'
              }
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={sending}
              aria-label="Chat message input"
            />
          </div>

          {/* Send */}
          <button
            id="send-message"
            onClick={() => sendMessage(input)}
            disabled={sending || !input.trim()}
            className="btn-gold !px-3 !py-2.5 !min-h-0 w-10 h-10 flex-shrink-0 justify-center"
            aria-label="Send message"
          >
            <Send size={14} />
          </button>
        </div>

        <p className="text-muted text-[10px] mt-1.5 text-center">
          Powered by Azure AI Foundry · {selectedLang.flag} {selectedLang.label} mode · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
