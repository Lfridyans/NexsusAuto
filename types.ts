
export type Sector = "MAJOR" | "MEME" | "AI" | "L2" | "DEFI" | "GAME" | "CLASSIC" | "COMMODITY" | "ALL";
export type BotStatus = "IDLE" | "BUY" | "SELL" | "HUNTING" | "TRADING";
export type LogType = "INFO" | "WIN" | "LOSS" | "LIQUIDATION" | "OPTIMIZATION";

export interface CryptoAsset {
  symbol: string;
  sector: Sector;
  volatility: "Low" | "Medium" | "High" | "Extreme";
}

export interface BotConfig {
  name: string;
  model: string;
  strategy: string;
  risk: string;
  targetSector: Sector;
  desc: string;
  personality: string;
  technique: string;
  preferredTimeframe: string; // e.g., "D", "240", "1"
  leverage: number; // Leverage multiplier
}

export interface Position {
  id: string;
  symbol: string;
  type: "BUY" | "SELL";
  entryPrice: number;
  takeProfit: number; // Target Price
  stopLoss: number; // Stop Price
  size: number; // Margin in $
  leverage: number;
  unrealizedPnL: number; // Floating PnL in $
  openTime: string;
  isTrailing?: boolean; // New: Smart Trailing Stop Active
}

export interface Bot extends BotConfig {
  id: number;
  balance: number; // Wallet Balance (Starts at $100)
  positions: Position[]; // Array of open positions
  
  // Legacy/Display fields
  status: string; 
  totalProfit: number;
  totalLoss: number;
  winCount: number;
  lossCount: number;
  lastAction: "WIN" | "LOSS" | "LIQUIDATION" | null;
  activeReason: string;
  activeNews: string;
  activePair: string; // Used for chart display (last active)
  activeTimeframe: string; // Current timeframe for the chart
}

export interface LogEntry {
  id: string;
  time: string;
  message: string;
  type: LogType;
  amount?: number;
}

export interface NewsItem {
  id: string;
  headline: string;
  summary: string;
  impactPair: string;
  impactDirection: "BUY" | "SELL";
}