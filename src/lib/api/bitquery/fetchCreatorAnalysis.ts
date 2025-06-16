import { bitqueryClient, safeBitqueryCall } from './client';
import { 
  GET_CREATOR_TRANSACTIONS, 
  GET_TOKEN_CREATION_INFO, 
  GET_WALLET_TOKEN_CREATIONS 
} from './queries';
import { 
  CreatorTransaction, 
  CreatorTransactionsResponse,
  CreatorAnalysis,
  validateSolanaAddress 
} from './types';

export interface CreatorAnalysisResult {
  creatorAddress: string;
  walletAge: number; // days
  firstSeenBlock: number;
  firstSeenDate: Date;
  totalTransactions: number;
  totalTokensCreated: number;
  recentTokenCreations: number; // last 30 days
  suspiciousActivity: string[];
  riskLevel: 'low' | 'medium' | 'high';
  riskScore: number; // 0-100
}

export async function fetchCreatorTransactions(
  creatorAddress: string,
  limit: number = 100
): Promise<CreatorTransaction[]> {
  if (!validateSolanaAddress(creatorAddress)) {
    throw new Error('Invalid Solana creator address');
  }

  return safeBitqueryCall(
    async () => {
      const response = await bitqueryClient.query<CreatorTransactionsResponse>(
        GET_CREATOR_TRANSACTIONS,
        { creatorAddress, limit }
      );

      if (!response.data?.solana?.transactions) {
        return [];
      }

      return response.data.solana.transactions;
    },
    [],
    'Failed to fetch creator transactions'
  );
}

export async function fetchTokenCreationInfo(mintAddress: string) {
  if (!validateSolanaAddress(mintAddress)) {
    throw new Error('Invalid Solana mint address');
  }

  return safeBitqueryCall(
    async () => {
      const response = await bitqueryClient.query(
        GET_TOKEN_CREATION_INFO,
        { mintAddress }
      );

      return response.data?.solana?.instructions?.[0] || null;
    },
    null,
    'Failed to fetch token creation info'
  );
}

export async function fetchWalletTokenCreations(
  walletAddress: string,
  limit: number = 50
): Promise<any[]> {
  if (!validateSolanaAddress(walletAddress)) {
    throw new Error('Invalid Solana wallet address');
  }

  return safeBitqueryCall(
    async () => {
      const response = await bitqueryClient.query(
        GET_WALLET_TOKEN_CREATIONS,
        { walletAddress, limit }
      );

      return response.data?.solana?.instructions || [];
    },
    [],
    'Failed to fetch wallet token creations'
  );
}

export async function analyzeCreator(mintAddress: string): Promise<CreatorAnalysisResult | null> {
  // First, get the token creation info to find the creator
  const tokenCreationInfo = await fetchTokenCreationInfo(mintAddress);
  
  if (!tokenCreationInfo?.Transaction?.Signer) {
    return null;
  }

  const creatorAddress = tokenCreationInfo.Transaction.Signer;
  
  // Fetch creator's transaction history and token creations
  const [creatorTransactions, tokenCreations] = await Promise.all([
    fetchCreatorTransactions(creatorAddress, 200),
    fetchWalletTokenCreations(creatorAddress, 100)
  ]);

  if (creatorTransactions.length === 0) {
    return {
      creatorAddress,
      walletAge: 0,
      firstSeenBlock: 0,
      firstSeenDate: new Date(),
      totalTransactions: 0,
      totalTokensCreated: tokenCreations.length,
      recentTokenCreations: 0,
      suspiciousActivity: ['No transaction history found'],
      riskLevel: 'high',
      riskScore: 0
    };
  }

  // Sort transactions by block time to find the first one
  const sortedTransactions = creatorTransactions.sort((a, b) => 
    a.Transaction.Block.Height - b.Transaction.Block.Height
  );

  const firstTransaction = sortedTransactions[0];
  const firstSeenDate = new Date(firstTransaction.Transaction.Block.Time);
  const walletAge = Math.floor((Date.now() - firstSeenDate.getTime()) / (1000 * 60 * 60 * 24));

  // Count recent token creations (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentTokenCreations = tokenCreations.filter(creation => 
    new Date(creation.Transaction.Block.Time) > thirtyDaysAgo
  ).length;

  // Analyze suspicious activity
  const suspiciousActivity = analyzeSuspiciousActivity(
    creatorTransactions,
    tokenCreations,
    walletAge
  );

  // Calculate risk score
  const riskScore = calculateCreatorRiskScore(
    walletAge,
    creatorTransactions.length,
    tokenCreations.length,
    recentTokenCreations,
    suspiciousActivity.length
  );

  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high';
  if (riskScore >= 70) riskLevel = 'low';
  else if (riskScore >= 40) riskLevel = 'medium';
  else riskLevel = 'high';

  return {
    creatorAddress,
    walletAge,
    firstSeenBlock: firstTransaction.Transaction.Block.Height,
    firstSeenDate,
    totalTransactions: creatorTransactions.length,
    totalTokensCreated: tokenCreations.length,
    recentTokenCreations,
    suspiciousActivity,
    riskLevel,
    riskScore
  };
}

function analyzeSuspiciousActivity(
  transactions: CreatorTransaction[],
  tokenCreations: any[],
  walletAge: number
): string[] {
  const suspicious: string[] = [];

  // Very new wallet
  if (walletAge < 7) {
    suspicious.push(`Wallet created only ${walletAge} days ago`);
  }

  // Too many token creations
  if (tokenCreations.length > 10) {
    suspicious.push(`Created ${tokenCreations.length} tokens (potential token spammer)`);
  }

  // Recent burst of token creations
  const recentCreations = tokenCreations.filter(creation => {
    const creationDate = new Date(creation.Transaction.Block.Time);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return creationDate > sevenDaysAgo;
  });

  if (recentCreations.length > 3) {
    suspicious.push(`Created ${recentCreations.length} tokens in the last 7 days`);
  }

  // Check for rapid token creation pattern
  if (tokenCreations.length > 1) {
    const creationTimes = tokenCreations
      .map(c => new Date(c.Transaction.Block.Time).getTime())
      .sort((a, b) => a - b);

    const rapidCreations = creationTimes.filter((time, i) => {
      if (i === 0) return false;
      return time - creationTimes[i - 1] < 24 * 60 * 60 * 1000; // Less than 24 hours apart
    });

    if (rapidCreations.length > tokenCreations.length * 0.5) {
      suspicious.push('Rapid token creation pattern detected');
    }
  }

  // Low transaction count relative to wallet age
  const expectedTransactions = Math.max(walletAge / 7, 1); // At least 1 tx per week
  if (transactions.length < expectedTransactions && walletAge > 30) {
    suspicious.push('Unusually low activity for wallet age');
  }

  // Check for contract creation loops
  const contractCreations = transactions.filter(tx => 
    tx.Instruction?.InstructionType?.includes('create') ||
    tx.Instruction?.InstructionType?.includes('initialize') ||
    tx.Instruction?.Program?.Address === 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
  );

  if (contractCreations.length > transactions.length * 0.8) {
    suspicious.push('Wallet primarily used for contract/token creation');
  }

  // Check for identical transaction patterns (potential bot)
  const instructionTypes = transactions.map(tx => tx.Instruction?.InstructionType).filter(Boolean);
  const uniqueInstructions = new Set(instructionTypes);
  
  if (instructionTypes.length > 10 && uniqueInstructions.size < 3) {
    suspicious.push('Repetitive transaction patterns (potential bot activity)');
  }

  return suspicious;
}

function calculateCreatorRiskScore(
  walletAge: number,
  totalTransactions: number,
  totalTokensCreated: number,
  recentTokenCreations: number,
  suspiciousActivityCount: number
): number {
  let score = 100;

  // Deduct points for young wallet
  if (walletAge < 7) score -= 40;
  else if (walletAge < 30) score -= 20;
  else if (walletAge < 90) score -= 10;

  // Deduct points for too many token creations
  if (totalTokensCreated > 20) score -= 30;
  else if (totalTokensCreated > 10) score -= 20;
  else if (totalTokensCreated > 5) score -= 10;

  // Deduct points for recent token spam
  if (recentTokenCreations > 5) score -= 25;
  else if (recentTokenCreations > 3) score -= 15;
  else if (recentTokenCreations > 1) score -= 5;

  // Deduct points for low activity
  const expectedActivity = Math.max(walletAge / 7, 1);
  if (totalTransactions < expectedActivity * 0.5) score -= 15;

  // Deduct points for each suspicious activity
  score -= suspiciousActivityCount * 10;

  // Bonus points for established wallets with reasonable activity
  if (walletAge > 180 && totalTokensCreated <= 3 && totalTransactions > 50) {
    score += 10;
  }

  return Math.max(0, Math.min(100, score));
}

export function formatWalletAge(days: number): string {
  if (days < 1) return 'Less than 1 day';
  if (days === 1) return '1 day';
  if (days < 7) return `${days} days`;
  if (days < 30) return `${Math.floor(days / 7)} weeks`;
  if (days < 365) return `${Math.floor(days / 30)} months`;
  return `${Math.floor(days / 365)} years`;
}

export function getCreatorRiskLevel(riskScore: number): 'low' | 'medium' | 'high' {
  if (riskScore >= 70) return 'low';
  if (riskScore >= 40) return 'medium';
  return 'high';
} 