
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

// --- NEW TECHNICAL ANALYSIS HELPERS ---

// On-Balance Volume (OBV)
const calculateOBV = (closes: number[], volumes: number[]) => {
  if (closes.length !== volumes.length || closes.length < 2) return [];
  
  let obv = 0;
  const obvValues: number[] = [obv];
  
  for (let i = 1; i < closes.length; i++) {
    if (closes[i] > closes[i - 1]) {
      obv += volumes[i]; // Price up, add volume
    } else if (closes[i] < closes[i - 1]) {
      obv -= volumes[i]; // Price down, subtract volume
    }
    // If price unchanged, OBV unchanged
    obvValues.push(obv);
  }
  
  return obvValues;
};

// Calculate Fibonacci Retracement Levels
const calculateFibonacciLevels = (swingHigh: number, swingLow: number) => {
  const diff = swingHigh - swingLow;
  return {
    0.236: swingLow + diff * 0.236,
    0.382: swingLow + diff * 0.382,
    0.5: swingLow + diff * 0.5,
    0.618: swingLow + diff * 0.618,
    0.786: swingLow + diff * 0.786,
  };
};

// Calculate Fibonacci Extension Levels
const calculateFibonacciExtensions = (swingHigh: number, swingLow: number, retracement: number) => {
  const diff = swingHigh - swingLow;
  const fibDiff = swingHigh - retracement;
  return {
    1.272: swingHigh + fibDiff * 0.272,
    1.618: swingHigh + diff * 0.618,
    2.0: swingHigh + diff,
    2.618: swingHigh + diff * 1.618,
  };
};

// Detect Swing Highs and Lows
const detectSwingPoints = (highs: number[], lows: number[], period: number = 5) => {
  const swingHighs: Array<{index: number; price: number}> = [];
  const swingLows: Array<{index: number; price: number}> = [];
  
  for (let i = period; i < highs.length - period; i++) {
    // Check for swing high
    let isSwingHigh = true;
    for (let j = i - period; j <= i + period; j++) {
      if (j !== i && highs[j] >= highs[i]) {
        isSwingHigh = false;
        break;
      }
    }
    if (isSwingHigh) {
      swingHighs.push({ index: i, price: highs[i] });
    }
    
    // Check for swing low
    let isSwingLow = true;
    for (let j = i - period; j <= i + period; j++) {
      if (j !== i && lows[j] <= lows[i]) {
        isSwingLow = false;
        break;
      }
    }
    if (isSwingLow) {
      swingLows.push({ index: i, price: lows[i] });
    }
  }
  
  return { swingHighs, swingLows };
};

// Find Supply/Demand Zones
const findSupplyDemandZones = (
  highs: number[], 
  lows: number[], 
  closes: number[], 
  volumes: number[],
  lookback: number = 20
) => {
  const supplyZones: Array<{high: number; low: number; strength: number}> = [];
  const demandZones: Array<{high: number; low: number; strength: number}> = [];
  
  for (let i = 5; i < closes.length - 5; i++) {
    // Supply Zone: Area where price was rejected downward (bearish candles after high)
    if (highs[i] === Math.max(...highs.slice(Math.max(0, i-lookback), i+5))) {
      const zoneHigh = highs[i];
      const zoneLow = Math.min(...lows.slice(i, Math.min(closes.length, i+5)));
      const bearishCount = closes.slice(i, Math.min(closes.length, i+5))
        .filter((c, idx) => c < closes[i] || closes[i + idx] < opens[i + idx]).length;
      
      if (bearishCount > 2) {
        supplyZones.push({
          high: zoneHigh,
          low: zoneLow,
          strength: bearishCount
        });
      }
    }
    
    // Demand Zone: Area where price was rejected upward (bullish candles after low)
    if (lows[i] === Math.min(...lows.slice(Math.max(0, i-lookback), i+5))) {
      const zoneLow = lows[i];
      const zoneHigh = Math.max(...highs.slice(i, Math.min(closes.length, i+5)));
      const bullishCount = closes.slice(i, Math.min(closes.length, i+5))
        .filter((c, idx) => c > closes[i] || closes[i + idx] > opens[i + idx]).length;
      
      if (bullishCount > 2) {
        demandZones.push({
          high: zoneHigh,
          low: zoneLow,
          strength: bullishCount
        });
      }
    }
  }
  
  return { supplyZones, demandZones };
};

// Detect Candle Patterns
const detectCandlePatterns = (opens: number[], highs: number[], lows: number[], closes: number[]) => {
  if (opens.length < 2) return { patterns: [], isBullishEngulfing: false, isBearishEngulfing: false, isPinBar: false };
  
  const i = opens.length - 1;
  const prevI = i - 1;
  
  const currentBody = Math.abs(closes[i] - opens[i]);
  const prevBody = Math.abs(closes[prevI] - opens[prevI]);
  const upperWick = highs[i] - Math.max(closes[i], opens[i]);
  const lowerWick = Math.min(closes[i], opens[i]) - lows[i];
  
  // Bullish Engulfing
  const isBullishEngulfing = 
    closes[prevI] < opens[prevI] && // Previous red
    closes[i] > opens[i] && // Current green
    opens[i] < closes[prevI] && // Current open below prev close
    closes[i] > opens[prevI]; // Current close above prev open
  
  // Bearish Engulfing
  const isBearishEngulfing =
    closes[prevI] > opens[prevI] && // Previous green
    closes[i] < opens[i] && // Current red
    opens[i] > closes[prevI] && // Current open above prev close
    closes[i] < opens[prevI]; // Current close below prev open
  
  // Pin Bar (rejection wick > 2x body)
  const isPinBar = (upperWick > currentBody * 2) || (lowerWick > currentBody * 2);
  const isBullishPinBar = lowerWick > currentBody * 2 && closes[i] > opens[i];
  const isBearishPinBar = upperWick > currentBody * 2 && closes[i] < opens[i];
  
  return {
    isBullishEngulfing,
    isBearishEngulfing,
    isPinBar,
    isBullishPinBar,
    isBearishPinBar,
    upperWick,
    lowerWick,
    currentBody
  };
};

// Calculate Volume Profile (simplified)
const calculateVolumeProfile = (highs: number[], lows: number[], closes: number[], volumes: number[]) => {
  const typicalPrices = closes.map((close, i) => (highs[i] + lows[i] + close) / 3);
  const vwap = typicalPrices.reduce((sum, tp, i) => sum + tp * volumes[i], 0) / 
               volumes.reduce((sum, vol) => sum + vol, 0);
  return vwap;
};

// Check if price is near psychological level (round numbers)
const findNearestPsychologicalLevel = (price: number, decimals: number = 2): number | null => {
  const power = Math.pow(10, decimals);
  const rounded = Math.round(price / power) * power;
  const distance = Math.abs(price - rounded) / price;
  
  if (distance < 0.01) { // Within 1%
    return rounded;
  }
  return null;
};

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
    // PRIMARY: CoinGecko API (No CORS restrictions, most reliable)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=200&page=1&sparkline=false&price_change_percentage=1h', {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const json = await response.json();
        const newPrices: Record<string, number> = {};
        const newTrends: Record<string, 'UP' | 'DOWN'> = {};

        json.forEach((asset: any) => {
          // Map CoinGecko symbols to Binance symbols (USDT pairs)
          const symbol = `${asset.symbol.toUpperCase()}USDT`;
          const price = parseFloat(asset.current_price);
          if (!isNaN(price) && price > 0) {
            newPrices[symbol] = price;
            if (prevPricesRef.current[symbol]) {
              newTrends[symbol] = price > prevPricesRef.current[symbol] ? 'UP' : 'DOWN';
            }
          }
        });
        
        if (Object.keys(newPrices).length > 0) {
          prevPricesRef.current = newPrices;
          setMarketPrices(newPrices);
          setMarketTrend(newTrends);
          setIsOnline(true);
          return; // Success with CoinGecko
        }
      }
    } catch (e) {
      // CoinGecko failed, try Binance with proxy
      console.warn("CoinGecko API failed, trying Binance with proxy...");
    }
    
    // FALLBACK: Binance API with CORS proxy
    const corsProxy = 'https://api.allorigins.win/raw?url=';
    const binanceTicker = 'https://api.binance.com/api/v3/ticker/price';
    const binanceEndpoints: string[] = [];
    
    // Try CORS proxy first (works for GitHub Pages)
    binanceEndpoints.push(`${corsProxy}${encodeURIComponent(binanceTicker)}`);
    
    // Then try direct endpoints (might work in some networks)
    binanceEndpoints.push(
      'https://api.binance.com/api/v3/ticker/price',
      'https://api1.binance.com/api/v3/ticker/price'
    );

    // Try each endpoint with timeout
    for (const endpoint of binanceEndpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const response = await fetch(endpoint, { 
          method: 'GET',
          signal: controller.signal,
          headers: {
            'Accept': 'application/json'
          }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) continue;
        
        let data;
        try {
          data = await response.json();
        } catch (e) {
          // If response is not JSON, might be wrapped by proxy
          const text = await response.text();
          try {
            data = JSON.parse(text);
          } catch (e2) {
            continue;
          }
        }
        
        const newPrices: Record<string, number> = {};
        const newTrends: Record<string, 'UP' | 'DOWN'> = {};

        if (Array.isArray(data)) {
          data.forEach((item: { symbol: string; price: string }) => {
            const symbol = item.symbol;
            const price = parseFloat(item.price);
            if (!isNaN(price) && price > 0) {
              newPrices[symbol] = price;

              if (prevPricesRef.current[symbol]) {
                newTrends[symbol] = price > prevPricesRef.current[symbol] ? 'UP' : 'DOWN';
              }
            }
          });

          if (Object.keys(newPrices).length > 0) {
            prevPricesRef.current = newPrices;
            setMarketPrices(newPrices);
            setMarketTrend(newTrends);
            setIsOnline(true);
            return; 
          }
        }
      } catch (error) { 
        // Skip to next endpoint
        continue; 
      }
    }
    
    // If all Binance endpoints failed, set offline
    setIsOnline(false);
  };

  // --- REAL-TIME PRICE FROM WEBSOCKET (SYNC WITH TRADINGVIEW CHART) ---
  useEffect(() => {
    // Use Binance WebSocket Stream for real-time price (same source as TradingView chart)
    // This ensures price data matches exactly what's displayed on the chart
    const symbols = CRYPTO_UNIVERSE.map(c => c.symbol.toLowerCase()).slice(0, 100); // Top 100 pairs
    
    // Binance WebSocket requires subscription via stream endpoint
    // For multiple streams, use combine stream
    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    
    const connectWebSocket = () => {
      try {
        // Binance WebSocket: Subscribe to ticker streams for all symbols
        // Format: wss://stream.binance.com:9443/stream?streams=btcusdt@ticker/ethusdt@ticker/...
        const streams = symbols.map(s => `${s}@ticker`).join('/');
        const wsUrl = `wss://stream.binance.com:9443/stream?streams=${streams}`;
        
        ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
          setIsOnline(true);
          addLog('WebSocket connected: Real-time price sync with TradingView active', 'INFO');
        };
        
        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            
            // Binance stream format: { stream: "btcusdt@ticker", data: { s: "BTCUSDT", c: "50000", ... } }
            if (message.stream && message.stream.includes('@ticker') && message.data) {
              const ticker = message.data;
              if (ticker.s && ticker.c) {
                const symbol = ticker.s; // e.g., "BTCUSDT"
                const price = parseFloat(ticker.c); // Current price (real-time from Binance)
                
                if (!isNaN(price) && price > 0) {
                  setMarketPrices(prev => {
                    const newPrices = { ...prev, [symbol]: price };
                    
                    // Update price trends
                    if (prevPricesRef.current[symbol] !== undefined) {
                      const newTrend = price > prevPricesRef.current[symbol] ? 'UP' : 'DOWN';
                      setMarketTrend(prev => ({ ...prev, [symbol]: newTrend }));
                    }
                    
                    // Update reference
                    prevPricesRef.current[symbol] = price;
                    return newPrices;
                  });
                }
              }
            }
          } catch (e) {
            console.error('WebSocket message parse error:', e);
          }
        };
        
        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setIsOnline(false);
        };
        
        ws.onclose = () => {
          setIsOnline(false);
          // Auto-reconnect after 3 seconds
          reconnectTimeout = setTimeout(() => {
            if (!ws || ws.readyState === WebSocket.CLOSED) {
              connectWebSocket();
            }
          }, 3000);
        };
      } catch (e) {
        console.error('WebSocket connection error:', e);
        setIsOnline(false);
        // Fallback to API polling if WebSocket completely fails
        fetchMarketPrices();
        const fallbackInterval = setInterval(fetchMarketPrices, 5000);
        return () => clearInterval(fallbackInterval);
      }
    };
    
    // Initial connection
    connectWebSocket();
    
    // Also fetch initial prices via API for all symbols (one-time load)
    fetchMarketPrices();
    
    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
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
       // Scalper: Trade all crypto pairs (prioritize high volume pairs)
       candidates = CRYPTO_UNIVERSE.filter(c => c.volatility !== 'Low'); // Skip low volatility pairs
       if (candidates.length === 0) candidates = CRYPTO_UNIVERSE;
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
        // PRIMARY: Use CORS proxy for klines data (most reliable for GitHub Pages)
        const corsProxy = 'https://api.allorigins.win/raw?url=';
        const binanceBase = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${apiInterval}&limit=200`;
        const endpoints: string[] = [];
        
        // Primary: CORS proxy (works from GitHub Pages)
        endpoints.push(`${corsProxy}${encodeURIComponent(binanceBase)}`);
        
        // Fallback: Direct endpoints (might work in some networks, but usually blocked by CORS)
        endpoints.push(
          `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${apiInterval}&limit=200`,
          `https://api1.binance.com/api/v3/klines?symbol=${symbol}&interval=${apiInterval}&limit=200`
        );

        let data = null;
        for (const endpoint of endpoints) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout for klines
                
                const res = await fetch(endpoint, {
                  method: 'GET',
                  signal: controller.signal,
                  headers: {
                    'Accept': 'application/json'
                  }
                });
                
                clearTimeout(timeoutId);
                
                if (res.ok) {
                    let jsonData;
                    try {
                      jsonData = await res.json();
                    } catch (e) {
                      // If response is not JSON, might be wrapped by proxy
                      const text = await res.text();
                      try {
                        jsonData = JSON.parse(text);
                      } catch (e2) {
                        continue;
                      }
                    }
                    
                    if (Array.isArray(jsonData) && jsonData.length > 0) {
                      data = jsonData;
                      break; 
                    }
                }
            } catch (e) { 
              // Timeout or network error, try next endpoint
              continue; 
            }
        }

        if (!data) continue; 
        
        // PARSE FULL OHLC DATA
        const opens = data.map((d: any) => parseFloat(d[1]));
        const highs = data.map((d: any) => parseFloat(d[2]));
        const lows = data.map((d: any) => parseFloat(d[3]));
        const closes = data.map((d: any) => parseFloat(d[4]));
        const volumes = data.map((d: any) => parseFloat(d[5])); // Volume data
        
        const currentPrice = closes[closes.length - 1];
        const openPrice = opens[opens.length - 1];
        const lastHigh = highs[highs.length - 1];
        const lastLow = lows[lows.length - 1];
        
        // Volume Analysis
        const avgVolume = volumes.slice(-20).reduce((a, b) => a + b, 0) / Math.min(20, volumes.length);
        const currentVolume = volumes[volumes.length - 1];
        const volumeAboveAverage = currentVolume > avgVolume * 1.2; // 20% above average
        const volumeRatio = currentVolume / avgVolume;

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
          // CHLOE: WEEKLY SWING (Fibonacci Macro Expansion) - FIXED
          
          // Detect swing points for Fibonacci
          const { swingHighs, swingLows } = detectSwingPoints(highs, lows, 5);
          const lastSwingHigh = swingHighs.length > 0 ? swingHighs[swingHighs.length - 1].price : Math.max(...highs.slice(-50));
          const lastSwingLow = swingLows.length > 0 ? swingLows[swingLows.length - 1].price : Math.min(...lows.slice(-50));
          const swingRange = lastSwingHigh - lastSwingLow;
          
          // Calculate Fibonacci retracement levels
          const fibLevels = calculateFibonacciLevels(lastSwingHigh, lastSwingLow);
          const fibExtensions = calculateFibonacciExtensions(lastSwingHigh, lastSwingLow, currentPrice);
          
          // Improved EMA for weekly (use 10/30 for weekly instead of 9/21)
          const ema10 = calculateEMA(closes, 10);
          const ema30 = calculateEMA(closes, 30);
          const trendBullish = ema10 > ema30 && currentPrice > ema30;
          const trendBearish = ema10 < ema30 && currentPrice < ema30;
          
          // Market Structure Break (more robust)
          const structureBreakHigh = swingHighs.length >= 2 ? 
            currentPrice > swingHighs[swingHighs.length - 2].price : 
            currentPrice > highs[highs.length - 10];
          const structureBreakLow = swingLows.length >= 2 ? 
            currentPrice < swingLows[swingLows.length - 2].price : 
            currentPrice < lows[lows.length - 10];
          
          // Volume confirmation
          const volumeConfirmation = volumeAboveAverage && volumeRatio > 1.5;
          
          // Candle pattern detection
          const patterns = detectCandlePatterns(opens, highs, lows, closes);
          
          // Check if price is at Fibonacci retracement level (within 2%)
          const isAtFib618 = Math.abs(currentPrice - fibLevels[0.618]) / currentPrice < 0.02;
          const isAtFib382 = Math.abs(currentPrice - fibLevels[0.382]) / currentPrice < 0.02;
          const isAtFib786 = Math.abs(currentPrice - fibLevels[0.786]) / currentPrice < 0.02;
          const isAboveFib618 = currentPrice > fibLevels[0.618] && currentPrice < fibLevels[0.786];
          
          // BUY Signal: Fibonacci bounce + trend bullish + volume + structure break
          if (trendBullish && rsi > 45 && rsi < 65 && currentPrice > ema30) {
              if ((isAtFib382 || isAtFib618 || isAboveFib618) && (structureBreakHigh || volumeConfirmation)) {
                  if (patterns.isBullishEngulfing || patterns.isBullishPinBar || isGreenCandle(openPrice, currentPrice)) {
                      decision = 'BUY';
                      confidenceScore = 90 + (volumeConfirmation ? 5 : 0);
                      reason = `WEEKLY FIB BOUNCE: Price $${currentPrice} at Fib ${isAtFib382 ? '38.2%' : isAtFib618 ? '61.8%' : '61.8-78.6%'} ($${isAtFib382 ? fibLevels[0.382].toFixed(4) : fibLevels[0.618].toFixed(4)}). EMA 10/30 bullish. ${volumeConfirmation ? 'HIGH VOLUME confirmation' : 'Volume normal'}. ${patterns.isBullishEngulfing ? 'Bullish Engulfing' : patterns.isBullishPinBar ? 'Bullish Pin Bar' : 'Green candle'}. Target: Fib Ext 1.618 @ $${fibExtensions[1.618].toFixed(4)}.`;
                  } else {
                      decision = 'HOLD';
                      confidenceScore = 65;
                      reason = `WEEKLY FIB: At Fib level but waiting for bullish candle confirmation.`;
                  }
              } else {
                  decision = 'HOLD';
                  confidenceScore = 55;
                  reason = `WEEKLY: Uptrend but price not at Fibonacci level. Current: $${currentPrice.toFixed(4)}, Fib 61.8%: $${fibLevels[0.618].toFixed(4)}.`;
              }
          } 
          // SELL Signal: Fibonacci rejection + trend bearish + volume + structure break
          else if (trendBearish && rsi < 55 && rsi > 35 && currentPrice < ema30) {
              if (structureBreakLow && (patterns.isBearishEngulfing || patterns.isBearishPinBar || !isGreenCandle(openPrice, currentPrice))) {
                  decision = 'SELL';
                  confidenceScore = 90 + (volumeConfirmation ? 5 : 0);
                  reason = `WEEKLY FIB REJECTION: Price $${currentPrice} rejected at Fib level. EMA 10/30 bearish. ${volumeConfirmation ? 'HIGH VOLUME breakdown' : 'Volume normal'}. ${patterns.isBearishEngulfing ? 'Bearish Engulfing' : patterns.isBearishPinBar ? 'Bearish Pin Bar' : 'Red candle'}. Structure break detected.`;
              } else {
                  decision = 'HOLD';
                  confidenceScore = 55;
                  reason = `WEEKLY: Downtrend but waiting for structure break confirmation.`;
              }
          } else {
              let rsiDesc = "";
              if (rsi >= 70) rsiDesc = ` RSI ${rsi.toFixed(0)} Overbought (>70, Reversion Risk).`;
              else if (rsi <= 30) rsiDesc = ` RSI ${rsi.toFixed(0)} Oversold (<30, Bounce Risk).`;
              reason = `WEEKLY CONSOLIDATION: EMA 10/30 flat. Price ranging between Fib 38.2% ($${fibLevels[0.382].toFixed(4)}) and Fib 78.6% ($${fibLevels[0.786].toFixed(4)}).${rsiDesc} No clean break.`;
          }

        } else if (bot.name === "Sebastian") {
          // SEBASTIAN: DAILY MACRO (Golden Cross / Death Cross) - FIXED
          
          const goldenCross = ema50 > ema200;
          const deathCross = ema50 < ema200;
          
          // Retest Logic - Check if price has retested EMA 50
          const recentLows = lows.slice(-10);
          const recentHighs = highs.slice(-10);
          const hasRetestedEMA50 = goldenCross ? 
            recentLows.some(low => Math.abs(low - ema50) / ema50 < 0.015) : // Within 1.5% of EMA50
            recentHighs.some(high => Math.abs(high - ema50) / ema50 < 0.015);
          
          // Volume Confirmation
          const volumeConfirmation = volumeAboveAverage && volumeRatio > 1.3;
          
          // Volume-based indicators (OBV for trend confirmation)
          const obv = calculateOBV(closes, volumes);
          const obvTrend = obv.length >= 10 ? obv[obv.length - 1] > obv[obv.length - 10] : false;
          const obvBearish = obv.length >= 10 ? obv[obv.length - 1] < obv[obv.length - 10] : false;
          
          // Candle Patterns
          const patterns = detectCandlePatterns(opens, highs, lows, closes);
          
          // Multiple Timeframe Confirmation (check if price above/below multiple EMAs)
          const priceAboveMultipleEMAs = currentPrice > ema20 && currentPrice > ema50 && currentPrice > ema200;
          const priceBelowMultipleEMAs = currentPrice < ema20 && currentPrice < ema50 && currentPrice < ema200;
          
          // BUY Signal: Golden Cross + Retest + Volume + OBV + RSI Filter
          if (goldenCross && (currentPrice > ema50 || hasRetestedEMA50)) {
              if (rsi > 40 && rsi < 65 && (currentPrice > ema20 || hasRetestedEMA50)) {
                   if (volumeConfirmation && (obvTrend || priceAboveMultipleEMAs)) {
                       decision = 'BUY';
                       confidenceScore = 93 + (hasRetestedEMA50 ? 2 : 0) + (volumeConfirmation ? 3 : 0) + (patterns.isBullishEngulfing ? 2 : 0);
                       reason = `DAILY CHART: Golden Cross (EMA 50 > 200) confirmed. Price $${currentPrice} ${hasRetestedEMA50 ? 'RETESTED and holding 50DMA support' : 'above 50DMA'}. RSI ${rsi.toFixed(0)} healthy (40-65). ${volumeConfirmation ? 'HIGH VOLUME confirmation' : 'Volume normal'}. OBV ${obvTrend ? 'RISING' : 'flat'}. ${patterns.isBullishEngulfing ? 'Bullish Engulfing pattern' : patterns.isBullishPinBar ? 'Bullish Pin Bar' : 'Price structure bullish'}. Major trend BULLISH.`;
                   } else {
                       confidenceScore = 70;
                       reason = `DAILY: Bullish Trend (Golden Cross) but ${!volumeConfirmation ? 'waiting for volume confirmation' : !obvTrend ? 'OBV not confirming' : 'need stronger confirmation'}. ${hasRetestedEMA50 ? 'Retest complete' : 'Waiting for retest of EMA 50'}.`;
                   }
              } else {
                   confidenceScore = 60;
                   if (rsi >= 65) {
                       reason = `DAILY: Bullish Trend (Golden Cross) but RSI ${rsi.toFixed(0)} overextended (>65). Waiting for pullback to EMA 20 or retest of EMA 50.`;
                   } else if (rsi <= 40) {
                       reason = `DAILY: Bullish Trend but RSI ${rsi.toFixed(0)} too low (<40). Waiting for strength confirmation.`;
                   } else {
                       reason = `DAILY: Golden Cross active but price not yet above EMA 20. Waiting for confirmation.`;
                   }
              }
          } 
          // SELL Signal: Death Cross + Retest + Volume + OBV + RSI Filter
          else if (deathCross && (currentPrice < ema50 || hasRetestedEMA50)) {
              if (rsi < 60 && rsi > 35 && (currentPrice < ema20 || hasRetestedEMA50)) {
                   if (volumeConfirmation && (obvBearish || priceBelowMultipleEMAs)) {
                       decision = 'SELL';
                       confidenceScore = 93 + (hasRetestedEMA50 ? 2 : 0) + (volumeConfirmation ? 3 : 0) + (patterns.isBearishEngulfing ? 2 : 0);
                       reason = `DAILY CHART: Death Cross (EMA 50 < 200) confirmed. Price $${currentPrice} ${hasRetestedEMA50 ? 'RETESTED and rejected at 50DMA' : 'below 50DMA'}. RSI ${rsi.toFixed(0)} healthy (35-60). ${volumeConfirmation ? 'HIGH VOLUME confirmation' : 'Volume normal'}. OBV ${obvBearish ? 'FALLING' : 'flat'}. ${patterns.isBearishEngulfing ? 'Bearish Engulfing pattern' : patterns.isBearishPinBar ? 'Bearish Pin Bar' : 'Price structure bearish'}. Major trend BEARISH.`;
                   } else {
                       confidenceScore = 70;
                       reason = `DAILY: Bearish Trend (Death Cross) but ${!volumeConfirmation ? 'waiting for volume confirmation' : !obvBearish ? 'OBV not confirming' : 'need stronger confirmation'}. ${hasRetestedEMA50 ? 'Retest complete' : 'Waiting for retest of EMA 50'}.`;
                   }
              } else {
                   confidenceScore = 60;
                   if (rsi <= 35) {
                       reason = `DAILY: Bearish Trend but RSI ${rsi.toFixed(0)} oversold (<35). Risk of mean reversion. Holding.`;
                   } else if (rsi >= 60) {
                       reason = `DAILY: Bearish Trend but RSI ${rsi.toFixed(0)} too high (>60). Waiting for weakness confirmation.`;
                   } else {
                       reason = `DAILY: Death Cross active but price not yet below EMA 20. Waiting for confirmation.`;
                   }
              }
          } else {
              let rsiDesc = "";
              if (rsi >= 70) rsiDesc = ` RSI ${rsi.toFixed(0)} Overbought (>70).`;
              else if (rsi <= 30) rsiDesc = ` RSI ${rsi.toFixed(0)} Oversold (<30).`;
              confidenceScore = 45;
              reason = `DAILY CHOP: Price interacting with EMA 200 ($${ema200.toFixed(4)}). EMA 50/200 ${goldenCross ? 'bullish' : deathCross ? 'bearish' : 'neutral'}. Trend undefined.${rsiDesc} Waiting for cross confirmation.`;
          }

        } else if (bot.name === "Dr. Adrian") {
          // ADRIAN: 4H QUANT (Volatility Squeeze + OBV) - FIXED
          
          // On-Balance Volume (OBV) - REQUIRED IMPLEMENTATION
          const obv = calculateOBV(closes, volumes);
          const obvTrend = obv.length >= 5 ? obv[obv.length - 1] > obv[obv.length - 5] : false;
          const obvBearish = obv.length >= 5 ? obv[obv.length - 1] < obv[obv.length - 5] : false;
          const obvStrength = obv.length >= 2 ? Math.abs(obv[obv.length - 1] - obv[obv.length - 2]) / Math.abs(obv[obv.length - 2]) : 0;
          
          // Bollinger Bands with Adaptive Threshold
          const bbWidth = (bb.upper - bb.lower) / bb.middle;
          const historicalBBWidths: number[] = [];
          for (let i = 20; i < closes.length && i < 50; i++) {
            const histBB = calculateBollingerBands(closes.slice(0, i+1), 20, 2);
            const histWidth = (histBB.upper - histBB.lower) / histBB.middle;
            historicalBBWidths.push(histWidth);
          }
          const avgBBWidth = historicalBBWidths.length > 0 ? 
            historicalBBWidths.reduce((a, b) => a + b, 0) / historicalBBWidths.length : 0.05;
          const isSqueeze = bbWidth < avgBBWidth * 0.7; // 30% below average = squeeze
          
          // Volatility Filter (ATR-based)
          const atrPercent = (atr / currentPrice) * 100;
          const isVolatile = atrPercent > 1.5; // Minimum 1.5% ATR for 4H
          
          // Volume confirmation
          const volumeConfirmation = volumeAboveAverage && volumeRatio > 1.3;
          
          // OBV Confirmation
          const obvConfirmation = (obvTrend && volumeConfirmation) || (obvStrength > 0.1);
          
          if (isSqueeze && isVolatile) {
              // Volatility Squeeze Breakout with OBV confirmation
              if (currentPrice > bb.upper && rsi > 55 && rsi < 75 && obvConfirmation) {
                   decision = 'BUY';
                   confidenceScore = 88 + (volumeConfirmation ? 5 : 0);
                   reason = `4H VOLATILITY BREAKOUT: BB Squeeze ending (${(bbWidth*100).toFixed(2)}% < avg ${(avgBBWidth*100).toFixed(2)}%). Price $${currentPrice} breaking Upper Band ($${bb.upper.toFixed(4)}). OBV ${obvTrend ? 'RISING' : 'flat'}. ${volumeConfirmation ? 'HIGH VOLUME' : 'Normal volume'}. RSI ${rsi.toFixed(0)} healthy. Expansion imminent.`;
              } else if (currentPrice < bb.lower && rsi < 45 && rsi > 25 && obvBearish) {
                   decision = 'SELL';
                   confidenceScore = 88 + (volumeConfirmation ? 5 : 0);
                   reason = `4H VOLATILITY BREAKDOWN: BB Squeeze ending. Price $${currentPrice} breaking Lower Band ($${bb.lower.toFixed(4)}). OBV FALLING. ${volumeConfirmation ? 'HIGH VOLUME breakdown' : 'Normal volume'}. RSI ${rsi.toFixed(0)}. Dumping.`;
              } else {
                   confidenceScore = 60;
                   reason = `4H SQUEEZE: Volatility low (${(bbWidth*100).toFixed(2)}% < avg). ${!obvConfirmation ? 'OBV not confirming' : 'Waiting for breakout direction'}. ${!isVolatile ? 'Low volatility - skip' : 'Coiling for move'}.`;
              }
          } else if (isVolatile) {
               // Momentum Trading with OBV
               if (currentPrice > ema20 && rsi > 50 && rsi < 70 && obvTrend && volumeConfirmation) {
                   decision = 'BUY';
                   confidenceScore = 75 + (obvConfirmation ? 10 : 0);
                   reason = `4H MOMENTUM: Price > Mid Band (EMA 20). RSI ${rsi.toFixed(0)} healthy. OBV RISING (strength: ${(obvStrength*100).toFixed(1)}%). ${volumeConfirmation ? 'HIGH VOLUME confirmation' : 'Volume normal'}. Targeting Upper Band ($${bb.upper.toFixed(4)}).`;
               } else if (currentPrice < ema20 && rsi < 50 && rsi > 30 && obvBearish && volumeConfirmation) {
                   decision = 'SELL';
                   confidenceScore = 75 + (obvStrength > 0.1 ? 10 : 0);
                   reason = `4H MOMENTUM: Price < Mid Band. RSI ${rsi.toFixed(0)}. OBV FALLING. ${volumeConfirmation ? 'HIGH VOLUME breakdown' : 'Volume normal'}. Targeting Lower Band ($${bb.lower.toFixed(4)}).`;
               } else {
                   let rsiStatus = "neutral";
                   if (rsi >= 70) rsiStatus = "Overbought (>70, Reversion Risk)";
                   else if (rsi <= 30) rsiStatus = "Oversold (<30, Bounce Risk)";
                   reason = `4H RANGE: Price inside bands. RSI ${rsi.toFixed(0)} is ${rsiStatus}. ${!obvConfirmation ? 'OBV not confirming' : 'No clear momentum edge'}.`;
               }
          } else {
               confidenceScore = 40;
               reason = `4H LOW VOLATILITY: ATR ${atrPercent.toFixed(2)}% below threshold (1.5%). Skipping trade - insufficient volatility for 4H timeframe.`;
          }
        } else if (bot.name === "Goldy Roger") {
           // GOLDY ROGER: HIGH-FREQUENCY SCALPER (5-15m) - ALL CRYPTO PAIRS
           
           // Fast EMA Cross for Scalping (5/13 for quick signals)
           const ema5 = calculateEMA(closes, 5);
           const ema13 = calculateEMA(closes, 13);
           const ema9 = calculateEMA(closes, 9);
           const ema21 = calculateEMA(closes, 21);
           
           // Fast EMA Cross Signals
           const fastBullishCross = ema5 > ema13 && closes[closes.length - 2] <= ema13 && currentPrice > ema13;
           const fastBearishCross = ema5 < ema13 && closes[closes.length - 2] >= ema13 && currentPrice < ema13;
           const strongTrendUp = ema5 > ema13 && ema13 > ema21 && currentPrice > ema5;
           const strongTrendDown = ema5 < ema13 && ema13 < ema21 && currentPrice < ema5;
           
           // Volume Spike Detection (critical for scalping)
           const volumeSpike = volumeRatio > 1.8; // 80% above average = spike
           const strongVolume = volumeRatio > 1.5; // 50% above average
           
           // Volume Profile for quick reference
           const vwap = calculateVolumeProfile(highs, lows, closes, volumes);
           const priceAboveVWAP = currentPrice > vwap;
           
           // Bollinger Bands for volatility check
           const bbWidth = (bb.upper - bb.lower) / bb.middle;
           const isVolatile = bbWidth > 0.02; // 2% width minimum for scalping
           const nearUpperBand = currentPrice > bb.upper * 0.995 && currentPrice <= bb.upper * 1.005;
           const nearLowerBand = currentPrice < bb.lower * 1.005 && currentPrice >= bb.lower * 0.995;
           
           // Candle Patterns (quick detection)
           const patterns = detectCandlePatterns(opens, highs, lows, closes);
           
           // Price Momentum (quick moves)
           const priceChange = (currentPrice - closes[closes.length - 2]) / closes[closes.length - 2] * 100;
           const strongMomentum = Math.abs(priceChange) > 0.3; // 0.3% move = momentum
           
           // RSI for Scalping (momentum, not overbought/oversold)
           const rsiMomentum = rsi > 55 && rsi < 75; // Bullish momentum zone
           const rsiBearishMomentum = rsi < 45 && rsi > 25; // Bearish momentum zone
           const rsiOverbought = rsi > 75;
           const rsiOversold = rsi < 25;
           
           // ATR percent for volatility check
           const atrPercent = (atr / currentPrice) * 100;
           const sufficientVolatility = atrPercent > 0.5; // 0.5% ATR minimum for scalping
           
           // BUY Signal: Fast EMA Cross + Volume Spike + Momentum + RSI
           if (fastBullishCross || strongTrendUp) {
               if (rsiMomentum && !rsiOverbought && volumeSpike && sufficientVolatility) {
                   if (strongMomentum && (patterns.isBullishEngulfing || patterns.isBullishPinBar || isGreenCandle(openPrice, currentPrice))) {
                       decision = 'BUY';
                       confidenceScore = 88 + (volumeSpike ? 5 : 0) + (fastBullishCross ? 3 : 0) + (strongMomentum ? 2 : 0);
                       reason = `5-15M SCALP: ${fastBullishCross ? 'FAST EMA 5/13 CROSS' : 'Strong uptrend'}. Price $${currentPrice} above EMA 5 ($${ema5.toFixed(4)}). ${strongTrendUp ? 'EMA stack bullish (5>13>21)' : 'EMA 5>13 bullish'}. RSI ${rsi.toFixed(0)} momentum zone (55-75). ${volumeSpike ? 'HIGH VOLUME SPIKE (' + volumeRatio.toFixed(2) + 'x)' : 'Strong volume'}. ${strongMomentum ? `Momentum: ${priceChange > 0 ? '+' : ''}${priceChange.toFixed(2)}%` : ''}. ${patterns.isBullishEngulfing ? 'Bullish Engulfing' : patterns.isBullishPinBar ? 'Bullish Pin Bar' : 'Green candle'}. VWAP: $${vwap.toFixed(4)}. ATR: ${atrPercent.toFixed(2)}%. Quick scalp target.`;
                   } else {
                       confidenceScore = 70;
                       reason = `5-15M: ${fastBullishCross ? 'EMA cross' : 'Uptrend'} detected but waiting for ${!strongMomentum ? 'momentum confirmation' : !volumeSpike ? 'volume spike' : 'candle pattern'}.`;
                   }
               } else if (rsiOverbought) {
                   confidenceScore = 50;
                   reason = `5-15M: Bullish cross but RSI ${rsi.toFixed(0)} OVERBOUGHT (>75). Risk of reversal. Skip.`;
               } else {
                   confidenceScore = 60;
                   reason = `5-15M: ${fastBullishCross ? 'EMA cross' : 'Uptrend'} but ${!volumeSpike ? 'no volume spike' : !sufficientVolatility ? 'low volatility (ATR: ' + atrPercent.toFixed(2) + '%)' : 'RSI not in momentum zone'}. Waiting.`;
               }
           } 
           // SELL Signal: Fast EMA Cross + Volume Spike + Momentum + RSI
           else if (fastBearishCross || strongTrendDown) {
               if (rsiBearishMomentum && !rsiOversold && volumeSpike && sufficientVolatility) {
                   if (strongMomentum && (patterns.isBearishEngulfing || patterns.isBearishPinBar || !isGreenCandle(openPrice, currentPrice))) {
                       decision = 'SELL';
                       confidenceScore = 88 + (volumeSpike ? 5 : 0) + (fastBearishCross ? 3 : 0) + (strongMomentum ? 2 : 0);
                       reason = `5-15M SCALP: ${fastBearishCross ? 'FAST EMA 5/13 CROSS DOWN' : 'Strong downtrend'}. Price $${currentPrice} below EMA 5 ($${ema5.toFixed(4)}). ${strongTrendDown ? 'EMA stack bearish (5<13<21)' : 'EMA 5<13 bearish'}. RSI ${rsi.toFixed(0)} momentum zone (25-45). ${volumeSpike ? 'HIGH VOLUME SPIKE (' + volumeRatio.toFixed(2) + 'x)' : 'Strong volume'}. ${strongMomentum ? `Momentum: ${priceChange > 0 ? '+' : ''}${priceChange.toFixed(2)}%` : ''}. ${patterns.isBearishEngulfing ? 'Bearish Engulfing' : patterns.isBearishPinBar ? 'Bearish Pin Bar' : 'Red candle'}. VWAP: $${vwap.toFixed(4)}. ATR: ${atrPercent.toFixed(2)}%. Quick scalp target.`;
                   } else {
                       confidenceScore = 70;
                       reason = `5-15M: ${fastBearishCross ? 'EMA cross down' : 'Downtrend'} detected but waiting for ${!strongMomentum ? 'momentum confirmation' : !volumeSpike ? 'volume spike' : 'candle pattern'}.`;
                   }
               } else if (rsiOversold) {
                   confidenceScore = 50;
                   reason = `5-15M: Bearish cross but RSI ${rsi.toFixed(0)} OVERSOLD (<25). Risk of bounce. Skip.`;
               } else {
                   confidenceScore = 60;
                   reason = `5-15M: ${fastBearishCross ? 'EMA cross down' : 'Downtrend'} but ${!volumeSpike ? 'no volume spike' : !sufficientVolatility ? 'low volatility (ATR: ' + atrPercent.toFixed(2) + '%)' : 'RSI not in momentum zone'}. Waiting.`;
               }
           } 
           // Range Scalping: Bounce from Bollinger Bands with volume
           else if (isVolatile && (nearLowerBand || nearUpperBand)) {
               if (nearLowerBand && rsi > 30 && rsi < 50 && volumeSpike && isGreenCandle(openPrice, currentPrice)) {
                   decision = 'BUY';
                   confidenceScore = 80 + (volumeSpike ? 5 : 0);
                   reason = `5-15M RANGE SCALP: Price $${currentPrice} bouncing from Lower BB ($${bb.lower.toFixed(4)}). RSI ${rsi.toFixed(0)} recovering. ${volumeSpike ? 'HIGH VOLUME SPIKE' : 'Strong volume'}. Quick bounce scalp.`;
               } else if (nearUpperBand && rsi < 70 && rsi > 50 && volumeSpike && !isGreenCandle(openPrice, currentPrice)) {
                   decision = 'SELL';
                   confidenceScore = 80 + (volumeSpike ? 5 : 0);
                   reason = `5-15M RANGE SCALP: Price $${currentPrice} rejecting from Upper BB ($${bb.upper.toFixed(4)}). RSI ${rsi.toFixed(0)} weakening. ${volumeSpike ? 'HIGH VOLUME SPIKE' : 'Strong volume'}. Quick rejection scalp.`;
               } else {
                   confidenceScore = 50;
                   reason = `5-15M: Price at BB ${nearLowerBand ? 'lower' : 'upper'} band but ${!volumeSpike ? 'no volume spike' : 'waiting for confirmation'}.`;
               }
           } else {
               confidenceScore = 45;
               reason = `5-15M: No clear scalping signal. ${!isVolatile ? 'Low volatility (ATR: ' + atrPercent.toFixed(2) + '%)' : 'No EMA cross'}. ${!volumeSpike ? 'No volume spike' : 'Price consolidating'}. Waiting for momentum.`;
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
              
              // RISK-BASED POSITION SIZING (IMPROVED)
              // Calculate position size based on account risk % (2% per trade)
              const accountRiskPercent = 0.02; // 2% risk per trade
              const accountRiskAmount = b.balance * accountRiskPercent;
              
              // RISK PROFILE CALCULATIONS (OPTIMIZED & FIXED)
              let riskMultiplier = 1.5; // Base Stop Distance in ATR
              let rewardRatio = 2.0;    // Base Reward to Risk Ratio
              
              // Agent-specific risk parameters (OPTIMIZED for each timeframe)
              if (b.name === "Chloe") {
                  // Weekly timeframe: Candles can move 10-20%, need wider stops
                  // Professional R:R for weekly swing trading: 1:3 minimum
                  riskMultiplier = 2.5;  // Wider stop for weekly (2.5x ATR = ~5-10% stop)
                  rewardRatio = 3.5;     // Professional 1:3.5 Risk/Reward for weekly (Home Runs)
              } else if (b.name === "Sebastian") {
                  riskMultiplier = 1.5;  // Daily timeframe: Tighter stop with retest confirmation
                  rewardRatio = 2.5;     // Improved 1:2.5
              } else if (b.name === "Dr. Adrian") {
                  riskMultiplier = 1.5;  // 4H timeframe: Wider stop for 4H
                  rewardRatio = 2.0;     // Improved 1:2
              } else if (b.name === "Goldy Roger") {
                  riskMultiplier = 0.8;  // 5-15m scalping: Tight stop for quick exits
                  rewardRatio = 1.5;     // Quick 1:1.5 for scalping
              }
              
              // Calculate stop distance with agent-specific multiplier
              const finalStopDistance = atr * riskMultiplier;
              const targetDistance = finalStopDistance * rewardRatio;
              
              // For weekly timeframe (Chloe), ensure stops are proportional to price
              // Weekly ATR can be very large, so we cap it to reasonable % of price
              let adjustedStopDistance = finalStopDistance;
              let adjustedTargetDistance = targetDistance;
              
              if (b.name === "Chloe") {
                  // For weekly: Stop should be max 8% of price (weekly can move 10-20%)
                  const maxStopPercent = 0.08; // 8% max stop for weekly
                  const stopPercent = finalStopDistance / currentPrice;
                  
                  if (stopPercent > maxStopPercent) {
                      // Cap stop to 8% of price, then adjust target proportionally
                      adjustedStopDistance = currentPrice * maxStopPercent;
                      adjustedTargetDistance = adjustedStopDistance * rewardRatio;
                  } else if (stopPercent < 0.03) {
                      // Minimum 3% stop for weekly (weekly moves are large)
                      adjustedStopDistance = currentPrice * 0.03;
                      adjustedTargetDistance = adjustedStopDistance * rewardRatio;
                  }
              }
              
              // Calculate position size based on risk amount and stop distance
              // Position size = Risk Amount / (Stop Distance % * Leverage)
              const stopPercent = adjustedStopDistance / currentPrice;
              let tradeMargin = accountRiskAmount / stopPercent / leverage;
              
              // Cap position size (max 30% of balance per trade, min 5%)
              const maxPositionSize = b.balance * 0.30;
              const minPositionSize = Math.max(5, b.balance * 0.05);
              tradeMargin = Math.min(Math.max(tradeMargin, minPositionSize), maxPositionSize, b.balance - 5);
              
              // Confidence-based position sizing (higher confidence = larger position)
              const confidenceMultiplier = confidenceScore / 100; // 0.75 to 1.0
              tradeMargin = tradeMargin * confidenceMultiplier;
              
              // Round down to 1 decimal
              tradeMargin = Math.floor(tradeMargin * 10) / 10;

              // Determine Price Levels - CRITICAL FIX: Ensure correct direction for BUY and SELL
              let tpPrice = 0, slPrice = 0;
              if (decision === 'BUY') {
                  // BUY: TP above entry, SL below entry ✅
                  tpPrice = currentPrice + adjustedTargetDistance;
                  slPrice = currentPrice - adjustedStopDistance;
              } else if (decision === 'SELL') {
                  // SELL: TP BELOW entry, SL ABOVE entry ✅ (FIXED!)
                  tpPrice = currentPrice - adjustedTargetDistance;
                  slPrice = currentPrice + adjustedStopDistance;
              }
              
              // VALIDATION & ADJUSTMENT: Ensure TP and SL are reasonable (not too far, not too close)
              // Define min/max TP distance based on timeframe and volatility
              let minTPPercent = 0.02; // Minimum 2% for TP
              let maxTPPercent = 0.15; // Maximum 15% for TP
              
              // Adjust min/max based on agent timeframe
              if (b.name === "Chloe") {
                  // Weekly timeframe: Can move 10-20%, so TP can be further
                  minTPPercent = 0.05;  // Minimum 5% for weekly
                  maxTPPercent = 0.25;  // Maximum 25% for weekly (home runs)
              } else if (b.name === "Sebastian") {
                  // Daily timeframe: Moderate moves 5-10%
                  minTPPercent = 0.03;  // Minimum 3% for daily
                  maxTPPercent = 0.15;  // Maximum 15% for daily
              } else if (b.name === "Dr. Adrian") {
                  // 4H timeframe: Moderate moves 3-8%
                  minTPPercent = 0.02;  // Minimum 2% for 4H
                  maxTPPercent = 0.12;  // Maximum 12% for 4H
              } else if (b.name === "Goldy Roger") {
                  // 5-15m scalping: Quick moves 0.5-2%
                  minTPPercent = 0.005; // Minimum 0.5% for scalping
                  maxTPPercent = 0.05;  // Maximum 5% for scalping
              }
              
              // Adjust TP if too far or too close
              if (decision === 'BUY') {
                  const tpPercent = (tpPrice - currentPrice) / currentPrice;
                  
                  if (tpPrice <= currentPrice) {
                      // TP must be above entry
                      tpPrice = currentPrice * (1 + minTPPercent);
                  } else if (tpPercent < minTPPercent) {
                      // TP too close, adjust to minimum
                      tpPrice = currentPrice * (1 + minTPPercent);
                  } else if (tpPercent > maxTPPercent) {
                      // TP too far, cap to maximum
                      tpPrice = currentPrice * (1 + maxTPPercent);
                  }
                  
                  // Validate SL
                  if (slPrice >= currentPrice) {
                      // SL must be below entry
                      slPrice = currentPrice * (1 - minTPPercent);
                  }
                  
                  // Ensure R:R ratio is maintained after TP adjustment
                  const actualTPDistance = tpPrice - currentPrice;
                  const actualSLDistance = currentPrice - slPrice;
                  if (actualSLDistance > 0) {
                      const actualRR = actualTPDistance / actualSLDistance;
                      if (actualRR < 1.0) {
                          // R:R too low, adjust TP to maintain minimum 1:1
                          tpPrice = currentPrice + (actualSLDistance * 1.0);
                      }
                  }
                  
              } else if (decision === 'SELL') {
                  const tpPercent = (currentPrice - tpPrice) / currentPrice;
                  
                  if (tpPrice >= currentPrice) {
                      // TP must be below entry for SELL
                      tpPrice = currentPrice * (1 - minTPPercent);
                  } else if (tpPercent < minTPPercent) {
                      // TP too close, adjust to minimum
                      tpPrice = currentPrice * (1 - minTPPercent);
                  } else if (tpPercent > maxTPPercent) {
                      // TP too far, cap to maximum
                      tpPrice = currentPrice * (1 - maxTPPercent);
                  }
                  
                  // Validate SL
                  if (slPrice <= currentPrice) {
                      // SL must be above entry for SELL
                      slPrice = currentPrice * (1 + minTPPercent);
                  }
                  
                  // Ensure R:R ratio is maintained after TP adjustment
                  const actualTPDistance = currentPrice - tpPrice;
                  const actualSLDistance = slPrice - currentPrice;
                  if (actualSLDistance > 0) {
                      const actualRR = actualTPDistance / actualSLDistance;
                      if (actualRR < 1.0) {
                          // R:R too low, adjust TP to maintain minimum 1:1
                          tpPrice = currentPrice - (actualSLDistance * 1.0);
                      }
                  }
              }
              
              // Final validation: Double-check TP and SL are in correct direction
              if (decision === 'BUY') {
                  if (tpPrice <= currentPrice || slPrice >= currentPrice) {
                      console.error(`BUY TP/SL ERROR: TP=${tpPrice}, Entry=${currentPrice}, SL=${slPrice}`);
                      // Emergency fallback
                      tpPrice = currentPrice * 1.05;
                      slPrice = currentPrice * 0.95;
                  }
              } else if (decision === 'SELL') {
                  if (tpPrice >= currentPrice || slPrice <= currentPrice) {
                      console.error(`SELL TP/SL ERROR: TP=${tpPrice}, Entry=${currentPrice}, SL=${slPrice}`);
                      // Emergency fallback
                      tpPrice = currentPrice * 0.95;
                      slPrice = currentPrice * 1.05;
                  }
              }

              // SAFETY: Ensure SL doesn't exceed liquidation approximation (approx 80% move / lev)
              const liqDistance = (currentPrice * 0.8) / leverage;
              const actualSLDistance = decision === 'BUY' ? (currentPrice - slPrice) : (slPrice - currentPrice);
              if (actualSLDistance > liqDistance) {
                  // Clamp SL to be safe if ATR is too wild
                  const safeStopDistance = liqDistance * 0.9;
                  if (decision === 'BUY') {
                      slPrice = currentPrice - safeStopDistance;
                  } else {
                      slPrice = currentPrice + safeStopDistance;
                  }
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

              // --- SMART TRAILING STOP LOGIC - FIXED ---
              let updatedPos = { ...pos, unrealizedPnL };
              const trend = marketTrend[pos.symbol] || 'FLAT';
              
              // FIXED: Trailing should activate when PROFITABLE and trend is FAVORABLE
              if (!pos.isTrailing && roiPercent > 10) {
                  let activateTrailing = false;
                  let newSl = pos.stopLoss;

                  // BUY position: Trail when trend is UP (profitable) or price is above entry significantly
                  if (pos.type === 'BUY') {
                      if (trend === 'UP' || currentPrice > pos.entryPrice * 1.05) {
                          activateTrailing = true;
                          // Lock in profit: Move SL to breakeven or 3% profit (whichever is higher)
                          const breakeven = pos.entryPrice;
                          const profitLockPrice = pos.entryPrice * (1 + (0.03 / pos.leverage));
                          newSl = Math.max(breakeven * 1.001, profitLockPrice); // Slightly above breakeven
                      }
                  } 
                  // SELL position: Trail when trend is DOWN (profitable) or price is below entry significantly
                  else {
                      if (trend === 'DOWN' || currentPrice < pos.entryPrice * 0.95) {
                          activateTrailing = true;
                          const breakeven = pos.entryPrice;
                          const profitLockPrice = pos.entryPrice * (1 - (0.03 / pos.leverage));
                          newSl = Math.min(breakeven * 0.999, profitLockPrice); // Slightly below breakeven
                      }
                  }

                  // Dynamic trailing: Update SL to lock more profit if price moves favorably
                  if (pos.isTrailing) {
                      if (pos.type === 'BUY' && currentPrice > pos.entryPrice) {
                          // Update SL to be 2% below current price (locking profit)
                          const newTrailingSL = currentPrice * 0.98;
                          if (newTrailingSL > pos.stopLoss) {
                              newSl = newTrailingSL;
                              activateTrailing = true;
                          }
                      } else if (pos.type === 'SELL' && currentPrice < pos.entryPrice) {
                          // Update SL to be 2% above current price (locking profit)
                          const newTrailingSL = currentPrice * 1.02;
                          if (newTrailingSL < pos.stopLoss) {
                              newSl = newTrailingSL;
                              activateTrailing = true;
                          }
                      }
                  }

                  if (activateTrailing) {
                      updatedPos.isTrailing = true;
                      updatedPos.stopLoss = newSl;
                      addLog(`${bot.name} ACTIVATED SMART TRAILING on ${pos.symbol}. Locked SL @ ${newSl.toFixed(4)} (${pos.type === 'BUY' ? trend === 'UP' ? 'trend UP' : 'profit locked' : trend === 'DOWN' ? 'trend DOWN' : 'profit locked'})`, 'INFO');
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
