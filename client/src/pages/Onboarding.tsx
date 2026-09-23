import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';

const SKILL_CATEGORIES = ['Programming Languages', 'Frameworks', 'AI/ML', 'Databases', 'Cloud', 'Other'];
const STEPS = ['Academic', 'Skills', 'Projects & Certs', 'Career Preferences'];

interface SkillEntry { name: string; category: string }
interface ProjectEntry { name: string; description: string; technologies: string }
interface CertEntry { name: string; issuer: string; year: string }

export default function Onboarding() {
  const { user, completeOnboarding } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 0: Academic
  const [academic, setAcademic] = useState({
    university: '', degree: '', branch: '', graduationYear: '', cgpa: '', backlogs: '0',
  });

  // Step 1: Skills
  const [skills, setSkills] = useState<SkillEntry[]>([{ name: '', category: 'Programming Languages' }]);

  // Step 2: Projects & Certs
  const [projects, setProjects] = useState<ProjectEntry[]>([{ name: '', description: '', technologies: '' }]);
  const [certs, setCerts] = useState<CertEntry[]>([{ name: '', issuer: '', year: '' }]);

  // Step 3: Career
  const [career, setCareer] = useState({ preferredRole: '', targetCompany: '' });

  const addSkill = () => setSkills(s => [...s, { name: '', category: 'Other' }]);
  const removeSkill = (i: number) => setSkills(s => s.filter((_, idx) => idx !== i));
  const addProject = () => setProjects(p => [...p, { name: '', description: '', technologies: '' }]);
  const removeProject = (i: number) => setProjects(p => p.filter((_, idx) => idx !== i));
  const addCert = () => setCerts(c => [...c, { name: '', issuer: '', year: '' }]);
  const removeCert = (i: number) => setCerts(c => c.filter((_, idx) => idx !== i));

  const completion = Math.round((
    [academic.university, academic.degree, academic.branch, academic.graduationYear, academic.cgpa,
      skills.some(s => s.name.trim()), projects.some(p => p.name.trim()),
      career.preferredRole, career.targetCompany,
    ].filter(Boolean).length / 9) * 100
  );

  const handleFinish = async () => {
    setLoading(true);
    setError('');
    try {
      await api.profile.update({
        profile: {
          university: academic.university || null,
          degree: academic.degree || null,
          branch: academic.branch || null,
          graduationYear: academic.graduationYear ? parseInt(academic.graduationYear) : null,
          cgpa: academic.cgpa ? parseFloat(academic.cgpa) : null,
          backlogs: academic.backlogs ? parseInt(academic.backlogs) : 0,
          preferredRole: career.preferredRole || null,
          targetCompany: career.targetCompany || null,
        },
        skills: skills.filter(s => s.name.trim()),
        projects: projects.filter(p => p.name.trim()),
        certifications: certs
          .filter(c => c.name.trim())
          .map(c => ({ name: c.name, issuer: c.issuer || null, year: c.year ? parseInt(c.year) : null })),
        fullName: user?.fullName,
      });
      completeOnboarding();
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const stepDots = STEPS.map((label, i) => {
    const state = i < step ? 'done' : i === step ? 'active' : 'pending';
    return { label, state };
  });

  return (
    <div className="deco-bg min-h-screen flex flex-col">
      {/* Header */}
      <div className="border-b border-[#1A1A1A] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 border border-gold flex items-center justify-center flex-shrink-0" style={{ transform: 'rotate(45deg)' }}>
            <div className="w-1.5 h-1.5 bg-gold" style={{ transform: 'rotate(-45deg)' }} />
          </div>
          <span className="label-deco">Campus Placement AI</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="label-deco">Profile Completion</span>
          <span className="text-gold font-heading text-lg">{completion}%</span>
        </div>
      </div>

      {/* Progress stepper */}
      <div className="px-6 pt-5 pb-2">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center">
            {stepDots.map((dot, i) => (
              <React.Fragment key={i}>
                {/* Step node */}
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  {/* Circle indicator */}
                  <div
                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 text-[11px] font-heading ${
                      dot.state === 'done'
                        ? 'bg-gold border-gold text-black'
                        : dot.state === 'active'
                        ? 'bg-transparent border-gold text-gold'
                        : 'bg-transparent border-[#3A3A3A] text-muted'
                    }`}
                  >
                    {dot.state === 'done' ? (
                      <Check size={13} strokeWidth={3} />
                    ) : (
                      <span>{['I', 'II', 'III', 'IV'][i]}</span>
                    )}
                  </div>
                  {/* Label */}
                  <span
                    className={`text-[9px] font-body tracking-wider uppercase whitespace-nowrap hidden sm:block ${
                      dot.state === 'active' ? 'text-gold' : 'text-muted'
                    }`}
                  >
                    {dot.label}
                  </span>
                </div>

                {/* Connector line */}
                {i < STEPS.length - 1 && (
                  <div
                    className="flex-1 h-px mx-2 mb-4 transition-all duration-500"
                    style={{ background: i < step ? 'var(--gold)' : '#2A2A2A' }}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-start justify-center px-4 py-4">
        <div className="w-full max-w-2xl" key={step}>
          <div className="deco-card deco-corners p-6">
            <div className="mb-5">
              <div className="label-deco mb-1">Step {step + 1} of {STEPS.length}</div>
              <h1 className="heading-lg text-foreground">BUILD YOUR PLACEMENT PROFILE</h1>
              <div className="gold-line mt-2" />
            </div>

            {error && (
              <div className="p-3 mb-4 border border-red-800/50 bg-red-900/10 text-red-400 text-xs flex items-center gap-2">
                <span>⚠</span>
                <span>{error}</span>
              </div>
            )}

            {/* ── Step 0: Academic ── */}
            {step === 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: 'University / College', field: 'university', placeholder: 'Your institution' },
                  { label: 'Degree', field: 'degree', placeholder: 'e.g. B.Tech, BCA' },
                  { label: 'Branch / Specialization', field: 'branch', placeholder: 'e.g. Computer Science' },
                  { label: 'Graduation Year', field: 'graduationYear', placeholder: 'e.g. 2025' },
                  { label: 'CGPA', field: 'cgpa', placeholder: 'e.g. 8.5' },
                  { label: 'Active Backlogs', field: 'backlogs', placeholder: '0' },
                ].map(({ label, field, placeholder }) => (
                  <div key={field}>
                    <label className="input-label">{label}</label>
                    <input
                      className="input-deco"
                      placeholder={placeholder}
                      value={academic[field as keyof typeof academic]}
                      onChange={e => setAcademic(a => ({ ...a, [field]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* ── Step 1: Skills ── */}
            {step === 1 && (
              <div className="space-y-3">
                <p className="text-muted text-xs mb-3">
                  Add your technical skills. Be specific — this feeds directly into AI analysis.
                </p>
                {skills.map((skill, i) => (
                  <div key={i} className="flex gap-2 items-center w-full">
                    <input
                      className="input-deco flex-1 min-w-0"
                      placeholder="Skill name (e.g. Python, React)"
                      value={skill.name}
                      onChange={e => setSkills(arr => arr.map((s, idx) => idx === i ? { ...s, name: e.target.value } : s))}
                    />
                    <select
                      className="input-deco flex-shrink-0"
                      style={{ width: '130px' }}
                      value={skill.category}
                      onChange={e => setSkills(arr => arr.map((s, idx) => idx === i ? { ...s, category: e.target.value } : s))}
                    >
                      {SKILL_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                    {skills.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSkill(i)}
                        className="flex-shrink-0 w-8 h-8 flex items-center justify-center border border-red-700/60 text-red-400 hover:bg-red-900/20 transition-colors rounded-none"
                        aria-label="Remove skill"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))}
                <button onClick={addSkill} className="btn-ghost !text-xs !py-2">
                  <Plus size={12} /> Add Skill
                </button>
              </div>
            )}

            {/* ── Step 2: Projects & Certs ── */}
            {step === 2 && (
              <div className="space-y-5">
                {/* Projects */}
                <div>
                  <div className="label-deco mb-3">Projects</div>
                  <div className="space-y-3">
                    {projects.map((proj, i) => (
                      <div key={i} className="border border-[#2A2A2A] p-3 space-y-2">
                        <div className="flex gap-2 items-center w-full">
                          <input
                            className="input-deco flex-1 min-w-0"
                            placeholder="Project name"
                            value={proj.name}
                            onChange={e => setProjects(arr => arr.map((p, idx) => idx === i ? { ...p, name: e.target.value } : p))}
                          />
                          {projects.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeProject(i)}
                              className="flex-shrink-0 w-8 h-8 flex items-center justify-center border border-red-700/60 text-red-400 hover:bg-red-900/20 transition-colors"
                              aria-label="Remove project"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                        <input
                          className="input-deco w-full"
                          placeholder="Technologies used"
                          value={proj.technologies}
                          onChange={e => setProjects(arr => arr.map((p, idx) => idx === i ? { ...p, technologies: e.target.value } : p))}
                        />
                        <textarea
                          className="input-deco w-full"
                          placeholder="Brief description"
                          rows={2}
                          value={proj.description}
                          onChange={e => setProjects(arr => arr.map((p, idx) => idx === i ? { ...p, description: e.target.value } : p))}
                        />
                      </div>
                    ))}
                  </div>
                  <button onClick={addProject} className="btn-ghost !text-xs !py-2 mt-2">
                    <Plus size={12} /> Add Project
                  </button>
                </div>

                <div className="gold-line" />

                {/* Certifications */}
                <div>
                  <div className="label-deco mb-3">Certifications</div>
                  <div className="space-y-2">
                    {certs.map((cert, i) => (
                      <div key={i} className="flex gap-2 items-center w-full flex-wrap sm:flex-nowrap">
                        <input
                          className="input-deco flex-1 min-w-0"
                          placeholder="Certification name"
                          value={cert.name}
                          onChange={e => setCerts(arr => arr.map((c, idx) => idx === i ? { ...c, name: e.target.value } : c))}
                        />
                        <input
                          className="input-deco flex-1 min-w-0"
                          placeholder="Issuer"
                          value={cert.issuer}
                          onChange={e => setCerts(arr => arr.map((c, idx) => idx === i ? { ...c, issuer: e.target.value } : c))}
                        />
                        <input
                          className="input-deco flex-shrink-0"
                          style={{ width: '80px' }}
                          placeholder="Year"
                          value={cert.year}
                          onChange={e => setCerts(arr => arr.map((c, idx) => idx === i ? { ...c, year: e.target.value } : c))}
                        />
                        {certs.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeCert(i)}
                            className="flex-shrink-0 w-8 h-8 flex items-center justify-center border border-red-700/60 text-red-400 hover:bg-red-900/20 transition-colors"
                            aria-label="Remove certification"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button onClick={addCert} className="btn-ghost !text-xs !py-2 mt-2">
                    <Plus size={12} /> Add Certification
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 3: Career ── */}
            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="ob-role" className="input-label">Preferred Role</label>
                  <input
                    id="ob-role"
                    className="input-deco w-full"
                    placeholder="e.g. Software Engineer, Data Scientist"
                    value={career.preferredRole}
                    onChange={e => setCareer(c => ({ ...c, preferredRole: e.target.value }))}
                  />
                </div>
                <div>
                  <label htmlFor="ob-company" className="input-label">Target Company (Primary)</label>
                  <input
                    id="ob-company"
                    className="input-deco w-full"
                    placeholder="e.g. Google, Microsoft, TCS"
                    value={career.targetCompany}
                    onChange={e => setCareer(c => ({ ...c, targetCompany: e.target.value }))}
                  />
                </div>
                <div className="p-3 border border-[#2A2A2A] bg-gold/5">
                  <p className="text-muted text-xs leading-relaxed">
                    <span className="text-gold font-semibold">Note:</span> You can update these
                    preferences anytime from your profile. The AI will use your target company and
                    role for eligibility and skill gap analysis.
                  </p>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-[#2A2A2A]">
              <button
                onClick={() => setStep(s => s - 1)}
                disabled={step === 0}
                className="btn-ghost !text-xs !py-2 disabled:opacity-30"
              >
                <ChevronLeft size={12} /> Back
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="btn-ghost !text-xs !py-2"
                >
                  Skip {step < STEPS.length - 1 ? 'Step' : 'All'}
                </button>

                {step < STEPS.length - 1 ? (
                  <button onClick={() => setStep(s => s + 1)} className="btn-gold !text-xs !py-2">
                    Next <ChevronRight size={12} />
                  </button>
                ) : (
                  <button onClick={handleFinish} disabled={loading} className="btn-gold !text-xs !py-2">
                    {loading ? 'Saving...' : 'Complete Setup'}
                    {!loading && <Check size={12} />}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
