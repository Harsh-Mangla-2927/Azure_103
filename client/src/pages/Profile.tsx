import React, { useState, useCallback } from 'react';
import { Plus, Trash2, Save, Edit2, X, Check, User, Book, Briefcase, Award, Target } from 'lucide-react';
import { useProfile } from '../hooks/useProfile';
import { LoadingState } from '../components/ui/LoadingState';
import { SectionDivider } from '../components/ui/SectionDivider';
import { DecoButton } from '../components/ui/DecoButton';

const SKILL_CATEGORIES = ['Programming Languages', 'Frameworks', 'AI/ML', 'Databases', 'Cloud', 'Other'];

export default function Profile() {
  const { user, profile, skills, projects, certifications, loading, error, save } = useProfile();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveOk, setSaveOk] = useState(false);

  // Local editable state
  const [localProfile, setLocalProfile] = useState({ ...profile });
  const [localSkills, setLocalSkills] = useState([...skills]);
  const [localProjects, setLocalProjects] = useState([...projects]);
  const [localCerts, setLocalCerts] = useState([...certifications]);
  const [fullName, setFullName] = useState(user?.fullName || '');

  // Sync when data loads
  React.useEffect(() => {
    if (!loading) {
      setLocalProfile({ ...profile });
      setLocalSkills([...skills]);
      setLocalProjects([...projects]);
      setLocalCerts([...certifications]);
      setFullName(user?.fullName || '');
    }
  }, [loading]);

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    setSaveOk(false);
    try {
      await save({
        fullName,
        profile: {
          university: localProfile.university,
          degree: localProfile.degree,
          branch: localProfile.branch,
          graduationYear: localProfile.graduation_year || null,
          cgpa: localProfile.cgpa !== undefined ? localProfile.cgpa : null,
          backlogs: localProfile.backlogs || 0,
          preferredRole: localProfile.preferred_role,
          targetCompany: localProfile.target_company,
        },
        skills: localSkills.filter(s => s.name?.trim()),
        projects: localProjects.filter(p => p.name?.trim()),
        certifications: localCerts.filter(c => c.name?.trim()),
      });
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 3000);
    } catch (err) {
      setSaveError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const completion = Math.round(
    ([
      fullName, localProfile.university, localProfile.degree, localProfile.branch,
      localProfile.graduation_year, localProfile.cgpa,
      localSkills.some(s => s.name?.trim()),
      localProjects.some(p => p.name?.trim()),
      localProfile.preferred_role, localProfile.target_company,
    ].filter(Boolean).length / 10) * 100
  );

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <LoadingState message="Loading profile..." />
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="label-deco mb-1">Your academic and career profile</div>
          <h1 className="font-heading text-xl text-foreground tracking-wide">MY PROFILE</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-gold font-heading text-lg">{completion}%</div>
          <div className="label-deco">Complete</div>
          <DecoButton onClick={handleSave} loading={saving} icon={saveOk ? <Check size={14} /> : <Save size={14} />}>
            {saveOk ? 'Saved!' : 'Save Profile'}
          </DecoButton>
        </div>
      </div>

      {/* Progress bar */}
      <div className="progress-deco">
        <div className="progress-deco-fill" style={{ width: `${completion}%` }} />
      </div>

      {(saveError || error) && (
        <div className="p-3 border border-red-800/50 bg-red-900/10 text-red-400 text-xs">{saveError || error}</div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Academic Information */}
        <div className="deco-card deco-corners p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="diamond-icon-sm text-gold"><Book size={12} /></div>
            <div className="label-deco">Academic Information</div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: 'Full Name', field: 'fullName', isUser: true, placeholder: 'Your full name' },
              { label: 'University', field: 'university', placeholder: 'Institution name' },
              { label: 'Degree', field: 'degree', placeholder: 'e.g. B.Tech' },
              { label: 'Branch', field: 'branch', placeholder: 'e.g. Computer Science' },
              { label: 'Graduation Year', field: 'graduation_year', placeholder: 'e.g. 2025', type: 'number' },
              { label: 'CGPA', field: 'cgpa', placeholder: 'e.g. 8.5', type: 'number' },
              { label: 'Active Backlogs', field: 'backlogs', placeholder: '0', type: 'number' },
            ].map(({ label, field, isUser, placeholder, type }) => (
              <div key={field}>
                <label className="input-label">{label}</label>
                <input
                  type={type || 'text'}
                  className="input-deco"
                  placeholder={placeholder}
                  value={isUser ? fullName : (localProfile[field as keyof typeof localProfile] as any) ?? ''}
                  onChange={e => {
                    if (isUser) setFullName(e.target.value);
                    else setLocalProfile(p => ({
                      ...p,
                      [field]: type === 'number' ? (e.target.value === '' ? undefined : Number(e.target.value)) : e.target.value
                    }));
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Career Preferences */}
        <div className="deco-card deco-corners p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="diamond-icon-sm text-gold"><Target size={12} /></div>
            <div className="label-deco">Career Preferences</div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="input-label">Preferred Role</label>
              <input
                className="input-deco"
                placeholder="e.g. Software Engineer, Data Scientist"
                value={localProfile.preferred_role || ''}
                onChange={e => setLocalProfile(p => ({ ...p, preferred_role: e.target.value }))}
              />
            </div>
            <div>
              <label className="input-label">Target Company</label>
              <input
                className="input-deco"
                placeholder="e.g. Google, Infosys, Wipro"
                value={localProfile.target_company || ''}
                onChange={e => setLocalProfile(p => ({ ...p, target_company: e.target.value }))}
              />
            </div>
          </div>

          {/* Skills */}
          <SectionDivider title="Skills" className="my-4" />
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {localSkills.map((skill, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  className="input-deco flex-1"
                  placeholder="Skill name"
                  value={skill.name || ''}
                  onChange={e => setLocalSkills(arr => arr.map((s, idx) => idx === i ? { ...s, name: e.target.value } : s))}
                />
                <select
                  className="input-deco w-28 flex-shrink-0"
                  value={skill.category || 'Other'}
                  onChange={e => setLocalSkills(arr => arr.map((s, idx) => idx === i ? { ...s, category: e.target.value } : s))}
                >
                  {SKILL_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
                <button onClick={() => setLocalSkills(arr => arr.filter((_, idx) => idx !== i))} className="btn-danger !px-1.5 !py-1.5 !min-h-0" aria-label="Remove skill">
                  <Trash2 size={10} />
                </button>
              </div>
            ))}
          </div>
          <button onClick={() => setLocalSkills(s => [...s, { id: Date.now(), name: '', category: 'Other' } as any])} className="btn-ghost !text-xs !py-1.5 mt-2">
            <Plus size={11} /> Add Skill
          </button>
        </div>

        {/* Projects */}
        <div className="deco-card deco-corners p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="diamond-icon-sm text-gold"><Briefcase size={12} /></div>
            <div className="label-deco">Projects</div>
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {localProjects.map((proj, i) => (
              <div key={i} className="border border-[#222] p-3 space-y-2">
                <div className="flex gap-2">
                  <input className="input-deco flex-1" placeholder="Project name" value={proj.name || ''} onChange={e => setLocalProjects(arr => arr.map((p, idx) => idx === i ? { ...p, name: e.target.value } : p))} />
                  <button onClick={() => setLocalProjects(arr => arr.filter((_, idx) => idx !== i))} className="btn-danger !px-1.5 !py-1.5 !min-h-0"><Trash2 size={10} /></button>
                </div>
                <input className="input-deco" placeholder="Technologies" value={proj.technologies || ''} onChange={e => setLocalProjects(arr => arr.map((p, idx) => idx === i ? { ...p, technologies: e.target.value } : p))} />
                <textarea className="input-deco text-xs" rows={2} placeholder="Description" value={proj.description || ''} onChange={e => setLocalProjects(arr => arr.map((p, idx) => idx === i ? { ...p, description: e.target.value } : p))} />
              </div>
            ))}
          </div>
          <button onClick={() => setLocalProjects(p => [...p, { id: Date.now(), name: '', description: '', technologies: '' } as any])} className="btn-ghost !text-xs !py-1.5 mt-2">
            <Plus size={11} /> Add Project
          </button>
        </div>

        {/* Certifications */}
        <div className="deco-card deco-corners p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="diamond-icon-sm text-gold"><Award size={12} /></div>
            <div className="label-deco">Certifications</div>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {localCerts.map((cert, i) => (
              <div key={i} className="grid grid-cols-3 gap-2 items-center">
                <input className="input-deco col-span-1" placeholder="Certification" value={cert.name || ''} onChange={e => setLocalCerts(arr => arr.map((c, idx) => idx === i ? { ...c, name: e.target.value } : c))} />
                <input className="input-deco" placeholder="Issuer" value={cert.issuer || ''} onChange={e => setLocalCerts(arr => arr.map((c, idx) => idx === i ? { ...c, issuer: e.target.value } : c))} />
                <div className="flex gap-1">
                  <input className="input-deco flex-1" placeholder="Year" value={cert.year || ''} onChange={e => setLocalCerts((arr: any[]) => arr.map((c, idx) => idx === i ? { ...c, year: e.target.value ? Number(e.target.value) : undefined } : c))} />
                  <button onClick={() => setLocalCerts(arr => arr.filter((_, idx) => idx !== i))} className="btn-danger !px-1.5 !py-1.5 !min-h-0"><Trash2 size={10} /></button>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => setLocalCerts(c => [...c, { id: Date.now(), name: '', issuer: '', year: '' } as any])} className="btn-ghost !text-xs !py-1.5 mt-2">
            <Plus size={11} /> Add Certification
          </button>
        </div>
      </div>

      {/* Save button (bottom) */}
      <div className="flex justify-end pt-2">
        <DecoButton onClick={handleSave} loading={saving} icon={saveOk ? <Check size={14} /> : <Save size={14} />}>
          {saveOk ? 'Profile Saved!' : 'Save All Changes'}
        </DecoButton>
      </div>
    </div>
  );
}
