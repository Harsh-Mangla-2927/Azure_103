import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic, Play, Square, RotateCcw, Globe, ChevronDown,
  Sparkles, Volume2, VolumeX, AlertCircle, Loader,
} from 'lucide-react';
import { api } from '../lib/api';
import { LoadingState } from '../components/ui/LoadingState';
import { SectionDivider } from '../components/ui/SectionDivider';

// ── Types ─────────────────────────────────────────────────────────────────────

interface LangOption {
  code: string;
  bcp47: string;
  label: string;
  flag: string;
}

type AudioState = 'idle' | 'generating' | 'ready' | 'playing' | 'paused' | 'error';

// ── Helpers ───────────────────────────────────────────────────────────────────

function pickVoice(bcp47: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const base = bcp47.split('-')[0];
  return (
    voices.find(v => v.lang === bcp47 && (v.name.includes('Google') || v.name.includes('Neural') || v.name.includes('Natural'))) ||
    voices.find(v => v.lang === bcp47) ||
    voices.find(v => v.lang.startsWith(base)) ||
    voices.find(v => v.lang.startsWith('en')) ||
    voices[0] ||
    null
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AudioPresentation() {
  const [languages, setLanguages] = useState<LangOption[]>([]);
  const [selectedLang, setSelectedLang] = useState<LangOption | null>(null);
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  const [script, setScript] = useState('');
  const [audioState, setAudioState] = useState<AudioState>('idle');
  const [error, setError] = useState('');
  const [generatingScript, setGeneratingScript] = useState(false);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  // ── Load languages from real backend endpoint ─────────────────────────────
  useEffect(() => {
    api.audio.languages()
      .then(({ languages: langs }) => {
        setLanguages(langs);
        setSelectedLang(langs[0] ?? null); // default: English
      })
      .catch(() => setError('Failed to load supported languages.'));
  }, []);

  // ── Close dropdown on outside click ──────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Cleanup TTS on unmount ────────────────────────────────────────────────
  useEffect(() => {
    return () => { window.speechSynthesis?.cancel(); };
  }, []);

  // ── Generate Script ───────────────────────────────────────────────────────
  const handleGenerateScript = async () => {
    if (!selectedLang) return;
    setGeneratingScript(true);
    setError('');
    setScript('');
    setAudioState('idle');
    stopAudio();

    try {
      const result = await api.audio.generateScript({
        language: selectedLang.label,
        languageCode: selectedLang.code,
      });

      if (!result.script || result.script.trim().length < 10) {
        throw new Error('Received an empty script from the agent.');
      }

      setScript(result.script);
      setAudioState('ready');
    } catch (err) {
      const msg = (err as Error).message || 'Failed to generate script.';
      setError(msg);
      setAudioState('error');
    } finally {
      setGeneratingScript(false);
    }
  };

  // ── TTS Play ──────────────────────────────────────────────────────────────
  const stopAudio = useCallback(() => {
    window.speechSynthesis?.cancel();
    utteranceRef.current = null;
    setAudioState(prev => (prev === 'playing' || prev === 'paused') ? 'ready' : prev);
  }, []);

  const playScript = useCallback(() => {
    if (!script || !ttsSupported || !selectedLang) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(script);
    utterance.lang = selectedLang.bcp47;
    utterance.rate = 0.92;
    utterance.pitch = 1;
    utterance.volume = 1;

    const doPlay = () => {
      const voice = pickVoice(selectedLang.bcp47);
      if (voice) utterance.voice = voice;

      utterance.onstart = () => setAudioState('playing');
      utterance.onend = () => setAudioState('ready');
      utterance.onerror = (e) => {
        // 'interrupted' is normal when user clicks Stop — don't treat as error
        if (e.error !== 'interrupted') {
          setError(`TTS error: ${e.error}. Your text response is still available above.`);
          setAudioState('error');
        } else {
          setAudioState('ready');
        }
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    };

    if (window.speechSynthesis.getVoices().length > 0) {
      doPlay();
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        doPlay();
        window.speechSynthesis.onvoiceschanged = null;
      };
    }
  }, [script, selectedLang, ttsSupported]);

  const pauseAudio = useCallback(() => {
    window.speechSynthesis.pause();
    setAudioState('paused');
  }, []);

  const resumeAudio = useCallback(() => {
    window.speechSynthesis.resume();
    setAudioState('playing');
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  const isPlaying = audioState === 'playing';
  const isPaused = audioState === 'paused';
  const hasScript = script.length > 0;

  return (
    <div className="p-4 md:p-6 space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="label-deco mb-1">Azure AI Foundry — CampusPlacementAgent</div>
          <h1 className="font-heading text-xl md:text-2xl text-foreground tracking-wide">
            PRESENTATION SCRIPT
          </h1>
          <p className="text-muted text-xs mt-0.5">
            AI-generated audio script · Personalised from your profile
          </p>
        </div>
        {selectedLang && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 border border-[#2A2A2A] rounded text-[11px] text-muted">
            <Volume2 size={11} className="text-gold" />
            <span>{selectedLang.flag} {selectedLang.label} · Browser TTS</span>
          </div>
        )}
      </div>

      <SectionDivider />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Left panel — controls */}
        <div className="space-y-4">
          <div className="deco-card deco-corners p-4 space-y-4">
            <div className="label-deco">Configuration</div>

            {/* Language Selector */}
            <div>
              <div className="text-muted text-[10px] mb-1.5 uppercase tracking-wider">Script Language</div>
              <div ref={langRef} className="relative">
                <button
                  onClick={() => setLangOpen(o => !o)}
                  disabled={generatingScript}
                  className="w-full flex items-center justify-between px-3 py-2 border border-[#2A2A2A] hover:border-gold/40 rounded text-[12px] text-foreground transition-all disabled:opacity-50"
                >
                  <span className="flex items-center gap-2">
                    <Globe size={12} className="text-gold" />
                    {selectedLang ? `${selectedLang.flag} ${selectedLang.label}` : 'Loading...'}
                  </span>
                  <ChevronDown size={11} className={`text-muted transition-transform ${langOpen ? 'rotate-180' : ''}`} />
                </button>

                {langOpen && languages.length > 0 && (
                  <div className="absolute left-0 top-full mt-1 z-50 w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded shadow-xl max-h-56 overflow-y-auto">
                    {languages.map(lang => (
                      <button
                        key={lang.code}
                        onClick={() => { setSelectedLang(lang); setLangOpen(false); setScript(''); setAudioState('idle'); setError(''); }}
                        className={`w-full text-left px-3 py-2 text-[11px] flex items-center gap-2 hover:bg-[#1A1A1A] transition-colors
                          ${selectedLang?.code === lang.code ? 'text-gold' : 'text-muted hover:text-foreground'}`}
                      >
                        <span>{lang.flag}</span>
                        <span>{lang.label}</span>
                        {selectedLang?.code === lang.code && <span className="ml-auto text-gold">✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Voice info */}
            {selectedLang && ttsSupported && (
              <div className="text-[10px] text-muted border border-[#1E1E1E] p-2 rounded space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <Volume2 size={9} className="text-gold" />
                  <span>TTS: Browser Web Speech API</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Globe size={9} className="text-gold" />
                  <span>Voice locale: {selectedLang.bcp47}</span>
                </div>
                <div className="text-[9px] text-muted mt-1 opacity-70">
                  Voice quality depends on your browser and OS.
                  Chrome provides the best multilingual support.
                </div>
              </div>
            )}

            {!ttsSupported && (
              <div className="flex items-start gap-2 p-2 border border-red-800/40 rounded text-[10px] text-red-400">
                <AlertCircle size={11} className="flex-shrink-0 mt-0.5" />
                <span>Web Speech API not supported in this browser. Use Chrome or Edge.</span>
              </div>
            )}

            {/* Generate button */}
            <button
              onClick={handleGenerateScript}
              disabled={generatingScript || !selectedLang}
              className="btn-gold w-full !py-2.5 justify-center"
              id="generate-script-btn"
            >
              {generatingScript ? (
                <><Loader size={13} className="animate-spin" /> Generating Script...</>
              ) : (
                <><Sparkles size={13} /> Generate AI Script</>
              )}
            </button>
          </div>

          {/* Audio Controls */}
          {hasScript && (
            <div className="deco-card p-4 space-y-3">
              <div className="label-deco">Audio Controls</div>

              {/* Play/Pause/Stop row */}
              <div className="flex gap-2">
                {!isPlaying && !isPaused && (
                  <button
                    onClick={playScript}
                    disabled={!ttsSupported}
                    className="btn-gold flex-1 !py-2 !text-xs justify-center"
                    id="play-audio-btn"
                    title="Play script"
                  >
                    <Play size={12} /> Play
                  </button>
                )}
                {isPlaying && (
                  <button
                    onClick={pauseAudio}
                    className="btn-ghost flex-1 !py-2 !text-xs justify-center"
                    id="pause-audio-btn"
                    title="Pause"
                  >
                    <VolumeX size={12} /> Pause
                  </button>
                )}
                {isPaused && (
                  <button
                    onClick={resumeAudio}
                    className="btn-gold flex-1 !py-2 !text-xs justify-center"
                    id="resume-audio-btn"
                    title="Resume"
                  >
                    <Play size={12} /> Resume
                  </button>
                )}
                {(isPlaying || isPaused) && (
                  <button
                    onClick={stopAudio}
                    className="btn-ghost !py-2 !text-xs !px-3"
                    id="stop-audio-btn"
                    title="Stop"
                  >
                    <Square size={12} />
                  </button>
                )}
                <button
                  onClick={handleGenerateScript}
                  disabled={generatingScript}
                  className="btn-ghost !py-2 !text-xs !px-3"
                  id="regenerate-btn"
                  title="Regenerate script"
                >
                  <RotateCcw size={12} />
                </button>
              </div>

              {/* Playing indicator */}
              {isPlaying && (
                <div className="flex items-center gap-2 text-[10px] text-gold animate-pulse">
                  <Volume2 size={10} />
                  <span>Playing in {selectedLang?.label}...</span>
                  <div className="flex gap-0.5 ml-auto">
                    {[0, 1, 2].map(i => (
                      <span key={i} className="w-1 h-3 bg-gold rounded-full animate-glow-pulse"
                        style={{ animationDelay: `${i * 150}ms` }} />
                    ))}
                  </div>
                </div>
              )}
              {isPaused && (
                <div className="flex items-center gap-2 text-[10px] text-muted">
                  <VolumeX size={10} />
                  <span>Paused</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right panel — script display */}
        <div className="lg:col-span-2">
          <div className="deco-card deco-corners p-4 min-h-[300px] flex flex-col">
            <div className="label-deco mb-3">Generated Script</div>

            {/* Error state */}
            {error && (
              <div className="flex items-start gap-2 p-3 border border-red-800/40 rounded mb-3 bg-red-950/10">
                <AlertCircle size={13} className="text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-xs leading-relaxed">{error}</p>
              </div>
            )}

            {/* Loading state */}
            {generatingScript && (
              <div className="flex-1 flex flex-col items-center justify-center gap-3">
                <div className="diamond-icon opacity-40">
                  <Sparkles size={20} className="text-gold" />
                </div>
                <div className="text-center">
                  <div className="label-deco mb-1">Generating Script</div>
                  <p className="text-muted text-xs">
                    Azure AI Foundry is crafting your personalised script in {selectedLang?.label}...
                  </p>
                </div>
                <div className="flex gap-1.5 mt-2">
                  {[0, 1, 2].map(i => (
                    <span key={i} className="w-2 h-2 bg-gold rounded-full animate-glow-pulse"
                      style={{ animationDelay: `${i * 200}ms` }} />
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {!generatingScript && !hasScript && !error && (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 opacity-50">
                <div className="diamond-icon">
                  <Mic size={20} className="text-gold" />
                </div>
                <div className="text-center">
                  <div className="heading-sm text-muted text-[11px] mb-1">NO SCRIPT YET</div>
                  <p className="text-muted text-xs max-w-xs">
                    Select a language and click "Generate AI Script" to create
                    a personalised presentation script from your profile.
                  </p>
                </div>
              </div>
            )}

            {/* Script display */}
            {hasScript && !generatingScript && (
              <div className="flex-1 flex flex-col">
                {/* Language + metadata badge */}
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className="flex items-center gap-1 px-2 py-0.5 border border-gold/30 rounded text-[10px] text-gold">
                    <Globe size={9} /> {selectedLang?.flag} {selectedLang?.label}
                  </span>
                  <span className="flex items-center gap-1 px-2 py-0.5 border border-[#2A2A2A] rounded text-[10px] text-muted">
                    <Sparkles size={9} /> AI Generated
                  </span>
                  {isPlaying && (
                    <span className="flex items-center gap-1 px-2 py-0.5 border border-gold/40 bg-gold/10 rounded text-[10px] text-gold animate-pulse ml-auto">
                      <Volume2 size={9} /> Speaking...
                    </span>
                  )}
                </div>

                {/* Script text */}
                <div className="flex-1 bg-[#0D0D0D] border border-[#1E1E1E] rounded p-4">
                  <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap font-sans">
                    {script}
                  </p>
                </div>

                <p className="text-muted text-[10px] mt-2">
                  Script generated by CampusPlacementAgent via Azure AI Foundry · GPT-4.1-mini ·
                  Based on your actual profile data only
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
