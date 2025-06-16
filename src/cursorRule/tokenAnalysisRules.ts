import { type TokenAnalysisData } from '../lib/api/helius/types';

export interface CursorRuleResult {
  ruleName: string;
  score: number;
  maxScore: number;
  passed: boolean;
  riskFlags: string[];
  details: string;
}

export interface TokenCursorRule {
  name: string;
  description: string;
  maxScore: number;
  analyze(data: TokenAnalysisData): CursorRuleResult;
}

/**
 * Rule 1: Token Metadata Quality
 * Checks for complete metadata, proper naming, and metadata source
 */
export class TokenMetadataRule implements TokenCursorRule {
  name = 'Token Metadata Quality';
  description = 'Evaluates completeness and quality of token metadata';
  maxScore = 20;

  analyze(data: TokenAnalysisData): CursorRuleResult {
    let score = 0;
    const riskFlags: string[] = [];
    const details: string[] = [];

    const { metadata } = data;

    // Basic metadata presence (5 points)
    if (metadata.name && metadata.symbol) {
      score += 5;
      details.push('✅ Name and symbol present');
    } else {
      riskFlags.push('Missing basic token information');
      details.push('❌ Missing name or symbol');
    }

    // Description (3 points)
    if (metadata.description && metadata.description.length > 10) {
      score += 3;
      details.push('✅ Has description');
    } else {
      details.push('⚠️ No description provided');
    }

    // Image/Logo (2 points)
    if (metadata.image) {
      score += 2;
      details.push('✅ Has logo/image');
    } else {
      details.push('⚠️ No logo/image');
    }

    // Metadata URI (5 points)
    if (metadata.metadataUri) {
      score += 5;
      if (metadata.metadataUri.includes('arweave.net')) {
        details.push('✅ Metadata on Arweave (permanent)');
      } else if (metadata.metadataUri.includes('ipfs')) {
        details.push('✅ Metadata on IPFS');
      } else {
        details.push('⚠️ Metadata on centralized server');
      }
    } else {
      riskFlags.push('No metadata URI found');
      details.push('❌ No metadata URI');
    }

    // Creators array (5 points)
    if (metadata.creators && metadata.creators.length > 0) {
      score += 5;
      const verifiedCreators = metadata.creators.filter(c => c.verified).length;
      details.push(`✅ ${metadata.creators.length} creator(s), ${verifiedCreators} verified`);
    } else {
      details.push('⚠️ No creators specified');
    }

    return {
      ruleName: this.name,
      score,
      maxScore: this.maxScore,
      passed: score >= this.maxScore * 0.6, // 60% threshold
      riskFlags,
      details: details.join('\n')
    };
  }
}

/**
 * Rule 2: Authority Risk Analysis
 * Checks mint authority, freeze authority, and update authority status
 */
export class AuthorityRiskRule implements TokenCursorRule {
  name = 'Authority Risk Analysis';
  description = 'Evaluates mint, freeze, and update authority risks';
  maxScore = 30;

  analyze(data: TokenAnalysisData): CursorRuleResult {
    let score = 0;
    const riskFlags: string[] = [];
    const details: string[] = [];

    const { metadata, mintInfo } = data;
    const mintData = mintInfo.data?.parsed?.info;

    // Mint Authority (15 points)
    if (mintData?.mintAuthority === null) {
      score += 15;
      details.push('✅ Mint authority burned (cannot create new tokens)');
    } else if (mintData?.mintAuthority) {
      riskFlags.push('Mint authority is NOT burned');
      details.push('🚨 Mint authority active - new tokens can be created');
    } else {
      details.push('⚠️ Mint authority status unknown');
    }

    // Freeze Authority (10 points)
    if (mintData?.freezeAuthority === null) {
      score += 10;
      details.push('✅ Freeze authority disabled');
    } else if (mintData?.freezeAuthority) {
      riskFlags.push('Freeze authority is active');
      details.push('🚨 Freeze authority active - tokens can be frozen');
    } else {
      details.push('⚠️ Freeze authority status unknown');
    }

    // Update Authority (5 points)
    if (metadata.isMutable === false) {
      score += 5;
      details.push('✅ Metadata is immutable');
    } else if (metadata.updateAuthority) {
      riskFlags.push('Update authority is mutable');
      details.push('⚠️ Metadata can be changed by update authority');
    } else {
      details.push('⚠️ Update authority status unknown');
    }

    return {
      ruleName: this.name,
      score,
      maxScore: this.maxScore,
      passed: score >= this.maxScore * 0.7, // 70% threshold for critical security
      riskFlags,
      details: details.join('\n')
    };
  }
}

/**
 * Rule 3: Token Distribution Analysis
 * Analyzes holder distribution and concentration risks
 */
export class DistributionAnalysisRule implements TokenCursorRule {
  name = 'Token Distribution Analysis';
  description = 'Evaluates token holder distribution and concentration';
  maxScore = 30;

  analyze(data: TokenAnalysisData): CursorRuleResult {
    let score = 0;
    const riskFlags: string[] = [];
    const details: string[] = [];

    const { holders, metadata } = data;

    if (holders.length === 0) {
      riskFlags.push('No holder data available');
      details.push('❌ Cannot analyze distribution - no holder data');
      return {
        ruleName: this.name,
        score: 0,
        maxScore: this.maxScore,
        passed: false,
        riskFlags,
        details: details.join('\n')
      };
    }

    const totalSupply = holders.reduce((sum, holder) => sum + holder.uiAmount, 0);

    // Number of holders (10 points)
    if (holders.length >= 1000) {
      score += 10;
      details.push(`✅ ${holders.length.toLocaleString()} holders (excellent distribution)`);
    } else if (holders.length >= 100) {
      score += 7;
      details.push(`✅ ${holders.length} holders (good distribution)`);
    } else if (holders.length >= 50) {
      score += 4;
      details.push(`⚠️ ${holders.length} holders (limited distribution)`);
    } else {
      riskFlags.push(`Only ${holders.length} holders`);
      details.push(`🚨 Only ${holders.length} holders (poor distribution)`);
    }

    // Top holder concentration (10 points)
    const topHolderPercent = totalSupply > 0 ? (holders[0]?.uiAmount || 0) / totalSupply * 100 : 0;
    if (topHolderPercent < 10) {
      score += 10;
      details.push(`✅ Top holder: ${topHolderPercent.toFixed(1)}% (well distributed)`);
    } else if (topHolderPercent < 25) {
      score += 6;
      details.push(`⚠️ Top holder: ${topHolderPercent.toFixed(1)}% (moderate concentration)`);
    } else if (topHolderPercent < 50) {
      score += 2;
      details.push(`⚠️ Top holder: ${topHolderPercent.toFixed(1)}% (high concentration)`);
    } else {
      riskFlags.push(`Top holder owns ${topHolderPercent.toFixed(1)}% of supply`);
      details.push(`🚨 Top holder: ${topHolderPercent.toFixed(1)}% (extreme concentration)`);
    }

    // Top 3 holders concentration (10 points)
    const top3Percent = totalSupply > 0 ? 
      holders.slice(0, 3).reduce((sum, holder) => sum + holder.uiAmount, 0) / totalSupply * 100 : 0;
    
    if (top3Percent < 30) {
      score += 10;
      details.push(`✅ Top 3 holders: ${top3Percent.toFixed(1)}% (healthy distribution)`);
    } else if (top3Percent < 50) {
      score += 5;
      details.push(`⚠️ Top 3 holders: ${top3Percent.toFixed(1)}% (concerning concentration)`);
    } else {
      riskFlags.push(`Top 3 holders own ${top3Percent.toFixed(1)}% of supply`);
      details.push(`🚨 Top 3 holders: ${top3Percent.toFixed(1)}% (dangerous concentration)`);
    }

    return {
      ruleName: this.name,
      score,
      maxScore: this.maxScore,
      passed: score >= this.maxScore * 0.6, // 60% threshold
      riskFlags,
      details: details.join('\n')
    };
  }
}

/**
 * Rule 4: Creator Wallet Audit
 * Analyzes creator wallet activity and patterns
 */
export class CreatorAuditRule implements TokenCursorRule {
  name = 'Creator Wallet Audit';
  description = 'Evaluates creator wallet history and activity patterns';
  maxScore = 20;

  analyze(data: TokenAnalysisData): CursorRuleResult {
    let score = 0;
    const riskFlags: string[] = [];
    const details: string[] = [];

    const { creatorSignatures, metadata } = data;

    if (!metadata.creators || metadata.creators.length === 0) {
      details.push('⚠️ No creator information available');
      return {
        ruleName: this.name,
        score: this.maxScore * 0.5, // Neutral score
        maxScore: this.maxScore,
        passed: true,
        riskFlags,
        details: details.join('\n')
      };
    }

    if (creatorSignatures.length === 0) {
      details.push('⚠️ No transaction history available for creator');
      return {
        ruleName: this.name,
        score: this.maxScore * 0.3,
        maxScore: this.maxScore,
        passed: false,
        riskFlags: ['No creator transaction history'],
        details: details.join('\n')
      };
    }

    // Recent activity analysis (10 points)
    const now = Date.now() / 1000;
    const last30Days = now - (30 * 24 * 60 * 60);
    const recentSigs = creatorSignatures.filter(sig => 
      sig.blockTime && sig.blockTime > last30Days
    );

    if (recentSigs.length < 10) {
      score += 10;
      details.push(`✅ Low recent activity: ${recentSigs.length} transactions in 30 days`);
    } else if (recentSigs.length < 50) {
      score += 6;
      details.push(`⚠️ Moderate activity: ${recentSigs.length} transactions in 30 days`);
    } else {
      riskFlags.push(`Creator has ${recentSigs.length} recent transactions`);
      details.push(`🚨 High activity: ${recentSigs.length} transactions in 30 days`);
    }

    // Token creation patterns (10 points)
    const mintKeywords = ['mint', 'create', 'initialize'];
    const suspiciousTxs = recentSigs.filter(sig => 
      sig.memo && mintKeywords.some(keyword => 
        sig.memo!.toLowerCase().includes(keyword)
      )
    );

    if (suspiciousTxs.length === 0) {
      score += 10;
      details.push('✅ No suspicious token creation activity');
    } else if (suspiciousTxs.length < 3) {
      score += 5;
      details.push(`⚠️ ${suspiciousTxs.length} potential token creation transactions`);
    } else {
      riskFlags.push(`Creator created ${suspiciousTxs.length} tokens recently`);
      details.push(`🚨 ${suspiciousTxs.length} token creation transactions (possible rug puller)`);
    }

    return {
      ruleName: this.name,
      score,
      maxScore: this.maxScore,
      passed: score >= this.maxScore * 0.6,
      riskFlags,
      details: details.join('\n')
    };
  }
}

/**
 * Main Token Analysis Engine
 * Orchestrates all cursor rules and calculates final trust score
 */
export class TokenAnalysisEngine {
  private rules: TokenCursorRule[] = [
    new TokenMetadataRule(),
    new AuthorityRiskRule(),
    new DistributionAnalysisRule(),
    new CreatorAuditRule()
  ];

  analyzeToken(data: TokenAnalysisData): {
    overallScore: number;
    maxScore: number;
    trustScore: number;
    riskLevel: 'low' | 'medium' | 'high';
    ruleResults: CursorRuleResult[];
    allRiskFlags: string[];
    summary: string;
  } {
    const ruleResults = this.rules.map(rule => rule.analyze(data));
    
    const overallScore = ruleResults.reduce((sum, result) => sum + result.score, 0);
    const maxScore = ruleResults.reduce((sum, result) => sum + result.maxScore, 0);
    const trustScore = Math.round((overallScore / maxScore) * 100);
    
    const allRiskFlags = ruleResults.flatMap(result => result.riskFlags);
    
    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high';
    if (trustScore >= 75) riskLevel = 'low';
    else if (trustScore >= 50) riskLevel = 'medium';
    else riskLevel = 'high';

    // Generate summary
    const passedRules = ruleResults.filter(r => r.passed).length;
    const criticalFlags = allRiskFlags.filter(flag => 
      flag.includes('NOT burned') || 
      flag.includes('active') || 
      flag.includes('extreme') ||
      flag.includes('dangerous')
    );

    let summary = `${passedRules}/${this.rules.length} rules passed. `;
    if (criticalFlags.length > 0) {
      summary += `🚨 Critical issues: ${criticalFlags.length}`;
    } else if (allRiskFlags.length > 0) {
      summary += `⚠️ ${allRiskFlags.length} risk factors identified`;
    } else {
      summary += '✅ No major risk factors detected';
    }

    return {
      overallScore,
      maxScore,
      trustScore,
      riskLevel,
      ruleResults,
      allRiskFlags,
      summary
    };
  }

  getRulesInfo(): Array<{name: string; description: string; maxScore: number}> {
    return this.rules.map(rule => ({
      name: rule.name,
      description: rule.description,
      maxScore: rule.maxScore
    }));
  }
}

// Export singleton instance
export const tokenAnalysisEngine = new TokenAnalysisEngine(); 