import React from 'react';
import { Settings as SettingsIcon, Mail, Lock, Info } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { SectionDivider } from '../components/ui/SectionDivider';

export default function Settings() {
  const { user } = useAuth();

  return (
    <div className="p-4 md:p-6 space-y-5 animate-fade-in">
      <div>
        <div className="label-deco mb-1">Account and application settings</div>
        <h1 className="font-heading text-xl text-foreground tracking-wide">SETTINGS</h1>
      </div>

      <SectionDivider />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="deco-card deco-corners p-4 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="diamond-icon-sm text-gold"><Mail size={12} /></div>
            <div className="label-deco">Account Information</div>
          </div>
          <div>
            <div className="label-deco mb-1">Email Address</div>
            <div className="input-deco text-muted cursor-not-allowed opacity-70">{user?.email}</div>
          </div>
          <div>
            <div className="label-deco mb-1">Full Name</div>
            <div className="input-deco text-muted cursor-not-allowed opacity-70">{user?.fullName}</div>
          </div>
          <p className="text-muted text-[10px]">To update your name, go to <strong className="text-gold">My Profile</strong>.</p>
        </div>

        <div className="deco-card deco-corners p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="diamond-icon-sm text-gold"><Info size={12} /></div>
            <div className="label-deco">About</div>
          </div>
          <div className="space-y-2">
            {[
              { label: 'Platform', value: 'Campus Placement AI' },
              { label: 'Version', value: '1.0.0' },
              { label: 'AI Backend', value: 'Azure AI Foundry' },
              { label: 'Agent', value: 'CampusPlacementAgent' },
              { label: 'Database', value: 'SQLite (local)' },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center text-xs border-b border-[#1E1E1E] pb-1.5">
                <span className="text-muted">{label}</span>
                <span className="text-foreground">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
