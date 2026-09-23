import React, { useState } from 'react';
import { BarChart2, AlertCircle, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';
import { LoadingState } from '../components/ui/LoadingState';
import { StatusBadge } from '../components/ui/StatusBadge';
import { SectionDivider } from '../components/ui/SectionDivider';
import { DecoButton } from '../components/ui/DecoButton';

function formatAnalysis(text: string): string {
  if (!text) return '';
  return text
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^#{1,4} (.+)$/gm, (_, t) => `<h3>${t}</h3>`)
    .replace(/^- (.+)$/gm, '<li>$1</li>');
}

export default function SkillGap() {
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const run = async () => {
    if (!company.trim() || !role.trim()) {
      setError('Please enter both target company and role.');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await api.analysis.skillGap({ targetCompany: company, targetRole: role });
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
        <div className="label-deco mb-1">Identify confirmed gaps vs. missing information</div>
        <h1 className="font-heading text-xl text-foreground tracking-wide">SKILL GAP INTELLIGENCE</h1>
      </div>

      <SectionDivider />

      {/* Input */}
      <div className="deco-card deco-corners p-4">
        <div className="label-deco mb-4">Analyze Skill Gap For</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div>
            <label htmlFor="sg-company" className="input-label">Target Company *</label>
            <input
              id="sg-company"
              className="input-deco"
              placeholder="e.g. Wipro, Cognizant"
              value={company}
              onChange={e => setCompany(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="sg-role" className="input-label">Target Role *</label>
            <input
              id="sg-role"
              className="input-deco"
              placeholder="e.g. Software Engineer"
              value={role}
              onChange={e => setRole(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
          <div className="p-2.5 border border-[#1E1E1E] text-center">
            <StatusBadge variant="green">Satisfied</StatusBadge>
            <p className="text-muted text-[10px] mt-1.5 leading-relaxed">Skill confirmed from your profile</p>
          </div>
          <div className="p-2.5 border border-[#1E1E1E] text-center">
            <StatusBadge variant="blue">Info Missing</StatusBadge>
            <p className="text-muted text-[10px] mt-1.5 leading-relaxed">Not mentioned — not a confirmed gap</p>
          </div>
          <div className="p-2.5 border border-[#1E1E1E] text-center">
            <StatusBadge variant="red">Confirmed Gap</StatusBadge>
            <p className="text-muted text-[10px] mt-1.5 leading-relaxed">Clearly absent based on profile data</p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 mb-3 border border-red-800/50 bg-red-900/10 text-red-400 text-xs">
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}

        <DecoButton
          id="run-skill-gap"
          onClick={run}
          loading={loading}
          icon={<BarChart2 size={14} />}
        >
          {loading ? 'Analyzing Skill Requirements...' : 'Analyze Skill Gap'}
        </DecoButton>
      </div>

      {loading && (
        <div className="deco-card p-8">
          <LoadingState message="Analyzing skill requirements..." size="lg" />
          <p className="text-center text-muted text-xs mt-3">
            Comparing your skills against {role} requirements at {company}.
          </p>
        </div>
      )}

      {result && !loading && (
        <div className="deco-card deco-corners p-4 animate-slide-up space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <div className="label-deco mb-1">Skill Gap Analysis</div>
              <div className="font-heading text-base text-foreground">
                {company} — {role}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge variant="gold">Skill Gap Report</StatusBadge>
              <button onClick={run} className="btn-ghost !p-2 !min-h-0" aria-label="Re-run analysis">
                <RefreshCw size={12} />
              </button>
            </div>
          </div>

          <SectionDivider />

          <div className="prose-deco" dangerouslySetInnerHTML={{ __html: formatAnalysis(result.analysis) }} />

          <div className="pt-2 border-t border-[#2A2A2A]">
            <p className="text-muted text-[10px] italic">
              Analyzed by Azure AI Foundry (CampusPlacementAgent) on {new Date(result.timestamp).toLocaleString()}.
              Missing information is never classified as a confirmed gap.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
