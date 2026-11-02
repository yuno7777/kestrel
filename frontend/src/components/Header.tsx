import React from 'react';
import { NavItem } from './Sidebar';

interface HeaderProps {
  currentTab: NavItem;
  isConnected: boolean;
}

const labels: Record<NavItem, string> = {
  overview: 'Overview',
  'live-transactions': 'Live transactions',
  'fraud-detection': 'Fraud investigations',
  explorer: 'Transaction search',
  'ml-models': 'Model registry',
  'model-performance': 'Performance',
  'drift-monitoring': 'Drift monitoring',
  streaming: 'Event streaming',
  infrastructure: 'Infrastructure',
  settings: 'Settings',
};

export const Header: React.FC<HeaderProps> = ({ currentTab, isConnected }) => (
  <header className="topbar">
    <div className="topbar-context">Kestrel <strong>/ {labels[currentTab]}</strong></div>
    <div className="topbar-right">
      <div className={`connection-state ${isConnected ? '' : 'offline'}`} role="status" aria-live="polite">
        <span className="health-dot" />
        {isConnected ? 'STREAM CONNECTED' : 'RECONNECTING'}
      </div>
      <time className="topbar-date" dateTime={new Date().toISOString()}>
        {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date())}
      </time>
    </div>
  </header>
);
