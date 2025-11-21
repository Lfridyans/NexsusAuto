import React, { useEffect, useState, useRef } from 'react';
import { TrendingUp, TrendingDown, Activity, Clock } from 'lucide-react';

interface PredictionChartProps {
  direction: 'BUY' | 'SELL' | 'IDLE';
  volatility: "Low" | "Medium" | "High" | "Extreme";
  symbol: string;
  currentPrice: number;
  targetPrice: number;
  timeframe: string;
}

interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
}

export const PredictionChart: React.FC<PredictionChartProps> = ({ 
  direction, 
  volatility, 
  symbol, 
  currentPrice,
  targetPrice,
  timeframe 
}) => {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [etaText, setEtaText] = useState("");

  const chartWidth = 300;
  const chartHeight = 120;
  const candleCount = 18;
  const candleWidth = (chartWidth / candleCount) * 0.6;
  const gap = (chartWidth / candleCount) * 0.4;

  // Helper to parse timeframe to minutes
  const getTimeframeMinutes = (tf: string) => {
    if (tf === '1') return 1;
    if (tf === '5') return 5;
    if (tf === '15') return 15;
    if (tf === '60') return 60;
    if (tf === '240') return 240; // 4H
    if (tf === 'D') return 1440;
    return 60; // Default
  };

  useEffect(() => {
    if (currentPrice === 0) return;

    const generateProjectedCandles = () => {
      const newCandles: Candle[] = [];
      
      // Base Volatility
      let volMult = 0.001; // Default 0.1%
      if (volatility === 'Medium') volMult = 0.003;
      if (volatility === 'High') volMult = 0.008;
      if (volatility === 'Extreme') volMult = 0.015;

      // Determine target price if not set (hunting mode)
      const finalTarget = targetPrice > 0 
        ? targetPrice 
        : direction === 'BUY' 
            ? currentPrice * (1 + (volMult * 10)) 
            : direction === 'SELL' 
                ? currentPrice * (1 - (volMult * 10))
                : currentPrice;

      const priceDiff = finalTarget - currentPrice;
      const stepSize = priceDiff / candleCount;

      let lastClose = currentPrice;

      for (let i = 0; i < candleCount; i++) {
        // Trend Component
        let trend = stepSize; 
        
        // Random Noise Component (Random Walk)
        // Add randomness but bias towards the trend direction slightly
        const noise = (Math.random() - 0.5) * (currentPrice * volMult);
        
        // If we are IDLE, remove trend, just noise
        if (direction === 'IDLE') trend = 0;

        const close = lastClose + trend + noise;
        const open = lastClose;
        
        // Generate High/Low wicks
        const bodyMax = Math.max(open, close);
        const bodyMin = Math.min(open, close);
        const wickLen = Math.abs(currentPrice * volMult * Math.random());
        
        const high = bodyMax + (wickLen * 0.6);
        const low = bodyMin - (wickLen * 0.6);

        newCandles.push({ open, high, low, close });
        lastClose = close;
      }
      setCandles(newCandles);

      // Calculate ETA
      const minutesPerCandle = getTimeframeMinutes(timeframe);
      const totalMinutes = minutesPerCandle * candleCount;
      const hours = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      
      let timeString = "";
      if (hours > 0) timeString += `${hours}h `;
      if (mins > 0 || hours === 0) timeString += `${mins}m`;
      setEtaText(timeString);
    };

    generateProjectedCandles();
  }, [direction, volatility, currentPrice, targetPrice, timeframe]);

  // Find min/max for scaling
  let minPrice = Math.min(...candles.map(c => c.low), currentPrice);
  let maxPrice = Math.max(...candles.map(c => c.high), currentPrice);
  
  // Add padding
  const padding = (maxPrice - minPrice) * 0.1;
  minPrice -= padding;
  maxPrice += padding;
  const range = maxPrice - minPrice || 1;

  // Y Coordinate Helper
  const getY = (price: number) => {
    return chartHeight - ((price - minPrice) / range) * chartHeight;
  };

  const tfLabel = timeframe === '240' ? '4H' : timeframe === 'D' ? '1D' : `${timeframe}m`;

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 relative overflow-hidden">
      
      {/* Header */}
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider flex items-center gap-1">
            <Activity size={12} className={direction === 'IDLE' ? 'text-slate-500' : 'text-amber-400 animate-pulse'}/>
            AI Projection Model
          </span>
          <div className="flex items-center gap-2 mt-1">
             <span className="text-xs font-mono text-slate-300 font-bold">{symbol} Path</span>
             <span className="text-[10px] px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-400 font-mono">{tfLabel}</span>
          </div>
        </div>
        <div className={`text-right flex flex-col items-end`}>
          <div className={`text-lg font-mono font-bold flex items-center justify-end gap-1 ${direction === 'BUY' ? 'text-emerald-400' : direction === 'SELL' ? 'text-rose-400' : 'text-slate-400'}`}>
             {direction === 'BUY' ? <TrendingUp size={16}/> : direction === 'SELL' ? <TrendingDown size={16}/> : '-'}
             {targetPrice > 0 ? targetPrice.toFixed(2) : currentPrice.toFixed(2)}
          </div>
          <span className="text-[9px] uppercase opacity-70">Target Price</span>
        </div>
      </div>

      {/* Chart Area */}
      <div className="relative h-[120px] w-full bg-slate-900/30 rounded border border-slate-800/50">
        {candles.length === 0 ? (
             <div className="absolute inset-0 flex items-center justify-center text-slate-600 text-xs">
                Waiting for price data...
             </div>
        ) : (
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible">
          {/* Grid Lines */}
          <line x1="0" y1={chartHeight/2} x2={chartWidth} y2={chartHeight/2} stroke="#334155" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.5" />

          {/* Start Line (Current Price) */}
          <line x1="0" y1={getY(currentPrice)} x2={chartWidth} y2={getY(currentPrice)} stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" opacity="0.3" />
          <text x="5" y={getY(currentPrice) - 5} fill="#94a3b8" fontSize="8" opacity="0.7">NOW</text>

          {/* Candles */}
          {candles.map((candle, i) => {
            const x = i * (candleWidth + gap) + (gap / 2);
            const isGreen = candle.close >= candle.open;
            const color = isGreen ? '#10b981' : '#f43f5e'; // emerald-500 : rose-500
            
            const yOpen = getY(candle.open);
            const yClose = getY(candle.close);
            const yHigh = getY(candle.high);
            const yLow = getY(candle.low);

            const bodyHeight = Math.max(Math.abs(yClose - yOpen), 1); // Min 1px height
            const bodyY = Math.min(yOpen, yClose);

            return (
              <g key={i} className="animate-in fade-in duration-1000" style={{ animationDelay: `${i * 50}ms` }}>
                {/* Wick */}
                <line x1={x + candleWidth/2} y1={yHigh} x2={x + candleWidth/2} y2={yLow} stroke={color} strokeWidth="1" />
                {/* Body */}
                <rect x={x} y={bodyY} width={candleWidth} height={bodyHeight} fill={color} />
              </g>
            );
          })}

          {/* Endpoint Pulse */}
          <circle cx={chartWidth - (candleWidth/2)} cy={getY(candles[candles.length-1].close)} r="2" fill="white" className="animate-ping" opacity="0.5"/>
        </svg>
        )}
      </div>

      {/* Analysis Text Footer */}
      <div className="mt-2 flex justify-between items-center">
         <div className="flex items-center gap-2 text-[10px] font-mono bg-black/30 p-1.5 rounded text-slate-400 border border-slate-800/50 flex-1 mr-2">
            <span className={`w-1.5 h-1.5 rounded-full ${direction === 'BUY' ? 'bg-emerald-500' : direction === 'SELL' ? 'bg-rose-500' : 'bg-slate-500'}`}></span>
            <span className="truncate">{direction === 'BUY' ? "Bullish Continuation Pattern" : direction === 'SELL' ? "Bearish Reversal Structure" : "Awaiting Market Direction"}</span>
         </div>
         
         <div className="flex items-center gap-1.5 text-[10px] font-mono text-indigo-400 bg-indigo-950/20 px-2 py-1.5 rounded border border-indigo-500/20 whitespace-nowrap">
            <Clock size={10} />
            <span>ETA: {etaText}</span>
         </div>
      </div>
    </div>
  );
};