import React, { useState, useRef } from 'react';
import {
  User, Briefcase, Code, Award, FileText, Target,
  ChevronRight, ChevronLeft, Download, Eye, Plus, Trash2,
  CheckCircle, Phone, Mail, MapPin, Globe, Linkedin, Github,
} from 'lucide-react';

/* ─── Types ─── */
interface Education {
  degree: string; branch: string; university: string;
  cgpa: string; startYear: string; endYear: string; backlogs: string;
}
interface Experience {
  company: string; role: string; duration: string; location: string; points: string[];
}
interface Project {
  name: string; description: string; technologies: string; link: string;
}
interface Certification {
  name: string; issuer: string; year: string;
}
interface ResumeData {
  // Personal
  fullName: string; email: string; phone: string;
  location: string; linkedin: string; github: string; portfolio: string;
  summary: string;
  // Education
  education: Education[];
  // Skills
  languages: string; frameworks: string; tools: string; databases: string; other: string;
  // Experience
  experience: Experience[];
  // Projects
  projects: Project[];
  // Certifications
  certifications: Certification[];
  // Target
  targetRole: string; targetCompany: string;
}

const empty = (): ResumeData => ({
  fullName: '', email: '', phone: '', location: '', linkedin: '', github: '', portfolio: '',
  summary: '',
  education: [{ degree: '', branch: '', university: '', cgpa: '', startYear: '', endYear: '', backlogs: '0' }],
  languages: '', frameworks: '', tools: '', databases: '', other: '',
  experience: [],
  projects: [{ name: '', description: '', technologies: '', link: '' }],
  certifications: [],
  targetRole: '', targetCompany: '',
});

const STEPS = [
  { id: 0, label: 'Personal', icon: <User size={15} /> },
  { id: 1, label: 'Education', icon: <Award size={15} /> },
  { id: 2, label: 'Skills', icon: <Code size={15} /> },
  { id: 3, label: 'Experience', icon: <Briefcase size={15} /> },
  { id: 4, label: 'Projects', icon: <FileText size={15} /> },
  { id: 5, label: 'Certifications', icon: <Award size={15} /> },
  { id: 6, label: 'Preview', icon: <Eye size={15} /> },
];

/* ─── Shared input styles ─── */
const inputStyle: React.CSSProperties = {
  width: '100%', background: '#0D0D0D', border: '1px solid #2A2A2A',
  color: 'var(--foreground)', fontFamily: "'Josefin Sans', sans-serif",
  fontSize: 13, padding: '9px 12px', outline: 'none',
  transition: 'border-color 200ms',
};
const labelStyle: React.CSSProperties = {
  fontSize: 10, fontFamily: "'Josefin Sans', sans-serif", fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--muted)',
  display: 'block', marginBottom: 5,
};
const groupStyle: React.CSSProperties = { marginBottom: 14 };

function Field({ label, id, value, onChange, placeholder, type = 'text', required = false }:
  { label: string; id: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; required?: boolean }) {
  return (
    <div style={groupStyle}>
      <label htmlFor={id} style={labelStyle}>{label}{required && <span style={{ color: '#D4AF37' }}> *</span>}</label>
      <input id={id} type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} style={inputStyle}
        onFocus={e => (e.target.style.borderColor = 'rgba(212,175,55,0.5)')}
        onBlur={e => (e.target.style.borderColor = '#2A2A2A')}
      />
    </div>
  );
}

function TextArea({ label, id, value, onChange, placeholder, rows = 3 }:
  { label: string; id: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <div style={groupStyle}>
      <label htmlFor={id} style={labelStyle}>{label}</label>
      <textarea id={id} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} rows={rows}
        style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
        onFocus={e => (e.target.style.borderColor = 'rgba(212,175,55,0.5)')}
        onBlur={e => (e.target.style.borderColor = '#2A2A2A')}
      />
    </div>
  );
}

/* ─── Resume HTML generator (ATS-friendly) ─── */
function generateResumeHTML(d: ResumeData): string {
  const skillSections: string[] = [];
  if (d.languages.trim()) skillSections.push(`<strong>Languages:</strong> ${d.languages}`);
  if (d.frameworks.trim()) skillSections.push(`<strong>Frameworks & Libraries:</strong> ${d.frameworks}`);
  if (d.tools.trim()) skillSections.push(`<strong>Tools & Technologies:</strong> ${d.tools}`);
  if (d.databases.trim()) skillSections.push(`<strong>Databases:</strong> ${d.databases}`);
  if (d.other.trim()) skillSections.push(`<strong>Other:</strong> ${d.other}`);

  const links: string[] = [];
  if (d.email) links.push(`<a href="mailto:${d.email}">${d.email}</a>`);
  if (d.phone) links.push(d.phone);
  if (d.location) links.push(d.location);
  if (d.linkedin) links.push(`<a href="${d.linkedin.startsWith('http') ? d.linkedin : 'https://' + d.linkedin}">LinkedIn</a>`);
  if (d.github) links.push(`<a href="${d.github.startsWith('http') ? d.github : 'https://' + d.github}">GitHub</a>`);
  if (d.portfolio) links.push(`<a href="${d.portfolio.startsWith('http') ? d.portfolio : 'https://' + d.portfolio}">Portfolio</a>`);

  const edu = d.education.filter(e => e.university).map(e => `
    <div class="item">
      <div class="item-header">
        <div>
          <div class="item-title">${e.degree}${e.branch ? ` in ${e.branch}` : ''}</div>
          <div class="item-sub">${e.university}</div>
        </div>
        <div class="item-right">
          ${e.startYear || e.endYear ? `${e.startYear || ''}${e.endYear ? ' – ' + e.endYear : ''}` : ''}
          ${e.cgpa ? `<div>CGPA: ${e.cgpa}</div>` : ''}
          ${e.backlogs && e.backlogs !== '0' ? `<div>Backlogs: ${e.backlogs}</div>` : ''}
        </div>
      </div>
    </div>`).join('');

  const exp = d.experience.filter(e => e.company).map(e => `
    <div class="item">
      <div class="item-header">
        <div>
          <div class="item-title">${e.role}</div>
          <div class="item-sub">${e.company}${e.location ? ` · ${e.location}` : ''}</div>
        </div>
        <div class="item-right">${e.duration || ''}</div>
      </div>
      <ul>${e.points.filter(p => p.trim()).map(p => `<li>${p}</li>`).join('')}</ul>
    </div>`).join('');

  const proj = d.projects.filter(p => p.name).map(p => `
    <div class="item">
      <div class="item-header">
        <div class="item-title">${p.name}${p.link ? ` <span style="font-weight:400;font-size:10px"> | <a href="${p.link.startsWith('http') ? p.link : 'https://' + p.link}">${p.link}</a></span>` : ''}</div>
      </div>
      ${p.technologies ? `<div style="font-size:11px;color:#444;margin-bottom:4px"><strong>Tech:</strong> ${p.technologies}</div>` : ''}
      ${p.description ? `<ul><li>${p.description}</li></ul>` : ''}
    </div>`).join('');

  const certs = d.certifications.filter(c => c.name).map(c => `
    <div class="item">
      <div class="item-header">
        <div class="item-title">${c.name}</div>
        <div class="item-right">${c.issuer ? c.issuer : ''}${c.year ? ' · ' + c.year : ''}</div>
      </div>
    </div>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>${d.fullName || 'Resume'} — Resume</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Calibri', 'Arial', sans-serif;
    font-size: 11px;
    color: #1a1a1a;
    background: #fff;
    line-height: 1.45;
    padding: 32px 44px;
    max-width: 850px;
    margin: 0 auto;
  }
  a { color: #1a1a1a; text-decoration: none; }
  h1 {
    font-size: 22px; font-weight: 700; letter-spacing: 0.02em;
    color: #000; text-transform: uppercase; margin-bottom: 3px;
  }
  .contact-row {
    font-size: 10.5px; color: #333;
    display: flex; flex-wrap: wrap; gap: 6px 14px;
    margin-bottom: 16px; padding-bottom: 10px;
    border-bottom: 2px solid #000;
  }
  .contact-row span { display: flex; align-items: center; gap: 3px; }
  .section { margin-bottom: 14px; }
  .section-title {
    font-size: 12px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.12em; color: #000;
    border-bottom: 1px solid #aaa;
    padding-bottom: 2px; margin-bottom: 8px;
  }
  .item { margin-bottom: 8px; }
  .item-header {
    display: flex; justify-content: space-between;
    align-items: flex-start; gap: 8px;
  }
  .item-title { font-weight: 700; font-size: 11px; color: #000; }
  .item-sub { font-size: 10.5px; color: #333; margin-top: 1px; }
  .item-right {
    font-size: 10.5px; color: #444; text-align: right;
    flex-shrink: 0; white-space: nowrap;
  }
  ul { margin-top: 4px; padding-left: 16px; }
  li { margin-bottom: 2px; font-size: 10.5px; }
  .summary { font-size: 10.5px; color: #222; line-height: 1.55; }
  .skills-list { font-size: 10.5px; line-height: 1.8; }
  @media print {
    body { padding: 18px 32px; }
    @page { margin: 1cm; size: A4; }
  }
</style>
</head>
<body>
  <h1>${d.fullName || 'Your Name'}</h1>
  ${d.targetRole ? `<div style="font-size:12px;color:#333;margin-bottom:8px">${d.targetRole}${d.targetCompany ? ` · Targeting ${d.targetCompany}` : ''}</div>` : ''}
  <div class="contact-row">
    ${links.map(l => `<span>${l}</span>`).join('')}
  </div>

  ${d.summary.trim() ? `
  <div class="section">
    <div class="section-title">Professional Summary</div>
    <div class="summary">${d.summary}</div>
  </div>` : ''}

  ${edu ? `
  <div class="section">
    <div class="section-title">Education</div>
    ${edu}
  </div>` : ''}

  ${skillSections.length ? `
  <div class="section">
    <div class="section-title">Technical Skills</div>
    <div class="skills-list">${skillSections.join('<br/>')}</div>
  </div>` : ''}

  ${exp ? `
  <div class="section">
    <div class="section-title">Work Experience & Internships</div>
    ${exp}
  </div>` : ''}

  ${proj ? `
  <div class="section">
    <div class="section-title">Projects</div>
    ${proj}
  </div>` : ''}

  ${certs ? `
  <div class="section">
    <div class="section-title">Certifications</div>
    ${certs}
  </div>` : ''}
</body>
</html>`;
}

/* ═══════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════ */
export default function ResumeBuilder() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<ResumeData>(empty());
  const [showPreview, setShowPreview] = useState(false);
  const previewRef = useRef<HTMLIFrameElement>(null);

  const update = (field: keyof ResumeData, value: any) =>
    setData(prev => ({ ...prev, [field]: value }));

  /* Education helpers */
  const addEdu = () => update('education', [...data.education, { degree: '', branch: '', university: '', cgpa: '', startYear: '', endYear: '', backlogs: '0' }]);
  const setEdu = (i: number, f: keyof Education, v: string) => {
    const arr = [...data.education]; arr[i] = { ...arr[i], [f]: v }; update('education', arr);
  };
  const removeEdu = (i: number) => update('education', data.education.filter((_, j) => j !== i));

  /* Experience helpers */
  const addExp = () => update('experience', [...data.experience, { company: '', role: '', duration: '', location: '', points: ['', '', ''] }]);
  const setExp = (i: number, f: keyof Experience, v: any) => {
    const arr = [...data.experience]; arr[i] = { ...arr[i], [f]: v }; update('experience', arr);
  };
  const setExpPoint = (i: number, j: number, v: string) => {
    const arr = [...data.experience];
    const pts = [...arr[i].points]; pts[j] = v; arr[i] = { ...arr[i], points: pts };
    update('experience', arr);
  };
  const addExpPoint = (i: number) => {
    const arr = [...data.experience]; arr[i] = { ...arr[i], points: [...arr[i].points, ''] };
    update('experience', arr);
  };
  const removeExp = (i: number) => update('experience', data.experience.filter((_, j) => j !== i));

  /* Project helpers */
  const addProject = () => update('projects', [...data.projects, { name: '', description: '', technologies: '', link: '' }]);
  const setProject = (i: number, f: keyof Project, v: string) => {
    const arr = [...data.projects]; arr[i] = { ...arr[i], [f]: v }; update('projects', arr);
  };
  const removeProject = (i: number) => update('projects', data.projects.filter((_, j) => j !== i));

  /* Cert helpers */
  const addCert = () => update('certifications', [...data.certifications, { name: '', issuer: '', year: '' }]);
  const setCert = (i: number, f: keyof Certification, v: string) => {
    const arr = [...data.certifications]; arr[i] = { ...arr[i], [f]: v }; update('certifications', arr);
  };
  const removeCert = (i: number) => update('certifications', data.certifications.filter((_, j) => j !== i));

  /* Download */
  const handleDownload = () => {
    const html = generateResumeHTML(data);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(data.fullName || 'Resume').replace(/\s+/g, '_')}_Resume.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* Print */
  const handlePrint = () => {
    const html = generateResumeHTML(data);
    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); setTimeout(() => win.print(), 500); }
  };

  /* ─── STEP CONTENT ─── */
  const renderStep = () => {
    switch (step) {
      /* ── Step 0: Personal Info ── */
      case 0: return (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Full Name" id="fn" value={data.fullName} onChange={v => update('fullName', v)} placeholder="Priya Sharma" required />
            <Field label="Email" id="em" value={data.email} onChange={v => update('email', v)} placeholder="priya@university.edu.in" type="email" required />
            <Field label="Phone" id="ph" value={data.phone} onChange={v => update('phone', v)} placeholder="+91 98765 43210" />
            <Field label="Location" id="loc" value={data.location} onChange={v => update('location', v)} placeholder="Chandigarh, Punjab" />
            <Field label="LinkedIn URL" id="li" value={data.linkedin} onChange={v => update('linkedin', v)} placeholder="linkedin.com/in/priyasharma" />
            <Field label="GitHub URL" id="gh" value={data.github} onChange={v => update('github', v)} placeholder="github.com/priyasharma" />
          </div>
          <Field label="Portfolio / Website" id="po" value={data.portfolio} onChange={v => update('portfolio', v)} placeholder="priyasharma.dev (optional)" />
          <TextArea label="Professional Summary (2–3 sentences, ATS-optimised)" id="su" value={data.summary} onChange={v => update('summary', v)}
            placeholder="Final-year B.Tech (CSE) student with hands-on experience in full-stack development and machine learning. Proficient in Python, React, and cloud technologies. Seeking a Software Engineer role to leverage academic knowledge and project experience." rows={4} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Target Role" id="tr" value={data.targetRole} onChange={v => update('targetRole', v)} placeholder="Software Engineer" />
            <Field label="Target Company (optional)" id="tc" value={data.targetCompany} onChange={v => update('targetCompany', v)} placeholder="Google, Microsoft…" />
          </div>
        </div>
      );

      /* ── Step 1: Education ── */
      case 1: return (
        <div>
          {data.education.map((edu, i) => (
            <div key={i} style={{ marginBottom: 20, padding: '16px', border: '1px solid #2A2A2A', background: 'rgba(212,175,55,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 11, fontFamily: "'Josefin Sans', sans-serif", fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.18em', color: '#D4AF37' }}>
                  Education {i + 1}
                </span>
                {i > 0 && (
                  <button onClick={() => removeEdu(i)} style={{ background: 'none', border: 'none', color: '#CF6679', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                    <Trash2 size={12} /> Remove
                  </button>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Degree" id={`deg-${i}`} value={edu.degree} onChange={v => setEdu(i, 'degree', v)} placeholder="B.Tech / B.E." required />
                <Field label="Branch / Stream" id={`br-${i}`} value={edu.branch} onChange={v => setEdu(i, 'branch', v)} placeholder="Computer Science Engineering" />
                <div style={{ gridColumn: '1/-1' }}>
                  <Field label="University / Institution" id={`uni-${i}`} value={edu.university} onChange={v => setEdu(i, 'university', v)} placeholder="Chitkara University, Punjab" required />
                </div>
                <Field label="CGPA / Percentage" id={`cgpa-${i}`} value={edu.cgpa} onChange={v => setEdu(i, 'cgpa', v)} placeholder="8.5 / 10" />
                <Field label="Active Backlogs" id={`bl-${i}`} value={edu.backlogs} onChange={v => setEdu(i, 'backlogs', v)} placeholder="0" />
                <Field label="Start Year" id={`sy-${i}`} value={edu.startYear} onChange={v => setEdu(i, 'startYear', v)} placeholder="2021" />
                <Field label="End Year (or Expected)" id={`ey-${i}`} value={edu.endYear} onChange={v => setEdu(i, 'endYear', v)} placeholder="2025" />
              </div>
            </div>
          ))}
          <button onClick={addEdu} className="btn-ghost" style={{ fontSize: 11, padding: '7px 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={13} /> Add Another Education
          </button>
        </div>
      );

      /* ── Step 2: Skills ── */
      case 2: return (
        <div>
          <div style={{ padding: '10px 14px', background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.15)', marginBottom: 20, fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
            💡 <strong style={{ color: '#D4AF37' }}>ATS Tip:</strong> List skills as comma-separated values. Use standard names (e.g. "Python, JavaScript, Java"). Avoid abbreviations not commonly known.
          </div>
          <Field label="Programming Languages" id="lang" value={data.languages} onChange={v => update('languages', v)} placeholder="Python, Java, JavaScript, C++, TypeScript" />
          <Field label="Frameworks & Libraries" id="fw" value={data.frameworks} onChange={v => update('frameworks', v)} placeholder="React, Node.js, Express.js, TensorFlow, FastAPI" />
          <Field label="Tools & Platforms" id="tools" value={data.tools} onChange={v => update('tools', v)} placeholder="Git, Docker, VS Code, Postman, Linux, Azure, AWS" />
          <Field label="Databases" id="db" value={data.databases} onChange={v => update('databases', v)} placeholder="MySQL, PostgreSQL, MongoDB, SQLite" />
          <Field label="Other Skills" id="oth" value={data.other} onChange={v => update('other', v)} placeholder="REST APIs, Agile, Problem Solving, DSA" />
        </div>
      );

      /* ── Step 3: Experience ── */
      case 3: return (
        <div>
          <div style={{ padding: '10px 14px', background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.15)', marginBottom: 20, fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
            💡 <strong style={{ color: '#D4AF37' }}>ATS Tip:</strong> Start each bullet with an action verb (Developed, Built, Implemented, Reduced). Include measurable results where possible.
          </div>
          {data.experience.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.6 }}>
              No experience entries yet. If you have internships, part-time jobs, or freelance work, add them below.
              <br /><span style={{ fontSize: 11, color: 'rgba(136,136,136,0.6)' }}>You can skip this step if you have no experience.</span>
            </p>
          )}
          {data.experience.map((exp, i) => (
            <div key={i} style={{ marginBottom: 20, padding: '16px', border: '1px solid #2A2A2A', background: 'rgba(212,175,55,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 11, fontFamily: "'Josefin Sans', sans-serif", fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.18em', color: '#D4AF37' }}>
                  Experience {i + 1}
                </span>
                <button onClick={() => removeExp(i)} style={{ background: 'none', border: 'none', color: '#CF6679', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                  <Trash2 size={12} /> Remove
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Company / Organisation" id={`co-${i}`} value={exp.company} onChange={v => setExp(i, 'company', v)} placeholder="Infosys, Startup Name…" />
                <Field label="Role / Designation" id={`ro-${i}`} value={exp.role} onChange={v => setExp(i, 'role', v)} placeholder="Software Engineer Intern" />
                <Field label="Duration" id={`du-${i}`} value={exp.duration} onChange={v => setExp(i, 'duration', v)} placeholder="Jun 2024 – Aug 2024" />
                <Field label="Location" id={`el-${i}`} value={exp.location} onChange={v => setExp(i, 'location', v)} placeholder="Remote / Bengaluru" />
              </div>
              <label style={{ ...labelStyle, marginTop: 8 }}>Key Responsibilities / Achievements (one per line)</label>
              {exp.points.map((pt, j) => (
                <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ color: 'var(--muted)', fontSize: 11, fontFamily: "'Josefin Sans',sans-serif" }}>{j + 1}.</span>
                  <input value={pt} onChange={e => setExpPoint(i, j, e.target.value)}
                    placeholder={j === 0 ? 'Developed REST APIs using Node.js reducing response time by 30%' : j === 1 ? 'Implemented authentication with JWT and bcrypt' : 'Collaborated with a cross-functional team of 6 engineers'}
                    style={{ ...inputStyle, flex: 1 }}
                    onFocus={e => (e.target.style.borderColor = 'rgba(212,175,55,0.5)')}
                    onBlur={e => (e.target.style.borderColor = '#2A2A2A')}
                  />
                </div>
              ))}
              <button onClick={() => addExpPoint(i)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 11, fontFamily: "'Josefin Sans',sans-serif", display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <Plus size={11} /> Add point
              </button>
            </div>
          ))}
          <button onClick={addExp} className="btn-ghost" style={{ fontSize: 11, padding: '7px 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={13} /> Add Experience / Internship
          </button>
        </div>
      );

      /* ── Step 4: Projects ── */
      case 4: return (
        <div>
          <div style={{ padding: '10px 14px', background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.15)', marginBottom: 20, fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
            💡 <strong style={{ color: '#D4AF37' }}>ATS Tip:</strong> Describe what you built, the problem it solved, and the technologies used. Mention GitHub or deployment links.
          </div>
          {data.projects.map((proj, i) => (
            <div key={i} style={{ marginBottom: 20, padding: '16px', border: '1px solid #2A2A2A', background: 'rgba(212,175,55,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 11, fontFamily: "'Josefin Sans', sans-serif", fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.18em', color: '#D4AF37' }}>
                  Project {i + 1}
                </span>
                {data.projects.length > 1 && (
                  <button onClick={() => removeProject(i)} style={{ background: 'none', border: 'none', color: '#CF6679', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                    <Trash2 size={12} /> Remove
                  </button>
                )}
              </div>
              <Field label="Project Name" id={`pn-${i}`} value={proj.name} onChange={v => setProject(i, 'name', v)} placeholder="Campus Placement AI" required />
              <Field label="Technologies Used" id={`pt-${i}`} value={proj.technologies} onChange={v => setProject(i, 'technologies', v)} placeholder="React, Node.js, Azure AI, SQLite" />
              <Field label="GitHub / Live Link (optional)" id={`pl-${i}`} value={proj.link} onChange={v => setProject(i, 'link', v)} placeholder="github.com/yourhandle/project" />
              <TextArea label="Description" id={`pd-${i}`} value={proj.description} onChange={v => setProject(i, 'description', v)}
                placeholder="Built an AI-powered placement preparation platform that analyses student profiles against company requirements to identify skill gaps and generate personalised preparation plans." rows={3} />
            </div>
          ))}
          <button onClick={addProject} className="btn-ghost" style={{ fontSize: 11, padding: '7px 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={13} /> Add Another Project
          </button>
        </div>
      );

      /* ── Step 5: Certifications ── */
      case 5: return (
        <div>
          {data.certifications.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.6 }}>
              Add any relevant certifications, online courses, or professional awards.
              <br /><span style={{ fontSize: 11, color: 'rgba(136,136,136,0.6)' }}>You can skip this step if none applicable.</span>
            </p>
          )}
          {data.certifications.map((cert, i) => (
            <div key={i} style={{ marginBottom: 14, padding: '14px 16px', border: '1px solid #2A2A2A', background: 'rgba(212,175,55,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontFamily: "'Josefin Sans', sans-serif", fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.18em', color: '#D4AF37' }}>
                  Certification {i + 1}
                </span>
                <button onClick={() => removeCert(i)} style={{ background: 'none', border: 'none', color: '#CF6679', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                  <Trash2 size={12} /> Remove
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px', gap: 12 }}>
                <Field label="Certification Name" id={`cn-${i}`} value={cert.name} onChange={v => setCert(i, 'name', v)} placeholder="AWS Cloud Practitioner" />
                <Field label="Issuing Organisation" id={`ci-${i}`} value={cert.issuer} onChange={v => setCert(i, 'issuer', v)} placeholder="Amazon Web Services" />
                <Field label="Year" id={`cy-${i}`} value={cert.year} onChange={v => setCert(i, 'year', v)} placeholder="2024" />
              </div>
            </div>
          ))}
          <button onClick={addCert} className="btn-ghost" style={{ fontSize: 11, padding: '7px 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={13} /> Add Certification
          </button>
        </div>
      );

      /* ── Step 6: Preview ── */
      case 6: return (
        <div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
            <button onClick={handlePrint} className="btn-gold" style={{ fontSize: 11, padding: '9px 20px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Download size={14} /> Print / Save as PDF
            </button>
            <button onClick={handleDownload} className="btn-ghost" style={{ fontSize: 11, padding: '9px 20px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Download size={14} /> Download HTML
            </button>
          </div>
          <div style={{ padding: '10px 14px', background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.15)', marginBottom: 16, fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
            <strong style={{ color: '#D4AF37' }}>How to save as PDF:</strong> Click "Print / Save as PDF" → In the print dialog, set Destination to "Save as PDF" → Click Save.
            The resume uses standard fonts and clean formatting for maximum ATS compatibility.
          </div>
          <div style={{ border: '1px solid #2A2A2A', background: '#fff', overflow: 'hidden' }}>
            <iframe
              ref={previewRef}
              srcDoc={generateResumeHTML(data)}
              style={{ width: '100%', height: '700px', border: 'none', display: 'block' }}
              title="Resume Preview"
            />
          </div>
        </div>
      );

      default: return null;
    }
  };

  const canGoNext = step < 6;
  const canGoPrev = step > 0;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
      {/* Page Header */}
      <div style={{ padding: '28px 32px 20px', borderBottom: '1px solid rgba(212,175,55,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.25em', color: '#D4AF37', marginBottom: 4 }}>
              ATS-Friendly
            </div>
            <h1 style={{ fontFamily: "'Marcellus', Georgia, serif", fontSize: 22, textTransform: 'uppercase' as const, letterSpacing: '0.15em', color: 'var(--foreground)', fontWeight: 400 }}>
              Resume Builder
            </h1>
          </div>
          {step === 6 && (
            <button onClick={handlePrint} className="btn-gold" style={{ fontSize: 11, padding: '10px 22px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Download size={14} /> Download Resume
            </button>
          )}
        </div>
      </div>

      <div style={{ padding: '24px 32px', maxWidth: 960, margin: '0 auto' }}>
        {/* Step Progress */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 32, overflowX: 'auto' }}>
          {STEPS.map((s, i) => (
            <button key={s.id} onClick={() => setStep(s.id)}
              style={{
                flex: 1, minWidth: 80, padding: '10px 8px',
                background: step === s.id ? 'rgba(212,175,55,0.1)' : 'transparent',
                border: '1px solid',
                borderColor: step === s.id ? 'rgba(212,175,55,0.45)' : 'rgba(42,42,42,0.8)',
                borderRight: i < STEPS.length - 1 ? 'none' : '1px solid',
                cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                transition: 'all 200ms',
              }}>
              <span style={{ color: step === s.id ? '#D4AF37' : step > s.id ? '#4CAF7A' : 'var(--muted)' }}>
                {step > s.id ? <CheckCircle size={14} /> : s.icon}
              </span>
              <span style={{ fontSize: 9, fontFamily: "'Josefin Sans', sans-serif", fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.15em', color: step === s.id ? '#D4AF37' : 'var(--muted)', whiteSpace: 'nowrap' }}>
                {s.label}
              </span>
            </button>
          ))}
        </div>

        {/* Step title */}
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontFamily: "'Marcellus', Georgia, serif", fontSize: 16, textTransform: 'uppercase' as const, letterSpacing: '0.15em', color: 'var(--foreground)', marginBottom: 4 }}>
            {STEPS[step].label}
          </h2>
          <div style={{ height: 1, width: 48, background: '#D4AF37', opacity: 0.4 }} />
        </div>

        {/* Step content */}
        <div style={{ minHeight: 300 }}>
          {renderStep()}
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 32, paddingTop: 20, borderTop: '1px solid rgba(212,175,55,0.08)' }}>
          <button onClick={() => setStep(s => s - 1)} disabled={!canGoPrev}
            className="btn-ghost" style={{ fontSize: 11, padding: '9px 20px', display: 'flex', alignItems: 'center', gap: 6, opacity: canGoPrev ? 1 : 0.3 }}>
            <ChevronLeft size={14} /> Back
          </button>
          <span style={{ fontSize: 11, fontFamily: "'Josefin Sans', sans-serif", color: 'var(--muted)', letterSpacing: '0.1em' }}>
            {step + 1} / {STEPS.length}
          </span>
          {canGoNext ? (
            <button onClick={() => setStep(s => s + 1)}
              className="btn-gold" style={{ fontSize: 11, padding: '9px 20px', display: 'flex', alignItems: 'center', gap: 6 }}>
              {step === 5 ? 'Preview Resume' : 'Continue'} <ChevronRight size={14} />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
