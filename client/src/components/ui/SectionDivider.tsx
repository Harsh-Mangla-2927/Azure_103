import React from 'react';

interface SectionDividerProps {
  title?: string;
  className?: string;
}

export function SectionDivider({ title, className = '' }: SectionDividerProps) {
  if (!title) {
    return <div className={`gold-line my-4 ${className}`} />;
  }

  return (
    <div className={`gold-divider my-4 ${className}`}>
      <span className="label-deco whitespace-nowrap px-2">{title}</span>
    </div>
  );
}
