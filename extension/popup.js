// Solana Token Analyzer Extension
const EXTENSION_VERSION = `SUPPLY-FIX-${Date.now()}`;
console.log('🚀🚀🚀 EXTENSION LOADED - VERSION:', EXTENSION_VERSION);
console.log('🚀🚀🚀 TIMESTAMP:', new Date().toISOString());
console.log('🚀🚀🚀 CACHE BUSTER:', Math.random());

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
  spinner: document.querySelector('.spinner')
};

// IMMEDIATE TEST - Verify our code is running
setTimeout(() => {
  console.log('🧪 IMMEDIATE TEST - Checking if our code is running');
  const testElement = document.getElementById('tokenSupply');
  if (testElement) {
    testElement.textContent = `TEST-${EXTENSION_VERSION}`;
    console.log('🧪 IMMEDIATE TEST - Updated tokenSupply to:', testElement.textContent);
    setTimeout(() => {
      testElement.textContent = '--';
      console.log('🧪 IMMEDIATE TEST - Reset tokenSupply to --');
    }, 2000);
  } else {
    console.error('🧪 IMMEDIATE TEST - tokenSupply element not found!');
  }
}, 100);

// Global variable to store current mint address for Solscan link
let currentMintAddress = '';

// Utility Functions
function validateSolanaAddress(address) {
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  
  if (!address || typeof address !== 'string') return false;
  if (!base58Regex.test(address)) return false;
  if (address.startsWith('0x')) return false;
  if (address.endsWith('.sol')) return false;
  
  return true;
}

function formatSupply(supply, decimals) {
  console.log(`🔧 formatSupply called with: supply=${supply}, decimals=${decimals}`);
  const adjustedSupply = supply / Math.pow(10, decimals);
  console.log(`🔧 adjustedSupply: ${adjustedSupply}`);
  
  if (adjustedSupply >= 1e9) {
    const result = `${(adjustedSupply / 1e9).toFixed(2)}B`;
    console.log(`🔧 formatSupply result (B): ${result}`);
    return result;
  } else if (adjustedSupply >= 1e6) {
    const result = `${(adjustedSupply / 1e6).toFixed(2)}M`;
    console.log(`🔧 formatSupply result (M): ${result}`);
    return result;
  } else if (adjustedSupply >= 1e3) {
    const result = `${(adjustedSupply / 1e3).toFixed(2)}K`;
    console.log(`🔧 formatSupply result (K): ${result}`);
    return result;
  }
  const result = adjustedSupply.toLocaleString();
  console.log(`🔧 formatSupply result (raw): ${result}`);
  return result;
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
  if (elements.loadingSection) {
    elements.loadingSection.classList.remove('hidden');
  }
  if (elements.resultsSection) {
    elements.resultsSection.classList.add('hidden');
  }
  if (elements.analyzeBtn) {
    elements.analyzeBtn.disabled = true;
  }
  if (elements.btnText) {
    elements.btnText.classList.add('hidden');
  }
  if (elements.spinner) {
    elements.spinner.classList.remove('hidden');
  }
}

function hideLoading() {
  if (elements.loadingSection) {
    elements.loadingSection.classList.add('hidden');
  }
  if (elements.analyzeBtn) {
    elements.analyzeBtn.disabled = false;
  }
  if (elements.btnText) {
    elements.btnText.classList.remove('hidden');
  }
  if (elements.spinner) {
    elements.spinner.classList.add('hidden');
  }
}

function showResults() {
  if (elements.resultsSection) {
    elements.resultsSection.classList.remove('hidden');
  }
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

// External API Functions
async function getExternalTokenMetadata(mintAddress) {
  try {
    // Try Jupiter Token List first
    const response = await fetch('https://token.jup.ag/strict');
    const tokenList = await response.json();
    
    const token = tokenList.find(t => t.address === mintAddress);
    
    if (token) {
      console.log('✅ Found metadata in Jupiter token list');
      return {
        name: token.name,
        symbol: token.symbol,
        decimals: token.decimals,
        logoURI: token.logoURI
      };
    }
    
    // Try Solana Token List as fallback
    const solanaResponse = await fetch('https://raw.githubusercontent.com/solana-labs/token-list/main/src/tokens/solana.tokenlist.json');
    const solanaTokenList = await solanaResponse.json();
    
    const solanaToken = solanaTokenList.tokens.find(t => t.address === mintAddress);
    
    if (solanaToken) {
      console.log('✅ Found metadata in Solana token list');
      return {
        name: solanaToken.name,
        symbol: solanaToken.symbol,
        decimals: solanaToken.decimals,
        logoURI: solanaToken.logoURI
      };
    }
    
    console.log('⚠️ Token not found in external token lists');
    return null;
  } catch (error) {
    console.log('❌ External metadata lookup failed:', error.message);
    return null;
  }
}

// GraphQL Queries
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
              Name
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
              Name
              MintAddress
            }
            Account {
              Address
            }
          }
          Dex {
            ProtocolName
            ProtocolFamily
          }
        }
      }
    }
  }
`;

const GET_TRANSFERS = `
  query GetTransfers($mintAddress: String!, $limit: Int = 50) {
    Solana {
      Transfers(
        where: {
          Transfer: {
            Currency: { MintAddress: { is: $mintAddress } }
          }
        }
        limit: { count: $limit }
      ) {
        Transaction {
          Signature
        }
        Transfer {
          Amount
          Currency {
            Symbol
            Name
            MintAddress
          }
          Sender {
            Address
          }
          Receiver {
            Address
          }
        }
      }
    }
  }
`;

// Core Analysis Functions
async function getTokenMetadata(mintAddress) {
  console.log('🔍 Getting token metadata...');
  
  let mintInfo = null;
  
  // Try to get mint info from Solana RPC
  try {
    const accountInfo = await makeSolanaRPCRequest('getAccountInfo', [
      mintAddress,
      { encoding: 'jsonParsed' }
    ]);

    if (accountInfo && accountInfo.value) {
      mintInfo = accountInfo.value.data.parsed.info;
      console.log('✅ Got mint info from RPC:', mintInfo);
    } else {
      console.warn('⚠️ No mint account found via RPC');
    }
  } catch (rpcError) {
    console.warn('⚠️ RPC failed, will try to get metadata from other sources:', rpcError.message);
  }
  
  // Try to get name/symbol from external APIs
  const externalMetadata = await getExternalTokenMetadata(mintAddress);
  
  // Try to get name/symbol from Bitquery
  let bitqueryMetadata = null;
  try {
    const tradesResult = await makeBitqueryRequest(GET_DEX_TRADES_WITH_TRADERS, { 
      mintAddress, 
      limit: 1 
    });
    
    if (tradesResult?.Solana?.DEXTrades?.length > 0) {
      const currency = tradesResult.Solana.DEXTrades[0].Trade.Buy.Currency;
      if (currency.Name && currency.Symbol) {
        bitqueryMetadata = {
          name: currency.Name,
          symbol: currency.Symbol
        };
        console.log('✅ Got metadata from Bitquery trades');
      }
    }
  } catch (error) {
    console.log('⚠️ Could not get metadata from Bitquery:', error.message);
  }
  
  // If we have no metadata at all, this might not be a valid token
  if (!mintInfo && !externalMetadata && !bitqueryMetadata) {
    throw new Error('Token not found - invalid mint address or token does not exist');
  }
  
  // Combine all metadata sources with fallbacks
  const metadata = {
    name: externalMetadata?.name || bitqueryMetadata?.name || 'Unknown Token',
    symbol: externalMetadata?.symbol || bitqueryMetadata?.symbol || 'UNKNOWN',
    decimals: mintInfo?.decimals || externalMetadata?.decimals || 9, // Fallback to 9 decimals as specified
    supply: mintInfo?.supply || 'Unknown',
    mintAuthority: mintInfo?.mintAuthority || null,
    freezeAuthority: mintInfo?.freezeAuthority || null,
    logoURI: externalMetadata?.logoURI || null
  };
  
  console.log('✅ Final metadata:', metadata);
  return metadata;
}

// Update the test token to the new one specified by user
const TEST_TOKEN = 'GjJas46PiGVN9WwJ3NYori5qxUdwEvrg9i5hsi3spump';

// Updated getTopHolders function to use the correct Bitquery query and calculate proper ownership percentages
async function getTopHolders(mintAddress) {
  console.log(`🔍 Getting top holders for: ${mintAddress}`);
  
  // First, try to get the total holder count with a separate query
  const countQuery = `
    query GetHolderCount($mintAddress: String!) {
      Solana(aggregates: only) {
        BalanceUpdates(
          where: {
            BalanceUpdate: {
              Currency: {MintAddress: {is: $mintAddress}}
              PostBalance: {gt: "0"}
            }
          }
        ) {
          count(uniq: BalanceUpdate_Account_Address)
        }
      }
    }
  `;
  
  // Then get the top holders for analysis
  const holdersQuery = `
    query GetTopHolders($mintAddress: String!, $limit: Int!) {
      Solana(aggregates: only) {
        BalanceUpdates(
          where: {
            BalanceUpdate: {
              Currency: {MintAddress: {is: $mintAddress}}
            }
          }
          orderBy: {descendingByField: "BalanceUpdate_PostBalance_maximum"}
          limit: {count: $limit}
        ) {
          BalanceUpdate {
            Account {
              Address
            }
            PostBalance: PostBalance(maximum: Block_Slot, selectWhere: {gt: "0"})
            Currency {
              MintAddress
              Symbol
              Name
              Decimals
            }
          }
        }
      }
    }
  `;
  
  try {
    // Try to get total holder count first
    let totalHolderCount = 0;
    try {
      console.log(`   📊 Fetching total holder count...`);
      const countResult = await makeBitqueryRequest(countQuery, { mintAddress });
      totalHolderCount = countResult?.Solana?.BalanceUpdates?.[0]?.count || 0;
      console.log(`   📊 Total holders found: ${totalHolderCount}`);
    } catch (countError) {
      console.warn('⚠️ Count query failed, will use analysis holders count as fallback:', countError);
    }
    
    // Now get top holders for analysis
    console.log(`   📊 Fetching top holders for analysis...`);
    
    const variables = { 
      mintAddress, 
      limit: 500  // Increased limit to get better analysis and fallback count
    };
    
    const result = await makeBitqueryRequest(holdersQuery, variables);
    const updates = result?.Solana?.BalanceUpdates || [];
    
    console.log(`   Found ${updates.length} balance updates for analysis`);
    
    if (updates.length === 0) {
      console.log('❌ No balance updates found');
      throw new Error('No current holders found for this token');
    }
    
    // Process balance updates to get unique current holders
    const holderMap = new Map();
    let tokenMetadata = null;
    
    for (const update of updates) {
      const address = update.BalanceUpdate.Account?.Address;
      const balance = Number(update.BalanceUpdate.PostBalance || '0'); // PostBalance is already in decimal format
      const currency = update.BalanceUpdate.Currency;
      
      // Store token metadata from first valid entry
      if (!tokenMetadata && currency) {
        tokenMetadata = {
          name: currency.Name || 'Unknown',
          symbol: currency.Symbol || 'Unknown',
          decimals: currency.Decimals || 9
        };
      }
      
      if (address && balance > 0) {
        // Store all holders with any positive balance
        holderMap.set(address, {
          address,
          balance
        });
      }
    }
    
    const finalHolders = Array.from(holderMap.values());
    
    // Sort by balance descending
    finalHolders.sort((a, b) => b.balance - a.balance);
    
    console.log(`✅ Found ${finalHolders.length} unique current holders for analysis`);
    
    // Use count query result if available, otherwise use analysis holders count
    const actualTotalHolders = totalHolderCount > 0 ? totalHolderCount : finalHolders.length;
    
    console.log(`✅ Total holder count: ${actualTotalHolders} (${totalHolderCount > 0 ? 'from count query' : 'from analysis fallback'})`);
    
    // Get actual total supply from RPC
    let actualTotalSupply = null;
    try {
      const accountInfo = await makeSolanaRPCRequest('getAccountInfo', [
        mintAddress,
        { encoding: 'jsonParsed' }
      ]);

      if (accountInfo && accountInfo.value) {
        const mintInfo = accountInfo.value.data.parsed.info;
        const rawSupply = Number(mintInfo.supply);
        const decimals = mintInfo.decimals;
        // Convert to same decimal format as PostBalance
        actualTotalSupply = rawSupply / Math.pow(10, decimals);
        console.log(`✅ Got actual total supply from RPC: ${actualTotalSupply} (adjusted)`);
      }
    } catch (rpcError) {
      console.warn('⚠️ Could not get total supply from RPC, falling back to holder sum');
    }
    
    // Fallback to summing holder balances only if RPC fails
    const holderBalanceSum = finalHolders.reduce((sum, holder) => sum + holder.balance, 0);
    const totalSupply = actualTotalSupply || holderBalanceSum;
    
    console.log(`   • Total holders: ${actualTotalHolders}`);
    console.log(`   • Analysis holders: ${finalHolders.length}`);
    console.log(`   • Actual total supply (RPC): ${actualTotalSupply || 'N/A'}`);
    console.log(`   • Holder balance sum: ${holderBalanceSum}`);
    console.log(`   • Using total supply: ${totalSupply}`);
    console.log(`   • Top holder: ${finalHolders[0]?.balance || 0}`);
    console.log(`   • Token: ${tokenMetadata?.name} (${tokenMetadata?.symbol})`);

    return {
      holders: finalHolders,
      totalHolders: actualTotalHolders,  // Use the accurate total count or fallback
      totalSupply,
      decimals: tokenMetadata?.decimals || 9,
      tokenMetadata
    };
    
  } catch (error) {
    console.error('❌ Error fetching current holders:', error);
    
    // Return minimal fallback data instead of throwing
    console.warn('⚠️ Returning fallback holder data due to API error');
    return {
      holders: [],
      totalHolders: 0,
      totalSupply: 1000000000, // 1B fallback
      decimals: 9,
      tokenMetadata: {
        name: 'Unknown',
        symbol: 'Unknown',
        decimals: 9
      }
    };
  }
}

async function getDexTrades(mintAddress) {
  console.log('🔍 Getting DEX trades...');
  
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
    
    console.log(`✅ Found ${uniqueTraders.size} unique traders`);
    
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

async function getTransfers(mintAddress) {
  console.log('🔍 Getting transfers...');
  
  try {
    const result = await makeBitqueryRequest(GET_TRANSFERS, { 
      mintAddress, 
      limit: 50 
    });
    
    const transfers = result?.Solana?.Transfers || [];
    console.log(`✅ Found ${transfers.length} transfers`);
    
    return transfers;
    
  } catch (error) {
    console.error('❌ Failed to get transfers:', error);
    return [];
  }
}

// Main Analysis Function - simplified to use new live data approach
async function analyzeToken(mintAddress) {
  console.log(`🚀 Starting live token analysis for: ${mintAddress}`);
  
  try {
    // Use the new updateTokenInfo function that handles everything
    await updateTokenInfo(mintAddress);
    
    console.log('✅ Live token analysis completed successfully');
    
  } catch (error) {
    console.error('❌ Token analysis failed:', error);
    throw error;
  }
}

// Updated calculateRiskScore function to use correct ownership percentages
function calculateRiskScore(holderData, tokenInfo) {
  console.log('🔍 Calculating risk score from top holder data...');
  
  const { holders, totalHolders, totalSupply } = holderData;
  const decimals = tokenInfo.decimals || 9;
  
  if (!holders || holders.length === 0) {
    console.warn('⚠️ No holder data available for risk calculation');
    return {
      score: 100,
      factors: ['Cannot calculate holder distribution – no holder data available'],
      details: {
        totalHolders: 0,
        topHolderPercent: 0,
        top10Percent: 0
      }
    };
  }
  
  // Validate data quality before calculating percentages
  if (totalSupply <= 0) {
    console.warn('⚠️ Invalid total supply for risk calculation');
    return {
      score: 90,
      factors: ['Cannot calculate holder distribution – invalid supply data'],
      details: {
        totalHolders,
        topHolderPercent: 0,
        top10Percent: 0
      }
    };
  }
  
  // Calculate percentages - PostBalance is already in decimal format, totalSupply is also adjusted
  const topHolderPercent = (holders[0].balance / totalSupply) * 100;
  const top10Supply = holders.slice(0, Math.min(10, holders.length)).reduce((sum, h) => sum + h.balance, 0);
  const top10Percent = (top10Supply / totalSupply) * 100;
  
  console.log(`   • Total holders: ${totalHolders}`);
  console.log(`   • Top holder: ${topHolderPercent.toFixed(1)}%`);
  console.log(`   • Top 10 holders: ${top10Percent.toFixed(1)}%`);
  
  let riskScore = 0;
  const riskFactors = [];
  
  // Risk factor 1: Total number of holders
  if (totalHolders < 50) {
    riskScore += 30;
    riskFactors.push(`Very few holders (${totalHolders})`);
  } else if (totalHolders < 100) {
    riskScore += 20;
    riskFactors.push(`Limited holders (${totalHolders})`);
  } else if (totalHolders < 500) {
    riskScore += 10;
    riskFactors.push(`Moderate holder count (${totalHolders})`);
  }
  
  // Risk factor 2: Top holder concentration
  if (topHolderPercent > 50) {
    riskScore += 25;
    riskFactors.push(`Top holder owns ${topHolderPercent.toFixed(1)}% of supply`);
  } else if (topHolderPercent > 25) {
    riskScore += 15;
    riskFactors.push(`Top holder owns ${topHolderPercent.toFixed(1)}% of supply`);
  } else if (topHolderPercent > 10) {
    riskScore += 5;
    riskFactors.push(`Top holder owns ${topHolderPercent.toFixed(1)}% of supply`);
  }
  
  // Risk factor 3: Top 10 concentration
  if (top10Percent > 80) {
    riskScore += 20;
    riskFactors.push(`Top 10 holders own ${top10Percent.toFixed(1)}% of supply`);
  } else if (top10Percent > 60) {
    riskScore += 10;
    riskFactors.push(`Top 10 holders own ${top10Percent.toFixed(1)}% of supply`);
  }
  
  // Cap risk score at 100
  riskScore = Math.min(riskScore, 100);
  
  const result = {
    score: riskScore,
    factors: riskFactors.length > 0 ? riskFactors : ['No significant risk factors detected'],
    details: {
      totalHolders,
      topHolderPercent: Math.round(topHolderPercent * 10) / 10, // Round to 1 decimal
      top10Percent: Math.round(top10Percent * 10) / 10, // Round to 1 decimal
      normalizedSupply: totalSupply.toLocaleString()
    }
  };
  
  console.log('✅ Risk calculation complete:', result);
  return result;
}

function updateTrustScore(analysis, status) {
  const trustScore = Math.max(0, 100 - analysis.riskAnalysis.score);
  
  // Safe element access for trust score updates
  if (elements.trustScore) {
    elements.trustScore.textContent = `${trustScore}%`;
  }
  
  if (elements.riskBadge) {
    elements.riskBadge.textContent = analysis.riskAnalysis.level;
  }
  
  // Update colors based on risk level
  const scoreElement = elements.trustScore?.parentElement;
  const badgeElement = elements.riskBadge;
  
  if (scoreElement) {
    scoreElement.className = scoreElement.className.replace(/text-\w+-500/g, '');
  }
  
  if (badgeElement) {
    badgeElement.className = badgeElement.className.replace(/bg-\w+-100 text-\w+-800/g, '');
  }
  
  if (analysis.riskAnalysis.level === 'HIGH') {
    if (scoreElement) scoreElement.classList.add('text-red-500');
    if (badgeElement) badgeElement.classList.add('bg-red-100', 'text-red-800');
    if (elements.riskIcon) elements.riskIcon.textContent = '⚠️';
  } else if (analysis.riskAnalysis.level === 'MEDIUM') {
    if (scoreElement) scoreElement.classList.add('text-yellow-500');
    if (badgeElement) badgeElement.classList.add('bg-yellow-100', 'text-yellow-800');
    if (elements.riskIcon) elements.riskIcon.textContent = '⚠️';
  } else {
    if (scoreElement) scoreElement.classList.add('text-green-500');
    if (badgeElement) badgeElement.classList.add('bg-green-100', 'text-green-800');
    if (elements.riskIcon) elements.riskIcon.textContent = '✅';
  }
  
  // Update summary
  let summary = '';
  if (analysis.riskAnalysis.level === 'HIGH') {
    summary = 'High risk token. Exercise extreme caution.';
  } else if (analysis.riskAnalysis.level === 'MEDIUM') {
    summary = 'Medium risk token. Do your own research.';
  } else {
    summary = 'Low risk token based on available data.';
  }
  
  if (elements.trustSummary) {
    elements.trustSummary.textContent = summary;
  }
  
  // Update risk factors
  if (analysis.riskAnalysis.factors.length > 0) {
    if (elements.riskFactorsCard) {
      elements.riskFactorsCard.classList.remove('hidden');
    }
    if (elements.riskFactorsList) {
      elements.riskFactorsList.innerHTML = analysis.riskAnalysis.factors
        .map(factor => `<li class="flex items-center gap-2"><span class="text-red-500">•</span>${factor}</li>`)
        .join('');
    }
  } else {
    if (elements.riskFactorsCard) {
      elements.riskFactorsCard.classList.add('hidden');
    }
  }
}

// Helper function to safely update element content
function safeUpdateElement(id, content) {
  const element = document.getElementById(id);
  if (element) {
    if (typeof content === 'string') {
      element.textContent = content;
    } else {
      element.innerHTML = content;
    }
  } else {
    console.warn(`⚠️ Element with id '${id}' not found`);
  }
}

// Updated updateTokenInfo function to use live data
async function updateTokenInfo(mintAddress) {
  console.log(`🚀 Analyzing token: ${mintAddress}`);
  
  try {
    // Show loading state - using correct element IDs and safe updates
    safeUpdateElement('tokenName', 'Loading...');
    safeUpdateElement('tokenSymbol', 'Loading...');
    safeUpdateElement('tokenSupply', 'Loading...');
    safeUpdateElement('holderCount', 'Loading...');
    safeUpdateElement('mintAuthority', 'Loading...');
    safeUpdateElement('freezeAuthority', 'Loading...');
    
    // Get live holder data first (includes token metadata)
    const holderData = await getTopHolders(mintAddress);
    
    console.log('📊 Holder Data:', holderData);
    
    // Get additional token info from RPC
    let tokenInfo;
    try {
      tokenInfo = await getTokenInfo(mintAddress);
    } catch (error) {
      console.warn('⚠️ RPC token info failed, using metadata from BalanceUpdates');
      tokenInfo = {
        name: holderData.tokenMetadata?.name || 'Unknown Token',
        symbol: holderData.tokenMetadata?.symbol || 'UNKNOWN',
        decimals: holderData.tokenMetadata?.decimals || 9,
        supply: 'Unknown',
        hasUpdateAuthority: false,
        hasFreezeAuthority: false,
        logoURI: null
      };
    }
    
    // Use metadata from BalanceUpdates if RPC didn't provide good data
    if (tokenInfo.name === 'Unknown' && holderData.tokenMetadata?.name) {
      tokenInfo.name = holderData.tokenMetadata.name;
    }
    if (tokenInfo.symbol === 'Unknown' && holderData.tokenMetadata?.symbol) {
      tokenInfo.symbol = holderData.tokenMetadata.symbol;
    }
    if (holderData.tokenMetadata?.decimals) {
      tokenInfo.decimals = holderData.tokenMetadata.decimals;
    }
    
    console.log('📊 Final Token Info:', tokenInfo);
    
    // Update holder data with correct decimals from token info
    holderData.decimals = tokenInfo.decimals;
    
    // Update UI with live data
    safeUpdateElement('tokenName', tokenInfo.name || 'Unknown Token');
    safeUpdateElement('tokenSymbol', tokenInfo.symbol || 'UNKNOWN');
    
    // Use actual supply if available, otherwise fallback to 1B
    if (tokenInfo.supply && tokenInfo.supply !== 'Unknown') {
      try {
        const formattedSupply = formatSupply(tokenInfo.supply, tokenInfo.decimals);
        safeUpdateElement('tokenSupply', formattedSupply);
      } catch (supplyError) {
        console.warn('⚠️ Supply formatting failed, using 1B fallback');
        safeUpdateElement('tokenSupply', '1B');
      }
    } else {
      safeUpdateElement('tokenSupply', '1B');
    }
    
    // Show holder count from live data
    safeUpdateElement('holderCount', holderData.totalHolders > 0 ? `${holderData.totalHolders}` : 'Unknown');
    
    // Calculate risk score using live holder data with correct decimals
    let riskData;
    try {
      riskData = calculateRiskScore(holderData, tokenInfo);
    } catch (riskError) {
      console.warn('⚠️ Risk calculation failed, using default values');
      riskData = {
        score: 50,
        factors: ['Unable to calculate risk factors due to data limitations']
      };
    }
    
    // Update mint authority status with better handling
    const mintAuth = tokenInfo.hasUpdateAuthority !== undefined ? 
      (tokenInfo.hasUpdateAuthority ? 'Active' : 'Revoked') : 'Unknown';
    const freezeAuth = tokenInfo.hasFreezeAuthority !== undefined ? 
      (tokenInfo.hasFreezeAuthority ? 'Active' : 'Revoked') : 'Unknown';
    
    safeUpdateElement('mintAuthority', mintAuth);
    safeUpdateElement('freezeAuthority', freezeAuth);
    
    // Update token image if available
    const tokenImage = document.getElementById('tokenImage');
    if (tokenImage && tokenInfo.logoURI) {
      tokenImage.src = tokenInfo.logoURI;
      tokenImage.classList.remove('hidden');
    }
    
    // Update trust score using existing function
    const analysisData = {
      riskAnalysis: {
        score: riskData.score,
        level: riskData.score >= 70 ? 'HIGH' : riskData.score >= 40 ? 'MEDIUM' : 'LOW',
        factors: riskData.factors
      }
    };
    updateTrustScore(analysisData, 'success');
    
    console.log('✅ Token analysis complete');
    console.log(`   • Name: ${tokenInfo.name}`);
    console.log(`   • Symbol: ${tokenInfo.symbol}`);
    console.log(`   • Decimals: ${tokenInfo.decimals}`);
    console.log(`   • Live Holders: ${holderData.totalHolders}`);
    console.log(`   • Risk Score: ${riskData.score}/100`);
    
    // Validate against known test token
    if (mintAddress === 'FJoFAPtvu1or3Jhdn2KG7V8VeSHbJp7GrE3aKa9Uay3c') {
      console.log('🧪 TEST TOKEN VALIDATION:');
      console.log(`   Expected holders: ~79, Got: ${holderData.totalHolders}`);
      console.log(`   Expected name: Not "Unknown", Got: "${tokenInfo.name}"`);
      console.log(`   Expected symbol: Not "Unknown", Got: "${tokenInfo.symbol}"`);
      
      const holderDiff = Math.abs(holderData.totalHolders - 79);
      const nameOk = tokenInfo.name !== 'Unknown';
      const symbolOk = tokenInfo.symbol !== 'Unknown';
      
      console.log(`   • Holder count: ${holderDiff <= 10 ? '✅ PASS' : '❌ FAIL'} (diff: ${holderDiff})`);
      console.log(`   • Name resolved: ${nameOk ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`   • Symbol resolved: ${symbolOk ? '✅ PASS' : '❌ FAIL'}`);
    }
    
  } catch (error) {
    console.error('❌ Error updating token info:', error);
    
    // Show graceful fallback state instead of just "Error"
    safeUpdateElement('tokenName', 'Unknown Token');
    safeUpdateElement('tokenSymbol', 'UNKNOWN');
    safeUpdateElement('tokenSupply', '1B');
    safeUpdateElement('holderCount', 'Unknown');
    safeUpdateElement('mintAuthority', 'Unknown');
    safeUpdateElement('freezeAuthority', 'Unknown');
    
    // Show a basic trust score even on error
    const fallbackAnalysis = {
      riskAnalysis: {
        score: 50,
        level: 'MEDIUM',
        factors: ['Unable to analyze token due to data limitations']
      }
    };
    updateTrustScore(fallbackAnalysis, 'error');
    
    // Show error message to user
    showError('Unable to analyze token. Please check the address and try again.');
  }
}

// Add missing getTokenInfo function with proper Metaplex metadata decoding
async function getTokenInfo(mintAddress) {
  console.log(`🔍 Getting complete token info for: ${mintAddress}`);
  
  try {
    // Get basic token metadata from RPC
    const accountInfo = await makeSolanaRPCRequest('getAccountInfo', [
      mintAddress,
      { encoding: 'jsonParsed' }
    ]);
    
    if (!accountInfo?.value?.data?.parsed?.info) {
      throw new Error('Invalid token mint address');
    }
    
    const mintInfo = accountInfo.value.data.parsed.info;
    console.log('📊 Mint info:', mintInfo);
    
    // Try to get external metadata first (Jupiter/Solana token lists)
    let metadata = { name: 'Unknown', symbol: 'Unknown' };
    try {
      const externalMetadata = await getExternalTokenMetadata(mintAddress);
      if (externalMetadata) {
        metadata = externalMetadata;
        console.log('✅ Found external metadata:', metadata);
      }
    } catch (error) {
      console.log('⚠️ External metadata lookup failed, trying on-chain...');
    }
    
    // If external metadata failed, try to get on-chain Metaplex metadata
    if (metadata.name === 'Unknown' || metadata.symbol === 'Unknown') {
      try {
        const onChainMetadata = await getMetaplexMetadata(mintAddress);
        if (onChainMetadata) {
          metadata = { ...metadata, ...onChainMetadata };
          console.log('✅ Found on-chain metadata:', metadata);
        }
      } catch (error) {
        console.log('⚠️ On-chain metadata lookup failed:', error.message);
      }
    }
    
    const tokenInfo = {
      name: metadata.name || 'Unknown',
      symbol: metadata.symbol || 'Unknown',
      decimals: mintInfo.decimals || 9,
      supply: mintInfo.supply,
      hasUpdateAuthority: mintInfo.mintAuthority !== null,
      hasFreezeAuthority: mintInfo.freezeAuthority !== null,
      logoURI: metadata.logoURI || null
    };
    
    console.log('✅ Complete token info:', tokenInfo);
    return tokenInfo;
    
  } catch (error) {
    console.error('❌ Error getting token info:', error);
    
    // Return minimal info with warning
    console.warn('⚠️ Using fallback token info due to error');
    return {
      name: 'Unknown',
      symbol: 'Unknown',
      decimals: 9, // Assume 9 decimals as default for Solana tokens
      supply: 'Unknown',
      hasUpdateAuthority: false,
      hasFreezeAuthority: false,
      logoURI: null
    };
  }
}

// Add Metaplex metadata decoder
async function getMetaplexMetadata(mintAddress) {
  console.log(`🔍 Fetching Metaplex metadata for: ${mintAddress}`);
  
  try {
    // Derive metadata PDA (Program Derived Address)
    const METADATA_PROGRAM_ID = 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s';
    
    // For now, try a simple approach - look for common metadata patterns
    // This is a simplified version - full Metaplex decoding would require more complex logic
    
    // Try to get account info for potential metadata account
    const seeds = [
      Buffer.from('metadata'),
      Buffer.from(METADATA_PROGRAM_ID, 'base58'),
      Buffer.from(mintAddress, 'base58')
    ];
    
    // This is a simplified approach - in a full implementation you'd:
    // 1. Properly derive the PDA
    // 2. Fetch the account data
    // 3. Decode the Metaplex metadata structure
    
    console.log('⚠️ Metaplex metadata decoding not fully implemented - using external sources');
    return null;
    
  } catch (error) {
    console.log('❌ Metaplex metadata fetch failed:', error.message);
    return null;
  }
}

// Updated main execution function
async function analyzeTokenMain() {
  const mintAddress = elements.mintAddress.value.trim() || TEST_TOKEN; // Use test token if empty
  
  if (!mintAddress) {
    showError('Please enter a token mint address');
    return;
  }
  
  if (!validateSolanaAddress(mintAddress)) {
    showError('Please enter a valid Solana token mint address');
    return;
  }
  
  hideError();
  showLoading();
  
  try {
    console.log(`🔍 Analyzing token: ${mintAddress}`);
    
    // Store the current mint address for the Solscan button
    currentMintAddress = mintAddress;
    
    // Use the new simplified analysis approach
    await updateTokenInfo(mintAddress);
    
    console.log('✅ Analysis complete');
    
    showResults();
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    showError(`Analysis failed: ${error.message}`);
  } finally {
    hideLoading();
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

// Add click handler for View on Solscan button
elements.viewOnSolscan.addEventListener('click', () => {
  if (currentMintAddress) {
    const url = `https://solscan.io/token/${currentMintAddress}`;
    console.log(`🔗 Opening Solscan URL: ${url}`);
    chrome.tabs.create({ url: url });
  }
});

// Auto-focus on input
elements.mintAddress.focus(); 