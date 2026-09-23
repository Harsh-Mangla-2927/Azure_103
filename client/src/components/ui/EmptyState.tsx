import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12 text-center animate-fade-in">
      {icon && (
        <div className="diamond-icon opacity-40">
          {icon}
        </div>
      )}
      <div>
        <p className="heading-sm text-muted mb-1">{title}</p>
        {description && (
          <p className="text-muted text-xs mt-1 max-w-xs mx-auto leading-relaxed">{description}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
