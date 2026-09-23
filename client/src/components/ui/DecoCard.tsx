import React from 'react';

interface DecoCardProps {
  children: React.ReactNode;
  className?: string;
  corners?: boolean;
  onClick?: () => void;
  hover?: boolean;
}

export function DecoCard({ children, className = '', corners = false, onClick, hover = true }: DecoCardProps) {
  return (
    <div
      className={`deco-card${corners ? ' deco-corners' : ''}${hover ? '' : ' hover:border-[#2A2A2A] hover:shadow-none'} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      {children}
    </div>
  );
}
