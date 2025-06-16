import {
  HELIUS_CONFIG,
  TokenMetadataSchema,
  AccountInfoSchema,
  TokenHoldersResponseSchema,
  SignaturesResponseSchema,
  TokenLargestAccountsResponseSchema,
  HeliusTokenMetadataSchema,
  HeliusErrorSchema,
  type TokenMetadata,
  type AccountInfo,
  type TokenHolder,
  type TransactionSignature,
  type TokenLargestAccount,
  type HeliusTokenMetadata,
  type RpcRequest,
  type RpcResponse,
  type TokenAnalysisData
} from './types';

export class HeliusApiClient {
  private rpcUrl: string;
  private restUrl: string;
  private apiKey: string;

  constructor() {
    this.rpcUrl = HELIUS_CONFIG.RPC_URL;
    this.restUrl = HELIUS_CONFIG.REST_URL;
    this.apiKey = HELIUS_CONFIG.API_KEY;
  }

  /**
   * Make RPC request to Helius
   */
  private async makeRpcRequest<T>(method: string, params: any[]): Promise<T> {
    const request: RpcRequest = {
      jsonrpc: '2.0',
      id: Math.floor(Math.random() * 1000000),
      method,
      params
    };

    try {
      const response = await fetch(this.rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: RpcResponse<T> = await response.json();

      if (data.error) {
        throw new Error(`RPC error: ${data.error.message} (${data.error.code})`);
      }

      if (!data.result) {
        throw new Error('No result in RPC response');
      }

      return data.result;
    } catch (error) {
      console.error('RPC request failed:', error);
      throw error;
    }
  }

  /**
   * Make REST API request to Helius
   */
  private async makeRestRequest<T>(endpoint: string): Promise<T> {
    try {
      const url = `${this.restUrl}${endpoint}?api-key=${this.apiKey}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('REST request failed:', error);
      throw error;
    }
  }

  /**
   * Get token metadata using Helius REST API
   */
  async getTokenMetadata(mintAddress: string): Promise<HeliusTokenMetadata> {
    try {
      const data = await this.makeRestRequest<HeliusTokenMetadata>(`/tokens/metadata?mints=${mintAddress}`);
      
      // Validate response
      const validated = HeliusTokenMetadataSchema.parse(data);
      return validated;
    } catch (error) {
      console.error('Failed to get token metadata:', error);
      throw new Error(`Failed to fetch token metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get mint account info (for mint/freeze authority)
   */
  async getMintAccountInfo(mintAddress: string): Promise<AccountInfo> {
    try {
      const data = await this.makeRpcRequest<AccountInfo>('getAccountInfo', [
        mintAddress,
        {
          encoding: 'jsonParsed',
          commitment: 'confirmed'
        }
      ]);

      const validated = AccountInfoSchema.parse(data);
      return validated;
    } catch (error) {
      console.error('Failed to get mint account info:', error);
      throw new Error(`Failed to fetch mint account info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get token largest accounts (top holders)
   */
  async getTokenLargestAccounts(mintAddress: string, limit: number = 10): Promise<TokenLargestAccount[]> {
    try {
      const data = await this.makeRpcRequest('getTokenLargestAccounts', [
        mintAddress,
        {
          commitment: 'confirmed'
        }
      ]);

      const validated = TokenLargestAccountsResponseSchema.parse(data);
      return validated.result.value.slice(0, limit);
    } catch (error) {
      console.error('Failed to get token largest accounts:', error);
      throw new Error(`Failed to fetch token holders: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get token holders using Helius REST API
   */
  async getTokenHolders(mintAddress: string, limit: number = 10): Promise<TokenHolder[]> {
    try {
      const data = await this.makeRestRequest<{ result: TokenHolder[] }>(`/token-holders?mint=${mintAddress}&limit=${limit}`);
      
      const validated = TokenHoldersResponseSchema.parse(data);
      return validated.result;
    } catch (error) {
      console.error('Failed to get token holders:', error);
      // Fallback to getTokenLargestAccounts if REST API fails
      try {
        const largestAccounts = await this.getTokenLargestAccounts(mintAddress, limit);
        return largestAccounts.map(account => ({
          address: account.address,
          amount: parseFloat(account.amount),
          decimals: account.decimals,
          uiAmount: account.uiAmount,
          uiAmountString: account.uiAmountString
        }));
      } catch (fallbackError) {
        throw new Error(`Failed to fetch token holders: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  /**
   * Get signatures for address (transaction history)
   */
  async getSignaturesForAddress(address: string, limit: number = 50): Promise<TransactionSignature[]> {
    try {
      const data = await this.makeRpcRequest<TransactionSignature[]>('getSignaturesForAddress', [
        address,
        {
          limit,
          commitment: 'confirmed'
        }
      ]);

      const validated = SignaturesResponseSchema.parse(data);
      return validated;
    } catch (error) {
      console.error('Failed to get signatures for address:', error);
      throw new Error(`Failed to fetch transaction history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate Solana mint address
   */
  validateMintAddress(address: string): boolean {
    // Base58 regex for Solana addresses (32-44 characters)
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    
    if (!address || typeof address !== 'string') return false;
    if (!base58Regex.test(address)) return false;
    if (address.startsWith('0x')) return false; // Reject Ethereum
    if (address.endsWith('.sol')) return false; // Reject .sol domains
    
    return true;
  }

  /**
   * Comprehensive token analysis
   */
  async analyzeToken(mintAddress: string): Promise<TokenAnalysisData> {
    if (!this.validateMintAddress(mintAddress)) {
      throw new Error('Invalid Solana mint address');
    }

    try {
      console.log(`Starting token analysis for: ${mintAddress}`);

      // Fetch all data in parallel
      const [metadata, mintInfo, holders] = await Promise.all([
        this.getTokenMetadata(mintAddress).catch(() => null),
        this.getMintAccountInfo(mintAddress).catch(() => null),
        this.getTokenHolders(mintAddress, 10).catch(() => [])
      ]);

      if (!metadata && !mintInfo) {
        throw new Error('Unable to fetch token data - token may not exist');
      }

      // Get creator signatures if we have metadata with creators
      let creatorSignatures: TransactionSignature[] = [];
      if (metadata?.creators && metadata.creators.length > 0) {
        try {
          const creatorAddress = metadata.creators[0].address;
          creatorSignatures = await this.getSignaturesForAddress(creatorAddress, 20);
        } catch (error) {
          console.warn('Failed to get creator signatures:', error);
        }
      }

      // Calculate trust score and risk flags
      const analysis = this.calculateTrustScore({
        metadata,
        mintInfo,
        holders,
        creatorSignatures
      });

      return {
        metadata: this.convertToTokenMetadata(metadata, mintInfo, mintAddress),
        mintInfo: mintInfo || this.createFallbackMintInfo(),
        holders,
        creatorSignatures,
        trustScore: analysis.trustScore,
        riskFlags: analysis.riskFlags,
        riskLevel: analysis.riskLevel
      };

    } catch (error) {
      console.error('Token analysis failed:', error);
      throw error;
    }
  }

  /**
   * Calculate trust score based on analysis data
   */
  private calculateTrustScore(data: {
    metadata: HeliusTokenMetadata | null;
    mintInfo: AccountInfo | null;
    holders: TokenHolder[];
    creatorSignatures: TransactionSignature[];
  }): { trustScore: number; riskFlags: string[]; riskLevel: 'low' | 'medium' | 'high' } {
    let score = 0;
    const riskFlags: string[] = [];

    // Metadata Analysis (20 points)
    if (data.metadata) {
      if (data.metadata.name && data.metadata.symbol) score += 5;
      if (data.metadata.description) score += 3;
      if (data.metadata.image) score += 2;
      if (data.metadata.metadataUri) score += 5;
      if (data.metadata.creators && data.metadata.creators.length > 0) score += 5;
    } else {
      riskFlags.push('No metadata found');
    }

    // Authority Analysis (30 points)
    if (data.mintInfo?.data?.parsed?.info) {
      const info = data.mintInfo.data.parsed.info;
      
      if (info.mintAuthority === null) {
        score += 15;
      } else {
        riskFlags.push('Mint authority is NOT burned');
      }
      
      if (info.freezeAuthority === null) {
        score += 10;
      } else {
        riskFlags.push('Freeze authority is active');
      }
      
      if (data.metadata?.isMutable === false) {
        score += 5;
      } else {
        riskFlags.push('Update authority is mutable');
      }
    }

    // Distribution Analysis (30 points)
    if (data.holders.length > 0) {
      const totalSupply = data.holders.reduce((sum, holder) => sum + holder.uiAmount, 0);
      
      if (data.holders.length >= 100) {
        score += 10;
      } else if (data.holders.length >= 50) {
        score += 5;
      } else {
        riskFlags.push(`Only ${data.holders.length} holders`);
      }
      
      // Check top holder concentration
      const topHolderPercent = totalSupply > 0 ? (data.holders[0]?.uiAmount || 0) / totalSupply * 100 : 0;
      const top3Percent = totalSupply > 0 ? 
        data.holders.slice(0, 3).reduce((sum, holder) => sum + holder.uiAmount, 0) / totalSupply * 100 : 0;
      
      if (topHolderPercent < 20) {
        score += 10;
      } else if (topHolderPercent < 50) {
        score += 5;
      } else {
        riskFlags.push(`Top holder owns ${topHolderPercent.toFixed(1)}% of supply`);
      }
      
      if (top3Percent < 50) {
        score += 10;
      } else {
        riskFlags.push(`Top 3 holders own ${top3Percent.toFixed(1)}% of supply`);
      }
    }

    // Creator Analysis (20 points)
    if (data.creatorSignatures.length > 0) {
      const recentSigs = data.creatorSignatures.filter(sig => 
        sig.blockTime && sig.blockTime > Date.now() / 1000 - (30 * 24 * 60 * 60) // Last 30 days
      );
      
      if (recentSigs.length < 10) {
        score += 10;
      } else if (recentSigs.length < 50) {
        score += 5;
      } else {
        riskFlags.push(`Creator has ${recentSigs.length} recent transactions`);
      }
      
      // Check for rapid token creation patterns
      const mintTransactions = recentSigs.filter(sig => 
        sig.memo?.includes('mint') || sig.memo?.includes('create')
      );
      
      if (mintTransactions.length < 3) {
        score += 10;
      } else {
        riskFlags.push(`Creator created ${mintTransactions.length} tokens recently`);
      }
    }

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high';
    if (score >= 70) riskLevel = 'low';
    else if (score >= 40) riskLevel = 'medium';
    else riskLevel = 'high';

    return {
      trustScore: Math.min(Math.max(score, 0), 100),
      riskFlags,
      riskLevel
    };
  }

  /**
   * Convert HeliusTokenMetadata to TokenMetadata format
   */
  private convertToTokenMetadata(
    metadata: HeliusTokenMetadata | null, 
    mintInfo: AccountInfo | null, 
    mintAddress: string
  ): TokenMetadata {
    if (metadata) {
      return {
        mint: metadata.mint,
        name: metadata.name,
        symbol: metadata.symbol,
        description: metadata.description,
        image: metadata.image,
        decimals: metadata.decimals,
        supply: metadata.supply,
        creators: metadata.creators,
        tokenStandard: metadata.tokenStandard,
        metadataUri: metadata.metadataUri,
        updateAuthority: metadata.updateAuthority,
        mintAuthority: mintInfo?.data?.parsed?.info?.mintAuthority || null,
        freezeAuthority: mintInfo?.data?.parsed?.info?.freezeAuthority || null,
        isMutable: metadata.isMutable
      };
    }
    
    return this.createFallbackMetadata(mintAddress, mintInfo);
  }

  /**
   * Create fallback metadata when REST API fails
   */
  private createFallbackMetadata(mintAddress: string, mintInfo: AccountInfo | null): TokenMetadata {
    return {
      mint: mintAddress,
      name: 'Unknown Token',
      symbol: 'UNK',
      decimals: mintInfo?.data?.parsed?.info?.decimals || 9,
      supply: mintInfo?.data?.parsed?.info?.supply ? parseInt(mintInfo.data.parsed.info.supply) : 0,
      mintAuthority: mintInfo?.data?.parsed?.info?.mintAuthority || null,
      freezeAuthority: mintInfo?.data?.parsed?.info?.freezeAuthority || null
    };
  }

  /**
   * Create fallback mint info
   */
  private createFallbackMintInfo(): AccountInfo {
    return {
      data: {
        parsed: {
          info: {
            mintAuthority: null,
            freezeAuthority: null,
            supply: '0',
            decimals: 9,
            isInitialized: false
          }
        }
      },
      executable: false,
      lamports: 0,
      owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
      rentEpoch: 0
    };
  }
}

// Export singleton instance
export const heliusClient = new HeliusApiClient(); 