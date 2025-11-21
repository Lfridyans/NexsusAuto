
import React from 'react';
import { Cpu, Search, Activity, Zap, TrendingUp, Wallet, Layers, Gauge, Ban } from 'lucide-react';
import { Bot } from '../types';

interface BotCardProps {
  bot: Bot;
  onClick: (bot: Bot) => void;
}

export const BotCard: React.FC<BotCardProps> = ({ bot, onClick }) => {
  const totalTrades = bot.winCount + bot.lossCount;
  const winPercentage = totalTrades > 0 ? (bot.winCount / totalTrades) * 100 : 0;
  const lossPercentage = totalTrades > 0 ? (bot.lossCount / totalTrades) * 100 : 0;
  const winRate = totalTrades > 0 ? ((bot.winCount / totalTrades) * 100).toFixed(1) : '-';
  const lossRate = totalTrades > 0 ? ((bot.lossCount / totalTrades) * 100).toFixed(1) : '-';
  const activePositionsCount = bot.positions.length;

  // Dynamic styling based on activity and leverage heat
  let borderColor = 'border-slate-700 hover:border-blue-500/50';
  let shadowColor = '';
  
  if (activePositionsCount > 0) {
    borderColor = 'border-indigo-500/50';
    shadowColor = 'shadow-[0_0_20px_rgba(99,102,241,0.15)]';
  }
  
  if (bot.leverage >= 50) {
     shadowColor = 'hover:shadow-[0_0_20px_rgba(244,63,94,0.2)]';
  }

  return (
    <div 
      onClick={() => onClick(bot)}
      className={`
        relative p-4 rounded-xl border transition-all duration-300 cursor-pointer 
        hover:scale-[1.02] hover:shadow-lg group bg-gradient-to-br from-slate-800 to-slate-900
        ${borderColor} ${shadowColor} flex flex-col h-full
      `}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-bold text-slate-100 flex items-center gap-2 text-lg">
            <Cpu size={18} className={activePositionsCount === 0 ? "text-slate-500" : "text-cyan-400 animate-pulse"} />
            {bot.name}
          </h3>
          <div className="flex flex-col gap-1 mt-1">
             <div className="flex items-center gap-2">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 border border-slate-600">
                  {bot.targetSector}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded border flex items-center gap-1 font-bold ${bot.leverage >= 50 ? 'bg-rose-900/30 text-rose-400 border-rose-500/30' : 'bg-slate-700 text-slate-300 border-slate-600'}`}>
                   <Gauge size={10} /> {bot.leverage}x
                </span>
             </div>
             <span className="text-[10px] text-indigo-400 font-bold tracking-wide uppercase">{bot.strategy}</span>
          </div>
        </div>
        
        <div className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-inner bg-slate-800 border border-slate-700`}>
            <Wallet size={12} className="text-amber-400"/>
            <span className="text-slate-200">${bot.balance.toFixed(2)}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-black/20 p-2.5 rounded-lg border border-slate-700/30">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Net Profit</p>
          <p className={`text-xl font-mono font-bold ${bot.totalProfit - bot.totalLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {(bot.totalProfit - bot.totalLoss) >= 0 ? '+' : '-'}${Math.abs(bot.totalProfit - bot.totalLoss).toFixed(2)}
          </p>
        </div>
        <div className="bg-black/20 p-2.5 rounded-lg border border-slate-700/30 flex flex-col justify-between">
          <div className="flex justify-between items-center border-b border-slate-700/50 pb-1 mb-1">
             <span className="text-[10px] text-slate-500 uppercase font-bold">Win Rate</span>
             <span className="text-xs font-mono font-bold text-emerald-400">{winRate}%</span>
          </div>
          <div className="flex justify-between items-center">
             <span className="text-[10px] text-slate-500 uppercase font-bold">Loss Rate</span>
             <span className="text-xs font-mono font-bold text-rose-400">{lossRate}%</span>
          </div>
        </div>
      </div>

      {/* Win / Loss Distribution Chart (Stacked Bar) */}
      <div className="mb-3 px-1 mt-2">
          <div className="flex justify-between items-end mb-1.5">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Win / Loss Ratio</span>
              <span className="text-[9px] text-slate-400 font-mono font-bold">{totalTrades} Total Trades</span>
          </div>
          
          <div className="w-full h-4 bg-slate-800 rounded-sm overflow-hidden flex relative">
              {totalTrades === 0 ? (
                  <div className="w-full h-full bg-slate-800/50 flex items-center justify-center text-[9px] text-slate-600 italic">
                      No Data
                  </div>
              ) : (
                  <>
                      {/* WIN SEGMENT */}
                      <div 
                        style={{ width: `${winPercentage}%` }} 
                        className="h-full bg-emerald-500 hover:bg-emerald-400 transition-colors flex items-center justify-center relative group/segment"
                      >
                          {winPercentage > 15 && <span className="text-[8px] font-bold text-emerald-950">{Math.round(winPercentage)}%</span>}
                      </div>
                      
                      {/* LOSS SEGMENT */}
                      <div 
                        style={{ width: `${lossPercentage}%` }} 
                        className="h-full bg-rose-500 hover:bg-rose-400 transition-colors flex items-center justify-center relative group/segment"
                      >
                          {lossPercentage > 15 && <span className="text-[8px] font-bold text-rose-950">{Math.round(lossPercentage)}%</span>}
                      </div>
                  </>
              )}
          </div>
          
          {totalTrades > 0 && (
              <div className="flex justify-between mt-1 text-[9px] font-mono">
                  <span className="text-emerald-400">{bot.winCount} Wins</span>
                  <span className="text-rose-400">{bot.lossCount} Losses</span>
              </div>
          )}
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center text-xs text-slate-500 border-t border-slate-700/50 pt-3 mt-auto">
        <div className="flex items-center gap-2">
            {activePositionsCount > 0 ? (
               <span className="text-indigo-400 flex items-center gap-1 font-bold animate-pulse">
                 <Layers size={10} /> {activePositionsCount} Open
               </span>
            ) : (
               <span className="flex items-center gap-1.5 truncate">
                <Search size={10}/> Scanning
               </span>
            )}
        </div>
        <span className="text-cyan-400/60 group-hover:text-cyan-400 transition-colors flex items-center gap-1">
          Details <TrendingUp size={10}/>
        </span>
      </div>
    </div>
  );
}
