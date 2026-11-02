import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, change, icon: Icon }) => (
  <article className="metric-card">
    <div className="metric-top">
      <span>{title}</span>
      <Icon size={14} strokeWidth={1.4} aria-hidden="true" />
    </div>
    <div className="metric-number" title={String(value)}>{value}</div>
    {(subtitle || change) && <div className="metric-note">{change && <b>{change}</b>}{change && subtitle ? ' · ' : ''}{subtitle}</div>}
  </article>
);
