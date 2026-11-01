import React from 'react';

interface BadgeProps {
  label: string;
  variant?: 'approve' | 'review' | 'block' | 'info' | 'neutral' | 'warning' | 'danger' | 'success';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'neutral', size = 'sm' }) => {
  const getColors = () => {
    switch (variant) {
      case 'approve':
      case 'success':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'review':
      case 'warning':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'block':
      case 'danger':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'info':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';

  return (
    <span
      className={`inline-flex items-center font-medium rounded border ${sizeClass} ${getColors()} tracking-wide`}
    >
      {label}
    </span>
  );
};
