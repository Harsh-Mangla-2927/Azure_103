import React from 'react';
import { Menu } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Placement intelligence workspace' },
  '/profile': { title: 'My Profile', subtitle: 'Manage your placement profile' },
  '/resume': { title: 'Resume', subtitle: 'Upload and manage your resume' },
  '/eligibility': { title: 'Eligibility Analysis', subtitle: 'Check placement eligibility' },
  '/skill-gap': { title: 'Skill Gap Intelligence', subtitle: 'Identify gaps and opportunities' },
  '/preparation': { title: 'Preparation Plan', subtitle: 'Personalized preparation roadmap' },
  '/assistant': { title: 'AI Assistant', subtitle: 'Ask anything about placement' },
  '/settings': { title: 'Settings', subtitle: 'Account and application settings' },
};

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const location = useLocation();
  const pageInfo = pageTitles[location.pathname] || { title: 'Campus Placement AI', subtitle: '' };

  return (
    <header className="h-14 border-b border-[#2A2A2A] bg-[#0F0F0F] flex items-center px-4 gap-4 flex-shrink-0 relative z-10">
      {/* Mobile menu */}
      <button
        onClick={onMenuClick}
        className="md:hidden btn-ghost !p-2 !min-h-0 !border-0 text-muted"
        aria-label="Open navigation menu"
      >
        <Menu size={20} />
      </button>

      {/* Vertical divider */}
      <div className="hidden md:block w-px h-6 bg-[#2A2A2A]" />

      {/* Page title */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="min-w-0">
          <h1 className="heading-sm text-foreground text-xs leading-none truncate">{pageInfo.title}</h1>
          {pageInfo.subtitle && (
            <p className="text-muted text-[10px] mt-0.5 font-body tracking-wider truncate">{pageInfo.subtitle}</p>
          )}
        </div>
      </div>

      {/* Gold accent line at bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{ background: 'linear-gradient(to right, transparent, rgba(212,175,55,0.2), transparent)' }}
      />
    </header>
  );
}
