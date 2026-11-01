import React from 'react';
import { Radio, Layers, AlertCircle, ArrowUpRight, CheckCircle2 } from 'lucide-react';

export const EventStreaming: React.FC = () => {
  const topics = [
    {
      name: 'transactions.raw',
      partitions: 6,
      throughput: '125 msg/s',
      lag: 0,
      retention: '7 days',
      status: 'HEALTHY',
    },
    {
      name: 'transactions.scored',
      partitions: 6,
      throughput: '125 msg/s',
      lag: 0,
      retention: '14 days',
      status: 'HEALTHY',
    },
    {
      name: 'transactions.fraud',
      partitions: 3,
      throughput: '2.8 msg/s',
      lag: 0,
      retention: '30 days',
      status: 'HEALTHY',
    },
    {
      name: 'transactions.review',
      partitions: 3,
      throughput: '4.5 msg/s',
      lag: 0,
      retention: '30 days',
      status: 'HEALTHY',
    },
    {
      name: 'transactions.dlq',
      partitions: 2,
      throughput: '0.0 msg/s',
      lag: 0,
      retention: '30 days',
      status: 'CLEAR',
    },
  ];

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">
          Apache Kafka Event Streaming Topology
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          KRaft-mode distributed broker topics, partition key hashing, and consumer group telemetry.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-[#11131c] border border-[#202538] rounded-lg p-5">
          <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
            Active Broker Mode
          </div>
          <div className="text-xl font-bold font-mono text-cyan-400 mt-2">Kafka KRaft (Quorum)</div>
          <div className="text-xs text-slate-400 mt-1">Zero ZooKeeper dependency</div>
        </div>
        <div className="bg-[#11131c] border border-[#202538] rounded-lg p-5">
          <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
            Consumer Group Lag
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-2">0 messages</div>
          <div className="text-xs text-slate-400 mt-1">kestrel-stream-processor-cg</div>
        </div>
        <div className="bg-[#11131c] border border-[#202538] rounded-lg p-5">
          <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
            Partitioning Key
          </div>
          <div className="text-xl font-bold font-mono text-white mt-2">customer_id</div>
          <div className="text-xs text-slate-400 mt-1">Strict per-entity event ordering</div>
        </div>
      </div>

      {/* Topics Table */}
      <div className="bg-[#11131c] border border-[#202538] rounded-lg overflow-hidden">
        <div className="p-5 border-b border-[#202538] flex items-center justify-between">
          <div className="text-xs uppercase font-medium tracking-wider text-slate-400">
            Registered Streaming Topics
          </div>
          <span className="text-xs font-mono text-cyan-400">Bootstrap: localhost:9092</span>
        </div>

        <table className="w-full text-left text-xs">
          <thead className="bg-[#151928] text-slate-400 border-b border-[#202538] uppercase font-mono text-[10px]">
            <tr>
              <th className="py-3 px-4">Topic Name</th>
              <th className="py-3 px-4">Partitions</th>
              <th className="py-3 px-4">Current Throughput</th>
              <th className="py-3 px-4">Consumer Lag</th>
              <th className="py-3 px-4">Retention</th>
              <th className="py-3 px-4 text-right">Health</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1c2235]">
            {topics.map((t) => (
              <tr key={t.name} className="hover:bg-[#161a29]">
                <td className="py-3 px-4 font-mono font-medium text-white flex items-center gap-2">
                  <Radio className="w-3.5 h-3.5 text-cyan-400" />
                  {t.name}
                </td>
                <td className="py-3 px-4 font-mono text-slate-300">{t.partitions}</td>
                <td className="py-3 px-4 font-mono text-slate-200">{t.throughput}</td>
                <td className="py-3 px-4 font-mono text-emerald-400 font-semibold">{t.lag}</td>
                <td className="py-3 px-4 font-mono text-slate-400">{t.retention}</td>
                <td className="py-3 px-4 text-right">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                    {t.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
