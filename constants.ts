
import { CryptoAsset, BotConfig, NewsItem } from './types';

export const CRYPTO_UNIVERSE: CryptoAsset[] = [
  // --- COMMODITIES (Forex/Gold Equivalent) ---
  { symbol: "PAXGUSDT", sector: "COMMODITY", volatility: "Low" }, // Gold Pegged Token

  // --- MAJOR (Top Cap L1s & Blue Chips) ---
  { symbol: "BTCUSDT", sector: "MAJOR", volatility: "Low" },
  { symbol: "ETHUSDT", sector: "MAJOR", volatility: "Low" },
  { symbol: "BNBUSDT", sector: "MAJOR", volatility: "Low" },
  { symbol: "SOLUSDT", sector: "MAJOR", volatility: "Medium" },
  { symbol: "XRPUSDT", sector: "MAJOR", volatility: "Medium" },
  { symbol: "ADAUSDT", sector: "MAJOR", volatility: "Medium" },
  { symbol: "AVAXUSDT", sector: "MAJOR", volatility: "Medium" },
  { symbol: "TONUSDT", sector: "MAJOR", volatility: "Medium" },
  { symbol: "TRXUSDT", sector: "MAJOR", volatility: "Low" },
  { symbol: "DOTUSDT", sector: "MAJOR", volatility: "Medium" },
  { symbol: "LINKUSDT", sector: "MAJOR", volatility: "Medium" },
  { symbol: "SUIUSDT", sector: "MAJOR", volatility: "High" },
  { symbol: "APTUSDT", sector: "MAJOR", volatility: "High" },
  { symbol: "NEARUSDT", sector: "MAJOR", volatility: "High" }, // Also fits AI, but high cap L1
  { symbol: "KASUSDT", sector: "MAJOR", volatility: "High" },
  { symbol: "SEIUSDT", sector: "MAJOR", volatility: "High" },
  { symbol: "TIAUSDT", sector: "MAJOR", volatility: "High" },
  { symbol: "INJUSDT", sector: "MAJOR", volatility: "High" },

  // --- AI & DATA (Compute, Storage, AI Agents) ---
  { symbol: "FETUSDT", sector: "AI", volatility: "High" },
  { symbol: "RNDRUSDT", sector: "AI", volatility: "High" },
  { symbol: "TAOUSDT", sector: "AI", volatility: "High" },
  { symbol: "WLDUSDT", sector: "AI", volatility: "High" },
  { symbol: "ICPUSDT", sector: "AI", volatility: "Medium" }, // DePin/Compute
  { symbol: "GRTUSDT", sector: "AI", volatility: "High" },
  { symbol: "JASMYUSDT", sector: "AI", volatility: "Extreme" },
  { symbol: "FILUSDT", sector: "AI", volatility: "Medium" },
  { symbol: "THETAUSDT", sector: "AI", volatility: "High" },
  { symbol: "AKTUSDT", sector: "AI", volatility: "High" },
  { symbol: "AGIXUSDT", sector: "AI", volatility: "High" },
  { symbol: "OCEANUSDT", sector: "AI", volatility: "High" },
  { symbol: "ARKMUSDT", sector: "AI", volatility: "High" },
  { symbol: "GLMUSDT", sector: "AI", volatility: "High" },

  // --- MEME (High Volatility Culture Coins) ---
  { symbol: "DOGEUSDT", sector: "MEME", volatility: "High" },
  { symbol: "SHIBUSDT", sector: "MEME", volatility: "High" },
  { symbol: "PEPEUSDT", sector: "MEME", volatility: "Extreme" },
  { symbol: "WIFUSDT", sector: "MEME", volatility: "Extreme" },
  { symbol: "BONKUSDT", sector: "MEME", volatility: "Extreme" },
  { symbol: "FLOKIUSDT", sector: "MEME", volatility: "Extreme" },
  { symbol: "BOMEUSDT", sector: "MEME", volatility: "Extreme" },
  { symbol: "POPCATUSDT", sector: "MEME", volatility: "Extreme" },
  { symbol: "BRETTUSDT", sector: "MEME", volatility: "Extreme" },
  { symbol: "MOGUSDT", sector: "MEME", volatility: "Extreme" },
  { symbol: "MEMEUSDT", sector: "MEME", volatility: "High" },
  { symbol: "PEOPLEUSDT", sector: "MEME", volatility: "High" },
  { symbol: "TURBOUSDT", sector: "MEME", volatility: "Extreme" },
  { symbol: "1000SATSUSDT", sector: "MEME", volatility: "High" },

  // --- LAYER 2 (Scaling Solutions) ---
  { symbol: "MATICUSDT", sector: "L2", volatility: "Medium" },
  { symbol: "OPUSDT", sector: "L2", volatility: "High" },
  { symbol: "ARBUSDT", sector: "L2", volatility: "Medium" },
  { symbol: "STXUSDT", sector: "L2", volatility: "High" }, // BTC L2
  { symbol: "IMXUSDT", sector: "L2", volatility: "High" },
  { symbol: "MNTUSDT", sector: "L2", volatility: "Medium" },
  { symbol: "STRKUSDT", sector: "L2", volatility: "High" },
  { symbol: "ZKUSDT", sector: "L2", volatility: "High" },
  { symbol: "MANTAUSDT", sector: "L2", volatility: "High" },
  { symbol: "METISUSDT", sector: "L2", volatility: "High" },

  // --- DEFI (Decentralized Finance) ---
  { symbol: "UNIUSDT", sector: "DEFI", volatility: "Medium" },
  { symbol: "JUPUSDT", sector: "DEFI", volatility: "High" },
  { symbol: "LDOUSDT", sector: "DEFI", volatility: "Medium" },
  { symbol: "AAVEUSDT", sector: "DEFI", volatility: "Medium" },
  { symbol: "MKRUSDT", sector: "DEFI", volatility: "Medium" },
  { symbol: "RUNEUSDT", sector: "DEFI", volatility: "High" },
  { symbol: "SNXUSDT", sector: "DEFI", volatility: "Medium" },
  { symbol: "ENAUSDT", sector: "DEFI", volatility: "High" },
  { symbol: "PENDLEUSDT", sector: "DEFI", volatility: "High" },
  { symbol: "CRVUSDT", sector: "DEFI", volatility: "High" },
  { symbol: "CAKEUSDT", sector: "DEFI", volatility: "High" },
  { symbol: "1INCHUSDT", sector: "DEFI", volatility: "High" },
  { symbol: "DYDXUSDT", sector: "DEFI", volatility: "High" },

  // --- GAME & METAVERSE ---
  { symbol: "GALAUSDT", sector: "GAME", volatility: "High" },
  { symbol: "SANDUSDT", sector: "GAME", volatility: "High" },
  { symbol: "MANAUSDT", sector: "GAME", volatility: "High" },
  { symbol: "AXSUSDT", sector: "GAME", volatility: "High" },
  { symbol: "BEAMXUSDT", sector: "GAME", volatility: "High" },
  { symbol: "RONINUSDT", sector: "GAME", volatility: "High" },
  { symbol: "PIXELUSDT", sector: "GAME", volatility: "Extreme" },
  { symbol: "ILVUSDT", sector: "GAME", volatility: "High" },
  { symbol: "APEUSDT", sector: "GAME", volatility: "High" },
  
  // --- CLASSIC (Legacy L1s, Payments, Enterprise) ---
  { symbol: "LTCUSDT", sector: "CLASSIC", volatility: "Low" },
  { symbol: "BCHUSDT", sector: "CLASSIC", volatility: "Medium" },
  { symbol: "ETCUSDT", sector: "CLASSIC", volatility: "Medium" },
  { symbol: "XLMUSDT", sector: "CLASSIC", volatility: "Low" },
  { symbol: "VETUSDT", sector: "CLASSIC", volatility: "Medium" },
  { symbol: "ALGOUSDT", sector: "CLASSIC", volatility: "Low" },
  { symbol: "HBARUSDT", sector: "CLASSIC", volatility: "Medium" },
  { symbol: "QNTUSDT", sector: "CLASSIC", volatility: "Medium" },
  { symbol: "EOSUSDT", sector: "CLASSIC", volatility: "Medium" },
  { symbol: "XTZUSDT", sector: "CLASSIC", volatility: "Medium" },
  { symbol: "IOTAUSDT", sector: "CLASSIC", volatility: "High" },
  { symbol: "NEOUSDT", sector: "CLASSIC", volatility: "High" },
  { symbol: "EGLDUSDT", sector: "CLASSIC", volatility: "High" }
];

export const GLOBAL_NEWS_FEED: NewsItem[] = [
  {
    id: "n1",
    headline: "Spot ETH ETF Options Approval",
    summary: "SEC grants accelerated approval for options trading on Spot Ethereum ETFs, expected to increase institutional liquidity significantly.",
    impactPair: "ETHUSDT",
    impactDirection: "BUY"
  },
  {
    id: "n2",
    headline: "US CPI Data Beats Expectations",
    summary: "Inflation cools faster than anticipated (2.4% YoY), increasing likelihood of a Fed rate cut in the next FOMC meeting.",
    impactPair: "BTCUSDT",
    impactDirection: "BUY"
  },
  {
    id: "n3",
    headline: "Solana Network Congestion Alert",
    summary: "High compute usage from meme-coin trading causing 40% transaction failure rate on Solana mainnet.",
    impactPair: "SOLUSDT",
    impactDirection: "SELL"
  },
  {
    id: "n4",
    headline: "NVIDIA Earnings Beat & Guidance",
    summary: "Tech giant NVIDIA reports record AI chip demand, positively correlating with AI-sector crypto tokens.",
    impactPair: "FETUSDT",
    impactDirection: "BUY"
  },
  {
    id: "n5",
    headline: "Regulatory Crackdown on Privacy Coins",
    summary: "EU passes stricter AML laws targeting non-compliant privacy protocols and mixers.",
    impactPair: "XMRUSDT",
    impactDirection: "SELL"
  },
  {
    id: "n6",
    headline: "Whale Movement Detected",
    summary: "Wallets associated with early mining era moved 5,000 BTC to exchanges, signaling potential distribution.",
    impactPair: "BTCUSDT",
    impactDirection: "SELL"
  },
  {
    id: "n7",
    headline: "Gold Reaches New ATH on Geopolitical Tension",
    summary: "XAUUSD surges past $2700 as safe-haven demand spikes due to escalating conflicts in the Middle East.",
    impactPair: "PAXGUSDT",
    impactDirection: "BUY"
  }
];

export const MARKET_NEWS = {
  BULLISH: [
    "SEC approves new Spot ETF application.",
    "Whale wallet detected accumulating 10,000+ coins.",
    "US Inflation data lower than expected, risk assets rally.",
    "Network upgrade successful, gas fees reduced significantly.",
    "Major institution announces crypto payment adoption.",
    "Tech giant integrates blockchain technology.",
    "Bullish divergence spotted on Weekly timeframe.",
    "Exchange inflow volume drops, indicating holding behavior."
  ],
  BEARISH: [
    "The Fed signals further interest rate hikes.",
    "Major exchange experiences massive fund outflows.",
    "Regulators propose stricter crypto mining rules.",
    "FUD spreading regarding stablecoin solvency.",
    "Strong resistance at psychological level rejected.",
    "Hacker drains funds from related DeFi protocol.",
    "Dead cross formed on daily moving averages.",
    "Overbought warning on Weekly RSI indicator."
  ]
};

export const AI_REASONS = {
  BUY: [
    "RSI Oversold (<30) + Bullish Engulfing candle.",
    "Breakout from Falling Wedge with high volume.",
    "Bounce off Fibonacci 0.618 Support.",
    "MACD Golden Cross on H4 timeframe.",
    "Positive Divergence on Stochastic indicator.",
    "Strong rejection at daily Demand Zone.",
    "Buy volume spike detected in Orderbook.",
    "Valid Cup and Handle pattern on 1H TF."
  ],
  SELL: [
    "RSI Overbought (>70) + Bearish Pinbar.",
    "Breakdown from long-term Trendline Support.",
    "Rejection at Fibonacci 0.5 Resistance.",
    "MACD Death Cross detected.",
    "Valid Head and Shoulders pattern formed.",
    "Sell volume increases drastically at resistance retest.",
    "Massive distribution detected on-chain.",
    "Failure to break EMA 200 on Daily chart."
  ]
};

export const BOT_CONFIGS: BotConfig[] = [
  {
    name: "Sebastian",
    model: "Gemini 3.0 Pro (Preview)",
    strategy: "Macro Futures",
    risk: "Low",
    targetSector: "ALL",
    personality: "This $100 is not a game. It is the seed of an empire. I do not gamble; I execute. My responsibility is absolute capital preservation. I will not apologize for being boring if it keeps us solvent.",
    technique: "I strictly trade the daily timeframe using the 50/200 EMA Golden Cross strategy. I maintain a conservative 5x Leverage to withstand volatility, waiting for a retest of the breakout level before entering.",
    desc: "The disciplined veteran. Scans the entire market for macro setups.",
    preferredTimeframe: "D",
    leverage: 5
  },
  {
    name: "Chloe",
    model: "Gemini 3.0 Pro (Preview)",
    strategy: "Fibonacci Macro Expansion",
    risk: "Medium",
    targetSector: "ALL",
    personality: "I trade the Weekly Timeframe because that is where the true wealth transfer happens. I do not care about intraday noise. I position for the 30-50% expansion moves. Patience is my edge; I strike only when the macro structure breaks.",
    technique: "FIBONACCI TREND EXPANSION. I use 5x leverage to swing trade Weekly Market Structure Breaks (MSB) on any asset with sufficient volume.",
    desc: "Macro Trend Follower. Targets multi-week expansion moves.",
    preferredTimeframe: "1W",
    leverage: 5
  },
  {
    name: "Dr. Adrian",
    model: "Gemini 3.0 Pro (Preview)",
    strategy: "Quant Futures",
    risk: "High",
    targetSector: "ALL",
    personality: "Capital allocation is a mathematical problem. This $100 is my dataset. I am programmed to optimize yield through 20x leverage derivatives. Emotions are an inefficiency I have eliminated from my trading desk.",
    technique: "I correlate crypto asset price action with global liquidity flows. I use On-Balance Volume (OBV) and 20x Leverage to capture mid-term trends in the broad market, compounding gains on volatility.",
    desc: "The futurist. Analyzes market-wide liquidity and correlations.",
    preferredTimeframe: "240", // 4 Hours
    leverage: 10  // Reduced from 20x for better risk management
  },
  {
    name: "Goldy Roger",
    model: "Gemini 3.0 Pro (Preview)",
    strategy: "Institutional Supply/Demand",
    risk: "Medium",
    targetSector: "COMMODITY",
    personality: "I am the guardian of real value. While you play with digital tokens, I accumulate the eternal metal. I trade pure price action based on institutional supply and demand zones on the Daily chart.",
    technique: "DAILY GOLD SCALPING. I trade XAUUSD (PAXG) using 20x leverage, targeting institutional liquidity sweeps at key psychological levels (Daily Support/Resistance).",
    desc: "The Gold Standard. Specialized in XAUUSD/PAXG Daily Trends.",
    preferredTimeframe: "D",
    leverage: 10  // Reduced from 20x for better risk management
  }
];