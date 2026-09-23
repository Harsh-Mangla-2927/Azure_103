import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, User, FileText, Target, BarChart2,
  BookOpen, MessageSquare, LogOut, Settings, ChevronLeft,
  ChevronRight, Menu, X
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
}

const navItems: NavItem[] = [
  { to: '/dashboard', icon: <LayoutDashboard size={16} />, label: 'Dashboard' },
  { to: '/profile', icon: <User size={16} />, label: 'My Profile' },
  { to: '/resume', icon: <FileText size={16} />, label: 'Resume' },
  { to: '/eligibility', icon: <Target size={16} />, label: 'Eligibility' },
  { to: '/skill-gap', icon: <BarChart2 size={16} />, label: 'Skill Gap' },
  { to: '/preparation', icon: <BookOpen size={16} />, label: 'Preparation' },
  { to: '/assistant', icon: <MessageSquare size={16} />, label: 'AI Assistant' },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-[#2A2A2A]">
        {!collapsed && (
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 border border-gold flex-shrink-0 flex items-center justify-center" style={{ transform: 'rotate(45deg)' }}>
              <div className="w-2 h-2 bg-gold" style={{ transform: 'rotate(-45deg)' }} />
            </div>
            <div className="min-w-0">
              <div className="heading-sm text-foreground text-[10px] leading-none truncate">Campus</div>
              <div className="heading-sm text-gold text-[10px] leading-none truncate">Placement AI</div>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-6 h-6 border border-gold mx-auto flex-shrink-0 flex items-center justify-center" style={{ transform: 'rotate(45deg)' }}>
            <div className="w-2 h-2 bg-gold" style={{ transform: 'rotate(-45deg)' }} />
          </div>
        )}

        {/* Desktop collapse toggle */}
        <button
          onClick={onToggle}
          className="hidden md:flex btn-ghost !p-1.5 !min-h-0 !border-0 text-muted hover:text-foreground ml-auto flex-shrink-0"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* Mobile close */}
        <button
          onClick={onMobileClose}
          className="md:hidden btn-ghost !p-1.5 !min-h-0 !border-0 text-muted"
          aria-label="Close navigation"
        >
          <X size={16} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-y-auto" aria-label="Main navigation">
        <div className="label-deco px-4 mb-2" style={{ display: collapsed ? 'none' : 'block' }}>
          Navigation
        </div>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onMobileClose}
            className={({ isActive }) =>
              `sidebar-nav-item${isActive ? ' active' : ''}`
            }
            title={collapsed ? item.label : undefined}
          >
            <span className="flex-shrink-0">{item.icon}</span>
            {!collapsed && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-[#2A2A2A]">
        {/* User info */}
        {!collapsed && user && (
          <div className="px-4 py-3 border-b border-[#2A2A2A]">
            <div className="text-foreground text-xs font-semibold truncate">{user.fullName}</div>
            <div className="text-muted text-[10px] truncate mt-0.5">{user.email}</div>
          </div>
        )}

        <NavLink
          to="/settings"
          onClick={onMobileClose}
          className={({ isActive }) => `sidebar-nav-item${isActive ? ' active' : ''}`}
          title={collapsed ? 'Settings' : undefined}
        >
          <span className="flex-shrink-0"><Settings size={16} /></span>
          {!collapsed && <span>Settings</span>}
        </NavLink>

        <button
          onClick={handleLogout}
          className="sidebar-nav-item w-full text-left hover:text-red-400 hover:border-l-red-400/30"
          aria-label="Log out"
        >
          <span className="flex-shrink-0"><LogOut size={16} /></span>
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`sidebar hidden md:flex flex-col ${collapsed ? 'collapsed' : ''}`}
        aria-label="Application sidebar"
      >
        {sidebarContent}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden">
          <div className="mobile-overlay" onClick={onMobileClose} aria-hidden="true" />
          <aside className="sidebar flex flex-col animate-slide-in" style={{ width: '220px' }}>
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
