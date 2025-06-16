import { solanaCursorRuleEngine } from '@/lib/cursor-rule-engine'
import { 
  ChromeMessage, 
  AnalysisRequest, 
  AnalysisResult,
  SolanaWalletAnalysis,
  TwitterAnalysis,
  GitHubAnalysis,
  SolanaTransactionBundle,
  STORAGE_KEYS,
  SOLANA_CONSTANTS,
  validateSolanaAddress
} from '@/types/extension'

// WebSocket connection for real-time Solana data
let wsConnection: WebSocket | null = null
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 5

// Mock Solana data generators for demonstration
class SolanaMockDataGenerator {
  static generateSolanaWalletAnalysis(address: string): SolanaWalletAnalysis {
    const balance = Math.random() * 1000 + 0.1 // 0.1 to 1000 SOL
    const lamports = balance * SOLANA_CONSTANTS.LAMPORTS_PER_SOL
    const tokenAccounts = Math.floor(Math.random() * 200) + 1
    const transactionCount = Math.floor(Math.random() * 5000) + 1
    const programInteractions = this.generateRandomPrograms()
    
    return {
      address,
      balance,
      lamports,
      tokenAccounts,
      transactionCount,
      firstTransaction: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      lastTransaction: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      isMultisig: Math.random() > 0.85,
      programInteractions,
      riskScore: Math.random() * 10,
      riskLevel: Math.random() > 0.7 ? 'high' : Math.random() > 0.4 ? 'medium' : 'low',
      flags: Math.random() > 0.5 ? ['airdrop-farming', 'high-frequency-trading'] : []
    }
  }

  static generateRandomPrograms(): string[] {
    const programs = Object.values(SOLANA_CONSTANTS.TYPICAL_PROGRAMS) as string[]
    const additionalPrograms = [
      '9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP', // Orca
      'JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB', // Jupiter
      'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc', // Whirlpool
      'srmqPiZkYKg6g9dBCbC7rRrxL8pSN9CQ5K6H2oQ5Z3z', // Serum (old)
    ]
    
    const selectedPrograms = [...programs.slice(0, Math.floor(Math.random() * 3) + 1)]
    
    if (Math.random() > 0.7) {
      selectedPrograms.push(...additionalPrograms.slice(0, Math.floor(Math.random() * 2)))
    }
    
    return selectedPrograms
  }

  static generateTwitterAnalysis(username: string): TwitterAnalysis {
    return {
      username,
      verified: Math.random() > 0.8,
      followers: Math.floor(Math.random() * 100000),
      following: Math.floor(Math.random() * 5000),
      accountAge: Math.floor(Math.random() * 2000) + 1,
      engagementRate: Math.random() * 0.1,
      botScore: Math.floor(Math.random() * 100),
      riskLevel: Math.random() > 0.6 ? 'high' : Math.random() > 0.3 ? 'medium' : 'low',
      flags: Math.random() > 0.6 ? ['potential-bot', 'low-engagement'] : []
    }
  }

  static generateGitHubAnalysis(repository: string): GitHubAnalysis {
    return {
      repository,
      stars: Math.floor(Math.random() * 10000),
      forks: Math.floor(Math.random() * 1000),
      commits: Math.floor(Math.random() * 500) + 1,
      contributors: Math.floor(Math.random() * 50) + 1,
      lastCommit: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
      hasReadme: Math.random() > 0.2,
      hasLicense: Math.random() > 0.3,
      codeQuality: Math.random() * 10,
      riskLevel: Math.random() > 0.5 ? 'high' : Math.random() > 0.25 ? 'medium' : 'low',
      flags: Math.random() > 0.4 ? ['inactive', 'few-contributors'] : []
    }
  }

  static generateSolanaTransactionBundle(signature: string): SolanaTransactionBundle {
    const mevTypes: Array<'sandwich' | 'frontrun' | 'backrun' | 'arbitrage' | undefined> = 
      ['sandwich', 'frontrun', 'backrun', 'arbitrage', undefined, undefined, undefined]
    
    const solTransferred = Math.random() * 100
    const tokenTransfers = Array.from({ length: Math.floor(Math.random() * 5) }, () => ({
      mint: this.generateRandomTokenMint(),
      amount: Math.floor(Math.random() * 1000000),
      decimals: Math.floor(Math.random() * 9) + 6
    }))
    
    return {
      signature,
      slot: Math.floor(Math.random() * 1000000) + 200000000,
      blockTime: Date.now() - Math.random() * 24 * 60 * 60 * 1000,
      fee: Math.floor(Math.random() * 50000) + 5000, // 5000-55000 lamports
      status: Math.random() > 0.1 ? { Ok: null } : { Err: 'Transaction failed' },
      programIds: this.generateRandomPrograms().slice(0, Math.floor(Math.random() * 4) + 1),
      accountKeys: Array.from({ length: Math.floor(Math.random() * 10) + 2 }, () => 
        this.generateRandomSolanaAddress()
      ),
      solTransferred,
      tokenTransfers,
      mevType: mevTypes[Math.floor(Math.random() * mevTypes.length)],
      riskLevel: Math.random() > 0.6 ? 'high' : Math.random() > 0.3 ? 'medium' : 'low',
      flags: Math.random() > 0.5 ? ['dex-arbitrage', 'high-frequency'] : []
    }
  }

  static generateRandomSolanaAddress(): string {
    // Generate a realistic-looking Solana address (base58, 32-44 chars)
    const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
    const length = Math.floor(Math.random() * 13) + 32 // 32-44 chars
    return Array.from({ length }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('')
  }

  static generateRandomTokenMint(): string {
    const knownMints = [
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
      'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
      'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So', // mSOL
      'So11111111111111111111111111111111111111112', // Wrapped SOL
    ]
    
    return Math.random() > 0.7 ? 
      knownMints[Math.floor(Math.random() * knownMints.length)] : 
      this.generateRandomSolanaAddress()
  }
}

// WebSocket management for Solana real-time data
function connectSolanaWebSocket() {
  // In a real implementation, this would connect to a Solana WebSocket endpoint
  console.log('Simulating Solana WebSocket connection for real-time transaction data...')
  
  // Simulate periodic transaction alerts
  setInterval(() => {
    simulateSolanaTransactionAlert()
  }, 45000) // Every 45 seconds
}

function simulateSolanaTransactionAlert() {
  const mockTx = SolanaMockDataGenerator.generateSolanaTransactionBundle(
    SolanaMockDataGenerator.generateRandomSolanaAddress() + 'TxSig'
  )
  
  if (mockTx.riskLevel === 'high') {
    // Update badge and send notification
    chrome.action.setBadgeBackgroundColor({ color: '#ef4444' })
    chrome.action.setBadgeText({ text: 'H' })
    
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon-48.png',
      title: 'High Risk Solana Transaction!',
      message: `Suspicious MEV activity detected in transaction ${mockTx.signature.substring(0, 10)}...`
    })
  }
}

// Solana analysis functions
async function performSolanaWalletAnalysis(address: string): Promise<AnalysisResult> {
  console.log(`Analyzing Solana wallet: ${address}`)
  
  // Validate Solana address
  const validation = validateSolanaAddress(address)
  if (!validation.valid) {
    throw new Error(`Invalid Solana address: ${validation.error}`)
  }
  
  // Generate mock Solana data
  const solanaWalletData = SolanaMockDataGenerator.generateSolanaWalletAnalysis(address)
  
  // Execute cursor rules
  const ruleResults = solanaCursorRuleEngine.executeRules({ solanaWallet: solanaWalletData })
  const { riskScore, riskLevel } = solanaCursorRuleEngine.calculateOverallRisk(ruleResults)
  
  return {
    id: `analysis_${Date.now()}`,
    type: 'wallet',
    target: address,
    timestamp: Date.now(),
    overallRisk: riskLevel,
    riskScore,
    rules: ruleResults,
    solanaWalletAnalysis: solanaWalletData,
    cached: false
  }
}

async function performTwitterAnalysis(username: string): Promise<AnalysisResult> {
  console.log(`Analyzing Twitter: ${username}`)
  
  const twitterData = SolanaMockDataGenerator.generateTwitterAnalysis(username)
  const ruleResults = solanaCursorRuleEngine.executeRules({ twitter: twitterData })
  const { riskScore, riskLevel } = solanaCursorRuleEngine.calculateOverallRisk(ruleResults)
  
  return {
    id: `analysis_${Date.now()}`,
    type: 'twitter',
    target: username,
    timestamp: Date.now(),
    overallRisk: riskLevel,
    riskScore,
    rules: ruleResults,
    twitterAnalysis: twitterData,
    cached: false
  }
}

async function performGitHubAnalysis(repository: string): Promise<AnalysisResult> {
  console.log(`Analyzing GitHub: ${repository}`)
  
  const githubData = SolanaMockDataGenerator.generateGitHubAnalysis(repository)
  const ruleResults = solanaCursorRuleEngine.executeRules({ github: githubData })
  const { riskScore, riskLevel } = solanaCursorRuleEngine.calculateOverallRisk(ruleResults)
  
  return {
    id: `analysis_${Date.now()}`,
    type: 'github',
    target: repository,
    timestamp: Date.now(),
    overallRisk: riskLevel,
    riskScore,
    rules: ruleResults,
    githubAnalysis: githubData,
    cached: false
  }
}

async function performSolanaTransactionAnalysis(signature: string): Promise<AnalysisResult> {
  console.log(`Analyzing Solana transaction: ${signature}`)
  
  const transactionData = SolanaMockDataGenerator.generateSolanaTransactionBundle(signature)
  const ruleResults = solanaCursorRuleEngine.executeRules({ solanaTransaction: transactionData })
  const { riskScore, riskLevel } = solanaCursorRuleEngine.calculateOverallRisk(ruleResults)
  
  return {
    id: `analysis_${Date.now()}`,
    type: 'transaction',
    target: signature,
    timestamp: Date.now(),
    overallRisk: riskLevel,
    riskScore,
    rules: ruleResults,
    solanaTransactionBundle: transactionData,
    cached: false
  }
}

// Cache management
async function getCachedAnalysis(target: string, type: string): Promise<AnalysisResult | null> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.ANALYSIS_CACHE)
    const cache = result[STORAGE_KEYS.ANALYSIS_CACHE] || {}
    const cacheKey = `${type}_${target}`
    
    const cached = cache[cacheKey]
    if (cached && Date.now() - cached.timestamp < 300000) { // 5 minutes
      return { ...cached, cached: true }
    }
    
    return null
  } catch (error) {
    console.error('Error getting cached analysis:', error)
    return null
  }
}

async function setCachedAnalysis(analysis: AnalysisResult): Promise<void> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.ANALYSIS_CACHE)
    const cache = result[STORAGE_KEYS.ANALYSIS_CACHE] || {}
    const cacheKey = `${analysis.type}_${analysis.target}`
    
    cache[cacheKey] = analysis
    
    // Limit cache size (keep only 50 most recent)
    const entries = Object.entries(cache)
    if (entries.length > 50) {
      entries.sort(([,a], [,b]) => (b as AnalysisResult).timestamp - (a as AnalysisResult).timestamp)
      const limitedCache = Object.fromEntries(entries.slice(0, 50))
      await chrome.storage.local.set({ [STORAGE_KEYS.ANALYSIS_CACHE]: limitedCache })
    } else {
      await chrome.storage.local.set({ [STORAGE_KEYS.ANALYSIS_CACHE]: cache })
    }
  } catch (error) {
    console.error('Error setting cached analysis:', error)
  }
}

// Message handling
chrome.runtime.onMessage.addListener((message: ChromeMessage, sender, sendResponse) => {
  console.log('Background received message:', message)
  
  if (message.type === 'ANALYZE_REQUEST') {
    const request = message.payload as AnalysisRequest
    handleAnalysisRequest(request).then(result => {
      sendResponse({ success: true, data: result })
    }).catch(error => {
      console.error('Analysis error:', error)
      sendResponse({ success: false, error: error.message })
    })
    return true // Will respond asynchronously
  }
  
  sendResponse({ success: true })
})

async function handleAnalysisRequest(request: AnalysisRequest): Promise<AnalysisResult> {
  // Check cache first
  const cached = await getCachedAnalysis(request.target, request.type)
  if (cached) {
    console.log('Returning cached analysis')
    return cached
  }
  
  // Perform new analysis
  let result: AnalysisResult
  
  switch (request.type) {
    case 'wallet':
      result = await performSolanaWalletAnalysis(request.target)
      break
    case 'twitter':
      result = await performTwitterAnalysis(request.target)
      break
    case 'github':
      result = await performGitHubAnalysis(request.target)
      break
    case 'transaction':
      result = await performSolanaTransactionAnalysis(request.target)
      break
    default:
      throw new Error(`Unknown analysis type: ${request.type}`)
  }
  
  // Cache the result
  await setCachedAnalysis(result)
  
  // Send to popup
  chrome.runtime.sendMessage({
    type: 'ANALYSIS_RESULT',
    payload: result,
    timestamp: Date.now()
  })
  
  return result
}

// Extension lifecycle
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Nilo Solana Extension installed:', details.reason)
  
  // Initialize storage
  chrome.storage.local.set({
    [STORAGE_KEYS.EXTENSION_STATE]: {
      isAnalyzing: false,
      recentAnalyses: [],
      settings: {
        autoAnalyze: true,
        riskThreshold: 'medium',
        notificationsEnabled: true,
        cacheEnabled: true,
        solanaRpcEndpoint: SOLANA_CONSTANTS.RPC_ENDPOINTS.MAINNET
      }
    }
  })
  
  // Set initial badge
  chrome.action.setBadgeBackgroundColor({ color: '#ff9900' })
  chrome.action.setBadgeText({ text: '' })
  
  // Connect to Solana WebSocket
  connectSolanaWebSocket()
})

chrome.runtime.onStartup.addListener(() => {
  console.log('Nilo Solana Extension starting up')
  connectSolanaWebSocket()
})

// Keep service worker alive
chrome.runtime.onConnect.addListener((port) => {
  console.log('Port connected:', port.name)
})

console.log('Nilo Solana background service worker loaded') 