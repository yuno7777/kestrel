import React from 'react';
import { Server, Database, Activity, CheckCircle2, Cpu, HardDrive } from 'lucide-react';

export const Infrastructure: React.FC = () => {
  const services = [
    {
      name: 'Kestrel FastAPI Service',
      role: 'Inference & REST API',
      port: '8000',
      uptime: '99.98%',
      latency: '3.2 ms',
      status: 'ONLINE',
    },
    {
      name: 'Kestrel Stream Processor',
      role: 'Async Stream Ingestion & Enrichment',
      port: 'Internal',
      uptime: '99.99%',
      latency: '1.4 ms',
      status: 'ONLINE',
    },
    {
      name: 'Redis 7 Feature Store',
      role: 'Sliding-Window Atomic ZSETs',
      port: '6379',
      uptime: '100%',
      latency: '0.8 ms',
      status: 'ONLINE',
    },
    {
      name: 'PostgreSQL 16 / SQLite',
      role: 'Durable Relational Store & Audit Trails',
      port: '5432 / Local',
      uptime: '99.95%',
      latency: '2.1 ms',
      status: 'ONLINE',
    },
    {
      name: 'Apache Kafka Broker (KRaft)',
      role: 'Distributed Event Streaming Backbone',
      port: '9092',
      uptime: '99.99%',
      latency: '2.5 ms',
      status: 'ONLINE',
    },
    {
      name: 'Prometheus Timeseries',
      role: 'Metrics Scraper & Histograms',
      port: '9090',
      uptime: '100%',
      latency: 'N/A',
      status: 'ONLINE',
    },
    {
      name: 'Grafana Dashboards',
      role: 'Provisioned Telemetry Visualization',
      port: '3000',
      uptime: '100%',
      latency: 'N/A',
      status: 'ONLINE',
    },
  ];

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Infrastructure Health & Topology</h2>
        <p className="text-xs text-slate-400 mt-1">
          Real-time service availability, latency health probes, and cluster resource status.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {services.map((s) => (
          <div
            key={s.name}
            className="bg-[#11131c] border border-[#202538] rounded-lg p-5 flex flex-col justify-between hover:border-[#2f3854] transition-colors"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                  {s.status}
                </span>
                <span className="font-mono text-xs text-slate-400">{s.port}</span>
              </div>
              <div className="text-sm font-semibold text-white mt-1">{s.name}</div>
              <div className="text-xs text-slate-400 mt-0.5">{s.role}</div>
            </div>

            <div className="mt-5 pt-3 border-t border-[#1c2235] flex items-center justify-between text-xs font-mono text-slate-300">
              <span>Uptime: {s.uptime}</span>
              <span className="text-cyan-400">Lat: {s.latency}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
