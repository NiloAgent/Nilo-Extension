import { z } from 'zod';

// Base Solana types
export const SolanaAddressSchema = z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
export const SolanaHashSchema = z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{64,88}$/);

// Token Transfer Schema
export const TokenTransferSchema = z.object({
  Transaction: z.object({
    Signature: SolanaHashSchema,
    Result: z.object({
      Success: z.boolean()
    }),
    Block: z.object({
      Time: z.string().datetime()
    })
  }),
  Transfer: z.object({
    Amount: z.number(),
    Currency: z.object({
      Symbol: z.string(),
      Name: z.string(),
      MintAddress: SolanaAddressSchema
    }),
    Sender: SolanaAddressSchema,
    Receiver: SolanaAddressSchema
  })
});

export type TokenTransfer = z.infer<typeof TokenTransferSchema>;

// Top Holder Schema
export const TopHolderSchema = z.object({
  Balance: z.object({
    Amount: z.number()
  }),
  BalanceUpdate: z.object({
    Account: SolanaAddressSchema,
    Currency: z.object({
      Symbol: z.string(),
      Name: z.string(),
      MintAddress: SolanaAddressSchema
    })
  })
});

export type TopHolder = z.infer<typeof TopHolderSchema>;

// DEX Trade Schema
export const DexTradeSchema = z.object({
  Transaction: z.object({
    Signature: SolanaHashSchema,
    Block: z.object({
      Time: z.string().datetime()
    })
  }),
  Trade: z.object({
    Buy: z.object({
      Amount: z.number(),
      Currency: z.object({
        Symbol: z.string(),
        MintAddress: SolanaAddressSchema
      }),
      Account: SolanaAddressSchema
    }),
    Sell: z.object({
      Amount: z.number(),
      Currency: z.object({
        Symbol: z.string(),
        MintAddress: SolanaAddressSchema
      }),
      Account: SolanaAddressSchema
    }),
    Dex: z.object({
      ProgramAddress: SolanaAddressSchema,
      ProtocolName: z.string(),
      ProtocolFamily: z.string()
    })
  })
});

export type DexTrade = z.infer<typeof DexTradeSchema>;

// Creator Wallet Transaction Schema
export const CreatorTransactionSchema = z.object({
  Transaction: z.object({
    Signature: SolanaHashSchema,
    Block: z.object({
      Time: z.string().datetime(),
      Height: z.number()
    }),
    Result: z.object({
      Success: z.boolean()
    }),
    Signer: SolanaAddressSchema
  }),
  Instruction: z.object({
    Program: z.object({
      Address: SolanaAddressSchema,
      Name: z.string().optional()
    }),
    InstructionType: z.string()
  }).optional()
});

export type CreatorTransaction = z.infer<typeof CreatorTransactionSchema>;

// Token Metadata Schema
export const TokenMetadataSchema = z.object({
  Currency: z.object({
    Symbol: z.string(),
    Name: z.string(),
    MintAddress: SolanaAddressSchema,
    Decimals: z.number(),
    Uri: z.string().url().optional()
  }),
  BalanceUpdate: z.object({
    Account: SolanaAddressSchema // This would be the creator/authority
  }).optional()
});

export type TokenMetadata = z.infer<typeof TokenMetadataSchema>;

// Liquidity Pool Schema
export const LiquidityPoolSchema = z.object({
  Transaction: z.object({
    Signature: SolanaHashSchema,
    Block: z.object({
      Time: z.string().datetime()
    })
  }),
  Instruction: z.object({
    Program: z.object({
      Address: SolanaAddressSchema,
      Name: z.string()
    }),
    InstructionType: z.string(),
    Data: z.string().optional()
  }),
  BalanceUpdate: z.array(z.object({
    Account: SolanaAddressSchema,
    Amount: z.number(),
    Currency: z.object({
      Symbol: z.string(),
      MintAddress: SolanaAddressSchema
    })
  }))
});

export type LiquidityPool = z.infer<typeof LiquidityPoolSchema>;

// Aggregated Analysis Types
export interface TokenAnalysisData {
  mintAddress: string;
  transfers: TokenTransfer[];
  topHolders: TopHolder[];
  dexTrades: DexTrade[];
  creatorTransactions: CreatorTransaction[];
  metadata: TokenMetadata | null;
  liquidityPools: LiquidityPool[];
}

export interface HolderAnalysis {
  address: string;
  balance: number;
  percentage: number;
  isRisky: boolean;
}

export interface CreatorAnalysis {
  address: string;
  walletAge: number; // days
  firstSeenBlock: number;
  totalTokensCreated: number;
  suspiciousActivity: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

export interface DexAnalysis {
  totalTrades: number;
  uniqueTraders: number;
  volume24h: number;
  priceChange24h: number;
  liquidityScore: number;
  activeDexes: string[];
}

export interface TokenRiskReport {
  mintAddress: string;
  tokenName: string;
  tokenSymbol: string;
  overallRiskScore: number; // 0-100
  riskLevel: 'safe' | 'suspicious' | 'dangerous';
  riskFactors: string[];
  holderAnalysis: HolderAnalysis[];
  creatorAnalysis: CreatorAnalysis;
  dexAnalysis: DexAnalysis;
  lastUpdated: Date;
}

// GraphQL Query Response Types
export interface TokenTransfersResponse {
  solana: {
    transfers: TokenTransfer[];
  };
}

export interface TopHoldersResponse {
  solana: {
    balanceUpdates: TopHolder[];
  };
}

export interface DexTradesResponse {
  solana: {
    dexTrades: DexTrade[];
  };
}

export interface CreatorTransactionsResponse {
  solana: {
    transactions: CreatorTransaction[];
  };
}

export interface TokenMetadataResponse {
  solana: {
    balanceUpdates: TokenMetadata[];
  };
}

export interface LiquidityPoolsResponse {
  solana: {
    instructions: LiquidityPool[];
  };
}

// Validation helpers
export function validateSolanaAddress(address: string): boolean {
  return SolanaAddressSchema.safeParse(address).success;
}

export function validateTokenTransfers(data: unknown): TokenTransfer[] {
  try {
    return z.array(TokenTransferSchema).parse(data);
  } catch {
    return [];
  }
}

export function validateTopHolders(data: unknown): TopHolder[] {
  try {
    return z.array(TopHolderSchema).parse(data);
  } catch {
    return [];
  }
}

export function validateDexTrades(data: unknown): DexTrade[] {
  try {
    return z.array(DexTradeSchema).parse(data);
  } catch {
    return [];
  }
} 