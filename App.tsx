
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Zap, Pause, Play, Cpu, Wallet, AlertTriangle, Database, RefreshCw, Wifi, WifiOff, Layers, TrendingUp, ArrowUpRight, ArrowDownRight, Trophy, Medal, BarChart3, Clock, Target, Radio, Newspaper, Star, Copy, BrainCircuit, Info, Microscope, X, ShieldCheck } from 'lucide-react';
import { Bot, LogEntry, Position, NewsItem } from './types';
import { BOT_CONFIGS, CRYPTO_UNIVERSE, AI_REASONS, MARKET_NEWS, GLOBAL_NEWS_FEED } from './constants';
import { BotCard } from './components/BotCard';
import { BotDetailModal } from './components/BotDetailModal';
import { LogPanel } from './components/LogPanel';

const INITIAL_CAPITAL = 100;
// Changed from 3 to 1 to ensure only the single best pair is traded at a time
const MAX_POSITIONS = 1;

// Default Global Configs (Overridden per bot in logic)
const DEFAULT_TARGET_ROI = 40; 
const DEFAULT_STOP_ROI = -20; 
const LIQ_ROI = -90;   

// Initialize bots
const initialBots: Bot[] = BOT_CONFIGS.map((s, i) => ({
  id: i,
  name: s.name,
  activePair: "SCANNING",
  targetSector: s.targetSector,
  strategy: s.strategy,
  risk: s.risk,
  desc: s.desc,
  personality: s.personality,
  technique: s.technique,
  preferredTimeframe: s.preferredTimeframe,
  activeTimeframe: s.preferredTimeframe,
  leverage: s.leverage,
  model: s.model,
  balance: INITIAL_CAPITAL,
  positions: [],
  status: 'HUNTING',
  totalProfit: 0,
  totalLoss: 0,
  winCount: 0,
  lossCount: 0,
  lastAction: null,
  activeReason: "",
  activeNews: "",
}));

// --- TECHNICAL ANALYSIS HELPERS ---
const calculateRSI = (closes: number[], period: number = 14) => {
  if (closes.length < period + 1) return 50;
  let gains = 0;
  let losses = 0;

  // Calculate initial average
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= Math.abs(diff);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  // Smooth subsequent values
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const currentGain = diff > 0 ? diff : 0;
    const currentLoss = diff < 0 ? Math.abs(diff) : 0;

    avgGain = ((avgGain * (period - 1)) + currentGain) / period;
    avgLoss = ((avgLoss * (period - 1)) + currentLoss) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
};

const calculateEMA = (closes: number[], period: number = 20) => {
  if (closes.length < period) return closes[closes.length - 1];
  const k = 2 / (period + 1);
  let ema = closes[0];
  for (let i = 1; i < closes.length; i++) {
    ema = (closes[i] * k) + (ema * (1 - k));
  }
  return ema;
};

const calculateBollingerBands = (closes: number[], period: number = 20, multiplier: number = 2) => {
  if (closes.length < period) return { upper: closes[closes.length-1], middle: closes[closes.length-1], lower: closes[closes.length-1] };
  
  // Simple Moving Average
  const slice = closes.slice(-period);
  const sma = slice.reduce((a, b) => a + b, 0) / period;
  
  // Standard Deviation
  const variance = slice.reduce((a, b) => a + Math.pow(b - sma, 2), 0) / period;
  const stdDev = Math.sqrt(variance);

  return {
    upper: sma + (multiplier * stdDev),
    middle: sma,
    lower: sma - (multiplier * stdDev)
  };
};

// Average True Range (Volatility)
const calculateATR = (highs: number[], lows: number[], closes: number[], period: number = 14) => {
  if (highs.length < period) return 0;
  
  let trs = [];
  for(let i=1; i < highs.length; i++) {
      const hl = highs[i] - lows[i];
      const hc = Math.abs(highs[i] - closes[i-1]);
      const lc = Math.abs(lows[i] - closes[i-1]);
      trs.push(Math.max(hl, hc, lc));
  }

  // Simple SMA of TR for ATR approximation
  const slice = trs.slice(-period);
  return slice.reduce((a,b) => a+b, 0) / period;
};

// Helper to detect candle color
const isGreenCandle = (open: number, close: number) => close > open;

export default function App() {
  // --- STATE MANAGEMENT ---
  const [bots, setBots] = useState<Bot[]>(() => {
    try {
      const savedBots = localStorage.getItem('ai_swarm_bots');
      return savedBots ? JSON.parse(savedBots) : initialBots;
    } catch (e) { return initialBots; }
  });

  const [logs, setLogs] = useState<LogEntry[]>(() => {
    try {
      const savedLogs = localStorage.getItem('ai_swarm_logs');
      return savedLogs ? JSON.parse(savedLogs) : [];
    } catch (e) { return []; }
  });

  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [globalPnL, setGlobalPnL] = useState<number>(0);
  const [selectedBot, setSelectedBot] = useState<Bot | null>(null);
  const [activeNews, setActiveNews] = useState<NewsItem>(GLOBAL_NEWS_FEED[0]);
  
  // MARKET DATA STATE
  const [marketPrices, setMarketPrices] = useState<Record<string, number>>({});
  const [marketTrend, setMarketTrend] = useState<Record<string, 'UP' | 'DOWN'>>({});
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const prevPricesRef = useRef<Record<string, number>>({});
  
  // To prevent multiple simultaneous executions for the same bot
  const isProcessingRef = useRef<Record<number, boolean>>({});

  // Updated Timestamp format: "MMM DD, HH:mm:ss"
  const getTimestamp = () => new Date().toLocaleString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });

  // --- PERSISTENCE ---
  useEffect(() => { localStorage.setItem('ai_swarm_bots', JSON.stringify(bots)); }, [bots]);
  useEffect(() => { localStorage.setItem('ai_swarm_logs', JSON.stringify(logs)); }, [logs]);

  // --- NEWS TICKER ROTATION ---
  useEffect(() => {
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * GLOBAL_NEWS_FEED.length);
      setActiveNews(GLOBAL_NEWS_FEED[randomIndex]);
    }, 20000); 
    return () => clearInterval(interval);
  }, []);

  const addLog = useCallback((message: string, type: LogEntry['type'], amount?: number) => {
    const id = Math.random().toString(36).substring(2, 9);
    const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setLogs(prev => [...prev.slice(-49), { id, time, message, type, amount }]);
  }, []);

  const handleResetDatabase = () => {
    if(window.confirm("WARNING: This will wipe all trading history and reset capital to $100. Continue?")) {
      setIsRunning(false);
      localStorage.removeItem('ai_swarm_bots');
      localStorage.removeItem('ai_swarm_logs');
      setBots(initialBots);
      setLogs([]);
      window.location.reload();
    }
  };

  const handleManualClose = (botId: number, positionId: string) => {
    setBots(prevBots => prevBots.map(b => {
      if (b.id !== botId) return b;
      const pos = b.positions.find(p => p.id === positionId);
      if (!pos) return b;

      // Calculate PnL at close based on current price
      const currentPrice = marketPrices[pos.symbol] || pos.entryPrice;
      let pnlPercent = 0;
      if (pos.type === 'BUY') pnlPercent = ((currentPrice - pos.entryPrice) / pos.entryPrice);
      else pnlPercent = ((pos.entryPrice - currentPrice) / pos.entryPrice);

      const realizedPnL = pnlPercent * pos.size * pos.leverage;
      const newBalance = b.balance + pos.size + realizedPnL;

      addLog(`MANUAL INTERVENTION: Operator closed ${b.name}'s ${pos.symbol} position.`, 'INFO', parseFloat(realizedPnL.toFixed(2)));

      return {
        ...b,
        balance: newBalance,
        positions: b.positions.filter(p => p.id !== positionId),
        totalProfit: realizedPnL > 0 ? b.totalProfit + realizedPnL : b.totalProfit,
        totalLoss: realizedPnL < 0 ? b.totalLoss + Math.abs(realizedPnL) : b.totalLoss,
        winCount: realizedPnL > 0 ? b.winCount + 1 : b.winCount,
        lossCount: realizedPnL < 0 ? b.lossCount + 1 : b.lossCount,
        lastAction: realizedPnL > 0 ? 'WIN' : 'LOSS',
        activeReason: "Position closed manually by operator override."
      };
    }));
  };

  // --- REAL-TIME MARKET DATA FETCHING ---
  const fetchMarketPrices = async () => {
    const binanceEndpoints = [
      'https://data-api.binance.vision/api/v3/ticker/price', 
      'https://api.binance.com/api/v3/ticker/price',
      'https://api1.binance.com/api/v3/ticker/price'
    ];

    for (const endpoint of binanceEndpoints) {
      try {
        const response = await fetch(endpoint, { method: 'GET' });
        if (!response.ok) continue;
        
        const data = await response.json();
        const newPrices: Record<string, number> = {};
        const newTrends: Record<string, 'UP' | 'DOWN'> = {};

        if (Array.isArray(data)) {
          data.forEach((item: { symbol: string; price: string }) => {
            const symbol = item.symbol;
            const price = parseFloat(item.price);
            newPrices[symbol] = price;

            if (prevPricesRef.current[symbol]) {
              newTrends[symbol] = price > prevPricesRef.current[symbol] ? 'UP' : 'DOWN';
            }
          });

          prevPricesRef.current = newPrices;
          setMarketPrices(newPrices);
          setMarketTrend(newTrends);
          setIsOnline(true);
          return; 
        }
      } catch (error) { continue; }
    }
    
    try {
      const response = await fetch('https://api.coincap.io/v2/assets?limit=100');
      if (response.ok) {
        const json = await response.json();
        const newPrices: Record<string, number> = {};
        const newTrends: Record<string, 'UP' | 'DOWN'> = {};

        json.data.forEach((asset: any) => {
           const symbol = `${asset.symbol.toUpperCase()}USDT`;
           const price = parseFloat(asset.priceUsd);
           newPrices[symbol] = price;
           if (prevPricesRef.current[symbol]) newTrends[symbol] = price > prevPricesRef.current[symbol] ? 'UP' : 'DOWN';
        });
        prevPricesRef.current = newPrices;
        setMarketPrices(newPrices);
        setMarketTrend(newTrends);
        setIsOnline(true);
      }
    } catch (e) { console.warn("Fallback failed"); setIsOnline(false); }
  };

  useEffect(() => {
    fetchMarketPrices();
    const interval = setInterval(fetchMarketPrices, 3000);
    return () => clearInterval(interval);
  }, []);

  // --- SHADOW AGENT KAEL (SWARM OPTIMIZER) ---
  const runSwarmOptimization = useCallback(() => {
    // Kael runs in the background (Shadow Mode) approx every 30s
    if (Math.random() > 0.7) return; 

    // Analyze the agents
    const agentsWithTrades = bots.filter(b => (b.winCount + b.lossCount) > 3);
    if (agentsWithTrades.length === 0) return; // Need data to optimize

    // Find worst performing bot by Win Rate
    const worstBot = [...agentsWithTrades].sort((a, b) => {
       const wrA = a.winCount / (a.winCount + a.lossCount);
       const wrB = b.winCount / (b.winCount + b.lossCount);
       return wrA - wrB;
    })[0];
    
    if (worstBot) {
       const totalTrades = worstBot.winCount + worstBot.lossCount;
       const winRate = (worstBot.winCount / totalTrades) * 100;

       // Only intervene if Win Rate is poor (< 40%)
       if (winRate < 40) {
           const updates = [
              `DETECTED: ${worstBot.name} Win Rate Critical (${winRate.toFixed(1)}%). Injecting new volatility threshold.`,
              `OPTIMIZING: ${worstBot.name} logic outdated. Uploading Patch v4.0 to tighten Stop Loss variance.`,
              `RECALIBRATING: ${worstBot.name} failing to capture trend. Forcing MACD sensitivity adjustment.`,
              `INTERVENTION: ${worstBot.name} performance degrading. Shadow Protocol Kael rewriting entry triggers.`
           ];
           const randomUpdate = updates[Math.floor(Math.random() * updates.length)];
           
           addLog(`[SHADOW KAEL] ${randomUpdate}`, 'OPTIMIZATION');
       }
    }
  }, [bots, addLog]);


  // --- DEEP ANALYSIS & EXECUTION ---
  const analyzeAndExecuteTrade = async (botId: number) => {
    if (isProcessingRef.current[botId]) return;
    isProcessingRef.current[botId] = true;

    // Get current bot state
    const bot = bots.find(b => b.id === botId);
    if (!bot) { isProcessingRef.current[botId] = false; return; }
    
    if (bot.positions.length >= MAX_POSITIONS) {
         isProcessingRef.current[botId] = false;
         return;
    }

    // Select Candidates Pool
    let candidates: any[] = [];
    if (bot.name === "Goldy Roger") {
       candidates = CRYPTO_UNIVERSE.filter(c => c.symbol === 'PAXGUSDT');
    } else {
       candidates = bot.targetSector === 'ALL' ? CRYPTO_UNIVERSE : CRYPTO_UNIVERSE.filter(c => c.sector === bot.targetSector);
    }
    
    if (candidates.length === 0) candidates = CRYPTO_UNIVERSE;

    // Shuffle candidates to randomize scanning order
    candidates = candidates.sort(() => 0.5 - Math.random());

    // --- MULTI-ASSET SCANNING LOOP ---
    const MAX_ATTEMPTS = 4;
    let attempts = 0;
    let tradeExecuted = false;
    let finalReason = "";
    let finalSymbol = "SCANNING";

    const intervalMap: Record<string, string> = { '1': '1m', '5': '5m', '15': '15m', '60': '1h', '240': '4h', 'D': '1d', '1W': '1w' };
    const apiInterval = intervalMap[bot.preferredTimeframe] || '1h';

    while (attempts < MAX_ATTEMPTS && !tradeExecuted) {
      if (attempts >= candidates.length) break; 

      const candidate = candidates[attempts];
      const symbol = candidate.symbol;
      attempts++;
      finalSymbol = symbol; 

      try {
        // INCREASED LIMIT TO 200 to support EMA 200 calculation
        const endpoints = [
            `https://data-api.binance.vision/api/v3/klines?symbol=${symbol}&interval=${apiInterval}&limit=200`,
            `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${apiInterval}&limit=200`,
            `https://api1.binance.com/api/v3/klines?symbol=${symbol}&interval=${apiInterval}&limit=200`
        ];

        let data = null;
        for (const endpoint of endpoints) {
            try {
                const res = await fetch(endpoint);
                if (res.ok) {
                    data = await res.json();
                    break; 
                }
            } catch (e) { }
        }

        if (!data) continue; 
        
        // PARSE FULL OHLC DATA
        const opens = data.map((d: any) => parseFloat(d[1]));
        const highs = data.map((d: any) => parseFloat(d[2]));
        const lows = data.map((d: any) => parseFloat(d[3]));
        const closes = data.map((d: any) => parseFloat(d[4]));
        
        const currentPrice = closes[closes.length - 1];
        const openPrice = opens[opens.length - 1];
        const lastHigh = highs[highs.length - 1];
        const lastLow = lows[lows.length - 1];

        // Basic Indicators
        const rsi = calculateRSI(closes, 14);
        const ema20 = calculateEMA(closes, 20);
        const bb = calculateBollingerBands(closes, 20, 2);
        const atr = calculateATR(highs, lows, closes, 14);
        
        // Advanced Indicators (Agent Specific)
        const ema50 = calculateEMA(closes, 50);
        const ema200 = calculateEMA(closes, 200); // Requires limit=200
        const ema9 = calculateEMA(closes, 9);
        const ema21 = calculateEMA(closes, 21);

        // Decision Logic
        let decision: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
        let reason = "";
        let confidenceScore = 0; // 0 to 100

        // --- AGENT SPECIFIC LOGIC ---
        if (bot.name === "Chloe") {
          // CHLOE: WEEKLY SWING (Macro Structure)
          
          const trendBullish = ema9 > ema21;
          const structureBreakHigh = lastHigh > highs[highs.length-2]; // Higher High

          if (trendBullish && rsi > 50 && currentPrice > ema21) {
              if (isGreenCandle(openPrice, currentPrice) || structureBreakHigh) {
                  decision = 'BUY';
                  confidenceScore = 88;
                  reason = `WEEKLY CHART: Price $${currentPrice} > EMA 21 ($${ema21.toFixed(4)}). EMA 9/21 Golden Cross active. RSI ${rsi.toFixed(0)} Bullish.`;
              } else {
                   decision = 'HOLD';
                   confidenceScore = 60;
                   reason = `WEEKLY: Uptrend detected but current candle is red. Waiting for green closure to confirm continuation.`;
              }
          } 
          else if (!trendBullish && rsi < 50 && currentPrice < ema21) {
              if (!isGreenCandle(openPrice, currentPrice)) {
                  decision = 'SELL';
                  confidenceScore = 88;
                  reason = `WEEKLY CHART: Bearish Structure. Price $${currentPrice} rejected at EMA 21 ($${ema21.toFixed(4)}). RSI ${rsi.toFixed(0)} falling.`;
              } else {
                   decision = 'HOLD';
                   confidenceScore = 60;
                   reason = `WEEKLY: Downtrend active but current candle green (pullback). Waiting for rejection.`;
              }
          } else {
               let rsiDesc = "";
               if (rsi >= 70) rsiDesc = ` RSI ${rsi.toFixed(0)} Overbought (>70, Reversion Risk).`;
               else if (rsi <= 30) rsiDesc = ` RSI ${rsi.toFixed(0)} Oversold (<30, Bounce Risk).`;
               reason = `WEEKLY CONSOLIDATION: EMA 9/21 flat. Price ranging between $${lastLow} and $${lastHigh}.${rsiDesc} No clean break.`;
          }

        } else if (bot.name === "Sebastian") {
          // SEBASTIAN: DAILY MACRO (Golden Cross / Death Cross)
          
          const goldenCross = ema50 > ema200;
          
          if (goldenCross && currentPrice > ema50) {
              if (rsi < 70 && currentPrice > ema20) {
                   decision = 'BUY';
                   confidenceScore = 92;
                   reason = `DAILY CHART: Golden Cross (EMA 50 > 200). Price $${currentPrice} holding 50DMA support. Major trend BULLISH.`;
              } else {
                   reason = `DAILY: Bullish Trend (Golden Cross) but RSI ${rsi.toFixed(0)} overextended. Waiting for pullback to EMA 20.`;
              }
          } 
          else if (!goldenCross && currentPrice < ema50) {
              if (rsi > 30 && currentPrice < ema20) {
                   decision = 'SELL';
                   confidenceScore = 92;
                   reason = `DAILY CHART: Death Cross (EMA 50 < 200). Price $${currentPrice} rejected at 50DMA. Major trend BEARISH.`;
              } else {
                   reason = `DAILY: Bearish Trend but RSI ${rsi.toFixed(0)} oversold. Risk of mean reversion. Holding.`;
              }
          } else {
              let rsiDesc = "";
              if (rsi >= 70) rsiDesc = ` RSI ${rsi.toFixed(0)} Overbought (>70).`;
              else if (rsi <= 30) rsiDesc = ` RSI ${rsi.toFixed(0)} Oversold (<30).`;
              reason = `DAILY CHOP: Price interacting with EMA 200 ($${ema200.toFixed(4)}). Trend undefined.${rsiDesc}`;
          }

        } else if (bot.name === "Dr. Adrian") {
          // ADRIAN: 4H QUANT (Volatility Squeeze)
          
          const bbWidth = (bb.upper - bb.lower) / bb.middle;
          const isSqueeze = bbWidth < 0.05; // Low volatility
          
          if (isSqueeze) {
              if (currentPrice > bb.upper && rsi > 60) {
                   decision = 'BUY';
                   confidenceScore = 85;
                   reason = `4H VOLATILITY BREAKOUT: BB Squeeze ending. Price $${currentPrice} breaking Upper Band ($${bb.upper.toFixed(4)}). Expansion imminent.`;
              } else if (currentPrice < bb.lower && rsi < 40) {
                   decision = 'SELL';
                   confidenceScore = 85;
                   reason = `4H VOLATILITY BREAKDOWN: BB Squeeze ending. Price $${currentPrice} breaking Lower Band ($${bb.lower.toFixed(4)}). Dumping.`;
              } else {
                   reason = `4H SQUEEZE: Volatility low (${(bbWidth*100).toFixed(2)}%). Coiling for move. Direction unclear.`;
              }
          } else {
               if (currentPrice > ema20 && rsi > 55 && rsi < 75) {
                   decision = 'BUY';
                   confidenceScore = 70;
                   reason = `4H MOMENTUM: Price > Mid Band. RSI ${rsi.toFixed(0)} rising. targeting Upper Band ($${bb.upper.toFixed(4)}).`;
               } else if (currentPrice < ema20 && rsi < 45 && rsi > 25) {
                   decision = 'SELL';
                   confidenceScore = 70;
                   reason = `4H MOMENTUM: Price < Mid Band. RSI ${rsi.toFixed(0)} falling. targeting Lower Band ($${bb.lower.toFixed(4)}).`;
               } else {
                   let rsiStatus = "neutral";
                   if (rsi >= 70) rsiStatus = "Overbought (>70, Reversion Risk)";
                   else if (rsi <= 30) rsiStatus = "Oversold (<30, Bounce Risk)";
                   reason = `4H RANGE: Price inside bands. RSI ${rsi.toFixed(0)} is ${rsiStatus}. No clear momentum edge.`;
               }
          }
        } else if (bot.name === "Goldy Roger") {
           // GOLDY ROGER: DAILY GOLD SUPPLY/DEMAND
           
           const trendUp = currentPrice > ema50;
           const isGreen = isGreenCandle(openPrice, currentPrice);
           
           if (trendUp) {
               if (rsi < 65 && isGreen && currentPrice > ema20) {
                   decision = 'BUY';
                   confidenceScore = 90;
                   reason = `GOLD DAILY (XAUUSD): Institutional demand detected above EMA 50. Price $${currentPrice} clearing local supply. RSI ${rsi.toFixed(0)} allows room for expansion.`;
               } else if (rsi > 70) {
                   reason = `GOLD DAILY: Strong uptrend but RSI ${rsi.toFixed(0)} is OVERBOUGHT (>70). Institutional distribution likely. Awaiting pullback.`;
               } else {
                   reason = `GOLD DAILY: Price above EMA 50 but consolidating. Volume profile neutral.`;
               }
           } else {
               if (rsi > 35 && !isGreen && currentPrice < ema20) {
                   decision = 'SELL';
                   confidenceScore = 90;
                   reason = `GOLD DAILY (XAUUSD): Rejection from liquidity zone below EMA 50. Price $${currentPrice} breaking structure. RSI ${rsi.toFixed(0)} supports further downside.`;
               } else if (rsi < 30) {
                   reason = `GOLD DAILY: Bearish trend but RSI ${rsi.toFixed(0)} is OVERSOLD (<30). Commercial hedging expected here. Risk of bounce.`;
               } else {
                   reason = `GOLD DAILY: Price below EMA 50. Chop zone between demand and supply. No clear liquidity sweep.`;
               }
           }
        }

        // --- FUNDAMENTAL ANALYSIS INTEGRATION ---
        const relevantNews = activeNews.impactPair === symbol ? activeNews : null;
        if (relevantNews) {
            if (decision === 'BUY' && relevantNews.impactDirection === 'SELL') {
                decision = 'HOLD'; 
                reason = `SAFETY LOCK: Chart signals BUY but News is Bearish ("${relevantNews.headline}"). Protocol forbids entry.`;
                addLog(`${bot.name} blocked trade on ${symbol}: Fundamentally unsafe.`, 'INFO');
                confidenceScore = 0;
            } 
            else if (decision === 'SELL' && relevantNews.impactDirection === 'BUY') {
                decision = 'HOLD'; 
                reason = `SAFETY LOCK: Chart signals SELL but News is Bullish ("${relevantNews.headline}"). Protocol forbids entry.`;
                addLog(`${bot.name} blocked trade on ${symbol}: Fundamentally unsafe.`, 'INFO');
                confidenceScore = 0;
            } 
            else if (decision === relevantNews.impactDirection) {
              reason += ` [CONFIRMED by News: ${relevantNews.headline}]`;
              confidenceScore += 10; 
            }
        }

        const MIN_CONFIDENCE = 75; 
        if (decision !== 'HOLD' && confidenceScore < MIN_CONFIDENCE) {
            decision = 'HOLD';
            reason = `Signal detected but confidence (${confidenceScore}%) below threshold (75%). Awaiting stronger confirmation.`;
        }

        // --- PROFESSIONAL EXECUTION: DYNAMIC TP/SL (ATR BASED) ---
        if (decision !== 'HOLD' && bot.balance > 20) {
          tradeExecuted = true; 
          finalReason = `${reason}`;
          
          setBots(prevBots => prevBots.map(b => {
              if (b.id !== botId) return b;
              if (b.positions.length >= MAX_POSITIONS) return b;

              const leverage = b.leverage;
              const tradeMargin = Math.min(b.balance, 20 + Math.random() * 10);
              
              // RISK PROFILE CALCULATIONS
              let riskMultiplier = 1.5; // Base Stop Distance in ATR
              let rewardRatio = 2.0;    // Base Reward to Risk Ratio

              if (b.name === "Chloe") {
                  riskMultiplier = 1.5;  // Tighter stop for weekly since candles are huge
                  rewardRatio = 3.0;     // Hunting 1:3 Risk/Reward (Home Runs)
              } else if (b.name === "Sebastian") {
                  riskMultiplier = 2.0;  // Wide stop for Daily noise
                  rewardRatio = 2.0;     // Conservative 1:2
              } else if (b.name === "Dr. Adrian") {
                  riskMultiplier = 1.0;  // Tight Scalp Stop
                  rewardRatio = 1.5;     // Quick 1:1.5
              } else if (b.name === "Goldy Roger") {
                  riskMultiplier = 1.5;
                  rewardRatio = 2.0;
              }

              // Calculate Distance
              const stopDistance = atr * riskMultiplier;
              const targetDistance = stopDistance * rewardRatio;

              // Determine Price Levels
              let tpPrice = 0, slPrice = 0;
              if (decision === 'BUY') {
                  tpPrice = currentPrice + targetDistance;
                  slPrice = currentPrice - stopDistance;
              } else {
                  tpPrice = currentPrice - targetDistance;
                  slPrice = currentPrice + stopDistance;
              }

              // SAFETY: Ensure SL doesn't exceed liquidation approximation (approx 80% move / lev)
              const liqDistance = (currentPrice * 0.8) / leverage;
              if (stopDistance > liqDistance) {
                  // Clamp SL to be safe if ATR is too wild
                  const safeStopDistance = liqDistance * 0.9;
                  if (decision === 'BUY') slPrice = currentPrice - safeStopDistance;
                  else slPrice = currentPrice + safeStopDistance;
                  finalReason += ` [SL clamped for Safety]`;
              }

              const newPos: Position = {
                  id: Math.random().toString(36).substr(2, 9),
                  symbol: symbol,
                  type: decision,
                  entryPrice: currentPrice,
                  takeProfit: tpPrice,
                  stopLoss: slPrice,
                  size: tradeMargin,
                  leverage: leverage,
                  unrealizedPnL: 0,
                  openTime: getTimestamp(),
                  isTrailing: false
              };

              addLog(`${b.name} EXECUTING ${leverage}x ${decision} on ${symbol} @ ${currentPrice}. Targeting ${rewardRatio}:1 R:R based on ATR (${atr.toFixed(4)}).`, 'INFO');

              return {
                  ...b,
                  balance: b.balance - tradeMargin,
                  positions: [...b.positions, newPos],
                  activePair: symbol,
                  activeReason: finalReason,
                  status: `TRADING (${b.positions.length + 1})`
              };
          }));
          break; 
        } else {
          finalReason = `Analyzed ${symbol}: ${reason}`;
        }

      } catch (e) {
         // Skip
      }
    }

    if (!tradeExecuted) {
      setBots(prevBots => prevBots.map(b => b.id === botId ? { 
        ...b, 
        activeReason: `${finalReason}`, 
        activePair: finalSymbol 
      } : b));
    }
    
    isProcessingRef.current[botId] = false;
  };


  // --- TRADING ENGINE LOOP ---
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    
    if (isRunning) {
      interval = setInterval(() => {
        
        if (Math.random() > 0.9) {
           runSwarmOptimization();
        }

        setBots(currentBots => {
          return currentBots.map(bot => {
            if (Object.keys(marketPrices).length === 0) return bot;

            if (bot.positions.length < MAX_POSITIONS && Math.random() > 0.85) {
               analyzeAndExecuteTrade(bot.id);
            }

            let newBalance = bot.balance;
            const keptPositions: Position[] = [];
            let newTotalProfit = bot.totalProfit;
            let newTotalLoss = bot.totalLoss;
            let newWinCount = bot.winCount;
            let newLossCount = bot.lossCount;
            let newLastAction = bot.lastAction;

            bot.positions.forEach(pos => {
              const currentPrice = marketPrices[pos.symbol];
              if (!currentPrice) { keptPositions.push(pos); return; }

              // Calculate PnL
              let pnlPercent = 0;
              if (pos.type === 'BUY') pnlPercent = ((currentPrice - pos.entryPrice) / pos.entryPrice);
              else pnlPercent = ((pos.entryPrice - currentPrice) / pos.entryPrice);

              const unrealizedPnL = pnlPercent * pos.size * pos.leverage;
              const roiPercent = (unrealizedPnL / pos.size) * 100;

              // --- SMART TRAILING STOP LOGIC ---
              let updatedPos = { ...pos, unrealizedPnL };
              const trend = marketTrend[pos.symbol] || 'FLAT';
              
              if (!pos.isTrailing && roiPercent > 10) {
                  let activateTrailing = false;
                  let newSl = pos.stopLoss;

                  if (pos.type === 'BUY') {
                      if (trend === 'DOWN') {
                          activateTrailing = true;
                          // Lock in 3% ROI worth of profit
                          const profitLockPrice = pos.entryPrice * (1 + (0.03 / pos.leverage));
                          newSl = profitLockPrice;
                      }
                  } else {
                      if (trend === 'UP') {
                          activateTrailing = true;
                          const profitLockPrice = pos.entryPrice * (1 - (0.03 / pos.leverage));
                          newSl = profitLockPrice;
                      }
                  }

                  if (activateTrailing) {
                      updatedPos.isTrailing = true;
                      updatedPos.stopLoss = newSl;
                      addLog(`${bot.name} ACTIVATED SMART TRAILING on ${pos.symbol}. Locked SL @ ${newSl.toFixed(4)}`, 'INFO');
                  }
              }

              // Exit Logic
              let shouldClose = false;
              let isLiquidation = false;
              let exitReason = "";

              // Calculate dynamic liquidation point logic (approx)
              if (roiPercent <= LIQ_ROI) { shouldClose = true; isLiquidation = true; exitReason = "LIQUIDATION"; }
              // Check Prices directly against TP/SL
              else if (pos.type === 'BUY' && currentPrice >= pos.takeProfit) { shouldClose = true; exitReason = "TP HIT"; }
              else if (pos.type === 'BUY' && currentPrice <= pos.stopLoss) { shouldClose = true; exitReason = "SL HIT"; }
              else if (pos.type === 'SELL' && currentPrice <= pos.takeProfit) { shouldClose = true; exitReason = "TP HIT"; }
              else if (pos.type === 'SELL' && currentPrice >= pos.stopLoss) { shouldClose = true; exitReason = "SL HIT"; }

              if (shouldClose) {
                let profit = parseFloat(unrealizedPnL.toFixed(2));
                if (isLiquidation) {
                    profit = -pos.size;
                    newTotalLoss += pos.size;
                    newLossCount++;
                    newLastAction = 'LIQUIDATION';
                    addLog(`${bot.name} LIQUIDATED on ${pos.symbol} @ ${currentPrice}`, 'LIQUIDATION', profit);
                } else {
                    newBalance += (pos.size + profit);
                    if (profit > 0) {
                        newTotalProfit += profit;
                        newWinCount++;
                        newLastAction = 'WIN';
                        addLog(`${bot.name} ${exitReason} on ${pos.symbol} @ ${currentPrice}`, 'WIN', profit);
                    } else {
                        newTotalLoss += Math.abs(profit);
                        newLossCount++;
                        newLastAction = 'LOSS';
                        addLog(`${bot.name} ${exitReason} on ${pos.symbol} @ ${currentPrice}`, 'LOSS', profit);
                    }
                }
              } else {
                keptPositions.push(updatedPos);
              }
            });

            return {
              ...bot,
              balance: newBalance,
              positions: keptPositions,
              totalProfit: parseFloat(newTotalProfit.toFixed(2)),
              totalLoss: parseFloat(newTotalLoss.toFixed(2)),
              winCount: newWinCount,
              lossCount: newLossCount,
              lastAction: newLastAction,
              status: keptPositions.length > 0 ? `TRADING (${keptPositions.length})` : "HUNTING"
            };
          });
        });
      }, 1000);
    }
    
    return () => { if(interval) clearInterval(interval); };
  }, [isRunning, addLog, marketPrices, runSwarmOptimization, marketTrend]); 

  useEffect(() => {
    if (selectedBot) {
      const updatedBot = bots.find(b => b.id === selectedBot.id);
      if (updatedBot) setSelectedBot(updatedBot);
    }
  }, [bots, selectedBot]);

  useEffect(() => {
    const total = bots.reduce((acc, bot) => acc + (bot.totalProfit - bot.totalLoss), 0);
    setGlobalPnL(parseFloat(total.toFixed(2)));
  }, [bots]);

  const SectorBadge = ({ label }: { label: string }) => (
    <span className="text-[10px] bg-slate-800 px-2 py-1 rounded text-slate-500 border border-slate-700 whitespace-nowrap">
      {label}
    </span>
  );

  const allPositions = bots.flatMap(b => b.positions.map(p => ({ ...p, botName: b.name, botId: b.id })));

  // --- LEADERBOARD LOGIC ---
  const profitLeaderboard = [...bots].sort((a, b) => {
    const profitA = a.totalProfit - a.totalLoss;
    const profitB = b.totalProfit - b.totalLoss;
    return profitB - profitA;
  });

  const activityLeaderboard = [...bots].sort((a, b) => {
    const activityA = a.winCount + a.lossCount + a.positions.length;
    const activityB = b.winCount + b.lossCount + b.positions.length;
    return activityB - activityA;
  });

  const winLossLeaderboard = [...bots].sort((a, b) => b.winCount - a.winCount);

  // --- COPY TRADING RECOMMENDATION LOGIC ---
  let recommendedBot = bots[0];
  let recommendationLabel = "Safety Protocol";
  let recommendationColor = "text-slate-300";

  const totalSwarmTrades = bots.reduce((acc, b) => acc + b.winCount + b.lossCount, 0);
  const hasHistory = totalSwarmTrades > 0;

  if (hasHistory) {
    recommendedBot = [...bots].sort((a, b) => {
        const profitA = a.totalProfit - a.totalLoss;
        const profitB = b.totalProfit - b.totalLoss;
        
        const totalTradesA = a.winCount + a.lossCount;
        const totalTradesB = b.winCount + b.lossCount;
        
        const winRateA = totalTradesA > 0 ? (a.winCount / totalTradesA) * 100 : 0;
        const winRateB = totalTradesB > 0 ? (b.winCount / totalTradesB) * 100 : 0;

        const scoreA = (profitA * 0.6) + (winRateA * 0.2) + (totalTradesA * 0.2);
        const scoreB = (profitB * 0.6) + (winRateB * 0.2) + (totalTradesB * 0.2);

        return scoreB - scoreA;
    })[0];
    recommendationLabel = "Performance Leader";
    recommendationColor = "text-indigo-300";
  } else {
    const safeBot = bots.find(b => b.risk === "Low");
    if (safeBot) recommendedBot = safeBot;
    recommendationLabel = "Lowest Risk Profile";
    recommendationColor = "text-emerald-300";
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-3 md:p-8 selection:bg-cyan-500/30">
      {selectedBot && (
        <BotDetailModal 
          bot={selectedBot} 
          onClose={() => setSelectedBot(null)} 
          currentPrice={marketPrices[selectedBot.activePair]} 
        />
      )}
      
      {/* NEWS TICKER */}
      <div className="mb-6 w-full bg-gradient-to-r from-indigo-900/30 via-slate-900/30 to-indigo-900/30 border-y border-indigo-500/20 py-2 px-2 md:px-4 flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-6 overflow-hidden relative">
         <div className="flex items-center gap-2 text-amber-400 animate-pulse shrink-0">
             <Radio size={16} />
             <span className="text-xs font-bold tracking-widest uppercase whitespace-nowrap">Global Intelligence</span>
         </div>
         
         <div className="flex-1 flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4 w-full">
             <span className="text-[10px] md:text-xs font-mono text-indigo-300 bg-indigo-950/50 px-2 py-0.5 rounded border border-indigo-500/30 shrink-0">
               {activeNews.headline}
             </span>
             <span className="text-[10px] md:text-xs text-slate-400 truncate w-full md:w-auto">
                {activeNews.summary}
             </span>
         </div>

         <div className="shrink-0 flex items-center gap-3 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-slate-800 pt-2 md:pt-0 mt-1 md:mt-0">
             <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-500">IMPACT:</span>
                <span className="font-mono text-xs font-bold text-slate-200">{activeNews.impactPair}</span>
             </div>
             <span className={`text-xs font-bold px-2 py-0.5 rounded ${activeNews.impactDirection === 'BUY' ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-500/30' : 'bg-rose-900/30 text-rose-400 border border-rose-500/30'}`}>
                {activeNews.impactDirection}
             </span>
         </div>
      </div>

      {/* WARNING BANNER */}
      <div className="bg-red-900/20 border-b border-red-500/20 p-2 mb-4 text-center text-[10px] md:text-xs text-red-400 font-mono tracking-widest uppercase flex items-center justify-center gap-2">
        <AlertTriangle size={14} /> <span className="hidden md:inline">LIVE EXECUTION ENVIRONMENT -</span> REAL CAPITAL DEPLOYED <AlertTriangle size={14} />
      </div>

      {/* HEADER SECTION */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-6">
        <div className="w-full xl:w-auto">
          <h1 className="text-2xl md:text-4xl font-black text-white flex items-center gap-3 tracking-tight">
            <BrainCircuit className="text-cyan-400 w-6 h-6 md:w-8 md:h-8 animate-pulse" />
            NEXUS // SWARM <span className="text-indigo-500 font-mono text-lg md:text-2xl">QUANTUM NET</span>
          </h1>
          <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-2">
             <p className="text-slate-400 flex items-center gap-2 text-xs md:text-sm w-full md:w-auto mb-2 md:mb-0">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                Autonomous Neural Execution Layer
             </p>
             <div className="flex gap-2">
                <div className={`text-[10px] md:text-xs flex items-center gap-1 bg-slate-900 px-2 py-1 rounded border ${isOnline ? 'border-emerald-500/50 text-emerald-400' : 'border-red-500/50 text-red-400'}`}>
                    {isOnline ? <Wifi size={10} /> : <WifiOff size={10} />}
                    <span>{isOnline ? "Data: LIVE" : "Data: DISCONNECTED"}</span>
                </div>
                <div className="text-[10px] md:text-xs text-slate-500 flex items-center gap-1 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                    <Database size={10} className="text-cyan-500"/>
                    <span>DB Connected</span>
                </div>
                <div className="text-[10px] md:text-xs text-slate-500 flex items-center gap-1 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                    <Microscope size={10} className="text-purple-500"/>
                    <span>Core: Gemini 3.0 Pro</span>
                </div>
             </div>
          </div>
        </div>

        {/* CONTROLS & GLOBAL STATS */}
        <div className="w-full xl:w-auto flex flex-col md:flex-row items-stretch md:items-center gap-4 bg-slate-900/80 p-4 md:p-5 rounded-2xl border border-slate-800 shadow-2xl backdrop-blur-sm">
          <div className="flex justify-between md:block md:text-right md:border-r border-slate-700 md:pr-6 md:mr-2">
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Realized Net PnL</p>
            <p className={`text-2xl md:text-3xl font-mono font-bold ${globalPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {globalPnL >= 0 ? '+' : '-'}${Math.abs(globalPnL).toLocaleString()}
            </p>
          </div>
          <div className="flex gap-2 flex-1 md:flex-none">
            <button
                onClick={() => setIsRunning(!isRunning)}
                className={`
                flex-1 flex items-center justify-center gap-2 px-4 md:px-6 py-3 rounded-xl font-bold transition-all shadow-lg hover:scale-105 active:scale-95 whitespace-nowrap
                ${isRunning 
                    ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/50' 
                    : 'bg-cyan-600 text-white hover:bg-cyan-500 shadow-cyan-600/30'}
                `}
            >
                {isRunning ? <><Pause size={18} fill="currentColor"/> HALT</> : <><Play size={18} fill="currentColor"/> EXECUTE</>}
            </button>
            <button 
                onClick={handleResetDatabase}
                className="px-4 text-[10px] text-slate-500 hover:text-rose-400 flex flex-col items-center justify-center gap-1 uppercase font-bold tracking-wider transition-colors border border-transparent hover:border-slate-800 rounded-xl"
            >
                <RefreshCw size={14} /> 
                <span className="hidden md:inline">Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* LEADERBOARD SECTION - 4 COLUMNS */}
      <div className="mb-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {/* Profit Leaderboard */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-800">
                <Trophy size={16} className="text-amber-400" />
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Top Profitability</h3>
            </div>
            <div className="space-y-2">
                {profitLeaderboard.map((bot, idx) => {
                    const pnl = bot.totalProfit - bot.totalLoss;
                    let rankColor = "text-slate-400";
                    let icon = null;
                    if (idx === 0) { rankColor = "text-amber-400"; icon = <Medal size={14} className="text-amber-400"/>; }
                    if (idx === 1) { rankColor = "text-slate-300"; icon = <Medal size={14} className="text-slate-300"/>; }
                    if (idx === 2) { rankColor = "text-orange-400"; icon = <Medal size={14} className="text-orange-400"/>; }

                    return (
                        <div key={bot.id} className="flex items-center justify-between bg-slate-800/30 p-2 rounded hover:bg-slate-800/50 transition-colors">
                            <div className="flex items-center gap-3">
                                <span className={`font-mono font-bold w-4 text-right ${rankColor}`}>{idx + 1}</span>
                                {icon}
                                <span className="font-bold text-sm text-slate-300">{bot.name}</span>
                            </div>
                            <span className={`font-mono font-bold ${pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {pnl >= 0 ? '+' : '-'}${Math.abs(pnl).toFixed(2)}
                            </span>
                        </div>
                    );
                })}
            </div>
          </div>

          {/* Activity Leaderboard */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-800">
                <BarChart3 size={16} className="text-cyan-400" />
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Most Active Agents</h3>
            </div>
            <div className="space-y-2">
                {activityLeaderboard.map((bot, idx) => {
                    const count = bot.winCount + bot.lossCount + bot.positions.length;
                    let rankColor = "text-slate-400";
                    if (idx === 0) rankColor = "text-cyan-400";
                    
                    return (
                        <div key={bot.id} className="flex items-center justify-between bg-slate-800/30 p-2 rounded hover:bg-slate-800/50 transition-colors">
                            <div className="flex items-center gap-3">
                                <span className={`font-mono font-bold w-4 text-right ${rankColor}`}>{idx + 1}</span>
                                <span className="font-bold text-sm text-slate-300">{bot.name}</span>
                            </div>
                            <div className="flex items-center gap-1 text-slate-400 text-xs">
                                <span className="font-mono font-bold text-white">{count}</span>
                                <span>Executions</span>
                            </div>
                        </div>
                    );
                })}
            </div>
          </div>

          {/* Win/Loss Leaderboard */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-800">
                <Target size={16} className="text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Win / Loss Record</h3>
            </div>
            <div className="space-y-2">
                {winLossLeaderboard.map((bot, idx) => {
                    let rankColor = "text-slate-400";
                    if (idx === 0) rankColor = "text-emerald-400";

                    return (
                        <div key={bot.id} className="flex items-center justify-between bg-slate-800/30 p-2 rounded hover:bg-slate-800/50 transition-colors">
                            <div className="flex items-center gap-3">
                                <span className={`font-mono font-bold w-4 text-right ${rankColor}`}>{idx + 1}</span>
                                <span className="font-bold text-sm text-slate-300">{bot.name}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs font-mono font-bold">
                                <span className="text-emerald-400 flex items-center gap-1">
                                    {bot.winCount} W
                                </span>
                                <span className="text-slate-600">|</span>
                                <span className="text-rose-400 flex items-center gap-1">
                                    {bot.lossCount} L
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
          </div>

          {/* Alpha Signal / Copy Trade Recommendation */}
          <div className="bg-gradient-to-br from-indigo-900/50 to-slate-900 border border-indigo-500/30 rounded-xl p-4 relative overflow-hidden group cursor-pointer hover:border-indigo-400/50 transition-all">
            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                <Zap size={80} />
            </div>
            
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-indigo-500/20 relative z-10">
                <Star size={16} className="text-indigo-400 fill-indigo-400 animate-pulse" />
                <h3 className="text-sm font-bold text-indigo-100 uppercase tracking-wider">Alpha Signal</h3>
            </div>

            <div className="relative z-10 space-y-3">
                 <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-mono">Recommended Agent</span>
                    <span className={`text-[10px] bg-indigo-500/20 px-2 py-0.5 rounded border border-indigo-500/30 font-bold ${recommendationColor}`}>
                        {recommendationLabel}
                    </span>
                 </div>
                 
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500 rounded-lg shadow-lg shadow-indigo-500/20">
                        <Cpu size={20} className="text-white"/>
                    </div>
                    <div>
                        <h4 className="font-bold text-lg text-white leading-none">{recommendedBot.name}</h4>
                        <span className="text-[10px] text-indigo-300">{recommendedBot.strategy}</span>
                    </div>
                 </div>

                 <div className="text-[9px] text-slate-500 flex items-center gap-1 bg-black/20 p-1.5 rounded border border-slate-800/50">
                    <Info size={10} />
                    <span>Ranking: Profit (60%) • WinRate (20%) • Vol (20%)</span>
                 </div>

                 <button 
                    onClick={() => setSelectedBot(recommendedBot)}
                    className="w-full mt-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-lg shadow-indigo-900/50"
                 >
                    <Copy size={12} /> COPY STRATEGY
                 </button>
            </div>
          </div>

      </div>

      {/* MAIN CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 flex flex-col gap-6">
           {/* BOTS GRID */}
           <div>
             <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
                <h3 className="text-slate-400 font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                   <Cpu size={16}/> Active Agents ({bots.length})
                </h3>
                <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 w-full sm:w-auto no-scrollbar">
                   <SectorBadge label="Major" />
                   <SectorBadge label="Meme" />
                   <SectorBadge label="AI" />
                   <SectorBadge label="L2" />
                   <SectorBadge label="Commodity" />
                </div>
             </div>
             {/* 2x2 GRID ON LARGE SCREENS */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {bots.map(bot => (
                  <BotCard key={bot.id} bot={bot} onClick={setSelectedBot} />
                ))}
             </div>
           </div>

           {/* GLOBAL POSITIONS TABLE */}
           <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-lg backdrop-blur-sm">
              <div className="p-3 bg-slate-800 border-b border-slate-700 flex items-center gap-2">
                  <Layers size={16} className="text-indigo-400"/>
                  <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Swarm Order Book</h3>
                  <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">{allPositions.length} Active</span>
              </div>
              
              {allPositions.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm italic flex flex-col items-center gap-2">
                   <TrendingUp size={24} className="opacity-20"/>
                   No active positions in the swarm. Waiting for market opportunities...
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-900 text-slate-500 uppercase font-bold tracking-wider border-b border-slate-700/50">
                        <th className="p-3 min-w-[120px]">Time</th>
                        <th className="p-3">Agent</th>
                        <th className="p-3">Symbol</th>
                        <th className="p-3">Side</th>
                        <th className="p-3 text-right">Entry</th>
                        <th className="p-3 text-right text-emerald-500/80">TP</th>
                        <th className="p-3 text-right text-rose-500/80">SL</th>
                        <th className="p-3 text-right">Size</th>
                        <th className="p-3 text-right">PnL (USDT)</th>
                        <th className="p-3 text-right min-w-[80px]">ROE %</th>
                        <th className="p-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {allPositions.map((pos, idx) => {
                        const roi = (pos.unrealizedPnL / pos.size) * 100;
                        return (
                          <tr key={idx} className="hover:bg-slate-800/30 transition-colors font-mono">
                            <td className="p-3 text-slate-500 whitespace-nowrap text-[10px] flex items-center gap-1">
                                <Clock size={10} className="opacity-50"/> {pos.openTime}
                            </td>
                            <td className="p-3 font-bold text-slate-300 whitespace-nowrap">{pos.botName}</td>
                            <td className="p-3 text-slate-400">{pos.symbol}</td>
                            <td className="p-3 whitespace-nowrap">
                               <span className={`px-1.5 py-0.5 rounded font-bold ${pos.type === 'BUY' ? 'bg-emerald-900/30 text-emerald-400' : 'bg-rose-900/30 text-rose-400'}`}>
                                 {pos.type} {pos.leverage}x
                               </span>
                            </td>
                            <td className="p-3 text-right text-slate-300">${pos.entryPrice.toLocaleString()}</td>
                            <td className="p-3 text-right text-emerald-400/80">${pos.takeProfit.toLocaleString(undefined, {maximumFractionDigits: 5})}</td>
                            
                            {/* TRAILING STOP HIGHLIGHTED CELL */}
                            <td className="p-3 text-right relative group/sl">
                                {pos.isTrailing && (
                                    <div className="absolute top-1 right-1 z-10">
                                        <ShieldCheck size={8} className="text-amber-400 animate-pulse" fill="currentColor" fillOpacity={0.3} />
                                    </div>
                                )}
                                <span className={`flex items-center justify-end gap-1 ${pos.isTrailing ? 'text-amber-400 font-bold' : 'text-rose-400/80'}`}>
                                    ${pos.stopLoss.toLocaleString(undefined, {maximumFractionDigits: 5})}
                                </span>
                                {pos.isTrailing && (
                                    <span className="text-[8px] text-amber-500/70 uppercase tracking-tighter block text-right leading-none">Trailing</span>
                                )}
                            </td>

                            <td className="p-3 text-right text-slate-400">${pos.size.toFixed(1)}</td>
                            <td className={`p-3 text-right font-bold ${pos.unrealizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {pos.unrealizedPnL >= 0 ? '+' : ''}{pos.unrealizedPnL.toFixed(2)}
                            </td>
                            <td className={`p-3 text-right flex items-center justify-end gap-1 ${roi >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {roi >= 0 ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>}
                              {roi.toFixed(2)}%
                            </td>
                            <td className="p-3 text-center">
                               <button 
                                 onClick={() => handleManualClose(pos.botId, pos.id)}
                                 className="p-1.5 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 rounded transition-colors group"
                                 title="Skip / Force Close"
                               >
                                 <X size={14} />
                               </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
           </div>

        </div>
        
        {/* LOGS SIDEBAR */}
        <div className="lg:col-span-1">
          <LogPanel logs={logs} />
        </div>
      </div>
    </div>
  );
}
