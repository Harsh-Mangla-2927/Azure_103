import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Target, FileText, BarChart2, BookOpen, MessageSquare, User, Clock, ArrowRight, Zap } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';
import { MetricCard } from '../components/ui/MetricCard';
import { LoadingState } from '../components/ui/LoadingState';
import { StatusBadge } from '../components/ui/StatusBadge';
import { SectionDivider } from '../components/ui/SectionDivider';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatTime(ts: string) {
  try {
    return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  } catch { return '—'; }
}

const QUICK_ACTIONS = [
  { to: '/eligibility', icon: <Target size={18} />, label: 'Eligibility Check', desc: 'Analyze placement eligibility' },
  { to: '/skill-gap', icon: <BarChart2 size={18} />, label: 'Skill Gap Analysis', desc: 'Find confirmed gaps' },
  { to: '/preparation', icon: <BookOpen size={18} />, label: 'Preparation Plan', desc: 'Generate your roadmap' },
  { to: '/assistant', icon: <MessageSquare size={18} />, label: 'AI Assistant', desc: 'Ask anything' },
];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.dashboard.get()
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-full py-20">
      <LoadingState message="Loading workspace..." />
    </div>
  );

  const profile = data?.profile || {};
  const metrics = data?.metrics || {};
  const resume = data?.resume;
  const recentActivity = data?.recentActivity || [];
  const displayName = user?.fullName || data?.user?.fullName || 'Student';

  return (
    <div className="p-4 md:p-6 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="label-deco mb-1">{getGreeting()}</div>
          <h1 className="font-heading text-xl md:text-2xl text-foreground tracking-wide">
            {displayName.split(' ')[0]}
          </h1>
          <p className="text-muted text-xs mt-0.5">Your placement intelligence workspace</p>
        </div>
        <div className="flex gap-2">
          <Link to="/profile" className="btn-ghost !text-xs !py-2 !px-3">
            <User size={12} /> Profile
          </Link>
          <Link to="/assistant" className="btn-gold !text-xs !py-2 !px-3">
            <MessageSquare size={12} /> Ask AI
          </Link>
        </div>
      </div>

      <SectionDivider />

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Profile Complete"
          value={`${metrics.profileCompletion ?? 0}%`}
          icon={<User size={14} className="text-gold" />}
          sub={metrics.profileCompletion >= 80 ? 'Strong profile' : 'Needs completion'}
          gold
        />
        <MetricCard
          label="Resume Status"
          value={resume ? 'Uploaded' : 'Missing'}
          icon={<FileText size={14} className="text-gold" />}
          sub={resume ? resume.originalName?.substring(0, 20) : 'Upload required'}
        />
        <MetricCard
          label="Placement Readiness"
          value={metrics.placementReadiness || 'N/A'}
          icon={<Zap size={14} className="text-gold" />}
          sub="Based on profile"
        />
        <MetricCard
          label="Target Role"
          value={profile.preferred_role || 'Not set'}
          icon={<Target size={14} className="text-gold" />}
          sub={profile.target_company || 'No company set'}
        />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Placement snapshot */}
        <div className="lg:col-span-2 space-y-4">
          {/* Snapshot */}
          <div className="deco-card deco-corners p-4">
            <div className="label-deco mb-3">Placement Snapshot</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: 'Target Company', value: profile.target_company || 'Not set' },
                { label: 'Target Role', value: profile.preferred_role || 'Not set' },
                { label: 'CGPA', value: profile.cgpa != null ? `${profile.cgpa}` : 'Not provided' },
                { label: 'Backlogs', value: profile.backlogs != null ? `${profile.backlogs}` : 'Not provided' },
                { label: 'Skills', value: `${metrics.skillsCount || 0} added` },
                { label: 'Projects', value: `${metrics.projectsCount || 0} added` },
              ].map(({ label, value }) => (
                <div key={label} className="border border-[#1E1E1E] p-2.5">
                  <div className="label-deco mb-1">{label}</div>
                  <div className="text-foreground text-sm font-heading truncate" title={value}>{value}</div>
                </div>
              ))}
            </div>

            {/* Profile completion bar */}
            <div className="mt-4">
              <div className="flex justify-between items-center mb-1">
                <span className="label-deco">Profile Completion</span>
                <span className="text-gold text-xs font-heading">{metrics.profileCompletion ?? 0}%</span>
              </div>
              <div className="progress-deco">
                <div
                  className="progress-deco-fill"
                  style={{ width: `${metrics.profileCompletion ?? 0}%` }}
                />
              </div>
              {metrics.profileCompletion < 80 && (
                <p className="text-muted text-[10px] mt-2">
                  Complete your profile to unlock more accurate AI analysis.{' '}
                  <Link to="/profile" className="text-gold hover:underline">Update now →</Link>
                </p>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="deco-card p-4">
            <div className="label-deco mb-3">Quick Actions</div>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_ACTIONS.map(action => (
                <Link
                  key={action.to}
                  to={action.to}
                  className="deco-card p-3 flex items-start gap-3 cursor-pointer hover:border-border-gold transition-all group"
                >
                  <div className="diamond-icon-sm text-gold group-hover:scale-110 transition-transform">
                    {action.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="text-foreground text-xs font-semibold uppercase tracking-wide leading-tight truncate">{action.label}</div>
                    <div className="text-muted text-[10px] mt-0.5 truncate">{action.desc}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* AI Insight placeholder / prompt */}
          <div className="deco-card deco-corners p-4">
            <div className="label-deco mb-2">AI Insight</div>
            <div className="gold-line mb-3" />
            {profile.target_company && profile.preferred_role ? (
              <div className="space-y-2">
                <p className="text-foreground text-xs leading-relaxed">
                  Your profile targets <span className="text-gold">{profile.target_company}</span> for a <span className="text-gold">{profile.preferred_role}</span> role.
                </p>
                <p className="text-muted text-xs leading-relaxed">
                  Run an eligibility analysis or chat with the AI assistant to get personalized intelligence.
                </p>
                <Link to="/eligibility" className="btn-gold !text-[10px] !py-2 !px-3 w-full justify-center mt-2">
                  Run Eligibility Check <ArrowRight size={10} />
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-muted text-xs leading-relaxed">
                  Set your target company and role to unlock AI-powered placement analysis.
                </p>
                <Link to="/profile" className="btn-ghost !text-[10px] !py-2 w-full justify-center mt-1">
                  Complete Profile →
                </Link>
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="deco-card p-4">
            <div className="label-deco mb-3">Recent Activity</div>
            {recentActivity.length === 0 ? (
              <p className="text-muted text-xs text-center py-4">
                No analysis yet. Run your first eligibility check.
              </p>
            ) : (
              <div className="space-y-2">
                {recentActivity.map((item: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 py-1.5 border-b border-[#1E1E1E] last:border-0">
                    <div className="diamond-icon-sm flex-shrink-0 opacity-50">
                      <Clock size={10} className="text-gold" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1 flex-wrap">
                        <StatusBadge variant={item.type === 'eligibility' ? 'blue' : item.type === 'skill-gap' ? 'gold' : 'green'}>
                          {item.type}
                        </StatusBadge>
                        <span className="text-muted text-[10px]">{formatTime(item.timestamp)}</span>
                      </div>
                      {item.targetCompany && (
                        <div className="text-foreground text-[10px] mt-0.5 truncate">
                          {item.targetCompany} — {item.targetRole}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
