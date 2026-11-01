import React from 'react';
import { Bell, ChevronRight, CircleDot, Database, Globe } from 'lucide-react';
import { NavItem } from './Sidebar';

interface HeaderProps {
  currentTab: NavItem;
  isConnected: boolean;
}

export const Header: React.FC<HeaderProps> = ({ currentTab, isConnected }) => {
  const getTabLabel = (tab: NavItem) => {
    switch (tab) {
      case 'overview':
        return 'Overview Dashboard';
      case 'live-transactions':
        return 'Live Transaction Feed';
      case 'fraud-detection':
        return 'Fraud Investigation & Alerts';
      case 'explorer':
        return 'Transaction Explorer';
      case 'ml-models':
        return 'ML Model Registry';
      case 'model-performance':
        return 'Evaluation & Precision-Recall';
      case 'drift-monitoring':
        return 'Feature Drift & Stability';
      case 'streaming':
        return 'Event Streaming (Kafka)';
      case 'infrastructure':
        return 'Infrastructure Health';
      case 'settings':
        return 'Risk Threshold Settings';
      default:
        return 'Dashboard';
    }
  };

  return (
    <header className="h-16 bg-[#0d0f17] border-b border-[#1e2336] px-6 flex items-center justify-between shrink-0">
      {/* Breadcrumb & Title */}
      <div className="flex items-center gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-slate-400 font-medium">
          <Globe className="w-3.5 h-3.5 text-slate-400" />
          <span>Production</span>
        </div>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="font-semibold text-slate-200">{getTabLabel(currentTab)}</span>
      </div>

      {/* Action Bar & Indicators */}
      <div className="flex items-center gap-4">
        {/* Stream Status Pill */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#141824] border border-[#23293d] text-xs">
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
            }`}
          />
          <span className="text-slate-300 font-mono text-[11px]">
            {isConnected ? 'LIVE FEED CONNECTED' : 'STREAM STANDBY'}
          </span>
        </div>

        {/* Database Mode Pill */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#141824] border border-[#23293d] text-[11px] text-slate-300 font-mono">
          <Database className="w-3 h-3 text-cyan-400" />
          <span>Kestrel SQLite/PG</span>
        </div>

        {/* Notification Bell */}
        <button
          className="relative p-2 rounded-md hover:bg-[#181c2b] text-slate-400 hover:text-slate-200 transition-colors"
          title="Notification Center"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-cyan-400" />
        </button>

        {/* User Pill */}
        <div className="flex items-center gap-2 pl-2 border-l border-[#1e2336]">
          <div className="w-7 h-7 rounded-full bg-[#20263b] border border-[#2c3452] flex items-center justify-center text-xs font-semibold text-cyan-400">
            OP
          </div>
          <div className="text-left hidden sm:block">
            <div className="text-xs font-medium text-slate-200 leading-tight">Fraud Lead</div>
            <div className="text-[10px] text-slate-400">Security Ops</div>
          </div>
        </div>
      </div>
    </header>
  );
};
