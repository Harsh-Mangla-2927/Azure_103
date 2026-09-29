import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, Target, Brain, RefreshCw, AlertCircle,
  CheckCircle, HelpCircle, XCircle, ChevronRight,
  BarChart2, BookOpen, Zap, Shield, ArrowRight,
  Upload, ExternalLink,
} from 'lucide-react';
import { api } from '../lib/api';
import { LoadingState } from '../components/ui/LoadingState';
import { SectionDivider } from '../components/ui/SectionDivider';
import { DecoButton } from '../components/ui/DecoButton';

/* ─── Markdown-like formatter (reuses existing pattern from SkillGap.tsx) ─── */
function formatSection(text: string): string {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^## (.+)$/gm, '')   // strip ## headers (we render them separately)
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>');
}

/* ─── Parse AI response into named sections ─── */
function parseAnalysis(raw: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const sectionHeaders = [
    'RESUME COMPATIBILITY SCORE',
    'SCORE BREAKDOWN',
    'WHY THIS SCORE',
    'REQUIRED SKILLS ANALYSIS',
    'RESUME SECTION ANALYSIS',
    'PROJECT RELEVANCE',
    'WHAT YOUR RESUME DOES WELL',
    'WHAT NEEDS IMPROVEMENT',
    'RESUME IMPROVEMENT RECOMMENDATIONS',
    'SAFE REWRITE SUGGESTIONS',
    'NEXT LEARNING PRIORITIES',
    'ACTION PLAN BEFORE APPLYING',
    'DISCLAIMER',
  ];

  let currentKey = '__preamble';
  sections[currentKey] = '';

  const lines = raw.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    const matchedHeader = sectionHeaders.find(h =>
      trimmed === `## ${h}` || trimmed === h || trimmed.startsWith(`## ${h}`)
    );
    if (matchedHeader) {
      currentKey = matchedHeader;
      sections[currentKey] = '';
    } else {
      sections[currentKey] = (sections[currentKey] || '') + line + '\n';
    }
  }

  return sections;
}

/* ─── Extract numeric score from "82/100" pattern ─── */
function extractScore(scoreSection: string): { score: number | null; rationale: string } {
  const match = scoreSection.match(/(\d{1,3})\s*\/\s*100/);
  const score = match ? Math.min(100, Math.max(0, parseInt(match[1], 10))) : null;
  const lines = scoreSection.trim().split('\n').filter(Boolean);
  const rationale = lines.find(l => !l.match(/^\d+\/100/) && !l.match(/^## /))?.trim() || '';
  return { score, rationale };
}

/* ─── Extract dimension scores from breakdown ─── */
function parseBreakdown(text: string): Array<{ label: string; score: number; weight: string }> {
  const dims: Array<{ label: string; score: number; weight: string }> = [];
  const lines = text.split('\n');
  for (const line of lines) {
    const m = line.match(/^([^:]+):\s*(\d+)\/100\s*\(weight:\s*([^)]+)\)/i);
    if (m) dims.push({ label: m[1].trim(), score: parseInt(m[2], 10), weight: m[3].trim() });
  }
  return dims;
}

/* ─── Status badge ─── */
function StatusPill({ status }: { status: string }) {
  const s = status.toUpperCase();
  if (s.includes('SATISFIED')) return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', background: 'rgba(76,175,122,0.1)', border: '1px solid rgba(76,175,122,0.3)', fontSize: 10, fontFamily: "'Josefin Sans',sans-serif", fontWeight: 700, letterSpacing: '0.12em', color: '#4CAF7A' }}>
      <CheckCircle size={10} /> SATISFIED
    </span>
  );
  if (s.includes('INFORMATION_MISSING') || s.includes('MISSING')) return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)', fontSize: 10, fontFamily: "'Josefin Sans',sans-serif", fontWeight: 700, letterSpacing: '0.12em', color: '#D4AF37' }}>
      <HelpCircle size={10} /> INFO MISSING
    </span>
  );
  if (s.includes('CONFIRMED_GAP') || s.includes('GAP')) return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', background: 'rgba(207,102,121,0.1)', border: '1px solid rgba(207,102,121,0.3)', fontSize: 10, fontFamily: "'Josefin Sans',sans-serif", fontWeight: 700, letterSpacing: '0.12em', color: '#CF6679' }}>
      <XCircle size={10} /> CONFIRMED GAP
    </span>
  );
  return null;
}

/* ─── Score circle ─── */
function ScoreCircle({ score }: { score: number | null }) {
  if (score === null) return null;
  const color = score >= 75 ? '#4CAF7A' : score >= 50 ? '#D4AF37' : '#CF6679';
  const r = 56;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <svg width={140} height={140} viewBox="0 0 140 140">
        <circle cx={70} cy={70} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={10} />
        <circle cx={70} cy={70} r={r} fill="none" stroke={color} strokeWidth={10}
          strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={circ / 4}
          strokeLinecap="round" style={{ transition: 'stroke-dasharray 1s ease' }} />
        <text x={70} y={66} textAnchor="middle" fill={color} fontSize={28} fontWeight={700} fontFamily="Marcellus,serif">{score}</text>
        <text x={70} y={84} textAnchor="middle" fill="rgba(136,136,136,0.8)" fontSize={11} fontFamily="'Josefin Sans',sans-serif">/100</text>
      </svg>
      <div style={{ fontFamily: "'Josefin Sans',sans-serif", fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--muted)', textAlign: 'center' }}>
        Resume Compatibility<br />Score
      </div>
    </div>
  );
}

/* ─── Progress bar ─── */
function DimBar({ label, score, weight }: { label: string; score: number; weight: string }) {
  const color = score >= 75 ? '#4CAF7A' : score >= 50 ? '#D4AF37' : '#CF6679';
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
        <span style={{ fontSize: 12, fontFamily: "'Josefin Sans',sans-serif", color: 'var(--foreground)' }}>{label}</span>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: "'Josefin Sans',sans-serif" }}>{weight}</span>
          <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "'Josefin Sans',sans-serif", color }}>{score}/100</span>
        </div>
      </div>
      <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${score}%`, background: color, borderRadius: 2, transition: 'width 1s ease' }} />
      </div>
    </div>
  );
}

/* ─── Section card ─── */
function SectionCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="deco-card" style={{ padding: '20px 22px', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid rgba(212,175,55,0.1)' }}>
        <span style={{ color: '#D4AF37' }}>{icon}</span>
        <h2 style={{ fontFamily: "'Marcellus',Georgia,serif", fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--foreground)', fontWeight: 400 }}>
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════ */
export default function ResumeIntelligence() {
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [resumeInfo, setResumeInfo] = useState<{ name: string; hasText: boolean } | null>(null);
  const [checkingResume, setCheckingResume] = useState(true);

  /* Check if user has an uploaded resume */
  useEffect(() => {
    (async () => {
      try {
        const { resumes } = await api.resume.list();
        if (resumes.length > 0) {
          const r = resumes[0];
          setResumeInfo({ name: r.originalName, hasText: !!(r.extractedText && r.extractedText.length > 50) });
        }
      } catch {
        // not critical
      } finally {
        setCheckingResume(false);
      }
    })();
  }, []);

  const run = async () => {
    if (!company.trim() || !role.trim()) {
      setError('Please enter both target company and role.');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await api.analysis.resumeIntelligence({ targetCompany: company.trim(), targetRole: role.trim() });
      setResult(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  /* ── Pre-analysis: ask user to upload resume if missing ── */
  if (checkingResume) {
    return (
      <div className="p-4 md:p-6">
        <LoadingState message="Checking resume status..." size="sm" />
      </div>
    );
  }

  /* ── Parse sections when result is available ── */
  const sections = result ? parseAnalysis(result.analysis) : null;
  const scoreInfo = sections ? extractScore(sections['RESUME COMPATIBILITY SCORE'] || '') : null;
  const breakdown = sections ? parseBreakdown(sections['SCORE BREAKDOWN'] || '') : [];

  return (
    <div className="p-4 md:p-6 space-y-5 animate-fade-in">

      {/* Header */}
      <div>
        <div className="label-deco mb-1">AI-powered, target-specific resume analysis</div>
        <h1 className="font-heading text-xl text-foreground tracking-wide">RESUME INTELLIGENCE</h1>
      </div>

      <SectionDivider />

      {/* Resume status banner */}
      {!resumeInfo && (
        <div style={{ padding: '14px 18px', background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.25)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Upload size={16} style={{ color: '#D4AF37', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, fontFamily: "'Josefin Sans',sans-serif", color: '#D4AF37', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 3 }}>No resume found</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Please upload your resume first, then return to run Resume Intelligence.</div>
          </div>
          <Link to="/resume" className="btn-gold" style={{ fontSize: 10, padding: '6px 14px', marginLeft: 'auto', flexShrink: 0 }}>Upload Resume</Link>
        </div>
      )}

      {resumeInfo && !resumeInfo.hasText && (
        <div style={{ padding: '14px 18px', background: 'rgba(207,102,121,0.06)', border: '1px solid rgba(207,102,121,0.25)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <AlertCircle size={16} style={{ color: '#CF6679', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, fontFamily: "'Josefin Sans',sans-serif", color: '#CF6679', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 3 }}>Resume text not extracted</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Your uploaded resume ({resumeInfo.name}) could not be read. Please re-upload a readable PDF or DOCX file.</div>
          </div>
          <Link to="/resume" className="btn-ghost" style={{ fontSize: 10, padding: '6px 14px', marginLeft: 'auto', flexShrink: 0 }}>Re-upload</Link>
        </div>
      )}

      {resumeInfo && resumeInfo.hasText && (
        <div style={{ padding: '10px 16px', background: 'rgba(76,175,122,0.05)', border: '1px solid rgba(76,175,122,0.2)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <CheckCircle size={14} style={{ color: '#4CAF7A', flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: "'Josefin Sans',sans-serif" }}>
            Resume ready: <strong style={{ color: 'var(--foreground)' }}>{resumeInfo.name}</strong>
          </span>
          <Link to="/resume" style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3, fontFamily: "'Josefin Sans',sans-serif", textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            <ExternalLink size={10} /> Replace
          </Link>
        </div>
      )}

      {/* Target selection */}
      <div className="deco-card deco-corners p-4">
        <div className="label-deco mb-4">Analyze Resume Against Target</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div>
            <label htmlFor="ri-company" className="input-label">Target Company *</label>
            <input
              id="ri-company"
              className="input-deco"
              value={company}
              onChange={e => setCompany(e.target.value)}
              placeholder="e.g. Microsoft, TCS, Infosys"
            />
          </div>
          <div>
            <label htmlFor="ri-role" className="input-label">Target Role *</label>
            <input
              id="ri-role"
              className="input-deco"
              value={role}
              onChange={e => setRole(e.target.value)}
              placeholder="e.g. Software Engineer"
            />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm mb-3">
            <AlertCircle size={14} />{error}
          </div>
        )}

        <DecoButton
          onClick={run}
          disabled={loading || !resumeInfo?.hasText}
          icon={loading ? <RefreshCw size={14} className="animate-spin" /> : <Brain size={14} />}
        >
          {loading ? 'Analyzing Resume...' : result ? 'Analyze Again' : 'Analyze Resume'}
        </DecoButton>

        {loading && (
          <div style={{ marginTop: 16 }}>
            <LoadingState message="Running Resume Intelligence — this may take 20–40 seconds..." size="sm" />
          </div>
        )}
      </div>

      {/* Results */}
      {result && sections && (
        <div style={{ animation: 'fadeIn 0.5s ease' }}>
          <SectionDivider />

          {/* Target info pill */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
            <div style={{ padding: '6px 14px', background: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.2)', fontSize: 11, fontFamily: "'Josefin Sans',sans-serif", color: 'var(--muted)' }}>
              <span style={{ color: '#D4AF37', fontWeight: 700 }}>TARGET</span>
              {' '}{result.targetCompany} · {result.targetRole}
            </div>
            <div style={{ padding: '6px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', fontSize: 11, fontFamily: "'Josefin Sans',sans-serif", color: 'var(--muted)' }}>
              <span style={{ color: '#D4AF37', fontWeight: 700 }}>RESUME</span>
              {' '}{result.resumeName}
            </div>
          </div>

          {/* Score + Breakdown */}
          <SectionCard icon={<Target size={16} />} title="Resume Compatibility Score">
            <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <div style={{ flexShrink: 0 }}>
                <ScoreCircle score={scoreInfo?.score ?? null} />
              </div>
              <div style={{ flex: 1, minWidth: 220 }}>
                {scoreInfo?.rationale && (
                  <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 18 }}>{scoreInfo.rationale}</p>
                )}
                {breakdown.length > 0 && (
                  <div>
                    <div style={{ fontSize: 10, fontFamily: "'Josefin Sans',sans-serif", fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--muted)', marginBottom: 12 }}>Score Breakdown</div>
                    {breakdown.map((d, i) => <DimBar key={i} {...d} />)}
                  </div>
                )}
                <div style={{ marginTop: 14, padding: '8px 12px', background: 'rgba(212,175,55,0.04)', border: '1px solid rgba(212,175,55,0.1)', fontSize: 11, color: 'rgba(136,136,136,0.7)', fontFamily: "'Josefin Sans',sans-serif", lineHeight: 1.6 }}>
                  This score is an application-defined compatibility assessment — not an official ATS score. It does not guarantee interview selection or placement.
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Why this score */}
          {sections['WHY THIS SCORE']?.trim() && (
            <SectionCard icon={<HelpCircle size={16} />} title="Why This Score">
              <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.75, whiteSpace: 'pre-line' }}>
                {sections['WHY THIS SCORE'].trim()}
              </div>
            </SectionCard>
          )}

          {/* Required Skills */}
          {sections['REQUIRED SKILLS ANALYSIS']?.trim() && (
            <SectionCard icon={<CheckCircle size={16} />} title="Required Skills Analysis">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sections['REQUIRED SKILLS ANALYSIS'].trim().split('\n').filter(Boolean).map((line, i) => {
                  const parts = line.split('|').map(p => p.trim());
                  if (parts.length >= 2) {
                    const skill = parts[0];
                    const statusPart = parts.find(p => p.startsWith('STATUS:')) || '';
                    const evidencePart = parts.find(p => p.startsWith('EVIDENCE:')) || '';
                    const status = statusPart.replace('STATUS:', '').trim();
                    const evidence = evidencePart.replace('EVIDENCE:', '').trim();
                    return (
                      <div key={i} style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: evidence ? 4 : 0 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "'Josefin Sans',sans-serif", color: 'var(--foreground)' }}>{skill}</span>
                          <StatusPill status={status} />
                        </div>
                        {evidence && <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: "'Josefin Sans',sans-serif" }}>{evidence}</div>}
                      </div>
                    );
                  }
                  return line.trim() ? <div key={i} style={{ fontSize: 12, color: 'var(--muted)' }}>{line}</div> : null;
                })}
              </div>
            </SectionCard>
          )}

          {/* Resume Section Analysis */}
          {sections['RESUME SECTION ANALYSIS']?.trim() && (
            <SectionCard icon={<FileText size={16} />} title="Resume Structure Analysis">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
                {sections['RESUME SECTION ANALYSIS'].trim().split('\n').filter(Boolean).map((line, i) => {
                  const statusMatch = line.match(/STATUS:\s*(PRESENT|MISSING|WEAK)/i);
                  const notesMatch = line.match(/NOTES?:\s*(.+)/i);
                  const sectionName = line.split('|')[0].trim();
                  if (!statusMatch) return line.trim() ? <div key={i} style={{ fontSize: 12, color: 'var(--muted)', gridColumn: '1/-1' }}>{line}</div> : null;
                  const status = statusMatch[1].toUpperCase();
                  const notes = notesMatch ? notesMatch[1].trim() : '';
                  const color = status === 'PRESENT' ? '#4CAF7A' : status === 'WEAK' ? '#D4AF37' : '#CF6679';
                  const icon = status === 'PRESENT' ? <CheckCircle size={12} /> : status === 'WEAK' ? <HelpCircle size={12} /> : <XCircle size={12} />;
                  return (
                    <div key={i} style={{ padding: '10px 12px', border: `1px solid ${color}30`, background: `${color}08` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: notes ? 4 : 0 }}>
                        <span style={{ color }}>{icon}</span>
                        <span style={{ fontSize: 11, fontFamily: "'Josefin Sans',sans-serif", fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color }}>{sectionName}</span>
                      </div>
                      {notes && <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: "'Josefin Sans',sans-serif" }}>{notes}</div>}
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          )}

          {/* Project Relevance */}
          {sections['PROJECT RELEVANCE']?.trim() && (
            <SectionCard icon={<BarChart2 size={16} />} title="Project Relevance">
              <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.75, whiteSpace: 'pre-line' }}>
                {sections['PROJECT RELEVANCE'].trim()}
              </div>
            </SectionCard>
          )}

          {/* Does well + Needs improvement side by side */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 16 }}>
            {sections['WHAT YOUR RESUME DOES WELL']?.trim() && (
              <div className="deco-card" style={{ padding: '18px 20px', borderColor: 'rgba(76,175,122,0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <CheckCircle size={15} style={{ color: '#4CAF7A' }} />
                  <h2 style={{ fontFamily: "'Marcellus',Georgia,serif", fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#4CAF7A', fontWeight: 400 }}>
                    What Your Resume Does Well
                  </h2>
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.75, whiteSpace: 'pre-line' }}>
                  {sections['WHAT YOUR RESUME DOES WELL'].trim()}
                </div>
              </div>
            )}
            {sections['WHAT NEEDS IMPROVEMENT']?.trim() && (
              <div className="deco-card" style={{ padding: '18px 20px', borderColor: 'rgba(207,102,121,0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <AlertCircle size={15} style={{ color: '#CF6679' }} />
                  <h2 style={{ fontFamily: "'Marcellus',Georgia,serif", fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#CF6679', fontWeight: 400 }}>
                    What Needs Improvement
                  </h2>
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.75, whiteSpace: 'pre-line' }}>
                  {sections['WHAT NEEDS IMPROVEMENT'].trim()}
                </div>
              </div>
            )}
          </div>

          {/* Recommendations */}
          {sections['RESUME IMPROVEMENT RECOMMENDATIONS']?.trim() && (
            <SectionCard icon={<Zap size={16} />} title="Resume Improvement Recommendations">
              <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.75, whiteSpace: 'pre-line' }}>
                {sections['RESUME IMPROVEMENT RECOMMENDATIONS'].trim()}
              </div>
            </SectionCard>
          )}

          {/* Safe Rewrites */}
          {sections['SAFE REWRITE SUGGESTIONS']?.trim() && (
            <SectionCard icon={<FileText size={16} />} title="Safe Rewrite Suggestions">
              <div style={{ fontSize: 12, color: 'rgba(212,175,55,0.7)', fontFamily: "'Josefin Sans',sans-serif", marginBottom: 12, lineHeight: 1.6 }}>
                ⚠ These suggestions are based only on evidence already in your resume. Do not add skills, projects, or achievements you have not genuinely completed.
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.75, whiteSpace: 'pre-line' }}>
                {sections['SAFE REWRITE SUGGESTIONS'].trim()}
              </div>
            </SectionCard>
          )}

          {/* Next Learning Priorities */}
          {sections['NEXT LEARNING PRIORITIES']?.trim() && (
            <SectionCard icon={<BookOpen size={16} />} title="Next Learning Priorities (Confirmed Gaps Only)">
              <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.75, whiteSpace: 'pre-line' }}>
                {sections['NEXT LEARNING PRIORITIES'].trim()}
              </div>
            </SectionCard>
          )}

          {/* Action Plan */}
          {sections['ACTION PLAN BEFORE APPLYING']?.trim() && (
            <SectionCard icon={<ArrowRight size={16} />} title="Action Plan Before Applying">
              <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.75, whiteSpace: 'pre-line' }}>
                {sections['ACTION PLAN BEFORE APPLYING'].trim()}
              </div>
            </SectionCard>
          )}

          {/* Disclaimer */}
          {sections['DISCLAIMER']?.trim() && (
            <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <Shield size={13} style={{ color: 'var(--muted)', flexShrink: 0, marginTop: 2 }} />
                <div style={{ fontSize: 11, color: 'rgba(136,136,136,0.6)', lineHeight: 1.65, fontFamily: "'Josefin Sans',sans-serif" }}>
                  {sections['DISCLAIMER'].trim()}
                </div>
              </div>
            </div>
          )}

          {/* CTA buttons */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', paddingTop: 4 }}>
            <DecoButton onClick={run} disabled={loading}
              icon={<RefreshCw size={13} />}>
              Analyze Again
            </DecoButton>
            <Link to="/skill-gap">
              <button className="btn-ghost" style={{ fontSize: 11, padding: '8px 18px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <BarChart2 size={13} /> Full Skill Gap Analysis
              </button>
            </Link>
            <Link to="/preparation">
              <button className="btn-ghost" style={{ fontSize: 11, padding: '8px 18px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <BookOpen size={13} /> Preparation Plan
              </button>
            </Link>
            <Link to="/assistant">
              <button className="btn-ghost" style={{ fontSize: 11, padding: '8px 18px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Brain size={13} /> Ask AI Assistant
              </button>
            </Link>
          </div>

          <div style={{ marginTop: 12, fontSize: 11, color: 'rgba(136,136,136,0.5)', fontFamily: "'Josefin Sans',sans-serif" }}>
            Analyzed: {new Date(result.timestamp).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
}
