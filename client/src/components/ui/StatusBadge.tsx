import React from 'react';

type BadgeVariant = 'gold' | 'green' | 'red' | 'blue' | 'muted';

interface StatusBadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  dot?: boolean;
}

const variantMap: Record<BadgeVariant, string> = {
  gold: 'badge-gold',
  green: 'badge-green',
  red: 'badge-red',
  blue: 'badge-blue',
  muted: 'badge-muted',
};

export function StatusBadge({ variant = 'muted', children, dot }: StatusBadgeProps) {
  return (
    <span className={variantMap[variant]}>
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full inline-block ${
            variant === 'green' ? 'bg-green-400' :
            variant === 'red' ? 'bg-red-400' :
            variant === 'gold' ? 'bg-gold' :
            variant === 'blue' ? 'bg-blue-400' :
            'bg-muted'
          }`}
        />
      )}
      {children}
    </span>
  );
}
