import { z } from 'zod';

// Helius API Configuration
export const HELIUS_CONFIG = {
  RPC_URL: 'https://mainnet.helius-rpc.com/?api-key=5e390e48-0c3b-4dd8-89a9-7736ce552c38',
  REST_URL: 'https://api.helius.xyz/v0',
  API_KEY: '5e390e48-0c3b-4dd8-89a9-7736ce552c38'
} as const;

// Token Metadata Schema
export const TokenMetadataSchema = z.object({
  mint: z.string(),
  name: z.string(),
  symbol: z.string(),
  description: z.string().optional(),
  image: z.string().optional(),
  decimals: z.number(),
  supply: z.number(),
  creators: z.array(z.object({
    address: z.string(),
    verified: z.boolean(),
    share: z.number()
  })).optional(),
  tokenStandard: z.string().optional(),
  metadataUri: z.string().optional(),
  updateAuthority: z.string().optional(),
  mintAuthority: z.string().nullable(),
  freezeAuthority: z.string().nullable(),
  isMutable: z.boolean().optional()
});

// Token Holder Schema
export const TokenHolderSchema = z.object({
  address: z.string(),
  amount: z.number(),
  decimals: z.number(),
  uiAmount: z.number(),
  uiAmountString: z.string()
});

export const TokenHoldersResponseSchema = z.object({
  result: z.array(TokenHolderSchema)
});

// Account Info Schema (for mint/freeze authority checks)
export const AccountInfoSchema = z.object({
  data: z.object({
    parsed: z.object({
      info: z.object({
        mintAuthority: z.string().nullable(),
        freezeAuthority: z.string().nullable(),
        supply: z.string(),
        decimals: z.number(),
        isInitialized: z.boolean()
      })
    })
  }).optional(),
  executable: z.boolean(),
  lamports: z.number(),
  owner: z.string(),
  rentEpoch: z.number()
});

// Transaction Signature Schema
export const TransactionSignatureSchema = z.object({
  signature: z.string(),
  slot: z.number(),
  err: z.any().nullable(),
  memo: z.string().nullable(),
  blockTime: z.number().nullable(),
  confirmationStatus: z.string().optional()
});

export const SignaturesResponseSchema = z.array(TransactionSignatureSchema);

// Token Largest Accounts Schema
export const TokenLargestAccountSchema = z.object({
  address: z.string(),
  amount: z.string(),
  decimals: z.number(),
  uiAmount: z.number(),
  uiAmountString: z.string()
});

export const TokenLargestAccountsResponseSchema = z.object({
  result: z.object({
    value: z.array(TokenLargestAccountSchema)
  })
});

// Helius REST API Token Metadata Schema
export const HeliusTokenMetadataSchema = z.object({
  mint: z.string(),
  name: z.string(),
  symbol: z.string(),
  description: z.string().optional(),
  image: z.string().optional(),
  decimals: z.number(),
  supply: z.number(),
  creators: z.array(z.object({
    address: z.string(),
    verified: z.boolean(),
    share: z.number()
  })).optional(),
  tokenStandard: z.string().optional(),
  metadataUri: z.string().optional(),
  updateAuthority: z.string().optional(),
  isMutable: z.boolean().optional(),
  primarySaleHappened: z.boolean().optional(),
  sellerFeeBasisPoints: z.number().optional()
});

// Error Response Schema
export const HeliusErrorSchema = z.object({
  error: z.object({
    code: z.number(),
    message: z.string()
  })
});

// Export Types
export type TokenMetadata = z.infer<typeof TokenMetadataSchema>;
export type TokenHolder = z.infer<typeof TokenHolderSchema>;
export type TokenHoldersResponse = z.infer<typeof TokenHoldersResponseSchema>;
export type AccountInfo = z.infer<typeof AccountInfoSchema>;
export type TransactionSignature = z.infer<typeof TransactionSignatureSchema>;
export type SignaturesResponse = z.infer<typeof SignaturesResponseSchema>;
export type TokenLargestAccount = z.infer<typeof TokenLargestAccountSchema>;
export type TokenLargestAccountsResponse = z.infer<typeof TokenLargestAccountsResponseSchema>;
export type HeliusTokenMetadata = z.infer<typeof HeliusTokenMetadataSchema>;
export type HeliusError = z.infer<typeof HeliusErrorSchema>;

// RPC Request/Response Types
export interface RpcRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params: any[];
}

export interface RpcResponse<T = any> {
  jsonrpc: '2.0';
  id: number;
  result?: T;
  error?: {
    code: number;
    message: string;
  };
}

// Token Analysis Result Types
export interface TokenAnalysisData {
  metadata: TokenMetadata;
  mintInfo: AccountInfo;
  holders: TokenHolder[];
  creatorSignatures: TransactionSignature[];
  trustScore: number;
  riskFlags: string[];
  riskLevel: 'low' | 'medium' | 'high';
} 