import React from 'react';
import {
  Activity,
  BarChart3,
  Cpu,
  GitBranch,
  LayoutDashboard,
  Radio,
  Search,
  Server,
  Settings,
  ShieldAlert,
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

const navSections: { title: string; items: { id: NavItem; label: string; icon: typeof Activity }[] }[] = [
  {
    title: 'Monitoring',
    items: [
      { id: 'overview', label: 'Overview', icon: LayoutDashboard },
      { id: 'live-transactions', label: 'Live transactions', icon: Activity },
      { id: 'fraud-detection', label: 'Fraud investigations', icon: ShieldAlert },
      { id: 'explorer', label: 'Transaction search', icon: Search },
    ],
  },
  {
    title: 'Models',
    items: [
      { id: 'ml-models', label: 'Model registry', icon: Cpu },
      { id: 'model-performance', label: 'Performance', icon: BarChart3 },
      { id: 'drift-monitoring', label: 'Drift monitoring', icon: GitBranch },
    ],
  },
  {
    title: 'Platform',
    items: [
      { id: 'streaming', label: 'Event streaming', icon: Radio },
      { id: 'infrastructure', label: 'Infrastructure', icon: Server },
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab }) => (
  <aside className="sidebar" aria-label="Main navigation">
    <div>
      <div className="brand">
        <div className="brand-mark" aria-hidden="true">
          <svg width="25" height="25" viewBox="0 0 32 32" fill="none">
            <path d="M5 22.5 14.5 7l2.1 9.2L27 8.5l-6.2 16L14 20.2 5 22.5Z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
            <path d="m14 20 2.6-3.8" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
          </svg>
        </div>
        <div className="brand-copy">
          <div className="brand-name">KESTREL</div>
          <div className="brand-subtitle">Fraud operations</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navSections.map((section) => (
          <section className="nav-section" key={section.title}>
            <div className="nav-section-label">{section.title}</div>
            <div className="nav-items">
              {section.items.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  className="nav-button"
                  aria-current={currentTab === id ? 'page' : undefined}
                  aria-label={label}
                  title={label}
                  onClick={() => onSelectTab(id)}
                >
                  <Icon size={15} strokeWidth={1.35} aria-hidden="true" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </nav>
    </div>

    <div className="sidebar-footer">
      <div className="sidebar-health">Kestrel risk operations</div>
    </div>
  </aside>
);
