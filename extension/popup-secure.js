// Solana Token Analyzer Extension - Secure Backend Version
const EXTENSION_VERSION = `SECURE-BACKEND-${Date.now()}`;
console.log('🚀🚀🚀 EXTENSION LOADED - VERSION:', EXTENSION_VERSION);
console.log('🚀🚀🚀 TIMESTAMP:', new Date().toISOString());
console.log('🚀🚀🚀 CACHE BUSTER:', Math.random());

// Backend API Configuration - Secure proxy endpoint
const API_CONFIG = {
  // Development endpoint (update for production)
  BACKEND_ENDPOINT: 'http://localhost:3000/api/analyze-token',
  // Production endpoint (will be updated after Vercel deployment)
  // BACKEND_ENDPOINT: 'https://your-app.vercel.app/api/analyze-token',
};

// Solana RPC Configuration - Using public endpoints that support CORS
const SOLANA_RPC_ENDPOINTS = [
  'https://api.mainnet-beta.solana.com',
  'https://solana-api.projectserum.com',
  'https://rpc.ankr.com/solana',
  'https://solana.public-rpc.com'
];

// DOM Elements
const elements = {
  mintAddress: document.getElementById('mintAddress'),
  analyzeBtn: document.getElementById('analyzeBtn'),
  errorMessage: document.getElementById('errorMessage'),
  resultsSection: document.getElementById('resultsSection'),
  loadingSection: document.getElementById('loadingSection'),
  trustScore: document.getElementById('trustScore'),
  riskBadge: document.getElementById('riskBadge'),
  riskIcon: document.getElementById('riskIcon'),
  trustSummary: document.getElementById('trustSummary'),
  tokenName: document.getElementById('tokenName'),
  tokenSymbol: document.getElementById('tokenSymbol'),
  tokenImage: document.getElementById('tokenImage'),
  tokenSupply: document.getElementById('tokenSupply'),
  holderCount: document.getElementById('holderCount'),
  mintAuthority: document.getElementById('mintAuthority'),
  freezeAuthority: document.getElementById('freezeAuthority'),
  riskFactorsCard: document.getElementById('riskFactorsCard'),
  riskFactorsList: document.getElementById('riskFactorsList'),
  viewOnSolscan: document.getElementById('viewOnSolscan'),
  analyzeAnother: document.getElementById('analyzeAnother'),
  btnText: document.querySelector('.btn-text'),
  spinner: document.querySelector('.spinner'),
  // Analysis card elements for mutual exclusivity
  tokenAnalysisCard: document.querySelector('.token-analysis-card'),
  githubAnalysisCard: document.querySelector('.github-analysis-card')
};

// Global variable to store current mint address for Solscan link
let currentMintAddress = '';

// Analysis state tracking for mutual exclusivity
let analysisState = {
  tokenAnalyzing: false,
  githubAnalyzing: false
};

// Utility Functions
function validateSolanaAddress(address) {
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  
  if (!address || typeof address !== 'string') return false;
  if (!base58Regex.test(address)) return false;
  if (address.startsWith('0x')) return false;
  if (address.endsWith('.sol')) return false;
  
  return true;
}

function showError(message) {
  if (elements.errorMessage) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.classList.remove('hidden');
  }
}

function hideError() {
  if (elements.errorMessage) {
    elements.errorMessage.classList.add('hidden');
  }
}

function showLoading() {
  // Set token analyzing state for mutual exclusivity
  setTokenAnalyzing(true);
  
  hideError();
  elements.loadingSection.classList.remove('hidden');
  elements.resultsSection.classList.add('hidden');
  elements.analyzeBtn.disabled = true;
  
  if (elements.btnText && elements.spinner) {
    elements.btnText.textContent = 'Analyzing...';
    elements.spinner.style.display = 'inline-block';
  }
}

function hideLoading() {
  // Clear token analyzing state for mutual exclusivity
  setTokenAnalyzing(false);
  
  elements.loadingSection.classList.add('hidden');
  elements.analyzeBtn.disabled = false;
  
  if (elements.btnText && elements.spinner) {
    elements.btnText.textContent = 'Analyze Token Security';
    elements.spinner.style.display = 'none';
  }
}

function showResults() {
  elements.resultsSection.classList.remove('hidden');
}

// Secure Backend API Call
async function analyzeTokenViaBackend(mintAddress) {
  console.log('🔒 Making secure backend API call for:', mintAddress);
  
  try {
    const response = await fetch(API_CONFIG.BACKEND_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mintAddress: mintAddress,
        action: 'analyze'
      })
    });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('📊 Backend API Response:', result);

    if (!result.success) {
      throw new Error(result.error || 'Backend analysis failed');
    }

    return result.data;
  } catch (error) {
    console.error('❌ Backend API call failed:', error);
    
    // Fallback: Check if it's a network error and suggest local development
    if (error.message.includes('fetch')) {
      throw new Error('Unable to connect to backend API. Make sure the backend server is running on localhost:3000');
    }
    
    throw error;
  }
}

// Solana RPC Functions (kept for metadata)
async function makeSolanaRPCRequest(method, params) {
  console.log('🌐 Solana RPC Request:', { method, params });
  
  // Try multiple RPC endpoints in case of CORS issues
  for (let i = 0; i < SOLANA_RPC_ENDPOINTS.length; i++) {
    const endpoint = SOLANA_RPC_ENDPOINTS[i];
    
    try {
      console.log(`🔄 Trying RPC endpoint ${i + 1}/${SOLANA_RPC_ENDPOINTS.length}: ${endpoint}`);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method,
          params
        })
      });

      if (!response.ok) {
        console.warn(`⚠️ RPC endpoint ${endpoint} failed with status: ${response.status}`);
        if (i === SOLANA_RPC_ENDPOINTS.length - 1) {
          throw new Error(`All RPC endpoints failed. Last error: HTTP ${response.status}`);
        }
        continue;
      }

      const data = await response.json();
      console.log('⚡ Solana RPC Response:', data.result ? '✅ Success' : '❌ No data');
      
      if (data.error) {
        console.warn(`⚠️ RPC endpoint ${endpoint} returned error:`, data.error);
        if (i === SOLANA_RPC_ENDPOINTS.length - 1) {
          throw new Error(`RPC error: ${data.error.message}`);
        }
        continue;
      }

      return data.result;
      
    } catch (error) {
      console.warn(`⚠️ RPC endpoint ${endpoint} failed:`, error.message);
      if (i === SOLANA_RPC_ENDPOINTS.length - 1) {
        throw new Error(`All RPC endpoints failed. Last error: ${error.message}`);
      }
    }
  }
}

// Get token metadata from Solana RPC
async function getTokenMetadata(mintAddress) {
  try {
    console.log(`🔍 Getting token metadata for: ${mintAddress}`);
    
    const accountInfo = await makeSolanaRPCRequest('getAccountInfo', [
      mintAddress,
      { encoding: 'jsonParsed' }
    ]);

    if (!accountInfo || !accountInfo.value) {
      console.log('❌ Token account not found');
      return null;
    }

    const parsedData = accountInfo.value.data?.parsed?.info;
    if (!parsedData) {
      console.log('❌ Unable to parse token data');
      return null;
    }

    console.log('✅ Token metadata retrieved successfully');
    return {
      supply: parsedData.supply,
      decimals: parsedData.decimals,
      mintAuthority: parsedData.mintAuthority,
      freezeAuthority: parsedData.freezeAuthority,
      isInitialized: parsedData.isInitialized
    };
  } catch (error) {
    console.error('❌ Failed to get token metadata:', error);
    return null;
  }
}

// Calculate risk score based on analysis data
function calculateRiskScore(data) {
  let score = 100;
  const riskFlags = [];
  const { metadata, holders, dexData } = data;

  // Metadata Analysis (25 points)
  if (!metadata) {
    riskFlags.push('❌ No token metadata available');
    score -= 25;
  } else {
    if (metadata.mintAuthority) {
      riskFlags.push('⚠️ Mint authority not revoked - new tokens can be minted');
      score -= 10;
    }
    
    if (metadata.freezeAuthority) {
      riskFlags.push('⚠️ Freeze authority not revoked - accounts can be frozen');
      score -= 10;
    }
  }

  // Holder Analysis (35 points)
  if (!holders || holders.length === 0) {
    riskFlags.push('❌ No holder data - token might only exist in DEX pools');
    score -= 25;
  } else {
    if (holders.length < 10) {
      riskFlags.push(`⚠️ Only ${holders.length} holders detected`);
      score -= 15;
    }

    // Check concentration
    const totalValue = holders.reduce((sum, h) => sum + parseFloat(h.value || 0), 0);
    if (totalValue > 0 && holders.length > 0) {
      const top1Percentage = (parseFloat(holders[0]?.value || 0) / totalValue) * 100;
      const top3Percentage = holders.slice(0, 3).reduce((sum, h) => sum + parseFloat(h.value || 0), 0) / totalValue * 100;

      if (top1Percentage > 50) {
        riskFlags.push(`🚨 Top holder owns ${top1Percentage.toFixed(1)}% of supply`);
        score -= 20;
      } else if (top1Percentage > 30) {
        riskFlags.push(`⚠️ Top holder owns ${top1Percentage.toFixed(1)}% of supply`);
        score -= 10;
      }

      if (top3Percentage > 70) {
        riskFlags.push(`⚠️ Top 3 holders own ${top3Percentage.toFixed(1)}% of supply`);
        score -= 10;
      }
    }
  }

  // Trading Analysis (40 points)
  if (!dexData || dexData.totalTrades === 0) {
    riskFlags.push('❌ No DEX trading activity found');
    score -= 30;
  } else {
    if (dexData.uniqueTraders < 5) {
      riskFlags.push(`⚠️ Only ${dexData.uniqueTraders} unique traders`);
      score -= 15;
    }

    if (dexData.totalTrades < 10) {
      riskFlags.push(`⚠️ Very low trading activity (${dexData.totalTrades} trades)`);
      score -= 15;
    }
  }

  // Ensure score bounds
  score = Math.max(0, Math.min(100, score));

  // Determine risk level
  let riskLevel;
  if (score >= 75) riskLevel = 'low';
  else if (score >= 50) riskLevel = 'medium';
  else riskLevel = 'high';

  return {
    trustScore: score,
    riskFlags,
    riskLevel,
    holderCount: holders ? holders.length : 0,
    tradeCount: dexData ? dexData.totalTrades : 0,
    uniqueTraders: dexData ? dexData.uniqueTraders : 0
  };
}

// Update trust score display
function updateTrustScore(analysis, status) {
  const { trustScore, riskFlags, riskLevel } = analysis;
  
  // Update score display
  elements.trustScore.textContent = trustScore;
  
  // Update risk badge and icon
  let badgeText, badgeClass, iconClass;
  
  if (riskLevel === 'low') {
    badgeText = '✅ Low Risk';
    badgeClass = 'low';
    iconClass = 'shield-check';
  } else if (riskLevel === 'medium') {
    badgeText = '⚠️ Medium Risk';
    badgeClass = 'medium';
    iconClass = 'alert-triangle';
  } else {
    badgeText = '❌ High Risk';
    badgeClass = 'high';
    iconClass = 'alert-circle';
  }
  
  elements.riskBadge.textContent = badgeText;
  elements.riskBadge.className = `risk-badge ${badgeClass}`;
  
  if (elements.riskIcon) {
    elements.riskIcon.className = `risk-icon ${iconClass}`;
  }
  
  // Update summary
  const summary = riskLevel === 'low' 
    ? 'This token appears to have good fundamentals and low risk factors.'
    : riskLevel === 'medium'
    ? 'This token has some concerning factors. Proceed with caution.'
    : 'This token has multiple red flags. High risk of being a scam.';
  
  elements.trustSummary.textContent = summary;
  
  // Update risk factors
  if (riskFlags.length > 0) {
    elements.riskFactorsCard.classList.remove('hidden');
    elements.riskFactorsList.innerHTML = riskFlags.map(flag => `<li>${flag}</li>`).join('');
  } else {
    elements.riskFactorsCard.classList.add('hidden');
  }
}

// Update token information display
function updateTokenInfo(data) {
  const { metadata, holders, dexData } = data;
  
  // Update basic info
  elements.tokenName.textContent = metadata?.name || 'Unknown Token';
  elements.tokenSymbol.textContent = metadata?.symbol || 'UNK';
  elements.holderCount.textContent = holders ? holders.length : '0';
  
  // Update authorities
  elements.mintAuthority.textContent = metadata?.mintAuthority === null ? 'Burned ✓' : 'Active ⚠️';
  elements.mintAuthority.className = metadata?.mintAuthority === null ? 'safe' : 'danger';
  
  elements.freezeAuthority.textContent = metadata?.freezeAuthority === null ? 'Disabled ✓' : 'Active ⚠️';
  elements.freezeAuthority.className = metadata?.freezeAuthority === null ? 'safe' : 'danger';
  
  // Format and update supply
  if (metadata?.supply && metadata?.decimals) {
    const adjustedSupply = metadata.supply / Math.pow(10, metadata.decimals);
    let formattedSupply;
    
    if (adjustedSupply >= 1e9) {
      formattedSupply = `${(adjustedSupply / 1e9).toFixed(2)}B`;
    } else if (adjustedSupply >= 1e6) {
      formattedSupply = `${(adjustedSupply / 1e6).toFixed(2)}M`;
    } else if (adjustedSupply >= 1e3) {
      formattedSupply = `${(adjustedSupply / 1e3).toFixed(2)}K`;
    } else {
      formattedSupply = adjustedSupply.toLocaleString();
    }
    
    elements.tokenSupply.textContent = formattedSupply;
  } else {
    elements.tokenSupply.textContent = '--';
  }
}

// Main analysis function
async function analyzeTokenMain() {
  const mintAddress = elements.mintAddress.value.trim();
  
  if (!mintAddress) {
    showError('Please enter a Solana token address');
    return;
  }
  
  if (!validateSolanaAddress(mintAddress)) {
    showError('Please enter a valid Solana token address (32-44 base58 characters)');
    return;
  }
  
  hideError();
  showLoading();
  currentMintAddress = mintAddress;
  
  try {
    console.log(`🔍 Starting secure analysis for: ${mintAddress}`);
    
    // Get data from secure backend
    const backendData = await analyzeTokenViaBackend(mintAddress);
    
    // Get additional metadata from Solana RPC
    const rpcMetadata = await getTokenMetadata(mintAddress);
    
    // Combine data
    const combinedData = {
      ...backendData,
      metadata: {
        ...backendData.metadata,
        ...rpcMetadata
      }
    };
    
    // Calculate risk score
    const analysis = calculateRiskScore(combinedData);
    
    // Update UI
    updateTokenInfo(combinedData);
    updateTrustScore(analysis, combinedData.status);
    
    console.log('✅ Secure analysis complete');
    showResults();
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    showError(error.message || 'Analysis failed. Please try again.');
  } finally {
    hideLoading();
  }
}

// Mutual Exclusivity Functions
function setTokenAnalyzing(analyzing) {
  analysisState.tokenAnalyzing = analyzing;
  console.log(`🎯 Token analyzing state: ${analyzing}`);
  
  if (analyzing) {
    console.log('🎯 Token analysis STARTING - hiding GitHub card');
    hideGithubAnalysisCard();
  } else {
    console.log('🎯 Token analysis FINISHED - checking if should show GitHub card');
    if (!analysisState.githubAnalyzing) {
      console.log('🎯 GitHub not analyzing - showing GitHub card');
      showGithubAnalysisCard();
    }
  }
}

function setGithubAnalyzing(analyzing) {
  analysisState.githubAnalyzing = analyzing;
  console.log(`🎯 GitHub analyzing state: ${analyzing}`);
  
  if (analyzing) {
    console.log('🎯 GitHub analysis STARTING - hiding Token card');
    hideTokenAnalysisCard();
  } else {
    console.log('🎯 GitHub analysis FINISHED - checking if should show Token card');
    if (!analysisState.tokenAnalyzing) {
      console.log('🎯 Token not analyzing - showing Token card');
      showTokenAnalysisCard();
    }
  }
}

function hideTokenAnalysisCard() {
  if (elements.tokenAnalysisCard) {
    elements.tokenAnalysisCard.style.display = 'none';
    console.log('🔒 Token analysis card hidden successfully');
  }
}

function showTokenAnalysisCard() {
  if (elements.tokenAnalysisCard) {
    elements.tokenAnalysisCard.style.display = 'block';
    console.log('🔓 Token analysis card shown successfully');
  }
}

function hideGithubAnalysisCard() {
  if (elements.githubAnalysisCard) {
    elements.githubAnalysisCard.style.display = 'none';
    console.log('🔒 GitHub analysis card hidden successfully');
  }
}

function showGithubAnalysisCard() {
  if (elements.githubAnalysisCard) {
    elements.githubAnalysisCard.style.display = 'block';
    console.log('🔓 GitHub analysis card shown successfully');
  }
}

// Event Listeners
elements.analyzeBtn.addEventListener('click', analyzeTokenMain);

elements.mintAddress.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    analyzeTokenMain();
  }
});

elements.analyzeAnother.addEventListener('click', () => {
  elements.mintAddress.value = '';
  elements.resultsSection.classList.add('hidden');
  elements.mintAddress.focus();
});

elements.viewOnSolscan.addEventListener('click', () => {
  if (currentMintAddress) {
    const url = `https://solscan.io/token/${currentMintAddress}`;
    console.log(`🔗 Opening Solscan URL: ${url}`);
    window.open(url, '_blank');
  }
});

// Initialize mutual exclusivity
document.addEventListener('DOMContentLoaded', () => {
  console.log('🎯 Initializing secure extension...');
  showTokenAnalysisCard();
  showGithubAnalysisCard();
  console.log('✅ Secure extension initialization complete');
});

console.log('🔒 Secure Solana Token Analyzer loaded successfully'); 