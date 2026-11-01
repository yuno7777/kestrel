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

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  change,
  changeType = 'neutral',
  icon: Icon,
}) => {
  return (
    <div className="bg-[#11131c] border border-[#202538] rounded-lg p-5 flex flex-col justify-between hover:border-[#2f3652] transition-colors shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase font-medium tracking-wider text-slate-400">
          {title}
        </span>
        <div className="p-2 bg-[#181c2b] border border-[#262c42] rounded-md text-slate-300">
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="mt-3">
        <div className="text-2xl font-bold tracking-tight text-white">{value}</div>
        {(subtitle || change) && (
          <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
            {change && (
              <span
                className={`font-medium ${
                  changeType === 'positive'
                    ? 'text-emerald-400'
                    : changeType === 'negative'
                    ? 'text-rose-400'
                    : 'text-slate-400'
                }`}
              >
                {change}
              </span>
            )}
            {subtitle && <span>{subtitle}</span>}
          </div>
        )}
      </div>
    </div>
  );
};
