import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function LoadingState({ message = 'Loading...', size = 'md' }: LoadingStateProps) {
  const iconSize = size === 'sm' ? 16 : size === 'lg' ? 32 : 20;
  const textClass = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm';

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8 animate-fade-in">
      <div className="diamond-icon opacity-80">
        <Loader2 size={iconSize} className="text-gold animate-spin" />
      </div>
      <p className={`label-deco ${textClass}`}>{message}</p>
      <div className="flex gap-1">
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="w-1 h-1 bg-gold rounded-full animate-glow-pulse"
            style={{ animationDelay: `${i * 200}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
