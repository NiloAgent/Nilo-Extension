import { 
  TokenAnalysisData, 
  TokenRiskReport, 
  validateSolanaAddress 
} from './types';
import { analyzeTokenTransfers } from './fetchTokenTransfers';
import { analyzeTopHolders } from './fetchTopHolders';
import { analyzeDexTrades } from './fetchDexTrades';
import { analyzeCreator } from './fetchCreatorAnalysis';
import { bitqueryClient, safeBitqueryCall } from './client';
import { GET_TOKEN_METADATA } from './queries';

export interface ComprehensiveTokenAnalysis {
  mintAddress: string;
  tokenName: string;
  tokenSymbol: string;
  riskReport: TokenRiskReport;
  transferAnalysis: any;
  holderAnalysis: any;
  dexAnalysis: any;
  creatorAnalysis: any;
  metadata: any;
}

export async function analyzeToken(mintAddress: string): Promise<ComprehensiveTokenAnalysis> {
  if (!validateSolanaAddress(mintAddress)) {
    throw new Error('Invalid Solana mint address');
  }

  console.log(`Starting comprehensive analysis for token: ${mintAddress}`);

  // Fetch all data in parallel for better performance
  const [
    transferAnalysis,
    holderAnalysis,
    dexAnalysis,
    creatorAnalysis,
    metadata
  ] = await Promise.allSettled([
    analyzeTokenTransfers(mintAddress),
    analyzeTopHolders(mintAddress),
    analyzeDexTrades(mintAddress),
    analyzeCreator(mintAddress),
    fetchTokenMetadata(mintAddress)
  ]);

  // Extract successful results or use fallbacks
  const transferData = transferAnalysis.status === 'fulfilled' ? transferAnalysis.value : {
    transfers: [],
    totalTransfers: 0,
    uniqueSenders: 0,
    uniqueReceivers: 0,
    recentActivity24h: 0,
    averageTransferAmount: 0,
    suspiciousPatterns: ['Failed to fetch transfer data']
  };

  const holderData = holderAnalysis.status === 'fulfilled' ? holderAnalysis.value : {
    holders: [],
    totalHolders: 0,
    concentrationRisk: 'high' as const,
    top1Percentage: 0,
    top3Percentage: 0,
    top10Percentage: 0,
    riskFactors: ['Failed to fetch holder data']
  };

  const dexData = dexAnalysis.status === 'fulfilled' ? dexAnalysis.value : {
    trades: [],
    totalTrades: 0,
    uniqueTraders: 0,
    volume24h: 0,
    buyVolume: 0,
    sellVolume: 0,
    priceImpact: 0,
    activeDexes: [],
    liquidityScore: 0,
    riskFactors: ['Failed to fetch DEX data']
  };

  const creatorData = creatorAnalysis.status === 'fulfilled' ? creatorAnalysis.value : null;

  const metadataData = metadata.status === 'fulfilled' ? metadata.value : null;

  // Generate comprehensive risk report
  const riskReport = generateRiskReport(
    mintAddress,
    metadataData,
    transferData,
    holderData,
    dexData,
    creatorData
  );

  return {
    mintAddress,
    tokenName: metadataData?.Currency?.Name || 'Unknown Token',
    tokenSymbol: metadataData?.Currency?.Symbol || 'UNK',
    riskReport,
    transferAnalysis: transferData,
    holderAnalysis: holderData,
    dexAnalysis: dexData,
    creatorAnalysis: creatorData,
    metadata: metadataData
  };
}

async function fetchTokenMetadata(mintAddress: string) {
  return safeBitqueryCall(
    async () => {
      const response = await bitqueryClient.query(
        GET_TOKEN_METADATA,
        { mintAddress }
      );

      return response.data?.solana?.balanceUpdates?.[0] || null;
    },
    null,
    'Failed to fetch token metadata'
  );
}

function generateRiskReport(
  mintAddress: string,
  metadata: any,
  transferAnalysis: any,
  holderAnalysis: any,
  dexAnalysis: any,
  creatorAnalysis: any
): TokenRiskReport {
  const riskFactors: string[] = [];
  let riskScore = 100;

  // Metadata Analysis (15 points)
  if (!metadata) {
    riskFactors.push('No token metadata found');
    riskScore -= 15;
  } else {
    if (!metadata.Currency?.Name || !metadata.Currency?.Symbol) {
      riskFactors.push('Missing token name or symbol');
      riskScore -= 8;
    }
    if (!metadata.Currency?.Uri) {
      riskFactors.push('No metadata URI provided');
      riskScore -= 7;
    }
  }

  // Transfer Analysis (20 points)
  if (transferAnalysis.totalTransfers < 10) {
    riskFactors.push('Very low transfer activity');
    riskScore -= 15;
  } else if (transferAnalysis.totalTransfers < 50) {
    riskFactors.push('Low transfer activity');
    riskScore -= 8;
  }

  if (transferAnalysis.recentActivity24h === 0) {
    riskFactors.push('No activity in last 24 hours');
    riskScore -= 10;
  }

  // Add transfer-specific risk factors
  riskFactors.push(...transferAnalysis.suspiciousPatterns);
  riskScore -= transferAnalysis.suspiciousPatterns.length * 3;

  // Holder Analysis (25 points)
  if (holderAnalysis.concentrationRisk === 'high') {
    riskScore -= 20;
  } else if (holderAnalysis.concentrationRisk === 'medium') {
    riskScore -= 10;
  }

  if (holderAnalysis.top1Percentage > 50) {
    riskFactors.push(`Top holder owns ${holderAnalysis.top1Percentage.toFixed(1)}% of supply`);
  }

  if (holderAnalysis.totalHolders < 10) {
    riskFactors.push(`Only ${holderAnalysis.totalHolders} holders detected`);
    riskScore -= 15;
  }

  // Add holder-specific risk factors
  riskFactors.push(...holderAnalysis.riskFactors);

  // DEX Analysis (20 points)
  if (dexAnalysis.liquidityScore < 30) {
    riskFactors.push('Very low liquidity score');
    riskScore -= 15;
  } else if (dexAnalysis.liquidityScore < 50) {
    riskFactors.push('Low liquidity score');
    riskScore -= 8;
  }

  if (dexAnalysis.totalTrades === 0) {
    riskFactors.push('No DEX trading activity');
    riskScore -= 20;
  }

  // Add DEX-specific risk factors
  riskFactors.push(...dexAnalysis.riskFactors);

  // Creator Analysis (20 points)
  if (creatorAnalysis) {
    if (creatorAnalysis.riskLevel === 'high') {
      riskScore -= 15;
    } else if (creatorAnalysis.riskLevel === 'medium') {
      riskScore -= 8;
    }

    if (creatorAnalysis.walletAge < 7) {
      riskFactors.push(`Creator wallet is only ${creatorAnalysis.walletAge} days old`);
    }

    if (creatorAnalysis.totalTokensCreated > 5) {
      riskFactors.push(`Creator has created ${creatorAnalysis.totalTokensCreated} tokens`);
    }

    // Add creator-specific risk factors
    riskFactors.push(...creatorAnalysis.suspiciousActivity);
  } else {
    riskFactors.push('Unable to analyze creator wallet');
    riskScore -= 10;
  }

  // Ensure score is within bounds
  riskScore = Math.max(0, Math.min(100, riskScore));

  // Determine overall risk level
  let riskLevel: 'safe' | 'suspicious' | 'dangerous';
  if (riskScore >= 75) {
    riskLevel = 'safe';
  } else if (riskScore >= 45) {
    riskLevel = 'suspicious';
  } else {
    riskLevel = 'dangerous';
  }

  return {
    mintAddress,
    tokenName: metadata?.Currency?.Name || 'Unknown Token',
    tokenSymbol: metadata?.Currency?.Symbol || 'UNK',
    overallRiskScore: riskScore,
    riskLevel,
    riskFactors: [...new Set(riskFactors)], // Remove duplicates
    holderAnalysis: holderAnalysis.holders || [],
    creatorAnalysis: creatorAnalysis ? {
      address: creatorAnalysis.creatorAddress,
      walletAge: creatorAnalysis.walletAge,
      firstSeenBlock: creatorAnalysis.firstSeenBlock,
      totalTokensCreated: creatorAnalysis.totalTokensCreated,
      suspiciousActivity: creatorAnalysis.suspiciousActivity,
      riskLevel: creatorAnalysis.riskLevel
    } : {
      address: 'Unknown',
      walletAge: 0,
      firstSeenBlock: 0,
      totalTokensCreated: 0,
      suspiciousActivity: ['Creator analysis failed'],
      riskLevel: 'high' as const
    },
    dexAnalysis: {
      totalTrades: dexAnalysis.totalTrades,
      uniqueTraders: dexAnalysis.uniqueTraders,
      volume24h: dexAnalysis.volume24h,
      priceChange24h: 0, // Not implemented yet
      liquidityScore: dexAnalysis.liquidityScore,
      activeDexes: dexAnalysis.activeDexes
    },
    lastUpdated: new Date()
  };
}

export function getRiskLevelEmoji(riskLevel: 'safe' | 'suspicious' | 'dangerous'): string {
  switch (riskLevel) {
    case 'safe': return '✅';
    case 'suspicious': return '⚠️';
    case 'dangerous': return '❌';
    default: return '❓';
  }
}

export function getRiskLevelColor(riskLevel: 'safe' | 'suspicious' | 'dangerous'): string {
  switch (riskLevel) {
    case 'safe': return '#4ade80';
    case 'suspicious': return '#fbbf24';
    case 'dangerous': return '#ef4444';
    default: return '#9ca3af';
  }
}

export function formatRiskScore(score: number): string {
  return `${score}/100`;
}

export function getScoreDescription(score: number): string {
  if (score >= 90) return 'Excellent - Very low risk';
  if (score >= 75) return 'Good - Low risk';
  if (score >= 60) return 'Fair - Moderate risk';
  if (score >= 45) return 'Poor - High risk';
  if (score >= 30) return 'Very Poor - Very high risk';
  return 'Extremely Poor - Extreme risk';
} 