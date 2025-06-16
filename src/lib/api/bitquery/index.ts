// Main exports for Bitquery API integration
export * from './client';
export * from './types';
export * from './queries';
export * from './fetchTokenTransfers';
export * from './fetchTopHolders';
export * from './fetchDexTrades';
export * from './fetchCreatorAnalysis';
export * from './tokenAnalyzer';

// Re-export the main analysis function for convenience
export { analyzeToken as analyzeSolanaToken } from './tokenAnalyzer';

// Version information
export const BITQUERY_API_VERSION = '2.0.0';
export const SUPPORTED_NETWORKS = ['solana'] as const;

// Default configuration
export const DEFAULT_CONFIG = {
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
  DEFAULT_LIMITS: {
    transfers: 50,
    holders: 10,
    dexTrades: 100,
    creatorTransactions: 100
  },
  RISK_THRESHOLDS: {
    safe: 75,
    suspicious: 45,
    dangerous: 0
  }
} as const; 