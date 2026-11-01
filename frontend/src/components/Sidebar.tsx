import React from 'react';
import {
  LayoutDashboard,
  Activity,
  ShieldAlert,
  Search,
  Cpu,
  BarChart3,
  GitBranch,
  Radio,
  Server,
  Settings as SettingsIcon,
  ShieldCheck,
} from 'lucide-react';

export type NavItem =
  | 'overview'
  | 'live-transactions'
  | 'fraud-detection'
  | 'explorer'
  | 'ml-models'
  | 'model-performance'
  | 'drift-monitoring'
  | 'streaming'
  | 'infrastructure'
  | 'settings';

interface SidebarProps {
  currentTab: NavItem;
  onSelectTab: (tab: NavItem) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab }) => {
  const navSections = [
    {
      title: 'Real-Time Monitoring',
      items: [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'live-transactions', label: 'Live Transactions', icon: Activity },
        { id: 'fraud-detection', label: 'Fraud Detection', icon: ShieldAlert },
        { id: 'explorer', label: 'Transaction Explorer', icon: Search },
      ],
    },
    {
      title: 'Machine Learning',
      items: [
        { id: 'ml-models', label: 'ML Models', icon: Cpu },
        { id: 'model-performance', label: 'Model Performance', icon: BarChart3 },
        { id: 'drift-monitoring', label: 'Drift Monitoring', icon: GitBranch },
      ],
    },
    {
      title: 'Infrastructure',
      items: [
        { id: 'streaming', label: 'Event Streaming', icon: Radio },
        { id: 'infrastructure', label: 'Infrastructure', icon: Server },
        { id: 'settings', label: 'Settings', icon: SettingsIcon },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-[#0d0f17] border-r border-[#1e2336] flex flex-col justify-between shrink-0 select-none">
      <div>
        {/* Brand Header */}
        <div className="h-16 border-b border-[#1e2336] px-5 flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-500/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="font-semibold text-sm tracking-wider text-white flex items-center gap-1.5">
              KESTREL <span className="text-[10px] text-cyan-400 font-mono font-normal px-1 py-0.2 bg-cyan-950/60 border border-cyan-800/40 rounded">v1.0</span>
            </div>
            <div className="text-[11px] text-slate-400">Fraud Intelligence Platform</div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-6">
          {navSections.map((sec) => (
            <div key={sec.title}>
              <div className="px-3 pb-2 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                {sec.title}
              </div>
              <div className="space-y-1">
                {sec.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onSelectTab(item.id as NavItem)}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-md transition-all ${
                        isActive
                          ? 'bg-[#1a2035] text-white border border-[#2d3758] shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-[#131622]'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Footer System Status */}
      <div className="p-4 border-t border-[#1e2336]">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-300 font-medium text-[11px]">Pipeline Healthy</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">LAT: 3.2ms</span>
        </div>
      </div>
    </aside>
  );
};
