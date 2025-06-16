import { bitqueryClient, safeBitqueryCall } from './client';
import { GET_TOP_HOLDERS } from './queries';
import { 
  TopHolder, 
  TopHoldersResponse,
  HolderAnalysis,
  validateTopHolders,
  validateSolanaAddress 
} from './types';

export interface TopHoldersAnalysis {
  holders: HolderAnalysis[];
  totalHolders: number;
  concentrationRisk: 'low' | 'medium' | 'high';
  top1Percentage: number;
  top3Percentage: number;
  top10Percentage: number;
  riskFactors: string[];
}

export async function fetchTopHolders(
  mintAddress: string,
  limit: number = 10
): Promise<TopHolder[]> {
  if (!validateSolanaAddress(mintAddress)) {
    throw new Error('Invalid Solana mint address');
  }

  return safeBitqueryCall(
    async () => {
      const response = await bitqueryClient.query<TopHoldersResponse>(
        GET_TOP_HOLDERS,
        { mintAddress, limit }
      );

      if (!response.data?.solana?.balanceUpdates) {
        return [];
      }

      return validateTopHolders(response.data.solana.balanceUpdates);
    },
    [],
    'Failed to fetch top holders'
  );
}

export async function analyzeTopHolders(
  mintAddress: string
): Promise<TopHoldersAnalysis> {
  const holders = await fetchTopHolders(mintAddress, 20);
  
  if (holders.length === 0) {
    return {
      holders: [],
      totalHolders: 0,
      concentrationRisk: 'high',
      top1Percentage: 0,
      top3Percentage: 0,
      top10Percentage: 0,
      riskFactors: ['No holder data available']
    };
  }

  // Calculate total supply from holders
  const totalSupply = holders.reduce((sum, holder) => sum + holder.Balance.Amount, 0);
  
  // Convert to HolderAnalysis format with percentages
  const holderAnalysis: HolderAnalysis[] = holders.map((holder, index) => {
    const percentage = totalSupply > 0 ? (holder.Balance.Amount / totalSupply) * 100 : 0;
    
    return {
      address: holder.BalanceUpdate.Account,
      balance: holder.Balance.Amount,
      percentage,
      isRisky: percentage > 10 || (index < 3 && percentage > 5) // Top holder >10% or top 3 >5%
    };
  });

  // Calculate concentration metrics
  const top1Percentage = holderAnalysis[0]?.percentage || 0;
  const top3Percentage = holderAnalysis.slice(0, 3).reduce((sum, h) => sum + h.percentage, 0);
  const top10Percentage = holderAnalysis.slice(0, 10).reduce((sum, h) => sum + h.percentage, 0);

  // Determine concentration risk
  let concentrationRisk: 'low' | 'medium' | 'high';
  if (top1Percentage > 50 || top3Percentage > 70) {
    concentrationRisk = 'high';
  } else if (top1Percentage > 20 || top3Percentage > 40) {
    concentrationRisk = 'medium';
  } else {
    concentrationRisk = 'low';
  }

  // Identify risk factors
  const riskFactors: string[] = [];

  if (top1Percentage > 50) {
    riskFactors.push(`Top holder owns ${top1Percentage.toFixed(1)}% of supply`);
  } else if (top1Percentage > 30) {
    riskFactors.push(`Top holder owns ${top1Percentage.toFixed(1)}% of supply (high concentration)`);
  }

  if (top3Percentage > 70) {
    riskFactors.push(`Top 3 holders own ${top3Percentage.toFixed(1)}% of supply`);
  } else if (top3Percentage > 50) {
    riskFactors.push(`Top 3 holders own ${top3Percentage.toFixed(1)}% of supply (concerning)`);
  }

  if (holders.length < 10) {
    riskFactors.push(`Only ${holders.length} holders detected (very low distribution)`);
  } else if (holders.length < 50) {
    riskFactors.push(`Only ${holders.length} holders detected (low distribution)`);
  }

  // Check for potential burn addresses or known addresses
  const potentialBurnAddresses = holderAnalysis.filter(h => 
    h.address.startsWith('1111111') || 
    h.address === '11111111111111111111111111111112' ||
    h.address.includes('burn') ||
    h.address.includes('dead')
  );

  if (potentialBurnAddresses.length > 0) {
    const burnPercentage = potentialBurnAddresses.reduce((sum, h) => sum + h.percentage, 0);
    if (burnPercentage > 10) {
      // This is actually good - tokens are burned
      riskFactors.push(`${burnPercentage.toFixed(1)}% of supply appears to be burned (positive)`);
    }
  }

  // Check for identical balances (potential sybil attack)
  const balanceGroups = holderAnalysis.reduce((acc, holder) => {
    const balance = holder.balance.toString();
    acc[balance] = (acc[balance] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const duplicateBalances = Object.entries(balanceGroups).filter(([, count]) => count > 1);
  if (duplicateBalances.length > 0) {
    riskFactors.push(`${duplicateBalances.length} groups of holders with identical balances (potential sybil)`);
  }

  return {
    holders: holderAnalysis,
    totalHolders: holders.length,
    concentrationRisk,
    top1Percentage,
    top3Percentage,
    top10Percentage,
    riskFactors
  };
}

export function formatHolderBalance(balance: number, decimals: number = 9): string {
  const adjustedBalance = balance / Math.pow(10, decimals);
  
  if (adjustedBalance >= 1e9) {
    return `${(adjustedBalance / 1e9).toFixed(2)}B`;
  } else if (adjustedBalance >= 1e6) {
    return `${(adjustedBalance / 1e6).toFixed(2)}M`;
  } else if (adjustedBalance >= 1e3) {
    return `${(adjustedBalance / 1e3).toFixed(2)}K`;
  }
  
  return adjustedBalance.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function getHolderRiskLevel(percentage: number): 'low' | 'medium' | 'high' {
  if (percentage > 30) return 'high';
  if (percentage > 10) return 'medium';
  return 'low';
}

export function shortenAddress(address: string, chars: number = 4): string {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
} 