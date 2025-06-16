import { 
  RuleResult, 
  SolanaWalletAnalysis, 
  TwitterAnalysis, 
  GitHubAnalysis, 
  SolanaTransactionBundle,
  SOLANA_CONSTANTS,
  type RiskLevel,
  type RuleSeverity 
} from '@/types/extension'

// Rule execution context for Solana
interface SolanaRuleContext {
  solanaWallet?: SolanaWalletAnalysis
  twitter?: TwitterAnalysis
  github?: GitHubAnalysis
  solanaTransaction?: SolanaTransactionBundle
  metadata?: Record<string, any>
}

// Base rule class
abstract class CursorRule {
  constructor(
    public id: string,
    public name: string,
    public description: string,
    public category: 'wallet' | 'social' | 'code' | 'transaction',
    public weight: number = 1.0,
    public enabled: boolean = true
  ) {}

  abstract execute(context: SolanaRuleContext): RuleResult
  
  protected createResult(
    score: number,
    severity: RuleSeverity,
    passed: boolean,
    data?: Record<string, any>
  ): RuleResult {
    return {
      id: this.id,
      label: this.name,
      description: this.description,
      score: Math.max(0, Math.min(10, score)),
      severity,
      passed,
      data
    }
  }
}

// Solana Wallet Analysis Rules
class SolanaHighRiskWalletRule extends CursorRule {
  constructor() {
    super(
      'solana-wallet-high-risk',
      'High Risk Solana Wallet',
      'Detects Solana wallets with suspicious transaction patterns',
      'wallet',
      0.9
    )
  }

  execute(context: SolanaRuleContext): RuleResult {
    const wallet = context.solanaWallet
    if (!wallet) {
      return this.createResult(0, 'info', true, { reason: 'No Solana wallet data' })
    }

    let riskScore = 0
    const flags: string[] = []

    // Check balance vs transaction activity ratio
    if (wallet.balance < 0.1 && wallet.transactionCount > 500) {
      riskScore += 4
      flags.push('High transaction count with low SOL balance')
    }

    // Check for excessive token accounts (potential airdrop farming)
    if (wallet.tokenAccounts > 100) {
      riskScore += 3
      flags.push('Excessive token accounts (possible airdrop farming)')
    }

    // Check for fresh wallet with high activity
    if (wallet.firstTransaction && wallet.transactionCount > 100) {
      const accountAge = Date.now() - new Date(wallet.firstTransaction).getTime()
      const daysSinceCreation = accountAge / (1000 * 60 * 60 * 24)
      
      if (daysSinceCreation < 7) {
        riskScore += 5
        flags.push('New wallet with high activity (< 7 days old)')
      }
    }

    // Check for multisig flag (higher risk for some activities)
    if (wallet.isMultisig) {
      riskScore += 1
      flags.push('Multisig wallet detected')
    }

    // Check program interactions for suspicious patterns
    const typicalPrograms = Object.values(SOLANA_CONSTANTS.TYPICAL_PROGRAMS)
    const suspiciousPrograms = wallet.programInteractions.filter(program => 
      !typicalPrograms.includes(program as any)
    )
    
    if (suspiciousPrograms.length > 10) {
      riskScore += 2
      flags.push(`Many unknown program interactions: ${suspiciousPrograms.length}`)
    }

    // Add existing flags
    riskScore += wallet.flags.length * 1.5

    const passed = riskScore < 5
    const severity: RuleSeverity = riskScore > 7 ? 'critical' : riskScore > 4 ? 'warning' : 'info'

    return this.createResult(riskScore, severity, passed, { 
      flags,
      solBalance: wallet.balance,
      lamports: wallet.lamports,
      tokenAccounts: wallet.tokenAccounts
    })
  }
}

class SolanaTokenHoardingRule extends CursorRule {
  constructor() {
    super(
      'solana-token-hoarding',
      'Token Hoarding Detection',
      'Identifies wallets with excessive token diversity (potential airdrop farming)',
      'wallet',
      0.7
    )
  }

  execute(context: SolanaRuleContext): RuleResult {
    const wallet = context.solanaWallet
    if (!wallet) {
      return this.createResult(0, 'info', true)
    }

    let riskScore = 0
    const flags: string[] = []

    // Token account to SOL balance ratio analysis
    const tokenToSolRatio = wallet.tokenAccounts / Math.max(wallet.balance, 0.1)
    
    if (tokenToSolRatio > 1000) {
      riskScore = 8
      flags.push('Extreme token hoarding detected')
    } else if (tokenToSolRatio > 500) {
      riskScore = 6
      flags.push('High token hoarding activity')
    } else if (tokenToSolRatio > 100) {
      riskScore = 3
      flags.push('Moderate token accumulation')
    }

    // Many tokens with low SOL (classic airdrop farming pattern)
    if (wallet.tokenAccounts > 50 && wallet.balance < 0.5) {
      riskScore += 3
      flags.push('Many tokens with minimal SOL balance')
    }

    const passed = riskScore < 5
    const severity: RuleSeverity = riskScore > 6 ? 'critical' : riskScore > 3 ? 'warning' : 'info'

    return this.createResult(riskScore, severity, passed, {
      tokenToSolRatio: tokenToSolRatio.toFixed(2),
      tokenAccounts: wallet.tokenAccounts,
      flags
    })
  }
}

// Social Media Rules
class TwitterBotDetectionRule extends CursorRule {
  constructor() {
    super(
      'twitter-bot-detection',
      'Twitter Bot Detection',
      'Identifies potential bot accounts and fake engagement',
      'social',
      0.7
    )
  }

  execute(context: SolanaRuleContext): RuleResult {
    const twitter = context.twitter
    if (!twitter) {
      return this.createResult(0, 'info', true, { reason: 'No Twitter data' })
    }

    let riskScore = 0
    const flags: string[] = []

    // High bot score
    if (twitter.botScore > 70) {
      riskScore += 6
      flags.push(`High bot score: ${twitter.botScore}%`)
    } else if (twitter.botScore > 40) {
      riskScore += 3
      flags.push(`Moderate bot score: ${twitter.botScore}%`)
    }

    // Suspicious follower/following ratio
    const ratio = twitter.followers / (twitter.following || 1)
    if (ratio > 100 && twitter.followers > 10000) {
      riskScore += 2
      flags.push('Suspicious follower ratio')
    }

    // Low engagement rate for high followers
    if (twitter.followers > 5000 && twitter.engagementRate < 0.01) {
      riskScore += 3
      flags.push('Low engagement for follower count')
    }

    const passed = riskScore < 5
    const severity: RuleSeverity = riskScore > 6 ? 'critical' : riskScore > 3 ? 'warning' : 'info'

    return this.createResult(riskScore, severity, passed, { flags })
  }
}

// GitHub Repository Rules
class CodeQualityRule extends CursorRule {
  constructor() {
    super(
      'code-quality',
      'Code Quality Assessment',
      'Analyzes repository quality and development activity',
      'code',
      0.8
    )
  }

  execute(context: SolanaRuleContext): RuleResult {
    const github = context.github
    if (!github) {
      return this.createResult(4, 'warning', false, { reason: 'No repository found' })
    }

    let riskScore = 0
    const flags: string[] = []

    // Missing essential files
    if (!github.hasReadme) {
      riskScore += 2
      flags.push('No README file')
    }

    if (!github.hasLicense) {
      riskScore += 1
      flags.push('No license file')
    }

    // Low activity indicators
    if (github.commits < 10) {
      riskScore += 3
      flags.push('Very few commits')
    }

    if (github.contributors < 2) {
      riskScore += 2
      flags.push('Single contributor')
    }

    // Recent activity
    if (github.lastCommit) {
      const daysSinceLastCommit = (Date.now() - new Date(github.lastCommit).getTime()) / (1000 * 60 * 60 * 24)
      if (daysSinceLastCommit > 90) {
        riskScore += 2
        flags.push('No recent commits')
      }
    }

    // Code quality score
    if (github.codeQuality < 5) {
      riskScore += 4
      flags.push('Low code quality score')
    }

    const passed = riskScore < 5
    const severity: RuleSeverity = riskScore > 6 ? 'critical' : riskScore > 3 ? 'warning' : 'info'

    return this.createResult(riskScore, severity, passed, { flags })
  }
}

// Solana Transaction Analysis Rules
class SolanaJupiterArbitrageRule extends CursorRule {
  constructor() {
    super(
      'solana-jupiter-arbitrage',
      'Jupiter Arbitrage Detection',
      'Detects potential arbitrage and MEV activities on Solana DEXs',
      'transaction',
      0.8
    )
  }

  execute(context: SolanaRuleContext): RuleResult {
    const transaction = context.solanaTransaction
    if (!transaction) {
      return this.createResult(0, 'info', true, { reason: 'No Solana transaction data' })
    }

    let riskScore = 0
    const flags: string[] = []

    // High fee for simple operations (MEV indicator)
    const feeInSol = transaction.fee / SOLANA_CONSTANTS.LAMPORTS_PER_SOL
    if (feeInSol > 0.01 && transaction.solTransferred < 1) {
      riskScore += 4
      flags.push('High fee for low-value transaction')
    }

    // Multiple token transfers in single transaction (arbitrage pattern)
    if (transaction.tokenTransfers.length > 3) {
      riskScore += 3
      flags.push('Multiple token swaps detected')
    }

    // Known DEX program interactions
    const dexPrograms = transaction.programIds.filter(program => 
      [
        SOLANA_CONSTANTS.TYPICAL_PROGRAMS.SERUM_DEX,
        SOLANA_CONSTANTS.TYPICAL_PROGRAMS.RAYDIUM,
        '9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP', // Orca
        'JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB', // Jupiter
      ].includes(program)
    )

    if (dexPrograms.length > 2) {
      riskScore += 2
      flags.push('Multiple DEX interactions')
    }

    // MEV type detection
    if (transaction.mevType) {
      switch (transaction.mevType) {
        case 'sandwich':
          riskScore += 7
          flags.push('Sandwich attack detected')
          break
        case 'arbitrage':
          riskScore += 4
          flags.push('Arbitrage transaction detected')
          break
        case 'frontrun':
          riskScore += 6
          flags.push('Front-running detected')
          break
        case 'backrun':
          riskScore += 3
          flags.push('Back-running detected')
          break
      }
    }

    // Transaction failed (potential failed MEV attempt)
    if (transaction.status.Err) {
      riskScore += 1
      flags.push('Transaction failed')
    }

    const passed = riskScore < 5
    const severity: RuleSeverity = riskScore > 6 ? 'critical' : riskScore > 3 ? 'warning' : 'info'

    return this.createResult(riskScore, severity, passed, { 
      flags,
      feeInSol: feeInSol.toFixed(6),
      tokenTransfers: transaction.tokenTransfers.length,
      dexPrograms: dexPrograms.length
    })
  }
}

// Main Cursor Rule Engine for Solana
export class SolanaCursorRuleEngine {
  private rules: CursorRule[] = []

  constructor() {
    this.initializeDefaultRules()
  }

  private initializeDefaultRules() {
    this.rules = [
      new SolanaHighRiskWalletRule(),
      new SolanaTokenHoardingRule(),
      new TwitterBotDetectionRule(),
      new CodeQualityRule(),
      new SolanaJupiterArbitrageRule()
    ]
  }

  addRule(rule: CursorRule) {
    this.rules.push(rule)
  }

  removeRule(ruleId: string) {
    this.rules = this.rules.filter(rule => rule.id !== ruleId)
  }

  enableRule(ruleId: string) {
    const rule = this.rules.find(r => r.id === ruleId)
    if (rule) rule.enabled = true
  }

  disableRule(ruleId: string) {
    const rule = this.rules.find(r => r.id === ruleId)
    if (rule) rule.enabled = false
  }

  executeRules(context: SolanaRuleContext): RuleResult[] {
    return this.rules
      .filter(rule => rule.enabled)
      .map(rule => {
        try {
          return rule.execute(context)
        } catch (error) {
          console.error(`Error executing rule ${rule.id}:`, error)
          return {
            id: rule.id,
            label: rule.name,
            description: rule.description,
            score: 0,
            severity: 'info' as RuleSeverity,
            passed: true,
            data: { error: error instanceof Error ? error.message : 'Unknown error' }
          }
        }
      })
  }

  calculateOverallRisk(results: RuleResult[]): { riskScore: number; riskLevel: RiskLevel } {
    if (results.length === 0) {
      return { riskScore: 0, riskLevel: 'low' }
    }

    // Calculate weighted average
    const weightedScore = results.reduce((sum, result) => {
      const rule = this.rules.find(r => r.id === result.id)
      return sum + (result.score * (rule?.weight || 1))
    }, 0)

    const totalWeight = results.reduce((sum, result) => {
      const rule = this.rules.find(r => r.id === result.id)
      return sum + (rule?.weight || 1)
    }, 0)

    const riskScore = totalWeight > 0 ? weightedScore / totalWeight : 0

    let riskLevel: RiskLevel = 'low'
    if (riskScore >= 7) {
      riskLevel = 'high'
    } else if (riskScore >= 4) {
      riskLevel = 'medium'
    }

    return { riskScore: Math.round(riskScore * 10) / 10, riskLevel }
  }

  getRules(): CursorRule[] {
    return [...this.rules]
  }
}

// Singleton instance
export const solanaCursorRuleEngine = new SolanaCursorRuleEngine()

// Export for backward compatibility
export const cursorRuleEngine = solanaCursorRuleEngine 