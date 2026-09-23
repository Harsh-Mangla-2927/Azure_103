import React, { useState } from 'react';
import { BookOpen, AlertCircle, RefreshCw, Save } from 'lucide-react';
import { api } from '../lib/api';
import { LoadingState } from '../components/ui/LoadingState';
import { StatusBadge } from '../components/ui/StatusBadge';
import { SectionDivider } from '../components/ui/SectionDivider';
import { DecoButton } from '../components/ui/DecoButton';

function formatPlan(text: string): string {
  if (!text) return '';
  return text
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^#{1,4} (.+)$/gm, (_, t) => `<h3>${t}</h3>`)
    .replace(/^- (.+)$/gm, '<li>$1</li>');
}

const PHASES = ['Foundation', 'Core Skills', 'Role Preparation', 'Interview Preparation', 'Final Readiness'];

export default function Preparation() {
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const run = async () => {
    if (!company.trim() || !role.trim()) {
      setError('Please enter both target company and role.');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    setSaved(false);
    try {
      const data = await api.analysis.preparation({ targetCompany: company, targetRole: role });
      setResult(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-5 animate-fade-in">
      <div>
        <div className="label-deco mb-1">Personalized AI-generated preparation roadmap</div>
        <h1 className="font-heading text-xl text-foreground tracking-wide">PLACEMENT PREPARATION PLAN</h1>
      </div>

      <SectionDivider />

      {/* Input */}
      <div className="deco-card deco-corners p-4">
        <div className="label-deco mb-4">Generate Preparation Plan For</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div>
            <label htmlFor="prep-company" className="input-label">Target Company *</label>
            <input
              id="prep-company"
              className="input-deco"
              placeholder="e.g. Accenture, TCS"
              value={company}
              onChange={e => setCompany(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="prep-role" className="input-label">Target Role *</label>
            <input
              id="prep-role"
              className="input-deco"
              placeholder="e.g. Software Engineer"
              value={role}
              onChange={e => setRole(e.target.value)}
            />
          </div>
        </div>

        {/* Phase preview */}
        <div className="flex items-center gap-1 flex-wrap mb-4">
          {PHASES.map((phase, i) => (
            <React.Fragment key={i}>
              <div className="flex items-center gap-1.5 py-1 px-2 border border-[#1E1E1E]">
                <span className="phase-number text-[9px]">{['I','II','III','IV','V'][i]}</span>
                <span className="text-muted text-[9px] uppercase tracking-wider">{phase}</span>
              </div>
              {i < PHASES.length - 1 && <div className="text-[#2A2A2A] text-xs">→</div>}
            </React.Fragment>
          ))}
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 mb-3 border border-red-800/50 bg-red-900/10 text-red-400 text-xs">
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          <DecoButton
            id="generate-plan"
            onClick={run}
            loading={loading}
            icon={<BookOpen size={14} />}
          >
            {loading ? 'Generating Plan...' : result ? 'Regenerate Plan' : 'Generate Preparation Plan'}
          </DecoButton>

          {result && (
            <DecoButton
              variant="ghost"
              onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000); }}
              icon={<Save size={14} />}
            >
              {saved ? 'Plan Saved!' : 'Save Plan'}
            </DecoButton>
          )}
        </div>
      </div>

      {loading && (
        <div className="deco-card p-8">
          <LoadingState message="Generating personalized preparation plan..." size="lg" />
          <p className="text-center text-muted text-xs mt-3">
            The AI is crafting a phased roadmap for {role} at {company} based on your profile.
          </p>
        </div>
      )}

      {result && !loading && (
        <div className="deco-card deco-corners p-4 animate-slide-up space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <div className="label-deco mb-1">Preparation Plan</div>
              <div className="font-heading text-base text-foreground">
                {company} — {role}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge variant="gold">AI Generated</StatusBadge>
              <button onClick={run} className="btn-ghost !p-2 !min-h-0" aria-label="Regenerate plan">
                <RefreshCw size={12} />
              </button>
            </div>
          </div>

          <SectionDivider />

          <div className="prose-deco" dangerouslySetInnerHTML={{ __html: formatPlan(result.plan) }} />

          <div className="pt-2 border-t border-[#2A2A2A]">
            <p className="text-muted text-[10px] italic">
              Plan generated by Azure AI Foundry (CampusPlacementAgent) on {new Date(result.timestamp).toLocaleString()}.
              Focus is placed on confirmed skill gaps — not on unmentioned information.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
