import React from 'react';
import { Loader2 } from 'lucide-react';

interface DecoButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'gold' | 'ghost' | 'danger';
  loading?: boolean;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

export function DecoButton({
  variant = 'gold',
  loading = false,
  children,
  icon,
  className = '',
  disabled,
  ...props
}: DecoButtonProps) {
  const cls = variant === 'gold' ? 'btn-gold' : variant === 'danger' ? 'btn-danger' : 'btn-ghost';

  return (
    <button
      className={`${cls} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 size={14} className="animate-spin" />
      ) : icon ? (
        <span className="flex-shrink-0">{icon}</span>
      ) : null}
      {children}
    </button>
  );
}
