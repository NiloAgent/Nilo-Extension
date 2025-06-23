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

// Helius API Configuration - Much better for holders data!
const HELIUS_CONFIG = {
  API_KEY: process.env.HELIUS_API_KEY || '5e390e48-0c3b-4dd8-89a9-7736ce552c38',
  RPC_URL: process.env.HELIUS_RPC_URL || `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY || '5e390e48-0c3b-4dd8-89a9-7736ce552c38'}`,
  BASE_URL: 'https://api.helius.xyz/v0'
};

// Legacy Solscan config (keeping as fallback)
const SOLSCAN_CONFIG = {
  PRO_API_URL: 'https://pro-api.solscan.io/v2.0',
  API_KEY: process.env.SOLSCAN_API_KEY
};

console.log('🚀 Nilo Backend Server Starting...');
console.log('📡 Bitquery API Key:', BITQUERY_CONFIG.API_KEY ? 'Configured ✅' : 'Missing ❌');
console.log('🔥 Helius RPC URL:', HELIUS_CONFIG.RPC_URL ? 'Configured ✅' : 'Missing ❌');
console.log('🔑 Helius API Key:', HELIUS_CONFIG.API_KEY ? 'Configured ✅' : 'Missing ❌');
console.log('📡 Solscan API Key:', SOLSCAN_CONFIG.API_KEY ? 'Configured ✅ (Fallback)' : 'Missing ❌');

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

// Enhanced Helius + Solana RPC holders fetching
async function fetchTokenHolders(tokenAddress) {
  console.log(`🔥 Fetching holders using Helius + Solana RPC for token: ${tokenAddress}`);
  
  let holdersData = [];
  let holdersCount = 0;
  let dataSource = 'helius';
  let error = null;

  // Method 1: Try Helius RPC getTokenLargestAccounts (Best method)
  if (HELIUS_CONFIG.API_KEY) {
    try {
      console.log('🔥 Using Helius RPC for token largest accounts...');
      
      const response = await fetch(HELIUS_CONFIG.RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getTokenLargestAccounts',
          params: [tokenAddress]
        })
      });
      
      console.log(`📡 Helius RPC Response Status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Raw Helius RPC response:', JSON.stringify(data, null, 2));
        
        if (data.result?.value && Array.isArray(data.result.value)) {
          const accounts = data.result.value;
          
          if (accounts.length > 0) {
            // Calculate total supply from all accounts
            const totalSupply = accounts.reduce((sum, acc) => sum + parseFloat(acc.amount || 0), 0);
            
            holdersData = accounts.slice(0, 50).map((account, index) => ({
              rank: index + 1,
              address: account.address || `Account-${index + 1}`,
              balance: account.amount || '0',
              percentage: totalSupply > 0 ? ((parseFloat(account.amount || 0) / totalSupply) * 100).toFixed(4) : '0',
              decimals: account.decimals || 9,
              value: parseFloat(account.amount || 0)
            }));
            
            holdersCount = Math.max(accounts.length, 100); // Estimate total holders
            dataSource = 'helius-rpc';
            console.log(`✅ Got ${holdersData.length} holders from Helius RPC (${holdersCount} estimated total)`);
            
            return {
              holders: holdersData,
              count: holdersCount,
              source: dataSource,
              error: null
            };
          }
        }
      } else {
        const errorText = await response.text();
        console.log(`❌ Helius RPC returned status ${response.status}: ${errorText}`);
        error = `Helius RPC error: ${response.status}`;
      }
    } catch (heliusError) {
      console.error('❌ Helius RPC request failed:', heliusError.message);
      error = `Helius RPC failed: ${heliusError.message}`;
    }
  }

  // Method 2: Try Helius API for token metadata and holder estimation
  if (!holdersData.length && HELIUS_CONFIG.API_KEY) {
    try {
      console.log('🔍 Trying Helius API for token metadata...');
      
      const response = await fetch(`${HELIUS_CONFIG.BASE_URL}/token-metadata?api-key=${HELIUS_CONFIG.API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mintAccounts: [tokenAddress]
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Helius metadata response:', JSON.stringify(data, null, 2));
        
        // If we get metadata, try to estimate holders from supply
        if (data && data.length > 0) {
          const tokenInfo = data[0];
          if (tokenInfo.supply) {
            // Estimate holders based on supply (very rough estimate)
            holdersCount = Math.min(Math.max(Math.floor(tokenInfo.supply / 1000000), 10), 10000);
            dataSource = 'helius-estimated';
            error = 'Using Helius metadata estimation';
          }
        }
      }
    } catch (heliusApiError) {
      console.log('⚠️ Helius API metadata request failed:', heliusApiError.message);
    }
  }

  // Method 3: Fallback to standard Solana RPC
  if (!holdersData.length) {
    try {
      console.log('🔗 Fallback: Using standard Solana RPC...');
      
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
          
          holdersCount = Math.max(accounts.length, 50);
          dataSource = 'solana-rpc';
          error = 'Helius failed, using standard Solana RPC';
          console.log(`✅ Got ${holdersData.length} largest accounts from standard Solana RPC`);
        }
      }
    } catch (rpcError) {
      console.log('⚠️ Standard Solana RPC also failed:', rpcError.message);
    }
  }

  // Method 4: Bitquery GraphQL estimation (if still no data)
  if (!holdersData.length && BITQUERY_CONFIG.API_KEY) {
    try {
      console.log('🔍 Fallback: Trying Bitquery GraphQL for holders estimation...');
      
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
          
          holdersCount = Math.max(holderMap.size, 100);
          dataSource = 'bitquery-estimated';
          error = 'All RPC methods failed, using Bitquery estimation';
          console.log(`✅ Estimated ${holdersData.length} top holders from Bitquery`);
        }
      }
    } catch (bitqueryError) {
      console.log('⚠️ Bitquery holders estimation also failed:', bitqueryError.message);
    }
  }

  // Final fallback: Demo data with clear disclaimer
  if (!holdersData.length) {
    console.log('⚠️ All methods failed, using demo data...');
    holdersData = [
      { rank: 1, address: 'Demo1...', balance: '1000000', percentage: '25.5', decimals: 9 },
      { rank: 2, address: 'Demo2...', balance: '800000', percentage: '20.2', decimals: 9 },
      { rank: 3, address: 'Demo3...', balance: '600000', percentage: '15.1', decimals: 9 }
    ];
    holdersCount = 150;
    dataSource = 'demo';
    error = 'All APIs failed, showing demo data';
  }

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
    solscanApiKeyConfigured: !!SOLSCAN_CONFIG.API_KEY
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

    // Get holder data using Solscan API with your key
    console.log('📡 Fetching holder data using Solscan API...');
    const holdersResult = await fetchTokenHolders(tokenAddress);
    const holdersData = holdersResult.holders;
    const holdersCount = holdersResult.count;
    const holdersSource = holdersResult.source;
    const holdersError = holdersResult.error;
    
    if (holdersError) {
      console.log('⚠️ Holders data note:', holdersError);
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
      solscanApiUsed: !!SOLSCAN_CONFIG.API_KEY
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