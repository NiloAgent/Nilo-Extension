import { bitqueryClient, safeBitqueryCall } from './client';
import { GET_DEX_TRADES, GET_DEX_VOLUME_24H } from './queries';
import { 
  DexTrade, 
  DexTradesResponse,
  DexAnalysis,
  validateDexTrades,
  validateSolanaAddress 
} from './types';

export interface DexTradeAnalysis {
  trades: DexTrade[];
  totalTrades: number;
  uniqueTraders: number;
  volume24h: number;
  buyVolume: number;
  sellVolume: number;
  priceImpact: number;
  activeDexes: string[];
  liquidityScore: number;
  riskFactors: string[];
}

export async function fetchDexTrades(
  mintAddress: string,
  limit: number = 100
): Promise<DexTrade[]> {
  if (!validateSolanaAddress(mintAddress)) {
    throw new Error('Invalid Solana mint address');
  }

  return safeBitqueryCall(
    async () => {
      const response = await bitqueryClient.query<DexTradesResponse>(
        GET_DEX_TRADES,
        { mintAddress, limit }
      );

      if (!response.data?.solana?.dexTrades) {
        return [];
      }

      return validateDexTrades(response.data.solana.dexTrades);
    },
    [],
    'Failed to fetch DEX trades'
  );
}

export async function fetchDexVolume24h(mintAddress: string): Promise<DexTrade[]> {
  if (!validateSolanaAddress(mintAddress)) {
    throw new Error('Invalid Solana mint address');
  }

  return safeBitqueryCall(
    async () => {
      const response = await bitqueryClient.query<DexTradesResponse>(
        GET_DEX_VOLUME_24H,
        { mintAddress }
      );

      if (!response.data?.solana?.dexTrades) {
        return [];
      }

      return validateDexTrades(response.data.solana.dexTrades);
    },
    [],
    'Failed to fetch 24h DEX volume'
  );
}

export async function analyzeDexTrades(mintAddress: string): Promise<DexTradeAnalysis> {
  const [allTrades, recentTrades] = await Promise.all([
    fetchDexTrades(mintAddress, 200),
    fetchDexVolume24h(mintAddress)
  ]);

  if (allTrades.length === 0) {
    return {
      trades: [],
      totalTrades: 0,
      uniqueTraders: 0,
      volume24h: 0,
      buyVolume: 0,
      sellVolume: 0,
      priceImpact: 0,
      activeDexes: [],
      liquidityScore: 0,
      riskFactors: ['No DEX trading activity found']
    };
  }

  // Calculate unique traders
  const uniqueTraders = new Set([
    ...allTrades.map(t => t.Trade.Buy.Account),
    ...allTrades.map(t => t.Trade.Sell.Account)
  ]).size;

  // Calculate volumes
  const buyVolume = recentTrades.reduce((sum, trade) => {
    return sum + (trade.Trade.Buy.Currency.MintAddress === mintAddress ? trade.Trade.Buy.Amount : 0);
  }, 0);

  const sellVolume = recentTrades.reduce((sum, trade) => {
    return sum + (trade.Trade.Sell.Currency.MintAddress === mintAddress ? trade.Trade.Sell.Amount : 0);
  }, 0);

  const volume24h = buyVolume + sellVolume;

  // Get active DEXes
  const dexes = new Set(allTrades.map(t => t.Trade.Dex.ProtocolName));
  const activeDexes = Array.from(dexes);

  // Calculate liquidity score (0-100)
  let liquidityScore = 0;
  
  // Base score from trade count
  if (allTrades.length > 100) liquidityScore += 30;
  else if (allTrades.length > 50) liquidityScore += 20;
  else if (allTrades.length > 10) liquidityScore += 10;

  // Score from unique traders
  if (uniqueTraders > 50) liquidityScore += 25;
  else if (uniqueTraders > 20) liquidityScore += 15;
  else if (uniqueTraders > 5) liquidityScore += 5;

  // Score from DEX diversity
  if (activeDexes.length > 3) liquidityScore += 20;
  else if (activeDexes.length > 1) liquidityScore += 10;
  else if (activeDexes.length === 1) liquidityScore += 5;

  // Score from recent activity
  if (recentTrades.length > 20) liquidityScore += 25;
  else if (recentTrades.length > 5) liquidityScore += 15;
  else if (recentTrades.length > 0) liquidityScore += 5;

  liquidityScore = Math.min(liquidityScore, 100);

  // Calculate price impact (simplified)
  const priceImpact = calculatePriceImpact(allTrades);

  // Identify risk factors
  const riskFactors: string[] = [];

  if (allTrades.length < 10) {
    riskFactors.push('Very low trading activity');
  }

  if (uniqueTraders < 5) {
    riskFactors.push(`Only ${uniqueTraders} unique traders`);
  }

  if (activeDexes.length === 1) {
    riskFactors.push(`Only trading on ${activeDexes[0]} (limited liquidity)`);
  }

  if (recentTrades.length === 0) {
    riskFactors.push('No trading activity in last 24 hours');
  }

  // Check for wash trading patterns
  const washTradingRisk = detectWashTrading(allTrades);
  if (washTradingRisk.isRisky) {
    riskFactors.push(washTradingRisk.reason);
  }

  // Check for pump and dump patterns
  const pumpDumpRisk = detectPumpAndDump(allTrades);
  if (pumpDumpRisk.isRisky) {
    riskFactors.push(pumpDumpRisk.reason);
  }

  return {
    trades: allTrades,
    totalTrades: allTrades.length,
    uniqueTraders,
    volume24h,
    buyVolume,
    sellVolume,
    priceImpact,
    activeDexes,
    liquidityScore,
    riskFactors
  };
}

function calculatePriceImpact(trades: DexTrade[]): number {
  if (trades.length < 2) return 0;

  // Simple price impact calculation based on trade size variance
  const tradeSizes = trades.map(t => t.Trade.Buy.Amount + t.Trade.Sell.Amount);
  const avgTradeSize = tradeSizes.reduce((sum, size) => sum + size, 0) / tradeSizes.length;
  const variance = tradeSizes.reduce((sum, size) => sum + Math.pow(size - avgTradeSize, 2), 0) / tradeSizes.length;
  
  // Normalize to 0-100 scale (higher variance = higher impact)
  return Math.min((Math.sqrt(variance) / avgTradeSize) * 100, 100);
}

function detectWashTrading(trades: DexTrade[]): { isRisky: boolean; reason: string } {
  if (trades.length < 10) return { isRisky: false, reason: '' };

  // Check for same address buying and selling frequently
  const traderActivity = trades.reduce((acc, trade) => {
    const buyer = trade.Trade.Buy.Account;
    const seller = trade.Trade.Sell.Account;
    
    acc[buyer] = (acc[buyer] || { buys: 0, sells: 0 });
    acc[seller] = (acc[seller] || { buys: 0, sells: 0 });
    
    acc[buyer].buys++;
    acc[seller].sells++;
    
    return acc;
  }, {} as Record<string, { buys: number; sells: number }>);

  const suspiciousTraders = Object.entries(traderActivity).filter(([, activity]) => {
    const total = activity.buys + activity.sells;
    const ratio = Math.min(activity.buys, activity.sells) / Math.max(activity.buys, activity.sells);
    return total > trades.length * 0.2 && ratio > 0.7; // High activity with balanced buy/sell
  });

  if (suspiciousTraders.length > 0) {
    return {
      isRisky: true,
      reason: `${suspiciousTraders.length} addresses show potential wash trading patterns`
    };
  }

  return { isRisky: false, reason: '' };
}

function detectPumpAndDump(trades: DexTrade[]): { isRisky: boolean; reason: string } {
  if (trades.length < 20) return { isRisky: false, reason: '' };

  // Sort trades by time
  const sortedTrades = trades.sort((a, b) => 
    new Date(a.Transaction.Block.Time).getTime() - new Date(b.Transaction.Block.Time).getTime()
  );

  // Check for rapid succession of large buys followed by sells
  const timeWindows = [];
  const windowSize = 10; // 10 trades per window

  for (let i = 0; i <= sortedTrades.length - windowSize; i++) {
    const window = sortedTrades.slice(i, i + windowSize);
    const buyCount = window.filter(t => t.Trade.Buy.Amount > t.Trade.Sell.Amount).length;
    const sellCount = windowSize - buyCount;
    
    timeWindows.push({ buyCount, sellCount, startTime: window[0].Transaction.Block.Time });
  }

  // Look for windows with extreme buy/sell imbalance
  const suspiciousWindows = timeWindows.filter(w => 
    Math.abs(w.buyCount - w.sellCount) > windowSize * 0.7
  );

  if (suspiciousWindows.length > timeWindows.length * 0.3) {
    return {
      isRisky: true,
      reason: 'Trading pattern suggests potential pump and dump activity'
    };
  }

  return { isRisky: false, reason: '' };
}

export function formatTradeVolume(volume: number, decimals: number = 9): string {
  const adjustedVolume = volume / Math.pow(10, decimals);
  
  if (adjustedVolume >= 1e9) {
    return `${(adjustedVolume / 1e9).toFixed(2)}B`;
  } else if (adjustedVolume >= 1e6) {
    return `${(adjustedVolume / 1e6).toFixed(2)}M`;
  } else if (adjustedVolume >= 1e3) {
    return `${(adjustedVolume / 1e3).toFixed(2)}K`;
  }
  
  return adjustedVolume.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function getDexRiskLevel(liquidityScore: number): 'low' | 'medium' | 'high' {
  if (liquidityScore >= 70) return 'low';
  if (liquidityScore >= 40) return 'medium';
  return 'high';
} 