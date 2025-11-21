import React, { useRef, useEffect } from 'react';
import { Activity, Filter, Skull } from 'lucide-react';
import { LogEntry } from '../types';

interface LogPanelProps {
  logs: LogEntry[];
}

const LogItem: React.FC<{ log: LogEntry }> = ({ log }) => (
  <div className={`
    text-xs font-mono py-2 border-b border-slate-800 flex justify-between animate-in fade-in duration-300
    ${
      log.type === 'WIN' ? 'text-emerald-400 bg-emerald-900/10 pl-2 border-l-2 border-emerald-500' : 
      log.type === 'LOSS' ? 'text-rose-400 bg-rose-900/10 pl-2 border-l-2 border-rose-500' : 
      log.type === 'LIQUIDATION' ? 'text-red-500 bg-red-950/30 pl-2 border-l-2 border-red-600 font-bold' :
      'text-cyan-300 pl-2 border-l-2 border-cyan-500'
    }
  `}>
    <div className="flex flex-col max-w-[80%]">
      <span className="opacity-50 text-[10px] mb-1">{log.time}</span>
      <span className="flex items-start gap-1">
        {log.type === 'LIQUIDATION' && <Skull size={12} className="mt-0.5 shrink-0"/>}
        {log.message}
      </span>
    </div>
    {log.amount !== undefined && (
      <span className="font-bold whitespace-nowrap ml-2 flex items-center">
        {log.amount > 0 ? '+' : ''}{log.amount}$
      </span>
    )}
  </div>
);

export const LogPanel: React.FC<LogPanelProps> = ({ logs }) => {
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div className="bg-slate-900/80 rounded-2xl border border-slate-800 flex flex-col h-[400px] lg:h-[calc(100vh-150px)] lg:sticky lg:top-4 shadow-2xl backdrop-blur-md overflow-hidden mt-6 lg:mt-0">
      
      <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-black/20">
        <h3 className="font-bold text-slate-300 flex items-center gap-2 text-sm uppercase tracking-wider">
          <Activity size={16} className="text-cyan-400" /> Swarm Intelligence
        </h3>
        <div className="flex gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></div>
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse delay-100"></div>
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse delay-200"></div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent font-mono text-xs">
        {logs.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-3">
              <Filter size={40} className="opacity-20"/>
              <p className="text-center max-w-[200px]">Initializing Market Scanners... Waiting for entry signals.</p>
            </div>
        )}
        {logs.map((log) => (
          <LogItem key={log.id} log={log} />
        ))}
        <div ref={logsEndRef} />
      </div>
      
      <div className="p-3 bg-black/40 border-t border-slate-800 text-[10px] text-slate-500 flex justify-between">
          <span>Server Time: {new Date().toLocaleTimeString()}</span>
          <span className="text-emerald-500">● System Operational</span>
      </div>
    </div>
  );
};