import React, { useState, useEffect } from 'react';
import { Sidebar, NavItem } from './components/Sidebar';
import { Header } from './components/Header';
import { TransactionDrawer } from './components/TransactionDrawer';
import { Overview } from './pages/Overview';
import { LiveTransactions } from './pages/LiveTransactions';
import { FraudDetection } from './pages/FraudDetection';
import { TransactionExplorer } from './pages/TransactionExplorer';
import { MLModels } from './pages/MLModels';
import { ModelPerformance } from './pages/ModelPerformance';
import { DriftMonitoring } from './pages/DriftMonitoring';
import { EventStreaming } from './pages/EventStreaming';
import { Infrastructure } from './pages/Infrastructure';
import { Settings } from './pages/Settings';
import { Transaction } from './types';
import { subscribeToLiveStream } from './services/api';

export function App() {
  const [currentTab, setCurrentTab] = useState<NavItem>('overview');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    // Monitor SSE health
    const unsubscribe = subscribeToLiveStream(
      () => setIsConnected(true),
      () => setIsConnected(false)
    );
    return () => unsubscribe();
  }, []);

  const renderActivePage = () => {
    switch (currentTab) {
      case 'overview':
        return <Overview onSelectTransaction={setSelectedTransaction} />;
      case 'live-transactions':
        return <LiveTransactions onSelectTransaction={setSelectedTransaction} />;
      case 'fraud-detection':
        return <FraudDetection onSelectTransaction={setSelectedTransaction} />;
      case 'explorer':
        return <TransactionExplorer onSelectTransaction={setSelectedTransaction} />;
      case 'ml-models':
        return <MLModels />;
      case 'model-performance':
        return <ModelPerformance />;
      case 'drift-monitoring':
        return <DriftMonitoring />;
      case 'streaming':
        return <EventStreaming onSelectTransaction={setSelectedTransaction} />;
      case 'infrastructure':
        return <Infrastructure />;
      case 'settings':
        return <Settings />;
      default:
        return <Overview onSelectTransaction={setSelectedTransaction} />;
    }
  };

  return (
    <div className="app-shell">
      {/* Sidebar Navigation */}
      <Sidebar currentTab={currentTab} onSelectTab={setCurrentTab} />

      {/* Main Workspace Area */}
      <div className="app-workspace">
        <Header currentTab={currentTab} isConnected={isConnected} />

        {/* Scrollable Page Content */}
        <main className="app-content">
          {renderActivePage()}
        </main>
      </div>

      {/* Transaction Details Inspector Drawer */}
      <TransactionDrawer
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
      />
    </div>
  );
}

export default App;
