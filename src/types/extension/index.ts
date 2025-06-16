import { z } from 'zod'

// Risk Assessment Types
export type RiskLevel = 'low' | 'medium' | 'high'
export type RuleSeverity = 'info' | 'warning' | 'critical'

// Solana Address Validation Schema
export const SolanaAddressSchema = z.string()
  .min(32, 'Solana address must be at least 32 characters')
  .max(44, 'Solana address must be at most 44 characters')
  .regex(/^[1-9A-HJ-NP-Za-km-z]+$/, 'Invalid base58 format')
  .refine((addr) => !addr.startsWith('0x'), 'Ethereum addresses not supported - Solana only')

// SOL Domain Schema
export const SolDomainSchema = z.string()
  .regex(/^[a-zA-Z0-9-_]+\.sol$/, 'Invalid .sol domain format')

// Solana Wallet Analysis Schema
export const SolanaWalletAnalysisSchema = z.object({
  address: SolanaAddressSchema,
  balance: z.number(), // SOL balance
  lamports: z.number(), // Raw lamports balance
  tokenAccounts: z.number(), // Number of token accounts
  transactionCount: z.number(),
  firstTransaction: z.string().optional(),
  lastTransaction: z.string().optional(),
  isMultisig: z.boolean().optional(),
  programInteractions: z.array(z.string()), // Program IDs interacted with
  riskScore: z.number().min(0).max(10),
  riskLevel: z.enum(['low', 'medium', 'high']),
  flags: z.array(z.string()),
})

// Twitter Analysis Schema
export const TwitterAnalysisSchema = z.object({
  username: z.string(),
  verified: z.boolean(),
  followers: z.number(),
  following: z.number(),
  accountAge: z.number(), // days
  engagementRate: z.number(),
  botScore: z.number().min(0).max(100),
  riskLevel: z.enum(['low', 'medium', 'high']),
  flags: z.array(z.string()),
})

// GitHub Analysis Schema
export const GitHubAnalysisSchema = z.object({
  repository: z.string(),
  stars: z.number(),
  forks: z.number(),
  commits: z.number(),
  contributors: z.number(),
  lastCommit: z.string().optional(),
  hasReadme: z.boolean(),
  hasLicense: z.boolean(),
  codeQuality: z.number().min(0).max(10),
  riskLevel: z.enum(['low', 'medium', 'high']),
  flags: z.array(z.string()),
})

// Solana Transaction Bundle Schema
export const SolanaTransactionBundleSchema = z.object({
  signature: z.string(), // Solana transaction signature
  slot: z.number(), // Solana slot number
  blockTime: z.number().optional(),
  fee: z.number(), // Transaction fee in lamports
  status: z.object({
    Ok: z.any().optional(),
    Err: z.any().optional(),
  }),
  programIds: z.array(z.string()), // Programs involved in transaction
  accountKeys: z.array(z.string()), // Accounts involved
  solTransferred: z.number(), // SOL amount transferred
  tokenTransfers: z.array(z.object({
    mint: z.string(),
    amount: z.number(),
    decimals: z.number(),
  })),
  mevType: z.enum(['sandwich', 'frontrun', 'backrun', 'arbitrage']).optional(),
  riskLevel: z.enum(['low', 'medium', 'high']),
  flags: z.array(z.string()),
})

// Rule Result Schema
export const RuleResultSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string(),
  score: z.number().min(0).max(10),
  severity: z.enum(['info', 'warning', 'critical']),
  passed: z.boolean(),
  data: z.record(z.any()).optional(),
})

// Cursor Rule Engine Types
export const CursorRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.enum(['wallet', 'social', 'code', 'transaction']),
  weight: z.number().min(0).max(1),
  enabled: z.boolean(),
  execute: z.function(),
})

// Analysis Request Schema
export const AnalysisRequestSchema = z.object({
  type: z.enum(['wallet', 'twitter', 'github', 'transaction']),
  target: z.string(),
  options: z.record(z.any()).optional(),
})

// Analysis Result Schema
export const AnalysisResultSchema = z.object({
  id: z.string(),
  type: z.enum(['wallet', 'twitter', 'github', 'transaction']),
  target: z.string(),
  timestamp: z.number(),
  overallRisk: z.enum(['low', 'medium', 'high']),
  riskScore: z.number(),
  rules: z.array(RuleResultSchema),
  solanaWalletAnalysis: SolanaWalletAnalysisSchema.optional(),
  twitterAnalysis: TwitterAnalysisSchema.optional(),
  githubAnalysis: GitHubAnalysisSchema.optional(),
  solanaTransactionBundle: SolanaTransactionBundleSchema.optional(),
  cached: z.boolean(),
})

// Extension State Schema
export const ExtensionStateSchema = z.object({
  isAnalyzing: z.boolean(),
  currentAnalysis: AnalysisResultSchema.optional(),
  recentAnalyses: z.array(AnalysisResultSchema),
  
  // Token Analysis State
  currentTokenAddress: z.string(),
  tokenAnalysis: z.custom<SolanaTokenAnalysis>().nullable(),
  analysisError: z.string().nullable(),
  analysisCache: z.record(z.custom<SolanaTokenAnalysis>()),
  
  settings: z.object({
    autoAnalyze: z.boolean(),
    riskThreshold: z.enum(['low', 'medium', 'high']),
    notificationsEnabled: z.boolean(),
    cacheEnabled: z.boolean(),
    cacheTimeout: z.number(), // minutes
    solanaRpcEndpoint: z.string().optional(),
  }),
})

// WebSocket Message Schema
export const WebSocketMessageSchema = z.object({
  type: z.enum(['transaction', 'alert', 'heartbeat']),
  data: z.record(z.any()),
  timestamp: z.number(),
})

// Export Types
export type SolanaWalletAnalysis = z.infer<typeof SolanaWalletAnalysisSchema>
export type TwitterAnalysis = z.infer<typeof TwitterAnalysisSchema>
export type GitHubAnalysis = z.infer<typeof GitHubAnalysisSchema>
export type SolanaTransactionBundle = z.infer<typeof SolanaTransactionBundleSchema>
export type RuleResult = z.infer<typeof RuleResultSchema>
export type CursorRule = z.infer<typeof CursorRuleSchema>
export type AnalysisRequest = z.infer<typeof AnalysisRequestSchema>
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>
export type ExtensionState = z.infer<typeof ExtensionStateSchema>
export type WebSocketMessage = z.infer<typeof WebSocketMessageSchema>

// Chrome Extension Message Types
export interface ChromeMessage {
  type: 'ANALYZE_REQUEST' | 'ANALYSIS_RESULT' | 'STATE_UPDATE' | 'CACHE_UPDATE'
  payload: any
  timestamp: number
}

// Storage Keys
export const STORAGE_KEYS = {
  ANALYSIS_CACHE: 'nilo_analysis_cache',
  EXTENSION_STATE: 'nilo_extension_state',
  USER_SETTINGS: 'nilo_user_settings',
} as const 

// Solana-specific constants
export const SOLANA_CONSTANTS = {
  LAMPORTS_PER_SOL: 1000000000,
  TYPICAL_PROGRAMS: {
    SYSTEM: '11111111111111111111111111111112',
    TOKEN: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    ASSOCIATED_TOKEN: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
    METAPLEX: 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
    SERUM_DEX: '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin',
    RAYDIUM: '675kPX9MHTjS2zt1qfr1YCZJi9HTDdR9YRp9AZqhB9vD',
  },
  RPC_ENDPOINTS: {
    MAINNET: 'https://api.mainnet-beta.solana.com',
    DEVNET: 'https://api.devnet.solana.com',
    HELIUS: 'https://rpc.helius.xyz',
    QUICKNODE: 'https://api.quicknode.com/solana',
  }
} as const

// Validation utilities
export function validateSolanaAddress(address: string): { valid: boolean; error?: string } {
  try {
    SolanaAddressSchema.parse(address)
    return { valid: true }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, error: error.errors[0]?.message || 'Invalid Solana address' }
    }
    return { valid: false, error: 'Invalid address format' }
  }
}

export function validateSolDomain(domain: string): { valid: boolean; error?: string } {
  try {
    SolDomainSchema.parse(domain)
    return { valid: true }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, error: error.errors[0]?.message || 'Invalid .sol domain' }
    }
    return { valid: false, error: 'Invalid domain format' }
  }
}

export function isValidSolanaInput(input: string): { valid: boolean; type: 'address' | 'domain' | null; error?: string } {
  // Check if it's a .sol domain
  if (input.endsWith('.sol')) {
    const domainResult = validateSolDomain(input)
    return { 
      valid: domainResult.valid, 
      type: domainResult.valid ? 'domain' : null, 
      error: domainResult.error 
    }
  }
  
  // Check if it's a Solana address
  const addressResult = validateSolanaAddress(input)
  return { 
    valid: addressResult.valid, 
    type: addressResult.valid ? 'address' : null, 
    error: addressResult.error 
  }
}

// Solana Token Contract Address Analysis Types

export interface SolanaTokenAnalysis {
  contractAddress: string;
  timestamp: number;
  trustScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high';
  
  // Token Metadata
  metadata: TokenMetadata;
  
  // Honeypot Detection
  honeypotAnalysis: HoneypotAnalysis;
  
  // Liquidity Analysis
  liquidityAnalysis: LiquidityAnalysis;
  
  // Ownership & Distribution
  ownershipAnalysis: OwnershipAnalysis;
  
  // Creator Wallet Audit
  creatorAnalysis: CreatorAnalysis;
  
  // Social Signals
  socialSignals: SocialSignals;
}

export interface TokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: number;
  creatorAddress: string;
  isOnChainMetadata: boolean;
  metadataUri?: string;
  logoUri?: string;
  description?: string;
}

export interface HoneypotAnalysis {
  canBeSold: boolean;
  hasTransferRestrictions: boolean;
  hasBlacklist: boolean;
  hasFreezeAuthority: boolean;
  mintAuthorityBurned: boolean;
  riskFlags: string[];
}

export interface LiquidityAnalysis {
  isListedOnDEX: boolean;
  dexListings: DEXListing[];
  totalLiquiditySOL: number;
  totalLiquidityUSDC: number;
  liquidityLocked: boolean;
  liquidityLockExpiry?: number;
  priceImpact: {
    buy1SOL: number;
    sell1SOL: number;
  };
}

export interface DEXListing {
  dex: 'Jupiter' | 'Raydium' | 'Orca' | 'Serum';
  pairAddress: string;
  liquiditySOL: number;
  liquidityUSDC: number;
  volume24h: number;
}

export interface OwnershipAnalysis {
  totalHolders: number;
  topHolders: TokenHolder[];
  creatorHoldingPercentage: number;
  distributionScore: number; // 0-100, higher = better distribution
}

export interface TokenHolder {
  address: string;
  balance: number;
  percentage: number;
  isKnownAddress?: boolean;
  label?: string; // e.g., "DEX Pool", "Known CEX"
}

export interface CreatorAnalysis {
  creatorAddress: string;
  walletAge: number; // days
  recentTokenLaunches: number; // last 30 days
  fundingSource: 'CEX' | 'Bridge' | 'Unknown' | 'Organic';
  suspiciousActivity: string[];
  riskScore: number; // 0-100
}

export interface SocialSignals {
  hasTwitter: boolean;
  twitterHandle?: string;
  hasWebsite: boolean;
  websiteUrl?: string;
  hasSolDomain: boolean;
  solDomain?: string;
  telegramGroup?: string;
  discordServer?: string;
}

// Solana Token Contract Address Validation
export function validateSolanaTokenAddress(address: string): boolean {
  if (!address || typeof address !== 'string') return false;
  
  // Must be base58 format, 32-44 characters
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  if (!base58Regex.test(address)) return false;
  
  // Reject Ethereum addresses
  if (address.startsWith('0x')) return false;
  
  // Reject .sol domains (not contract addresses)
  if (address.endsWith('.sol')) return false;
  
  return true;
}

// Solana Constants for Token Analysis
export const SOLANA_TOKEN_CONSTANTS = {
  RPC_ENDPOINTS: [
    'https://api.mainnet-beta.solana.com',
    'https://solana-api.projectserum.com',
    'https://rpc.helius.xyz/?api-key=YOUR_KEY'
  ],
  
  INDEXING_APIS: {
    HELIUS: 'https://api.helius.xyz/v0',
    SOLANA_FM: 'https://api.solana.fm/v1',
    SHYFT: 'https://api.shyft.to/sol/v1',
    JUPITER: 'https://quote-api.jup.ag/v6'
  },
  
  KNOWN_PROGRAMS: {
    TOKEN_PROGRAM: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    METAPLEX: 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
    JUPITER: '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P',
    RAYDIUM: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
    ORCA: '9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP'
  },
  
  KNOWN_ADDRESSES: {
    WSOL: 'So11111111111111111111111111111111111111112',
    USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'
  },
  
  TRUST_SCORE_WEIGHTS: {
    METADATA: 15,
    HONEYPOT: 30,
    LIQUIDITY: 25,
    OWNERSHIP: 20,
    CREATOR: 10
  }
};

// Trust Score Calculation
export function calculateTrustScore(analysis: Partial<SolanaTokenAnalysis>): number {
  let score = 0;
  const weights = SOLANA_TOKEN_CONSTANTS.TRUST_SCORE_WEIGHTS;
  
  // Metadata Score (0-15 points)
  if (analysis.metadata) {
    let metadataScore = 0;
    if (analysis.metadata.name && analysis.metadata.symbol) metadataScore += 5;
    if (analysis.metadata.isOnChainMetadata) metadataScore += 5;
    if (analysis.metadata.logoUri) metadataScore += 3;
    if (analysis.metadata.description) metadataScore += 2;
    score += Math.min(metadataScore, weights.METADATA);
  }
  
  // Honeypot Score (0-30 points)
  if (analysis.honeypotAnalysis) {
    let honeypotScore = 0;
    if (analysis.honeypotAnalysis.canBeSold) honeypotScore += 10;
    if (!analysis.honeypotAnalysis.hasTransferRestrictions) honeypotScore += 5;
    if (!analysis.honeypotAnalysis.hasBlacklist) honeypotScore += 5;
    if (!analysis.honeypotAnalysis.hasFreezeAuthority) honeypotScore += 5;
    if (analysis.honeypotAnalysis.mintAuthorityBurned) honeypotScore += 5;
    score += Math.min(honeypotScore, weights.HONEYPOT);
  }
  
  // Liquidity Score (0-25 points)
  if (analysis.liquidityAnalysis) {
    let liquidityScore = 0;
    if (analysis.liquidityAnalysis.isListedOnDEX) liquidityScore += 10;
    if (analysis.liquidityAnalysis.totalLiquiditySOL > 10) liquidityScore += 5;
    if (analysis.liquidityAnalysis.totalLiquiditySOL > 100) liquidityScore += 5;
    if (analysis.liquidityAnalysis.liquidityLocked) liquidityScore += 5;
    score += Math.min(liquidityScore, weights.LIQUIDITY);
  }
  
  // Ownership Score (0-20 points)
  if (analysis.ownershipAnalysis) {
    let ownershipScore = 0;
    if (analysis.ownershipAnalysis.totalHolders > 100) ownershipScore += 5;
    if (analysis.ownershipAnalysis.totalHolders > 1000) ownershipScore += 5;
    if (analysis.ownershipAnalysis.creatorHoldingPercentage < 20) ownershipScore += 5;
    if (analysis.ownershipAnalysis.distributionScore > 70) ownershipScore += 5;
    score += Math.min(ownershipScore, weights.OWNERSHIP);
  }
  
  // Creator Score (0-10 points)
  if (analysis.creatorAnalysis) {
    let creatorScore = 0;
    if (analysis.creatorAnalysis.walletAge > 30) creatorScore += 3;
    if (analysis.creatorAnalysis.recentTokenLaunches < 3) creatorScore += 3;
    if (analysis.creatorAnalysis.fundingSource === 'Organic') creatorScore += 2;
    if (analysis.creatorAnalysis.suspiciousActivity.length === 0) creatorScore += 2;
    score += Math.min(creatorScore, weights.CREATOR);
  }
  
  return Math.min(Math.max(score, 0), 100);
}

// Risk Level Determination
export function determineRiskLevel(trustScore: number): 'low' | 'medium' | 'high' {
  if (trustScore >= 70) return 'low';
  if (trustScore >= 40) return 'medium';
  return 'high';
} 