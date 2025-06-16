// Background service worker for Solana Token Analyzer

// Bitquery API Configuration
const BITQUERY_CONFIG = {
  EAP_ENDPOINT: 'https://streaming.bitquery.io/eap',
  API_KEY: 'ory_at_YoW0aLryiXB0CVuzCHqJc-BVKohDim455mpOowrDpSU.n-9KUF5fjDMjnyXikYO5HBcHz7tqIOjtIua4nMuy8ZY'
};

// Solana RPC Configuration - Using public endpoints that support CORS
const SOLANA_RPC_ENDPOINTS = [
  'https://api.mainnet-beta.solana.com',
  'https://solana-api.projectserum.com',
  'https://rpc.ankr.com/solana',
  'https://solana.public-rpc.com'
];

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const cache = new Map();

// Extension installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Solana Token Analyzer installed:', details.reason);
  
  if (details.reason === 'install') {
    // Set default settings
    chrome.storage.local.set({
      settings: {
        autoAnalyze: true,
        notifications: true,
        riskThreshold: 'medium'
      },
      analysisCache: {},
      lastAnalyzed: null
    });
  }
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);
  
  switch (request.action) {
    case 'analyzeToken':
      analyzeTokenBackground(request.mintAddress)
        .then(result => {
          sendResponse({ success: true, data: result });
        })
        .catch(error => {
          console.error('Background analysis failed:', error);
          sendResponse({ 
            success: false, 
            error: error.message || 'Analysis failed' 
          });
        });
      return true; // Keep message channel open for async response
      
    case 'getCache':
      getCachedAnalysis(request.mintAddress, sendResponse);
      return true;
      
    case 'clearCache':
      cache.clear();
      sendResponse({ success: true });
      return true;
      
    case 'updateSettings':
      updateSettings(request.settings, sendResponse);
      return true;
      
    default:
      sendResponse({ error: 'Unknown action' });
  }
});

// Utility Functions
function validateSolanaAddress(address) {
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return address && typeof address === 'string' && base58Regex.test(address);
}

function getCacheKey(type, address) {
  return `${type}:${address}`;
}

function isCacheValid(timestamp) {
  return Date.now() - timestamp < CACHE_DURATION;
}

// API Functions
async function makeBitqueryRequest(query, variables = {}) {
  console.log('🔍 Bitquery EAP Request:', { query: query.substring(0, 100) + '...', variables });
  
  const response = await fetch(BITQUERY_CONFIG.EAP_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${BITQUERY_CONFIG.API_KEY}`
    },
    body: JSON.stringify({
      query,
      variables
    })
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  console.log('📊 Bitquery EAP Response:', data);
  
  if (data.errors && data.errors.length > 0) {
    console.error('❌ GraphQL errors:', data.errors);
    throw new Error(`GraphQL errors: ${data.errors.map(e => e.message).join(', ')}`);
  }

  return data.data;
}

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

// Updated GraphQL Queries
const GET_TOKEN_HOLDERS = `
  query GetTopHolders($mintAddress: String!, $limit: Int = 10) {
    Solana {
      BalanceUpdates(
        where: {
          BalanceUpdate: {
            Currency: { MintAddress: { is: $mintAddress } }
          }
        }
        limit: { count: $limit }
        orderBy: { descending: BalanceUpdate_PostBalance }
      ) {
        BalanceUpdate {
          Account {
            Address
          }
          PostBalance
          Currency {
            Symbol
            Name
            MintAddress
          }
        }
      }
    }
  }
`;

const GET_DEX_TRADES_WITH_TRADERS = `
  query GetDexTrades($mintAddress: String!, $limit: Int = 100) {
    Solana {
      DEXTrades(
        where: {
          Trade: {
            Buy: { Currency: { MintAddress: { is: $mintAddress } } }
          }
        }
        limit: { count: $limit }
      ) {
        Transaction {
          Signature
        }
        Trade {
          Buy {
            Amount
            Currency {
              Symbol
              MintAddress
            }
            Account {
              Address
            }
          }
          Sell {
            Amount
            Currency {
              Symbol
              MintAddress
            }
            Account {
              Address
            }
          }
          Dex {
            ProtocolName
          }
        }
      }
    }
  }
`;

// Enhanced Analysis Functions
async function getTokenMetadata(mintAddress) {
  console.log('🔍 Fetching token metadata...');
  
  try {
    // Get mint account info from Solana RPC
    const accountInfo = await makeSolanaRPCRequest('getAccountInfo', [
      mintAddress,
      { encoding: 'jsonParsed' }
    ]);

    if (!accountInfo || !accountInfo.value) {
      throw new Error('Token mint account not found');
    }

    const mintInfo = accountInfo.value.data.parsed.info;
    console.log('✅ Mint info retrieved:', mintInfo);

    return {
      name: null,
      symbol: null,
      uri: null,
      supply: mintInfo.supply,
      decimals: mintInfo.decimals,
      mintAuthority: mintInfo.mintAuthority,
      freezeAuthority: mintInfo.freezeAuthority
    };
  } catch (error) {
    console.error('❌ Failed to get token metadata:', error);
    throw error;
  }
}

async function getTopHolders(mintAddress) {
  console.log('👥 Fetching top holders...');
  
  try {
    const result = await makeBitqueryRequest(GET_TOKEN_HOLDERS, { 
      mintAddress, 
      limit: 10 
    }); // Use EAP endpoint for BalanceUpdates query

    const balanceUpdates = result?.Solana?.BalanceUpdates || [];
    console.log(`✅ Found ${balanceUpdates.length} balance updates`);
    
    // Transform to holders format
    const holders = balanceUpdates.map(update => ({
      address: { address: update.BalanceUpdate.Account.Address },
      value: update.BalanceUpdate.Holding || '0'
    }));
    
    if (holders.length === 0) {
      console.warn('⚠️ No holders found - token might only exist in DEX pools');
    }

    return holders;
  } catch (error) {
    console.error('❌ Failed to get holders:', error);
    return [];
  }
}

async function getDexTrades(mintAddress) {
  console.log('💱 Fetching DEX trades...');
  
  try {
    const result = await makeBitqueryRequest(GET_DEX_TRADES_WITH_TRADERS, { 
      mintAddress, 
      limit: 100 
    });

    const trades = result?.Solana?.DEXTrades || [];
    console.log(`✅ Found ${trades.length} trades`);

    // Count unique traders
    const uniqueTraders = new Set();
    trades.forEach(trade => {
      if (trade.Trade.Buy.Account?.Address) {
        uniqueTraders.add(trade.Trade.Buy.Account.Address);
      }
      if (trade.Trade.Sell.Account?.Address) {
        uniqueTraders.add(trade.Trade.Sell.Account.Address);
      }
    });

    console.log(`👤 Unique traders: ${uniqueTraders.size}`);

    return {
      trades,
      uniqueTraders: uniqueTraders.size,
      totalTrades: trades.length
    };
  } catch (error) {
    console.error('❌ Failed to get DEX trades:', error);
    return { trades: [], uniqueTraders: 0, totalTrades: 0 };
  }
}

// Main Analysis Function
async function analyzeTokenBackground(mintAddress) {
  console.log(`🔍 Background analysis for: ${mintAddress}`);
  
  if (!validateSolanaAddress(mintAddress)) {
    throw new Error('Invalid Solana mint address');
  }

  // Check cache first
  const cacheKey = getCacheKey('analysis', mintAddress);
  const cached = cache.get(cacheKey);
  if (cached && isCacheValid(cached.timestamp)) {
    console.log('📋 Returning cached analysis');
    return cached.data;
  }

  const results = {
    metadata: null,
    holders: [],
    dexData: { trades: [], uniqueTraders: 0, totalTrades: 0 },
    status: {
      metadata: '⏳ Loading...',
      holders: '⏳ Loading...',
      trades: '⏳ Loading...'
    }
  };

  try {
    // Fetch all data in parallel with individual error handling
    const [metadataResult, holdersResult, dexResult] = await Promise.allSettled([
      getTokenMetadata(mintAddress),
      getTopHolders(mintAddress),
      getDexTrades(mintAddress)
    ]);

    // Process metadata
    if (metadataResult.status === 'fulfilled') {
      results.metadata = metadataResult.value;
      results.status.metadata = '✅ Found';
      console.log('✅ Metadata loaded successfully');
    } else {
      results.status.metadata = '❌ Failed';
      console.error('❌ Metadata failed:', metadataResult.reason);
    }

    // Process holders
    if (holdersResult.status === 'fulfilled') {
      results.holders = holdersResult.value;
      results.status.holders = results.holders.length > 0 ? 
        `✅ Found ${results.holders.length}` : '⚠️ No holders';
      console.log(`✅ Holders loaded: ${results.holders.length}`);
    } else {
      results.status.holders = '❌ Failed';
      console.error('❌ Holders failed:', holdersResult.reason);
    }

    // Process DEX trades
    if (dexResult.status === 'fulfilled') {
      results.dexData = dexResult.value;
      results.status.trades = results.dexData.totalTrades > 0 ? 
        `✅ Found ${results.dexData.totalTrades} (${results.dexData.uniqueTraders} traders)` : '⚠️ No trades';
      console.log(`✅ DEX data loaded: ${results.dexData.totalTrades} trades, ${results.dexData.uniqueTraders} unique traders`);
    } else {
      results.status.trades = '❌ Failed';
      console.error('❌ DEX trades failed:', dexResult.reason);
    }

    // Calculate risk score
    results.analysis = calculateRiskScore(results);
    
    // Cache the results
    cache.set(cacheKey, {
      data: results,
      timestamp: Date.now()
    });
    
    console.log('🎯 Background analysis complete:', results);
    return results;
    
  } catch (error) {
    console.error('💥 Background analysis failed:', error);
    throw error;
  }
}

function calculateRiskScore(data) {
  let score = 100;
  const riskFlags = [];
  const { metadata, holders, dexData } = data;

  // Metadata Analysis (25 points)
  if (!metadata) {
    riskFlags.push('❌ No token metadata available');
    score -= 25;
  } else {
    if (!metadata.name && !metadata.symbol) {
      riskFlags.push('⚠️ Missing token name and symbol');
      score -= 15;
    }
    
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
  if (holders.length === 0) {
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
  if (dexData.totalTrades === 0) {
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
    holderCount: holders.length,
    tradeCount: dexData.totalTrades,
    uniqueTraders: dexData.uniqueTraders
  };
}

// Cache and Settings Functions
async function getCachedAnalysis(mintAddress, sendResponse) {
  const cacheKey = getCacheKey('analysis', mintAddress);
  const cached = cache.get(cacheKey);
  
  if (cached && isCacheValid(cached.timestamp)) {
    sendResponse({ success: true, data: cached.data, cached: true });
  } else {
    sendResponse({ success: false, error: 'No valid cache found' });
  }
}

async function updateSettings(settings, sendResponse) {
  try {
    await chrome.storage.local.set({ settings });
    sendResponse({ success: true });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

// Context menu integration
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'analyzeSolanaToken') {
    const selectedText = info.selectionText?.trim();
    if (selectedText && validateSolanaAddress(selectedText)) {
      // Send message to content script to show analysis
      chrome.tabs.sendMessage(tab.id, {
        action: 'showTokenAnalysis',
        mintAddress: selectedText
      });
    }
  }
});

// Create context menu on startup
chrome.runtime.onStartup.addListener(() => {
  chrome.contextMenus.create({
    id: 'analyzeSolanaToken',
    title: 'Analyze Solana Token',
    contexts: ['selection']
  });
});

// Also create on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'analyzeSolanaToken',
    title: 'Analyze Solana Token',
    contexts: ['selection']
  });
});

console.log('Solana Token Analyzer - Bitquery Edition background script loaded'); 