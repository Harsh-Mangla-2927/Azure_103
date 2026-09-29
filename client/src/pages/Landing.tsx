import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, ChevronRight, Target, BarChart2, BookOpen,
  Shield, User, FileText, Brain, MessageSquare, CheckCircle,
  AlertCircle, HelpCircle, Layers, Cpu, Search, Menu, X,
  GraduationCap, Briefcase, Award, Code, Database, Lock,
  Mail, KeyRound,
} from 'lucide-react';

/* ─── Scroll-triggered fade-up animation ─── */
function useInView(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function FadeUp({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const { ref, inView } = useInView();
  return (
    <div ref={ref} style={{
      opacity: inView ? 1 : 0,
      transform: inView ? 'translateY(0)' : 'translateY(24px)',
      transition: `opacity 0.65s ease ${delay}ms, transform 0.65s ease ${delay}ms`,
    }}>
      {children}
    </div>
  );
}

/* ─── Reusable pieces ─── */
function LogoMark({ size = 22 }: { size?: number }) {
  const inner = size * 0.36;
  return (
    <div style={{ width: size, height: size, border: '1px solid #D4AF37', transform: 'rotate(45deg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <div style={{ width: inner, height: inner, background: '#D4AF37', transform: 'rotate(-45deg)' }} />
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, justifyContent: 'center' }}>
      <div style={{ width: 24, height: 1, background: 'rgba(212,175,55,0.6)' }} />
      <span style={{ fontFamily: "'Josefin Sans', sans-serif", textTransform: 'uppercase' as const, letterSpacing: '0.25em', fontSize: 11, fontWeight: 600, color: '#D4AF37' }}>
        {children}
      </span>
      <div style={{ width: 24, height: 1, background: 'rgba(212,175,55,0.6)' }} />
    </div>
  );
}

function GoldDivider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, margin: '20px 0' }}>
      <div style={{ height: 1, width: 64, background: 'linear-gradient(to right, transparent, rgba(212,175,55,0.5))' }} />
      <div style={{ width: 6, height: 6, border: '1px solid rgba(212,175,55,0.7)', transform: 'rotate(45deg)', background: 'rgba(212,175,55,0.15)' }} />
      <div style={{ height: 1, width: 64, background: 'linear-gradient(to left, transparent, rgba(212,175,55,0.5))' }} />
    </div>
  );
}

function SectionSep() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '0 5%' }}>
      <div style={{ flex: 1, height: 1, background: 'rgba(212,175,55,0.07)' }} />
      <div style={{ width: 5, height: 5, border: '1px solid rgba(212,175,55,0.3)', transform: 'rotate(45deg)' }} />
      <div style={{ flex: 1, height: 1, background: 'rgba(212,175,55,0.07)' }} />
    </div>
  );
}

export default function Landing() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const scrollTo = (id: string) => {
    setMobileOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const navLinks = [
    { label: 'Platform', id: 'platform' },
    { label: 'How It Works', id: 'how-it-works' },
    { label: 'AI Intelligence', id: 'ai-intel' },
    { label: 'Features', id: 'features' },
  ];

  return (
    <div className="deco-bg" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflowX: 'hidden' }}>

      {/* ══════════════════════════ NAVBAR ══════════════════════════ */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 200,
        background: 'rgba(10,10,10,0.94)',
        backdropFilter: 'blur(14px)',
        borderBottom: '1px solid rgba(212,175,55,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 5%', height: 62,
      }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <LogoMark size={22} />
          <span style={{ fontFamily: "'Marcellus', Georgia, serif", textTransform: 'uppercase' as const, letterSpacing: '0.22em', fontSize: 12, color: 'var(--foreground)' }}>
            Campus Placement AI
          </span>
        </Link>

        {/* Desktop nav */}
        <div style={{ display: 'flex', gap: 32, alignItems: 'center' }} className="lp-nav-links">
          {navLinks.map(l => (
            <button key={l.id} onClick={() => scrollTo(l.id)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: "'Josefin Sans', sans-serif", textTransform: 'uppercase' as const,
              fontSize: 11, letterSpacing: '0.18em', fontWeight: 600,
              color: 'var(--muted)', transition: 'color 200ms',
              padding: 0,
            }}
              onMouseEnter={e => (e.currentTarget.style.color = '#D4AF37')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}>
              {l.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link to="/login" className="btn-ghost" style={{ fontSize: 11, padding: '7px 16px', minHeight: 36, letterSpacing: '0.18em' }}>Sign In</Link>
          <Link to="/register" className="btn-gold" style={{ fontSize: 11, padding: '7px 16px', minHeight: 36, letterSpacing: '0.18em' }}>Get Started</Link>
          <button onClick={() => setMobileOpen(v => !v)} className="lp-hamburger"
            style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--muted)', cursor: 'pointer', padding: '6px 8px', marginLeft: 6, display: 'none', alignItems: 'center', justifyContent: 'center' }}>
            {mobileOpen ? <X size={15} /> : <Menu size={15} />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div style={{ position: 'fixed', top: 62, left: 0, right: 0, zIndex: 199, background: '#0A0A0A', borderBottom: '1px solid var(--border)', padding: '12px 5%', display: 'flex', flexDirection: 'column' }}>
          {navLinks.map(l => (
            <button key={l.id} onClick={() => scrollTo(l.id)} style={{
              background: 'none', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.04)',
              color: 'var(--muted)', cursor: 'pointer',
              fontFamily: "'Josefin Sans', sans-serif", textTransform: 'uppercase' as const,
              fontSize: 12, letterSpacing: '0.18em', fontWeight: 600,
              padding: '12px 0', textAlign: 'left',
            }}>
              {l.label}
            </button>
          ))}
        </div>
      )}

      {/* ══════════════════════════ HERO ══════════════════════════ */}
      <section style={{ padding: '80px 5% 64px', textAlign: 'center', position: 'relative' }}>
        {/* Subtle radial glow — behind content */}
        <div style={{
          position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%,-50%)',
          width: 700, height: 500, pointerEvents: 'none', zIndex: 0,
          background: 'radial-gradient(ellipse at center, rgba(212,175,55,0.055) 0%, transparent 68%)',
        }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 780, margin: '0 auto' }}>
          <SectionLabel>AI-Powered Placement Intelligence</SectionLabel>

          <h1 className="heading-display" style={{ color: 'var(--foreground)', marginBottom: 4 }}>
            CAMPUS
          </h1>
          <h1 className="heading-display" style={{ color: '#D4AF37', marginBottom: 4 }}>
            PLACEMENT
          </h1>
          <h1 className="heading-display" style={{ color: 'var(--foreground)', marginBottom: 0 }}>
            INTELLIGENCE
          </h1>

          <GoldDivider />

          <p style={{ fontSize: 16, color: 'var(--foreground)', lineHeight: 1.65, marginBottom: 10, fontFamily: "'Josefin Sans', sans-serif", opacity: 0.9 }}>
            Understand your eligibility.&nbsp; Identify real skill gaps.&nbsp; Prepare intelligently.
          </p>
          <p style={{ fontSize: 14, color: 'var(--muted)', maxWidth: 540, margin: '0 auto 36px', lineHeight: 1.85 }}>
            Campus Placement AI analyses your academic profile, skills, projects, certifications,
            resume, and target role to deliver knowledge-grounded placement insights and
            personalised preparation guidance.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
            <Link to="/register" className="btn-gold" style={{ padding: '13px 32px', fontSize: 12 }}>
              Get Started <ArrowRight size={14} />
            </Link>
            <button onClick={() => scrollTo('platform')} className="btn-ghost" style={{ padding: '13px 32px', fontSize: 12 }}>
              Explore Platform
            </button>
          </div>
        </div>
      </section>

      {/* ── Intelligence flow panel — 5 items, single row ── */}
      <section style={{ padding: '0 5% 72px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
            {[
              { label: 'Student Profile', sub: 'Academic · Skills · Projects · Resume', icon: <User size={15} /> },
              { label: 'Target Company & Role', sub: 'Company + role selection', icon: <Briefcase size={15} /> },
              { label: 'AI Analysis Engine', sub: 'Azure AI Foundry + Knowledge Retrieval', icon: <Brain size={15} />, gold: true },
              { label: 'Eligibility Check', sub: 'Requirements vs profile', icon: <Target size={15} /> },
              { label: 'Skill Gap Analysis', sub: 'Satisfied / Missing / Confirmed', icon: <BarChart2 size={15} /> },
            ].map((node, i) => (
              <div key={i} className="deco-card" style={{
                padding: '16px',
                border: node.gold ? '1px solid rgba(212,175,55,0.4)' : '1px solid var(--border)',
                background: node.gold ? 'rgba(212,175,55,0.05)' : 'var(--card)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ color: '#D4AF37', opacity: node.gold ? 1 : 0.65 }}>{node.icon}</span>
                  <span style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.15em', color: node.gold ? '#D4AF37' : 'var(--foreground)' }}>
                    {node.label}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, fontFamily: "'Josefin Sans', sans-serif" }}>{node.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SectionSep />

      {/* ══════════════════════════ PLATFORM — PRODUCT OVERVIEW ══════════════════════════ */}
      <section id="platform" style={{ padding: '72px 5%' }}>
        <FadeUp>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <SectionLabel>Product Overview</SectionLabel>
            <h2 className="heading-xl" style={{ color: 'var(--foreground)', marginBottom: 12 }}>WHAT CAMPUS PLACEMENT AI DOES</h2>
            <p style={{ fontSize: 14, color: 'var(--muted)', maxWidth: 500, margin: '0 auto', lineHeight: 1.75 }}>
              A structured, knowledge-grounded approach to campus placement preparation — from profile to readiness.
            </p>
          </div>
        </FadeUp>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20, maxWidth: 1100, margin: '0 auto' }}>
          {[
            {
              num: '01', icon: <User size={20} />, title: 'Profile Intelligence',
              desc: 'Build a complete student profile: academic details, skills, projects, certifications, resume, and career preferences.',
              items: ['Academic record', 'Technical skills', 'Projects', 'Certifications', 'Resume', 'Target role'],
            },
            {
              num: '02', icon: <Target size={20} />, title: 'Eligibility Analysis',
              desc: 'Compare your profile against target company and role requirements to understand where you currently stand.',
              items: ['CGPA thresholds', 'Backlog criteria', 'Degree requirements', 'Branch eligibility', 'Role-specific criteria'],
            },
            {
              num: '03', icon: <BarChart2 size={20} />, title: 'Skill Gap Intelligence',
              desc: 'Distinguish between three distinct states — never assumes missing information equals a confirmed gap.',
              items: ['✓ Satisfied', '? Information missing', '✗ Confirmed skill gap'],
            },
            {
              num: '04', icon: <BookOpen size={20} />, title: 'Personalised Preparation',
              desc: 'Generate a structured preparation path aligned with your specific profile and target company and role.',
              items: ['Phased learning plan', 'Role-specific guidance', 'Profile-aware content', 'AI-assisted planning'],
            },
          ].map((card, i) => (
            <FadeUp key={i} delay={i * 80}>
              <div className="deco-card deco-corners" style={{ padding: '28px 24px', height: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                  <span style={{ color: '#D4AF37', opacity: 0.85 }}>{card.icon}</span>
                  <span style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.3em', textTransform: 'uppercase' as const }}>{card.num}</span>
                </div>
                <h3 style={{ fontFamily: "'Marcellus', Georgia, serif", fontSize: 14, textTransform: 'uppercase' as const, letterSpacing: '0.15em', color: '#D4AF37', marginBottom: 12 }}>
                  {card.title}
                </h3>
                <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.75, marginBottom: 16 }}>{card.desc}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {card.items.map((item, j) => (
                    <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'rgba(242,240,228,0.6)', fontFamily: "'Josefin Sans', sans-serif" }}>
                      <div style={{ width: 4, height: 4, background: 'rgba(212,175,55,0.5)', borderRadius: '50%', flexShrink: 0 }} />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      <SectionSep />

      {/* ══════════════════════════ HOW IT WORKS ══════════════════════════ */}
      <section id="how-it-works" style={{ padding: '72px 5%' }}>
        <FadeUp>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <SectionLabel>Process</SectionLabel>
            <h2 className="heading-xl" style={{ color: 'var(--foreground)', marginBottom: 12 }}>FROM PROFILE TO PLACEMENT READINESS</h2>
            <p style={{ fontSize: 14, color: 'var(--muted)', maxWidth: 460, margin: '0 auto', lineHeight: 1.75 }}>
              A five-stage intelligent workflow from profile creation to personalised preparation.
            </p>
          </div>
        </FadeUp>

        {/* Equal-height cards via flex row with stretch */}
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', gap: 0 }}>
          {[
            { num: '01', title: 'Build Profile', icon: <User size={18} />, items: ['University & degree', 'Skills', 'Projects', 'Certifications', 'Resume upload'] },
            { num: '02', title: 'Select Target', icon: <Briefcase size={18} />, items: ['Target company', 'Target role'] },
            { num: '03', title: 'Analyse', icon: <Brain size={18} />, items: ['AI eligibility check', 'Requirements retrieval', 'Profile comparison'] },
            { num: '04', title: 'Identify Gaps', icon: <BarChart2 size={18} />, items: ['Satisfied criteria', 'Missing information', 'Confirmed skill gaps'] },
            { num: '05', title: 'Prepare', icon: <BookOpen size={18} />, items: ['Personalised plan', 'AI assistant guidance', 'Placement readiness'] },
          ].map((stage, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', opacity: 1, transform: 'translateY(0)', transition: `opacity 0.65s ease ${i * 90}ms, transform 0.65s ease ${i * 90}ms` }}>
              <div style={{
                flex: 1,
                padding: '24px 20px',
                borderTop: '1px solid var(--border)',
                borderBottom: '1px solid var(--border)',
                borderLeft: '1px solid var(--border)',
                borderRight: i === 4 ? '1px solid var(--border)' : 'none',
                background: 'var(--card)',
                position: 'relative',
              }}>
                <div style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 11, fontWeight: 700, color: '#D4AF37', letterSpacing: '0.3em', marginBottom: 12 }}>{stage.num}</div>
                <div style={{ color: '#D4AF37', opacity: 0.75, marginBottom: 12 }}>{stage.icon}</div>
                <div style={{ fontFamily: "'Marcellus', Georgia, serif", fontSize: 13, textTransform: 'uppercase' as const, letterSpacing: '0.15em', color: 'var(--foreground)', marginBottom: 14 }}>{stage.title}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {stage.items.map((item, j) => (
                    <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--muted)', fontFamily: "'Josefin Sans', sans-serif" }}>
                      <div style={{ width: 3, height: 3, background: 'rgba(212,175,55,0.45)', borderRadius: '50%', flexShrink: 0 }} />{item}
                    </div>
                  ))}
                </div>
                {i < 4 && (
                  <div style={{ position: 'absolute', right: -10, top: '50%', transform: 'translateY(-50%)', zIndex: 2, background: 'var(--card)', padding: '2px 0', display: 'flex', alignItems: 'center' }}>
                    <ChevronRight size={16} style={{ color: '#D4AF37', opacity: 0.5 }} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <SectionSep />

      {/* ══════════════════════════ AI INTELLIGENCE ══════════════════════════ */}
      <section id="ai-intel" style={{ padding: '72px 5%' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 56, alignItems: 'start' }}>
          <FadeUp>
            <SectionLabel>Architecture</SectionLabel>
            <h2 className="heading-xl" style={{ color: 'var(--foreground)', marginBottom: 20 }}>KNOWLEDGE-GROUNDED AI</h2>
            <div style={{ height: 1, width: 56, background: '#D4AF37', opacity: 0.4, marginBottom: 20 }} />
            <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.85, marginBottom: 16 }}>
              Campus Placement AI combines an Azure AI Foundry–powered agent with retrieval from curated
              placement knowledge sources to generate responses grounded in relevant placement information.
            </p>
            <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.85, marginBottom: 28 }}>
              Rather than generating generic responses, the system retrieves placement-specific knowledge
              and grounds its analysis in the student's actual profile data.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { icon: <Cpu size={14} />, label: 'Azure AI Foundry Agent' },
                { icon: <Search size={14} />, label: 'Azure AI Search — Knowledge Retrieval' },
                { icon: <Database size={14} />, label: 'Profile-Aware Context Injection' },
                { icon: <Brain size={14} />, label: 'Grounded Placement Analysis' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'rgba(212,175,55,0.04)', border: '1px solid rgba(212,175,55,0.1)' }}>
                  <span style={{ color: '#D4AF37' }}>{item.icon}</span>
                  <span style={{ fontSize: 13, color: 'var(--foreground)', fontFamily: "'Josefin Sans', sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>{item.label}</span>
                </div>
              ))}
            </div>
          </FadeUp>

          <FadeUp delay={120}>
            <div className="deco-card" style={{ padding: '28px 24px' }}>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <SectionLabel>System Architecture</SectionLabel>
              </div>
              {[
                { label: 'Student Profile', sub: 'Academic + Skills + Projects + Resume', icon: <User size={13} /> },
                { label: 'Target Company & Role', sub: 'Company + role selection', icon: <Briefcase size={13} /> },
                { label: 'Campus Placement AI', sub: 'Azure AI Foundry Agent', icon: <Brain size={13} />, gold: true },
                { label: 'Knowledge Retrieval', sub: 'Azure AI Search', icon: <Search size={13} /> },
                { label: 'Placement Knowledge', sub: 'Grounded placement information', icon: <Database size={13} /> },
                { label: 'AI Analysis', sub: 'Eligibility · Skill Gap · Preparation', icon: <Cpu size={13} /> },
              ].map((step, i) => (
                <div key={i}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px',
                    background: step.gold ? 'rgba(212,175,55,0.07)' : 'transparent',
                    border: step.gold ? '1px solid rgba(212,175,55,0.3)' : '1px solid transparent',
                  }}>
                    <span style={{ color: step.gold ? '#D4AF37' : 'rgba(212,175,55,0.5)' }}>{step.icon}</span>
                    <div>
                      <div style={{ fontSize: 12, fontFamily: "'Josefin Sans', sans-serif", fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: step.gold ? '#D4AF37' : 'var(--foreground)' }}>{step.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, fontFamily: "'Josefin Sans', sans-serif" }}>{step.sub}</div>
                    </div>
                  </div>
                  {i < 5 && <div style={{ display: 'flex', justifyContent: 'center', padding: '3px 0' }}><div style={{ width: 1, height: 14, background: 'rgba(212,175,55,0.2)' }} /></div>}
                </div>
              ))}
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(212,175,55,0.1)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {['Eligibility', 'Skill Gap', 'Preparation'].map((out, i) => (
                  <div key={i} style={{ textAlign: 'center', padding: '8px 4px', border: '1px solid rgba(212,175,55,0.2)', fontSize: 11, fontFamily: "'Josefin Sans', sans-serif", fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#D4AF37' }}>
                    {out}
                  </div>
                ))}
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      <SectionSep />

      {/* ══════════════════════════ SKILL GAP STATES ══════════════════════════ */}
      <section style={{ padding: '72px 5%' }}>
        <FadeUp>
          <div style={{ textAlign: 'center', marginBottom: 44 }}>
            <SectionLabel>Skill Gap States</SectionLabel>
            <h2 className="heading-xl" style={{ color: 'var(--foreground)', marginBottom: 12 }}>THREE DISTINCT STATES</h2>
            <p style={{ fontSize: 14, color: 'var(--muted)', maxWidth: 520, margin: '0 auto', lineHeight: 1.75 }}>
              Campus Placement AI distinguishes clearly between what is satisfied, what is unknown,
              and what is a confirmed gap — never conflating missing data with confirmed deficiency.
            </p>
          </div>
        </FadeUp>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20, maxWidth: 960, margin: '0 auto' }}>
          {[
            { icon: <CheckCircle size={22} />, state: 'Satisfied', color: '#4CAF7A', bg: 'rgba(76,175,122,0.06)', border: 'rgba(76,175,122,0.2)', desc: "The student's profile demonstrates the required skill or qualification for this criterion." },
            { icon: <HelpCircle size={22} />, state: 'Information Missing', color: '#D4AF37', bg: 'rgba(212,175,55,0.06)', border: 'rgba(212,175,55,0.3)', desc: "The student has not provided enough information to evaluate this criterion. Not necessarily a skill gap." },
            { icon: <AlertCircle size={22} />, state: 'Confirmed Skill Gap', color: '#CF6679', bg: 'rgba(207,102,121,0.06)', border: 'rgba(207,102,121,0.2)', desc: "The student's profile clearly indicates a deficiency in this required skill or qualification." },
          ].map((item, i) => (
            <FadeUp key={i} delay={i * 100}>
              <div style={{ background: item.bg, border: `1px solid ${item.border}`, padding: '28px 24px', height: '100%' }}>
                <div style={{ color: item.color, marginBottom: 14 }}>{item.icon}</div>
                <div style={{ fontFamily: "'Marcellus', Georgia, serif", fontSize: 14, textTransform: 'uppercase' as const, letterSpacing: '0.12em', color: item.color, marginBottom: 12 }}>{item.state}</div>
                <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.75 }}>{item.desc}</p>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      <SectionSep />

      {/* ══════════════════════════ FEATURE MATRIX ══════════════════════════ */}
      <section id="features" style={{ padding: '72px 5%' }}>
        <FadeUp>
          <div style={{ textAlign: 'center', marginBottom: 44 }}>
            <SectionLabel>Capabilities</SectionLabel>
            <h2 className="heading-xl" style={{ color: 'var(--foreground)', marginBottom: 4 }}>ONE PLATFORM.</h2>
            <h2 className="heading-xl" style={{ color: '#D4AF37', marginBottom: 0 }}>MULTIPLE INTELLIGENCE LAYERS.</h2>
          </div>
        </FadeUp>

        {/* Fixed 3-column grid → always renders as perfect 3×2 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, maxWidth: 960, margin: '0 auto' }}>
          {[
            { icon: <User size={18} />, label: 'Profile', detail: 'Academic · Skills · Projects · Certifications' },
            { icon: <FileText size={18} />, label: 'Resume', detail: 'Upload · Extract · Analyse context' },
            { icon: <Target size={18} />, label: 'Eligibility', detail: 'Company + role requirement analysis' },
            { icon: <BarChart2 size={18} />, label: 'Skill Gap', detail: 'Satisfied / Missing / Confirmed Gap' },
            { icon: <BookOpen size={18} />, label: 'Preparation', detail: 'Personalised preparation path' },
            { icon: <MessageSquare size={18} />, label: 'AI Assistant', detail: 'Interactive placement guidance' },
          ].map((item, i) => (
            <FadeUp key={i} delay={i * 60}>
              <div className="deco-card" style={{ padding: '22px 20px', height: '100%' }}>
                <div style={{ color: '#D4AF37', opacity: 0.8, marginBottom: 14 }}>{item.icon}</div>
                <div style={{ fontFamily: "'Marcellus', Georgia, serif", fontSize: 13, textTransform: 'uppercase' as const, letterSpacing: '0.15em', color: 'var(--foreground)', marginBottom: 8 }}>{item.label}</div>
                <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.65, fontFamily: "'Josefin Sans', sans-serif" }}>{item.detail}</p>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      <SectionSep />

      {/* ══════════════════════════ AI ASSISTANT ══════════════════════════ */}
      <section style={{ padding: '72px 5%' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 56, alignItems: 'center' }}>
          <FadeUp>
            <SectionLabel>AI Assistant</SectionLabel>
            <h2 className="heading-xl" style={{ color: 'var(--foreground)', marginBottom: 8 }}>YOUR PLACEMENT</h2>
            <h2 className="heading-xl" style={{ color: '#D4AF37', marginBottom: 20 }}>AI ASSISTANT</h2>
            <div style={{ height: 1, width: 56, background: '#D4AF37', opacity: 0.4, marginBottom: 20 }} />
            <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.85, marginBottom: 20 }}>
              Ask questions about your placement preparation, eligibility concerns, or skill development.
              The AI assistant responds with context drawn from your profile and placement knowledge.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
              {['Profile-aware responses', 'Knowledge-grounded guidance', 'Text and voice interaction', 'Placement-specific context'].map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--foreground)', opacity: 0.8 }}>
                  <CheckCircle size={13} style={{ color: '#D4AF37', flexShrink: 0 }} />{f}
                </div>
              ))}
            </div>
            <Link to="/register" className="btn-gold" style={{ fontSize: 11, padding: '11px 24px' }}>
              Try the Platform <ChevronRight size={14} />
            </Link>
          </FadeUp>

          <FadeUp delay={120}>
            <div className="deco-card" style={{ padding: '24px' }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 8, height: 8, background: '#4CAF7A', borderRadius: '50%' }} />
                <span style={{ fontSize: 12, fontFamily: "'Josefin Sans', sans-serif", fontWeight: 700, letterSpacing: '0.18em', color: 'var(--foreground)', textTransform: 'uppercase' as const }}>Placement AI Assistant</span>
                <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto', fontFamily: "'Josefin Sans', sans-serif" }}>Preview</span>
              </div>

              {/* Chat messages */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
                {[
                  { role: 'user', text: 'What should I focus on to improve my eligibility for this role?' },
                  { role: 'ai', text: "Based on your profile, your CGPA and core skills are strong. The analysis identified two confirmed skill gaps. I'd suggest prioritising those before the application window." },
                  { role: 'user', text: 'Please create a preparation plan for those gaps.' },
                  { role: 'ai', text: 'I\'ve structured a phased preparation plan: Phase I addresses confirmed gaps, Phase II strengthens existing skills, Phase III focuses on company-specific preparation.' },
                ].map((msg, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    <div style={{
                      maxWidth: '82%', padding: '10px 14px', fontSize: 13, lineHeight: 1.65,
                      fontFamily: "'Josefin Sans', sans-serif",
                      background: msg.role === 'user' ? 'rgba(212,175,55,0.08)' : 'rgba(255,255,255,0.03)',
                      border: msg.role === 'user' ? '1px solid rgba(212,175,55,0.28)' : '1px solid var(--border)',
                      color: msg.role === 'user' ? '#D4AF37' : 'var(--muted)',
                    }}>
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>

              {/* Input bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid var(--border)', background: 'rgba(0,0,0,0.3)' }}>
                <span style={{ fontSize: 12, color: 'var(--muted)', flex: 1, fontFamily: "'Josefin Sans', sans-serif" }}>Ask your placement question...</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['Ask', 'Voice'].map((btn, i) => (
                    <div key={i} style={{ padding: '4px 10px', border: '1px solid rgba(212,175,55,0.2)', fontSize: 10, color: i === 0 ? '#D4AF37' : 'var(--muted)', fontFamily: "'Josefin Sans', sans-serif", letterSpacing: '0.15em', textTransform: 'uppercase' as const }}>
                      {btn}
                    </div>
                  ))}
                </div>
              </div>
              <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 10, fontFamily: "'Josefin Sans', sans-serif", opacity: 0.55, textAlign: 'center' }}>
                Visual preview — full assistant available after sign-in
              </p>
            </div>
          </FadeUp>
        </div>
      </section>

      <SectionSep />

      {/* ══════════════════════════ WHY DIFFERENT ══════════════════════════ */}
      <section style={{ padding: '72px 5%' }}>
        <FadeUp>
          <div style={{ textAlign: 'center', marginBottom: 44 }}>
            <SectionLabel>Differentiators</SectionLabel>
            <h2 className="heading-xl" style={{ color: 'var(--foreground)' }}>WHY CAMPUS PLACEMENT AI?</h2>
          </div>
        </FadeUp>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20, maxWidth: 1100, margin: '0 auto' }}>
          {[
            { num: '01', icon: <Layers size={18} />, title: 'Grounded Insights', desc: 'Placement analysis draws from a curated knowledge base rather than generic assumptions. Responses are grounded in relevant placement information.' },
            { num: '02', icon: <User size={18} />, title: 'Profile-Aware Analysis', desc: "Every analysis considers the student's actual profile: academics, skills, projects, certifications, and resume — not generic student archetypes." },
            { num: '03', icon: <BarChart2 size={18} />, title: 'Clear Skill-Gap States', desc: "Clearly distinguishes Satisfied, Information Missing, and Confirmed Skill Gap — avoiding the mistake of treating incomplete data as a deficiency." },
            { num: '04', icon: <BookOpen size={18} />, title: 'Personalised Preparation', desc: 'Preparation guidance is generated specifically for the selected company, role, and the student\'s current profile — not a generic study list.' },
          ].map((card, i) => (
            <FadeUp key={i} delay={i * 80}>
              <div className="deco-card" style={{ padding: '24px 22px', height: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <span style={{ color: '#D4AF37', opacity: 0.75 }}>{card.icon}</span>
                  <span style={{ fontSize: 11, fontFamily: "'Josefin Sans', sans-serif", fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.3em', textTransform: 'uppercase' as const }}>{card.num}</span>
                </div>
                <h3 style={{ fontFamily: "'Marcellus', Georgia, serif", fontSize: 14, textTransform: 'uppercase' as const, letterSpacing: '0.12em', color: 'var(--foreground)', marginBottom: 12 }}>{card.title}</h3>
                <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.75 }}>{card.desc}</p>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      <SectionSep />

      {/* ══════════════════════════ PROFILE → ANALYSIS ══════════════════════════ */}
      <section style={{ padding: '72px 5%' }}>
        <FadeUp>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <SectionLabel>Profile Intelligence</SectionLabel>
            <h2 className="heading-xl" style={{ color: 'var(--foreground)', marginBottom: 8 }}>YOUR PROFILE + RESUME</h2>
            <h2 className="heading-xl" style={{ color: '#D4AF37' }}>= PERSONALISED ANALYSIS</h2>
          </div>
        </FadeUp>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 28, maxWidth: 960, margin: '0 auto', alignItems: 'center' }}>
          <FadeUp>
            <div className="deco-card deco-corners" style={{ padding: '24px 20px' }}>
              <div style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase' as const, color: 'var(--muted)', marginBottom: 16 }}>Your Profile</div>
              {[
                { icon: <GraduationCap size={13} />, label: 'Academic Details' },
                { icon: <Code size={13} />, label: 'Technical Skills' },
                { icon: <Briefcase size={13} />, label: 'Projects' },
                { icon: <Award size={13} />, label: 'Certifications' },
                { icon: <FileText size={13} />, label: 'Resume' },
                { icon: <Target size={13} />, label: 'Career Preferences' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: i < 5 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <span style={{ color: '#D4AF37', opacity: 0.6 }}>{item.icon}</span>
                  <span style={{ fontSize: 13, color: 'var(--muted)', fontFamily: "'Josefin Sans', sans-serif" }}>{item.label}</span>
                </div>
              ))}
            </div>
          </FadeUp>

          <FadeUp delay={100}>
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div className="deco-card" style={{ display: 'inline-block', padding: '18px 20px', marginBottom: 12 }}>
                <Brain size={24} style={{ color: '#D4AF37' }} />
              </div>
              <div style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: '#D4AF37', marginBottom: 6 }}>AI Analysis</div>
              <p style={{ fontSize: 12, color: 'var(--muted)', fontFamily: "'Josefin Sans', sans-serif", lineHeight: 1.6 }}>Azure AI Foundry<br />+ Knowledge Retrieval</p>
            </div>
          </FadeUp>

          <FadeUp delay={200}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { color: '#4CAF7A', border: 'rgba(76,175,122,0.2)', bg: 'rgba(76,175,122,0.05)', icon: <Target size={15} />, title: 'Eligibility Result', sub: 'Profile vs requirements' },
                { color: '#D4AF37', border: 'rgba(212,175,55,0.2)', bg: 'rgba(212,175,55,0.05)', icon: <BarChart2 size={15} />, title: 'Skill Gap Analysis', sub: 'Satisfied / Missing / Gap' },
                { color: '#9B8ECF', border: 'rgba(155,142,207,0.2)', bg: 'rgba(155,142,207,0.05)', icon: <BookOpen size={15} />, title: 'Preparation Plan', sub: 'Personalised path' },
              ].map((item, i) => (
                <div key={i} style={{ padding: '14px 16px', background: item.bg, border: `1px solid ${item.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ color: item.color }}>{item.icon}</span>
                    <span style={{ fontSize: 12, fontFamily: "'Josefin Sans', sans-serif", fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: item.color }}>{item.title}</span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--muted)', fontFamily: "'Josefin Sans', sans-serif" }}>{item.sub}</p>
                </div>
              ))}
            </div>
          </FadeUp>
        </div>
      </section>

      <SectionSep />

      {/* ══════════════════════════ SECURITY ══════════════════════════ */}
      <section style={{ padding: '72px 5%' }}>
        <FadeUp>
          <div style={{ textAlign: 'center', marginBottom: 44 }}>
            <SectionLabel>Security</SectionLabel>
            <h2 className="heading-xl" style={{ color: 'var(--foreground)' }}>BUILT WITH SECURITY IN MIND</h2>
          </div>
        </FadeUp>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, maxWidth: 1000, margin: '0 auto' }}>
          {[
            { icon: <GraduationCap size={16} />, title: 'Institutional Email Only', desc: 'Only verified educational email addresses are accepted for registration.' },
            { icon: <Mail size={16} />, title: 'OTP Verification', desc: 'Every login and registration is secured with a one-time password sent to your institutional email.' },
            { icon: <KeyRound size={16} />, title: 'Password Authentication', desc: 'Passwords are hashed using bcrypt with 12 rounds before storage. Never stored in plaintext.' },
            { icon: <Lock size={16} />, title: 'Server-Side Auth', desc: 'All authentication is validated server-side. JWTs are verified on every protected request.' },
            { icon: <Shield size={16} />, title: 'Protected Routes', desc: 'Application pages are protected. Unauthenticated access is redirected to sign-in.' },
            { icon: <Database size={16} />, title: 'Secure Configuration', desc: 'Secrets and credentials are managed via environment variables — never hard-coded.' },
          ].map((item, i) => (
            <FadeUp key={i} delay={i * 50}>
              <div style={{ padding: '20px 18px', border: '1px solid rgba(212,175,55,0.1)', background: 'rgba(212,175,55,0.02)' }}>
                <div style={{ color: '#D4AF37', opacity: 0.75, marginBottom: 12 }}>{item.icon}</div>
                <div style={{ fontSize: 12, fontFamily: "'Josefin Sans', sans-serif", fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: 'var(--foreground)', marginBottom: 10 }}>{item.title}</div>
                <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.7 }}>{item.desc}</p>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      <SectionSep />

      {/* ══════════════════════════ FINAL CTA ══════════════════════════ */}
      <section style={{ padding: '80px 5%' }}>
        <FadeUp>
          <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
            <div className="deco-card deco-corners" style={{ padding: '56px 44px' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
                <LogoMark size={30} />
              </div>
              <div style={{ fontFamily: "'Josefin Sans', sans-serif", textTransform: 'uppercase' as const, letterSpacing: '0.25em', fontSize: 11, fontWeight: 600, color: 'var(--muted)', marginBottom: 16 }}>Ready to begin?</div>
              <h2 className="heading-xl" style={{ color: 'var(--foreground)', marginBottom: 20 }}>
                START YOUR PLACEMENT JOURNEY
              </h2>
              <div style={{ height: 1, width: 80, background: '#D4AF37', opacity: 0.4, margin: '0 auto 24px' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 32 }}>
                {['Build your profile.', 'Choose your target company and role.', 'Understand where you stand.', 'Prepare with AI.'].map((s, i) => (
                  <p key={i} style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6 }}>{s}</p>
                ))}
              </div>
              <Link to="/register" className="btn-gold" style={{ padding: '14px 38px', fontSize: 12 }}>
                Create Free Account <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        </FadeUp>
      </section>

      {/* ══════════════════════════ FOOTER ══════════════════════════ */}
      <footer style={{ borderTop: '1px solid rgba(212,175,55,0.08)', padding: '44px 5% 28px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 36, marginBottom: 36 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <LogoMark size={20} />
              <span style={{ fontFamily: "'Marcellus', Georgia, serif", fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '0.2em', color: 'var(--foreground)' }}>Campus Placement AI</span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.75, maxWidth: 220 }}>
              Knowledge-grounded AI for campus placement preparation.
            </p>
          </div>
          <div>
            <div style={{ fontFamily: "'Josefin Sans', sans-serif", textTransform: 'uppercase' as const, letterSpacing: '0.22em', fontSize: 10, fontWeight: 600, color: 'var(--muted)', marginBottom: 14 }}>Platform</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {navLinks.map(l => (
                <button key={l.id} onClick={() => scrollTo(l.id)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontFamily: "'Josefin Sans', sans-serif", fontSize: 13, textAlign: 'left', padding: 0, transition: 'color 200ms' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#D4AF37')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}>
                  {l.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontFamily: "'Josefin Sans', sans-serif", textTransform: 'uppercase' as const, letterSpacing: '0.22em', fontSize: 10, fontWeight: 600, color: 'var(--muted)', marginBottom: 14 }}>Account</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[{ label: 'Sign In', to: '/login' }, { label: 'Get Started', to: '/register' }].map(item => (
                <Link key={item.to} to={item.to} style={{ color: 'var(--muted)', fontSize: 13, textDecoration: 'none', fontFamily: "'Josefin Sans', sans-serif", transition: 'color 200ms' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#D4AF37')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 20, textAlign: 'center' }}>
          <p style={{ fontSize: 11, color: 'rgba(136,136,136,0.6)', fontFamily: "'Josefin Sans', sans-serif", letterSpacing: '0.15em', textTransform: 'uppercase' as const }}>
            Campus Placement AI — AI-Powered Placement Intelligence Platform
          </p>
        </div>
      </footer>

      {/* Responsive overrides */}
      <style>{`
        @media (min-width: 768px) { .lp-nav-links { display: flex !important; } }
        @media (max-width: 767px) { .lp-nav-links { display: none !important; } .lp-hamburger { display: flex !important; } }
        @media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }
      `}</style>
    </div>
  );
}
