import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Target, BarChart2, BookOpen, ChevronRight } from 'lucide-react';

export default function Landing() {
  return (
    <div className="deco-bg min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 md:px-12 py-4 border-b border-[#1A1A1A] relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 border border-gold flex items-center justify-center" style={{ transform: 'rotate(45deg)' }}>
            <div className="w-2 h-2 bg-gold" style={{ transform: 'rotate(-45deg)' }} />
          </div>
          <span className="heading-sm text-foreground text-[11px] tracking-[0.2em]">CAMPUS PLACEMENT AI</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="btn-ghost !text-[11px] !px-4 !py-2 !min-h-0">
            Sign In
          </Link>
          <Link to="/register" className="btn-gold !text-[11px] !px-4 !py-2 !min-h-0">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex items-center justify-center px-6 md:px-12 py-12 relative">
        {/* Art Deco radial graphic (CSS only) */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
          <div className="relative">
            <div
              className="w-72 h-72 md:w-96 md:h-96 rounded-full border"
              style={{
                borderColor: 'rgba(212,175,55,0.05)',
                boxShadow: '0 0 80px rgba(212,175,55,0.06) inset',
              }}
            />
            <div
              className="absolute inset-6 rounded-full border"
              style={{ borderColor: 'rgba(212,175,55,0.04)' }}
            />
            <div
              className="absolute inset-12 rounded-full border"
              style={{ borderColor: 'rgba(212,175,55,0.06)' }}
            />
            {/* Diagonal lines */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="w-full h-px"
                style={{ background: 'linear-gradient(to right, transparent, rgba(212,175,55,0.12), transparent)' }}
              />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="h-full w-px"
                style={{ background: 'linear-gradient(to bottom, transparent, rgba(212,175,55,0.12), transparent)' }}
              />
            </div>
            {/* Diamond center */}
            <div
              className="absolute top-1/2 left-1/2 w-4 h-4 border border-gold"
              style={{ transform: 'translate(-50%, -50%) rotate(45deg)', background: 'rgba(212,175,55,0.1)' }}
            />
          </div>
        </div>

        <div className="relative z-10 text-center max-w-3xl mx-auto animate-slide-up">
          <div className="label-deco mb-6 tracking-[0.4em]">Placement Intelligence Platform</div>

          <h1 className="heading-display text-foreground mb-2">
            <span className="block">CAMPUS</span>
            <span className="block text-gold">PLACEMENT</span>
            <span className="block">AI</span>
          </h1>

          <div className="gold-divider my-6 max-w-xs mx-auto" />

          <p className="text-muted text-sm md:text-base max-w-md mx-auto leading-relaxed mb-8">
            Knowledge-grounded AI for smarter campus placement preparation.
            Analyze eligibility, identify skill gaps, and build your path to success.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/register" className="btn-gold !px-8 !py-3 text-sm">
              Get Started <ArrowRight size={14} />
            </Link>
            <a
              href="#features"
              className="btn-ghost !px-8 !py-3 text-sm"
            >
              Explore Platform
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-6 md:px-12 py-12 border-t border-[#1A1A1A]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <div className="label-deco mb-2">Core Capabilities</div>
            <h2 className="heading-lg text-foreground">WHY CAMPUS PLACEMENT AI</h2>
            <div className="gold-line mt-3 max-w-xs mx-auto" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                numeral: 'I',
                icon: <Target size={20} />,
                title: 'Eligibility Intelligence',
                desc: 'AI-powered analysis of your profile against real placement requirements. Know exactly where you stand before you apply.',
              },
              {
                numeral: 'II',
                icon: <BarChart2 size={20} />,
                title: 'Skill Gap Analysis',
                desc: 'Precisely identify confirmed skill gaps vs. missing information. Never be misled by incorrect gap assessments.',
              },
              {
                numeral: 'III',
                icon: <BookOpen size={20} />,
                title: 'Personalized Preparation',
                desc: 'Get a structured, phased preparation plan generated specifically for your profile and target role.',
              },
            ].map((feature, idx) => (
              <div key={idx} className="deco-card deco-corners p-5 animate-slide-up" style={{ animationDelay: `${idx * 100}ms` }}>
                <div className="flex items-start gap-3 mb-3">
                  <div className="diamond-icon-sm text-gold">
                    {feature.icon}
                  </div>
                  <div className="phase-number">{feature.numeral}</div>
                </div>
                <h3 className="heading-sm text-gold text-[11px] mb-2">{feature.title.toUpperCase()}</h3>
                <p className="text-muted text-xs leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 md:px-12 py-12 border-t border-[#1A1A1A]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="label-deco mb-2">Process</div>
            <h2 className="heading-lg text-foreground">HOW IT WORKS</h2>
            <div className="gold-line mt-3 max-w-xs mx-auto" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { numeral: 'I', title: 'Build Your Profile', desc: 'Add your academic details, skills, projects, certifications and upload your resume.' },
              { numeral: 'II', title: 'Analyze Your Target', desc: 'Select your target company and role. Our AI performs real eligibility and skill gap analysis.' },
              { numeral: 'III', title: 'Prepare with AI', desc: 'Receive a phased preparation plan and chat with the AI assistant for guidance.' },
            ].map((step, idx) => (
              <div key={idx} className="text-center flex flex-col items-center gap-3">
                <div className="w-10 h-10 border border-gold flex items-center justify-center" style={{ transform: 'rotate(45deg)' }}>
                  <span className="phase-number" style={{ transform: 'rotate(-45deg)' }}>{step.numeral}</span>
                </div>
                {idx < 2 && (
                  <div className="hidden md:block absolute" />
                )}
                <div>
                  <h3 className="heading-sm text-gold text-[11px] mb-1">{step.title.toUpperCase()}</h3>
                  <p className="text-muted text-xs leading-relaxed max-w-xs">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 md:px-12 py-10 border-t border-[#1A1A1A]">
        <div className="max-w-xl mx-auto text-center">
          <div className="deco-card deco-corners p-8">
            <div className="label-deco mb-2">Ready to begin?</div>
            <h2 className="heading-lg text-foreground mb-4">START YOUR PLACEMENT JOURNEY</h2>
            <Link to="/register" className="btn-gold !px-8 !py-3">
              Create Free Account <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1A1A1A] px-6 py-4 text-center">
        <p className="text-muted text-[10px] tracking-widest uppercase">
          Campus Placement AI — AI-Powered Placement Intelligence Platform
        </p>
      </footer>
    </div>
  );
}
