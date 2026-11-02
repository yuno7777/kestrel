import React from 'react';

interface BadgeProps {
  label: string;
  variant?: 'approve' | 'review' | 'block' | 'info' | 'neutral' | 'warning' | 'danger' | 'success';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'neutral', size = 'sm' }) => (
  <span className="decision-chip" data-variant={variant} data-size={size}>{label}</span>
);
