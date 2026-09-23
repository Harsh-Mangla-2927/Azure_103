import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  sub?: string;
  gold?: boolean;
}

export function MetricCard({ label, value, icon, sub, gold }: MetricCardProps) {
  return (
    <div className="metric-card deco-corners">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="label-deco mb-2">{label}</div>
          <div className={`metric-value ${gold ? 'text-gold' : 'text-foreground'}`}>{value}</div>
          {sub && <div className="text-muted text-xs mt-1 font-body tracking-wide">{sub}</div>}
        </div>
        {icon && (
          <div className="diamond-icon-sm opacity-60 flex-shrink-0">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
