// Railway Express Server for Nilo Backend
// Migrated from Vercel to Railway for better team deployment support

const express = require('express');
const cors = require('cors');
const https = require('https');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Bitquery API Configuration
const BITQUERY_CONFIG = {
  ENDPOINT: 'https://graphql.bitquery.io',
  API_KEY: process.env.BITQUERY_API_KEY
};

// Solscan API Configuration - NOTE: Pro API is paid ($199+/month for holders)
const SOLSCAN_CONFIG = {
  API_URL: process.env.SOLSCAN_API_URL || 'https://public-api.solscan.io',
  PRO_API_URL: 'https://pro-api.solscan.io/v2.0',
  PRO_API_KEY: process.env.SOLSCAN_PRO_API_KEY // Only if user has paid subscription
};

console.log('🚀 Nilo Backend Server Starting...');
console.log('📡 Bitquery API Key:', BITQUERY_CONFIG.API_KEY ? 'Configured ✅' : 'Missing ❌');
console.log('📡 Solscan API URL:', SOLSCAN_CONFIG.API_URL ? 'Configured ✅' : 'Missing ❌');
console.log('💰 Solscan Pro API Key:', SOLSCAN_CONFIG.PRO_API_KEY ? 'Configured ✅ ($199+/month)' : 'Missing ❌ (Free tier)');

// Helper function to make HTTP requests
function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });
    
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

// Enhanced holders fetching with multiple free alternatives
async function fetchHoldersAlternatives(tokenAddress) {
  console.log(`📡 Fetching holders using free alternatives for token: ${tokenAddress}`);
  
  let holdersData = [];
  let holdersCount = 0;
  let dataSource = 'estimated';
  let error = null;

  // Method 1: Try Solscan Pro API if we have the key (paid)
  if (SOLSCAN_CONFIG.PRO_API_KEY) {
    try {
      console.log('💰 Trying Solscan Pro API (paid subscription)...');
      const proApiUrl = `${SOLSCAN_CONFIG.PRO_API_URL}/token/holders?address=${tokenAddress}&page_size=20`;
      
      const response = await fetch(proApiUrl, {
        headers: {
          'token': SOLSCAN_CONFIG.PRO_API_KEY,
          'Accept': 'application/json'
        },
        timeout: 10000
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data && data.data.items) {
          holdersData = data.data.items.map((holder, index) => ({
            rank: holder.rank || index + 1,
            address: holder.owner || holder.address,
            balance: holder.amount || '0',
            percentage: holder.percentage || 0,
            decimals: holder.decimals || 9
          }));
          holdersCount = data.data.total || holdersData.length;
          dataSource = 'solscan-pro';
          console.log(`✅ Got ${holdersData.length} holders from Solscan Pro API`);
          return { holders: holdersData, count: holdersCount, source: dataSource, error: null };
        }
      }
    } catch (proError) {
      console.log('⚠️ Solscan Pro API failed:', proError.message);
    }
  }

  // Method 2: Use Bitquery GraphQL to get top holders (free but limited)
  if (BITQUERY_CONFIG.API_KEY) {
    try {
      console.log('🔍 Trying Bitquery GraphQL for holders...');
      
      const holdersQuery = `
        query ($tokenAddress: String!) {
          solana {
            transfers(
              currency: {is: $tokenAddress}
              options: {limit: 1000, desc: "amount"}
            ) {
              receiver {
                address
              }
              amount
              count
            }
          }
        }
      `;

      const options = {
        hostname: 'graphql.bitquery.io',
        port: 443,
        path: '/',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': BITQUERY_CONFIG.API_KEY
        }
      };

      const requestData = JSON.stringify({
        query: holdersQuery,
        variables: { tokenAddress }
      });

      const response = await makeRequest(options, requestData);
      
      if (response.data?.solana?.transfers) {
        const transfers = response.data.solana.transfers;
        
        // Aggregate transfers by receiver to estimate holdings
        const holderMap = new Map();
        
        transfers.forEach(transfer => {
          const address = transfer.receiver?.address;
          if (address) {
            const currentAmount = holderMap.get(address) || 0;
            holderMap.set(address, currentAmount + parseFloat(transfer.amount || 0));
          }
        });
        
        // Convert to array and sort by amount
        const aggregatedHolders = Array.from(holderMap.entries())
          .map(([address, amount]) => ({ address, amount }))
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 20);
        
        if (aggregatedHolders.length > 0) {
          const totalAmount = aggregatedHolders.reduce((sum, h) => sum + h.amount, 0);
          
          holdersData = aggregatedHolders.map((holder, index) => ({
            rank: index + 1,
            address: holder.address,
            balance: holder.amount.toString(),
            percentage: totalAmount > 0 ? ((holder.amount / totalAmount) * 100).toFixed(4) : '0',
            decimals: 9
          }));
          
          holdersCount = Math.max(holderMap.size, 100); // Estimate total holders
          dataSource = 'bitquery-estimated';
          console.log(`✅ Estimated ${holdersData.length} top holders from Bitquery`);
          return { holders: holdersData, count: holdersCount, source: dataSource, error: null };
        }
      }
    } catch (bitqueryError) {
      console.log('⚠️ Bitquery holders estimation failed:', bitqueryError.message);
    }
  }

  // Method 3: Use Solana RPC to get largest token accounts (free)
  try {
    console.log('🔗 Trying Solana RPC getLargestAccounts...');
    
    const rpcResponse = await fetch('https://api.mainnet-beta.solana.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getTokenLargestAccounts',
        params: [tokenAddress]
      })
    });
    
    const rpcData = await rpcResponse.json();
    
    if (rpcData.result?.value && Array.isArray(rpcData.result.value)) {
      const accounts = rpcData.result.value;
      
      if (accounts.length > 0) {
        const totalSupply = accounts.reduce((sum, acc) => sum + parseFloat(acc.amount || 0), 0);
        
        holdersData = accounts.slice(0, 20).map((account, index) => ({
          rank: index + 1,
          address: account.address || `Account-${index + 1}`,
          balance: account.amount || '0',
          percentage: totalSupply > 0 ? ((parseFloat(account.amount || 0) / totalSupply) * 100).toFixed(4) : '0',
          decimals: account.decimals || 9
        }));
        
        holdersCount = Math.max(accounts.length, 50); // Conservative estimate
        dataSource = 'solana-rpc';
        console.log(`✅ Got ${holdersData.length} largest accounts from Solana RPC`);
        return { holders: holdersData, count: holdersCount, source: dataSource, error: null };
      }
    }
  } catch (rpcError) {
    console.log('⚠️ Solana RPC getLargestAccounts failed:', rpcError.message);
  }

  // Method 4: Generate demo data with disclaimer (fallback)
  console.log('⚠️ All holder data sources failed, using demo data...');
  
  holdersData = [
    { rank: 1, address: 'Demo1111111111111111111111111111111111111', balance: '100000', percentage: '10.0000', decimals: 9 },
    { rank: 2, address: 'Demo2222222222222222222222222222222222222', balance: '50000', percentage: '5.0000', decimals: 9 },
    { rank: 3, address: 'Demo3333333333333333333333333333333333333', balance: '30000', percentage: '3.0000', decimals: 9 },
    { rank: 4, address: 'Demo4444444444444444444444444444444444444', balance: '20000', percentage: '2.0000', decimals: 9 },
    { rank: 5, address: 'Demo5555555555555555555555555555555555555', balance: '15000', percentage: '1.5000', decimals: 9 }
  ];
  holdersCount = 250; // Demo estimate
  dataSource = 'demo-fallback';
  error = 'Real holder data requires Solscan Pro API ($199+/month). Showing demo data.';
  
  return {
    holders: holdersData,
    count: holdersCount,
    source: dataSource,
    error: error
  };
}

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'Nilo Backend API is working on Railway! 🚄',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    bitqueryConfigured: !!BITQUERY_CONFIG.API_KEY,
    solscanConfigured: !!SOLSCAN_CONFIG.API_URL,
    solscanProConfigured: !!SOLSCAN_CONFIG.PRO_API_KEY
  });
});

// Main token analysis endpoint
app.post('/api/analyze-token', async (req, res) => {
  try {
    const { tokenAddress } = req.body;

    if (!tokenAddress) {
      return res.status(400).json({ 
        error: 'Token address is required' 
      });
    }

    console.log(`🔍 Analyzing token: ${tokenAddress}`);

    // Check if API key is available
    if (!BITQUERY_CONFIG.API_KEY) {
      console.error('❌ BITQUERY_API_KEY not found in environment variables');
      return res.status(500).json({ 
        error: 'API configuration error - Please set BITQUERY_API_KEY environment variable',
        tokenAddress,
        configured: false
      });
    }

    // First, get basic token info from Solana RPC
    console.log('📡 Fetching token info from Solana RPC...');
    let tokenMetadata = { name: 'Unknown Token', symbol: 'UNKNOWN', decimals: 9, supply: '0' };
    
    try {
      // Get mint account info
      const mintResponse = await fetch('https://api.mainnet-beta.solana.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getAccountInfo',
          params: [
            tokenAddress,
            { encoding: 'jsonParsed' }
          ]
        })
      });
      
      const mintData = await mintResponse.json();
      if (mintData.result?.value?.data?.parsed?.info) {
        const mintInfo = mintData.result.value.data.parsed.info;
        tokenMetadata.decimals = mintInfo.decimals || 9;
        tokenMetadata.supply = mintInfo.supply || '0';
        console.log('✅ Got mint info from RPC:', { decimals: tokenMetadata.decimals, supply: tokenMetadata.supply });
      }

      // Try to get Metaplex metadata from blockchain
      try {
        console.log('📡 Fetching token metadata from multiple sources...');
        
        // Try DexScreener API FIRST since we know it works
        try {
          console.log('📡 Trying DexScreener API...');
          const dexResponse = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`);
          
          if (dexResponse.ok) {
            const dexData = await dexResponse.json();
            console.log('DexScreener response:', dexData);
            
            if (dexData.pairs && dexData.pairs.length > 0) {
              const pair = dexData.pairs[0];
              if (pair.baseToken && pair.baseToken.address === tokenAddress) {
                tokenMetadata.name = pair.baseToken.name;
                tokenMetadata.symbol = pair.baseToken.symbol || tokenMetadata.symbol;
                tokenMetadata.logoURI = pair.info?.imageUrl;
                tokenMetadata.fromDexScreener = true;
                console.log('✅ SUCCESS! Got metadata from DexScreener:', { 
                  name: tokenMetadata.name, 
                  symbol: tokenMetadata.symbol,
                  logo: tokenMetadata.logoURI 
                });
              }
            }
          } else {
            console.log('DexScreener API returned status:', dexResponse.status);
          }
        } catch (dexError) {
          console.log('⚠️ DexScreener API failed:', dexError.message);
        }
        
        // Only try other APIs if DexScreener failed
        if (tokenMetadata.name === 'Unknown Token') {
          // Try Solscan API for metadata
          try {
            const solscanResponse = await fetch(`https://public-api.solscan.io/token/meta?tokenAddress=${tokenAddress}`, {
              headers: {
                'User-Agent': 'Nilo-Extension/1.0'
              }
            });
            
            if (solscanResponse.ok) {
              const solscanData = await solscanResponse.json();
              if (solscanData.name && solscanData.name !== 'Unknown Token') {
                tokenMetadata.name = solscanData.name;
                tokenMetadata.symbol = solscanData.symbol || tokenMetadata.symbol;
                tokenMetadata.logoURI = solscanData.icon;
                tokenMetadata.fromSolscan = true;
                console.log('✅ Got metadata from Solscan:', { name: tokenMetadata.name, symbol: tokenMetadata.symbol });
              }
            }
          } catch (solscanError) {
            console.log('⚠️ Solscan API failed');
          }
        }
        
      } catch (metadataError) {
        console.log('⚠️ Metadata fetch failed:', metadataError.message);
        
        // Try pump.fun API since these look like pump tokens
        if (tokenMetadata.name === 'Unknown Token' && tokenAddress.includes('pump')) {
          try {
            const pumpResponse = await fetch(`https://frontend-api.pump.fun/coins/${tokenAddress}`);
            
            if (pumpResponse.ok) {
              const pumpData = await pumpResponse.json();
              if (pumpData.name) {
                tokenMetadata.name = pumpData.name;
                tokenMetadata.symbol = pumpData.symbol || tokenMetadata.symbol;
                tokenMetadata.logoURI = pumpData.image_uri;
                tokenMetadata.fromPumpFun = true;
                console.log('✅ Got metadata from Pump.fun:', { name: tokenMetadata.name, symbol: tokenMetadata.symbol });
              }
            }
          } catch (pumpError) {
            console.log('⚠️ Pump.fun API failed');
          }
        }
      }

      // Try to get token metadata from Jupiter API
      if (tokenMetadata.name === 'Unknown Token') {
        try {
          const jupiterResponse = await fetch(`https://token.jup.ag/strict`);
          const jupiterTokens = await jupiterResponse.json();
          const jupiterToken = jupiterTokens.find(token => token.address === tokenAddress);
          
          if (jupiterToken) {
            tokenMetadata.name = jupiterToken.name;
            tokenMetadata.symbol = jupiterToken.symbol;
            tokenMetadata.logoURI = jupiterToken.logoURI;
            tokenMetadata.fromJupiter = true;
            console.log('✅ Got metadata from Jupiter:', { name: tokenMetadata.name, symbol: tokenMetadata.symbol });
          }
        } catch (jupiterError) {
          console.log('⚠️ Jupiter API failed, continuing...');
        }
      }

      // If Jupiter didn't work, try Solana token list
      if (tokenMetadata.name === 'Unknown Token') {
        try {
          const solanaListResponse = await fetch('https://raw.githubusercontent.com/solana-labs/token-list/main/src/tokens/solana.tokenlist.json');
          const solanaList = await solanaListResponse.json();
          const solanaToken = solanaList.tokens.find(token => token.address === tokenAddress);
          
          if (solanaToken) {
            tokenMetadata.name = solanaToken.name;
            tokenMetadata.symbol = solanaToken.symbol;
            tokenMetadata.logoURI = solanaToken.logoURI;
            tokenMetadata.fromSolanaList = true;
            console.log('✅ Got metadata from Solana token list:', { name: tokenMetadata.name, symbol: tokenMetadata.symbol });
          }
        } catch (solanaListError) {
          console.log('⚠️ Solana token list failed, continuing...');
        }
      }

    } catch (rpcError) {
      console.log('⚠️ RPC calls failed, continuing with Bitquery only...');
    }

    // Now get transaction data from Bitquery (but not holders)
    const query = `
      query ($tokenAddress: String!) {
        solana {
          transfers(
            currency: {is: $tokenAddress}
            options: {limit: 100, desc: "block.timestamp.time"}
          ) {
            count
            amount
            sender {
              address
            }
            receiver {
              address
            }
            block {
              timestamp {
                time
              }
            }
          }
        }
      }
    `;

    // Make request to Bitquery
    const options = {
      hostname: 'graphql.bitquery.io',
      port: 443,
      path: '/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': BITQUERY_CONFIG.API_KEY
      }
    };

    const requestData = JSON.stringify({
      query,
      variables: { tokenAddress }
    });

    console.log('📡 Making Bitquery API request...');
    const response = await makeRequest(options, requestData);

    // Process the Bitquery response (transactions only)
    let transactions = 0;
    let bitqueryTokenInfo = {};
    
    if (response.errors) {
      console.error('❌ Bitquery API errors:', response.errors);
    } else if (response.data?.solana) {
      const data = response.data.solana;
      const transfers = data.transfers || [];
      
      transactions = transfers.length;
      
      console.log('✅ Got Bitquery transaction data:', { transactions });
    } else {
      console.warn('⚠️ No data returned from Bitquery API - using RPC data only');
    }

    // Get holder data using free alternatives
    console.log('📡 Fetching holder data using free alternatives...');
    const holdersResult = await fetchHoldersAlternatives(tokenAddress);
    const holdersData = holdersResult.holders;
    const holdersCount = holdersResult.count;
    const holdersSource = holdersResult.source;
    const holdersError = holdersResult.error;
    
    if (holdersError) {
      console.log('⚠️ Holders data limitation:', holdersError);
    } else {
      console.log(`✅ Successfully fetched ${holdersData.length} holders (${holdersCount} total) from ${holdersSource}`);
    }
    
    // Use holdersCount for calculations
    const holders = holdersCount;

    // Calculate risk score
    let riskScore = 5; // Default medium risk
    
    if (holders > 100) riskScore += 2;
    if (transactions > 50) riskScore += 1;
    if (tokenMetadata.supply && parseFloat(tokenMetadata.supply) > 1000000) riskScore += 1;
    
    riskScore = Math.min(10, Math.max(1, riskScore));

    console.log(`✅ Analysis complete for ${tokenAddress}:`);
    console.log(`   • Name: ${tokenMetadata.name}`);
    console.log(`   • Symbol: ${tokenMetadata.symbol}`);
    console.log(`   • Supply: ${tokenMetadata.supply}`);
    console.log(`   • Holders: ${holders} (source: ${holdersSource})`);
    console.log(`   • Transactions: ${transactions}`);

    // Return comprehensive analysis results
    res.json({
      success: true,
      platform: 'Railway',
      tokenAddress,
      symbol: tokenMetadata.symbol,
      name: tokenMetadata.name,
      totalSupply: tokenMetadata.supply,
      decimals: tokenMetadata.decimals,
      logoURI: tokenMetadata.logoURI,
      holders,
      holdersCount,
      transactions,
      riskScore,
      analysis: {
        liquidityScore: Math.min(10, holders / 10),
        holderDistribution: Math.min(10, Math.max(1, 10 - (holders / 20))),
        transactionVolume: Math.min(10, transactions / 10)
      },
      holders: holdersData,
      holdersDataSource: holdersSource,
      recentTransactions: response.data?.solana?.transfers?.slice(0, 5).map(transfer => ({
        from: transfer.sender?.address || '',
        to: transfer.receiver?.address || '',
        amount: transfer.amount || '0',
        timestamp: transfer.block?.timestamp?.time || ''
      })) || [],
      dataSources: {
        rpc: tokenMetadata.supply !== '0' ? 'available' : 'unavailable',
        metaplex: tokenMetadata.name !== 'Unknown Token' && !tokenMetadata.fromJupiter && !tokenMetadata.fromSolanaList && !tokenMetadata.fromSolscan && !tokenMetadata.fromDexScreener && !tokenMetadata.fromBirdeye && !tokenMetadata.fromCoinGecko && !tokenMetadata.fromPumpFun ? 'available' : 'unavailable',
        dexscreener: tokenMetadata.fromDexScreener ? 'available' : 'unavailable',
        birdeye: tokenMetadata.fromBirdeye ? 'available' : 'unavailable',
        coingecko: tokenMetadata.fromCoinGecko ? 'available' : 'unavailable',
        pumpfun: tokenMetadata.fromPumpFun ? 'available' : 'unavailable',
        solscan: tokenMetadata.fromSolscan || (holdersSource && holdersSource !== 'demo-fallback') ? 'available' : 'unavailable',
        jupiter: tokenMetadata.fromJupiter ? 'available' : 'unavailable',
        solanaList: tokenMetadata.fromSolanaList ? 'available' : 'unavailable',
        bitquery: response.data?.solana ? 'available' : 'unavailable',
        holders: holdersSource
      },
      holdersError: holdersError,
      notice: holdersSource === 'demo-fallback' ? 'Real holder data requires Solscan Pro API ($199+/month). Using demo data.' : null
    });

  } catch (error) {
    console.error('❌ Error in analyze-token endpoint:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      tokenAddress: req.body.tokenAddress || 'unknown',
      platform: 'Railway'
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    platform: 'Railway'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Nilo Backend API - Migrated to Railway! 🚄',
    endpoints: [
      'GET /api/test - Test endpoint',
      'POST /api/analyze-token - Analyze Solana token',
      'GET /health - Health check'
    ],
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚄 Railway server running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🧪 Test endpoint: http://localhost:${PORT}/api/test`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('👋 Received SIGINT, shutting down gracefully');  
  process.exit(0);
}); 