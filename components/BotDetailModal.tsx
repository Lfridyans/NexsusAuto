
import React, { useEffect, useRef } from 'react';
import { Cpu, Search, X, BrainCircuit, Terminal, Code2, Quote, Wallet, Clock, Gauge, AlertCircle, Target, ShieldAlert, LineChart } from 'lucide-react';
import { Bot } from '../types';
import { CRYPTO_UNIVERSE } from '../constants';
import { PredictionChart } from './PredictionChart';

// Declare global TradingView property
declare global {
  interface Window {
    TradingView: any;
  }
}

interface BotDetailModalProps {
  bot: Bot;
  onClose: () => void;
  currentPrice?: number;
}

export const BotDetailModal: React.FC<BotDetailModalProps> = ({ bot, onClose, currentPrice }) => {
  const displayPair = bot.activePair === "SCANNING" ? "BTCUSDT" : bot.activePair;
  const displayTimeframe = bot.activeTimeframe || "D";
  const containerId = useRef(`tv_chart_container_${Math.random().toString(36).substring(7)}`);

  const totalPnL = bot.totalProfit - bot.totalLoss;
  const formatTimeframe = (tf: string) => {
    if (tf === "D") return "Daily";
    if (tf === "240") return "4 Hour";
    if (tf === "1") return "1 Minute";
    return tf;
  }

  // Determine Prediction State and Targets
  let predictionDirection: 'BUY' | 'SELL' | 'IDLE' = 'IDLE';
  let targetPrice = 0;
  
  if (bot.positions.length > 0) {
      const activePos = bot.positions[bot.positions.length - 1];
      predictionDirection = activePos.type;
      targetPrice = activePos.takeProfit;
  }

  // Fallback for when no position is open but we want to show a hypothetical chart
  // Use currentPrice if available, otherwise 0
  const safeCurrentPrice = currentPrice || (bot.positions.length > 0 ? bot.positions[bot.positions.length-1].entryPrice : 0);

  // Find volatility
  const assetInfo = CRYPTO_UNIVERSE.find(c => c.symbol === displayPair);
  const volatility = assetInfo ? assetInfo.volatility : "Medium";

  // Initialize TradingView Widget
  useEffect(() => {
    const scriptId = 'tradingview-widget-loading-script';
    
    const initWidget = () => {
      if (window.TradingView) {
        new window.TradingView.widget({
          "autosize": true,
          "symbol": `BINANCE:${displayPair}`,
          "interval": displayTimeframe,
          "timezone": "Etc/UTC",
          "theme": "dark",
          "style": "1",
          "locale": "en",
          "enable_publishing": false,
          "hide_side_toolbar": false,
          "allow_symbol_change": true,
          "container_id": containerId.current,
          "studies": [
            "MASimple@tv-basicstudies", // Moving Average
            "RSI@tv-basicstudies"       // RSI
          ],
          "toolbar_bg": "#f1f3f6",
          "hide_top_toolbar": false,
          "save_image": false
        });
      }
    };

    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://s3.tradingview.com/tv.js';
      script.async = true;
      script.onload = initWidget;
      document.head.appendChild(script);
    } else {
      initWidget();
    }
  }, [displayPair, displayTimeframe]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-0 md:p-4 animate-fade-in">
      <div className="bg-slate-900 w-full max-w-6xl h-full md:h-[90vh] md:rounded-2xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800 shrink-0">
          <div className="flex items-center gap-3 md:gap-4">
             <div className={`p-2 md:p-3 rounded-full bg-slate-700`}>
               <Cpu size={20} className="text-cyan-400" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 md:gap-3">
                <h2 className="text-lg md:text-2xl font-bold text-white">{bot.name}</h2>
                <span className={`px-2 py-0.5 rounded text-xs md:text-sm font-mono border font-bold ${totalPnL >= 0 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border-rose-500/30'}`}>
                    Real PnL: {totalPnL >= 0 ? '+' : '-'}${Math.abs(totalPnL).toFixed(2)}
                </span>
                <span className="px-2 py-0.5 rounded text-xs md:text-sm font-mono border border-slate-600 bg-slate-800 text-slate-300 flex items-center gap-1">
                   <Gauge size={12}/> {bot.leverage}x
                </span>
              </div>
              <p className="text-xs md:text-sm text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                <span className="bg-slate-800 px-2 py-0.5 rounded text-[10px] md:text-xs border border-slate-700">{bot.targetSector} SECTOR</span>
                <span className="text-slate-600 hidden md:inline">•</span>
                <span className="font-bold text-indigo-400">{bot.strategy}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Modal Content Grid */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-3">
          
          {/* Left: Chart Area */}
          <div className="lg:col-span-2 bg-black border-r border-slate-800 flex flex-col relative group min-h-[350px] md:min-h-[500px]">
             {/* Chart Info Badge */}
             <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-slate-900/80 backdrop-blur border border-slate-700 px-2 py-1 md:px-3 md:py-1.5 rounded-lg shadow-lg pointer-events-none">
                <span className="text-amber-400 font-bold text-xs md:text-sm">BINANCE:{displayPair}</span>
                <span className="text-slate-600">|</span>
                <span className="text-cyan-400 text-[10px] md:text-xs flex items-center gap-1 font-mono">
                    <Clock size={12}/> {formatTimeframe(displayTimeframe)}
                </span>
                <span className="text-slate-600 hidden md:inline">|</span>
                <span className="hidden md:flex text-xs text-emerald-400 items-center gap-1 font-bold bg-emerald-900/20 px-2 py-0.5 rounded border border-emerald-500/30">
                    <LineChart size={12} /> MA + RSI
                </span>
             </div>

             {/* TradingView Container */}
             <div id={containerId.current} className="w-full h-full" />

             {bot.positions.length === 0 && bot.activePair === "SCANNING" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 pointer-events-none backdrop-blur-[1px] z-20">
                    <Search size={48} className="text-slate-500 animate-bounce mb-4"/>
                    <p className="text-slate-300 font-mono text-lg">Scanning {bot.targetSector} Live Data...</p>
                    <p className="text-slate-500 text-sm mt-2">Searching for high probability entry</p>
                </div>
             )}
          </div>

          {/* Right: Personality, Stats, & Analysis */}
          <div className="lg:col-span-1 p-4 md:p-6 space-y-6 bg-slate-900/50 flex flex-col">
            
            {/* Agent Identity Section */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                  <h4 className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-widest">
                    <Terminal size={14} /> Agent Identity
                  </h4>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-emerald-400 font-bold border border-emerald-500/30 bg-emerald-900/20 px-1.5 rounded mb-0.5">{bot.model}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{bot.id}0x{Math.random().toString(16).slice(2,6)}...</span>
                  </div>
              </div>
              
              <div className="relative p-4 bg-slate-800/50 rounded-lg border-l-4 border-indigo-500">
                <Quote size={20} className="absolute top-2 right-2 text-slate-700 transform rotate-12 opacity-50"/>
                <p className="text-sm text-slate-200 italic leading-relaxed font-serif">
                  "{bot.personality}"
                </p>
              </div>

              {/* NEW TECHNIQUE DISPLAY */}
              <div className="relative p-3 bg-cyan-950/20 rounded border border-cyan-800/30 mt-2">
                 <h5 className="text-[10px] font-bold text-cyan-500 uppercase mb-1 flex items-center gap-1.5">
                    <Code2 size={12} /> Active Trading Technique
                 </h5>
                 <p className="text-xs text-cyan-100 font-mono leading-relaxed">
                     {bot.technique}
                 </p>
              </div>
            </div>

            {/* PREDICTION CHART COMPONENT */}
            <PredictionChart 
               direction={predictionDirection} 
               volatility={volatility}
               symbol={displayPair}
               currentPrice={safeCurrentPrice}
               targetPrice={targetPrice}
               timeframe={displayTimeframe}
            />

            <div className="h-px bg-slate-800/80 my-2" />

            {/* Wallet & Positions */}
            <div>
               <div className="flex justify-between items-center mb-3">
                 <h4 className="text-sm uppercase text-slate-400 font-bold tracking-wider flex items-center gap-2">
                   <Wallet size={14}/> Live Capital & Exposure
                 </h4>
                 <span className="font-mono text-xl font-bold text-white">${bot.balance.toFixed(2)}</span>
               </div>
               
               {/* Risk Warning */}
               {bot.positions.length > 0 && (
                  <div className="mb-2 flex items-center gap-1.5 text-[10px] text-rose-400 bg-rose-900/20 px-2 py-1 rounded border border-rose-900/50">
                      <AlertCircle size={10} /> REAL CAPITAL AT RISK
                  </div>
               )}

               {/* Positions Table */}
               <div className="bg-slate-950 rounded-lg border border-slate-800 overflow-hidden">
                 <div className="grid grid-cols-6 gap-1 p-2 bg-slate-900/50 text-[9px] uppercase text-slate-500 font-bold border-b border-slate-800">
                    <span className="col-span-1">Pair/Side</span>
                    <span className="col-span-2 text-right">Entry</span>
                    <span className="col-span-1 text-right">Targets</span>
                    <span className="col-span-1 text-right">Margin</span>
                    <span className="col-span-1 text-right">PnL</span>
                 </div>
                 {bot.positions.length === 0 ? (
                   <div className="p-4 text-center text-xs text-slate-600 italic">No active exposures</div>
                 ) : (
                   <div className="max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
                     {bot.positions.map(pos => {
                       const roe = (pos.unrealizedPnL / pos.size) * 100;
                       return (
                         <div key={pos.id} className="grid grid-cols-6 gap-1 p-2 border-b border-slate-800/50 text-xs font-mono items-center hover:bg-white/5 transition-colors">
                            
                            {/* Pair & Side */}
                            <div className="col-span-1 flex flex-col gap-1">
                                <span className="font-bold text-slate-300 leading-none">{pos.symbol}</span>
                                <span className={`text-[8px] px-1 py-0.5 rounded w-fit ${pos.type === 'BUY' ? 'bg-emerald-900 text-emerald-400' : 'bg-rose-900 text-rose-400'}`}>
                                    {pos.type}
                                </span>
                            </div>

                            {/* Entry Price */}
                            <div className="col-span-2 text-right flex flex-col justify-center">
                                <span className="text-slate-300">${pos.entryPrice.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                                <span className="text-[8px] text-slate-500">{pos.leverage}x Lev</span>
                            </div>

                            {/* Targets (TP/SL) */}
                            <div className="col-span-1 flex flex-col items-end justify-center gap-0.5">
                                <span className="text-[9px] text-emerald-400 flex items-center gap-0.5">
                                    <Target size={8} /> {pos.takeProfit.toLocaleString(undefined, {maximumFractionDigits: 0})}
                                </span>
                                <span className="text-[9px] text-rose-400 flex items-center gap-0.5">
                                    <ShieldAlert size={8} /> {pos.stopLoss.toLocaleString(undefined, {maximumFractionDigits: 0})}
                                </span>
                            </div>

                            {/* Margin */}
                            <div className="col-span-1 text-right flex flex-col justify-center">
                                <span className="text-slate-400">${pos.size.toFixed(0)}</span>
                            </div>

                            {/* PnL & ROE */}
                            <div className="col-span-1 text-right flex flex-col justify-center">
                                <span className={`font-bold ${pos.unrealizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {pos.unrealizedPnL >= 0 ? '+' : ''}{pos.unrealizedPnL.toFixed(2)}
                                </span>
                                <span className={`text-[8px] ${roe >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {roe >= 0 ? '+' : ''}{roe.toFixed(1)}%
                                </span>
                            </div>

                         </div>
                       );
                     })}
                   </div>
                 )}
               </div>
            </div>

            {/* AI Analysis Text */}
            <div className="space-y-2 flex-1">
              <h4 className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-widest mt-2">
                <BrainCircuit size={14} /> Execution Logic
              </h4>
              <div className="p-4 bg-cyan-950/20 border border-cyan-800/30 rounded-lg text-sm text-cyan-100 italic leading-relaxed">
                "{bot.activeReason || "Scanning market structure for high probability execution..."}"
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
