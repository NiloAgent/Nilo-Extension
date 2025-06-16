import { bitqueryClient, safeBitqueryCall } from './client';
import { GET_TOKEN_TRANSFERS, GET_RECENT_ACTIVITY } from './queries';
import { 
  TokenTransfer, 
  TokenTransfersResponse,
  validateTokenTransfers,
  validateSolanaAddress 
} from './types';

export interface TokenTransferAnalysis {
  transfers: TokenTransfer[];
  totalTransfers: number;
  uniqueSenders: number;
  uniqueReceivers: number;
  recentActivity24h: number;
  averageTransferAmount: number;
  suspiciousPatterns: string[];
}

export async function fetchTokenTransfers(
  mintAddress: string,
  limit: number = 50
): Promise<TokenTransfer[]> {
  if (!validateSolanaAddress(mintAddress)) {
    throw new Error('Invalid Solana mint address');
  }

  return safeBitqueryCall(
    async () => {
      const response = await bitqueryClient.query<TokenTransfersResponse>(
        GET_TOKEN_TRANSFERS,
        { mintAddress, limit }
      );

      if (!response.data?.solana?.transfers) {
        return [];
      }

      return validateTokenTransfers(response.data.solana.transfers);
    },
    [],
    'Failed to fetch token transfers'
  );
}

export async function fetchRecentActivity(
  mintAddress: string,
  hours: number = 24
): Promise<TokenTransfer[]> {
  if (!validateSolanaAddress(mintAddress)) {
    throw new Error('Invalid Solana mint address');
  }

  return safeBitqueryCall(
    async () => {
      const response = await bitqueryClient.query<TokenTransfersResponse>(
        GET_RECENT_ACTIVITY,
        { mintAddress, hours }
      );

      if (!response.data?.solana?.transfers) {
        return [];
      }

      return validateTokenTransfers(response.data.solana.transfers);
    },
    [],
    'Failed to fetch recent activity'
  );
}

export async function analyzeTokenTransfers(
  mintAddress: string
): Promise<TokenTransferAnalysis> {
  const [transfers, recentTransfers] = await Promise.all([
    fetchTokenTransfers(mintAddress, 100),
    fetchRecentActivity(mintAddress, 24)
  ]);

  const uniqueSenders = new Set(transfers.map(t => t.Transfer.Sender)).size;
  const uniqueReceivers = new Set(transfers.map(t => t.Transfer.Receiver)).size;
  
  const totalAmount = transfers.reduce((sum, t) => sum + t.Transfer.Amount, 0);
  const averageTransferAmount = transfers.length > 0 ? totalAmount / transfers.length : 0;

  // Detect suspicious patterns
  const suspiciousPatterns: string[] = [];

  // Check for circular transfers (same sender/receiver)
  const circularTransfers = transfers.filter(t => t.Transfer.Sender === t.Transfer.Receiver);
  if (circularTransfers.length > transfers.length * 0.1) {
    suspiciousPatterns.push(`${circularTransfers.length} circular transfers detected`);
  }

  // Check for whale concentration
  const senderCounts = transfers.reduce((acc, t) => {
    acc[t.Transfer.Sender] = (acc[t.Transfer.Sender] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topSender = Object.entries(senderCounts).sort(([,a], [,b]) => b - a)[0];
  if (topSender && topSender[1] > transfers.length * 0.3) {
    suspiciousPatterns.push(`Single address responsible for ${((topSender[1] / transfers.length) * 100).toFixed(1)}% of transfers`);
  }

  // Check for rapid-fire transactions
  const rapidTransactions = transfers.filter((t, i) => {
    if (i === 0) return false;
    const prevTime = new Date(transfers[i - 1].Transaction.Block.Time);
    const currTime = new Date(t.Transaction.Block.Time);
    return Math.abs(currTime.getTime() - prevTime.getTime()) < 5000; // 5 seconds
  });

  if (rapidTransactions.length > 10) {
    suspiciousPatterns.push(`${rapidTransactions.length} rapid-fire transactions detected`);
  }

  // Check for low activity
  if (transfers.length < 10) {
    suspiciousPatterns.push('Very low transfer activity');
  }

  return {
    transfers,
    totalTransfers: transfers.length,
    uniqueSenders,
    uniqueReceivers,
    recentActivity24h: recentTransfers.length,
    averageTransferAmount,
    suspiciousPatterns
  };
}

export function formatTransferAmount(amount: number, decimals: number = 9): string {
  const adjustedAmount = amount / Math.pow(10, decimals);
  
  if (adjustedAmount >= 1e9) {
    return `${(adjustedAmount / 1e9).toFixed(2)}B`;
  } else if (adjustedAmount >= 1e6) {
    return `${(adjustedAmount / 1e6).toFixed(2)}M`;
  } else if (adjustedAmount >= 1e3) {
    return `${(adjustedAmount / 1e3).toFixed(2)}K`;
  }
  
  return adjustedAmount.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function getTransferDirection(transfer: TokenTransfer, userAddress?: string): 'in' | 'out' | 'other' {
  if (!userAddress) return 'other';
  
  if (transfer.Transfer.Receiver === userAddress) return 'in';
  if (transfer.Transfer.Sender === userAddress) return 'out';
  return 'other';
} 