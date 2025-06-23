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

// Solscan API Configuration
const SOLSCAN_CONFIG = {
  API_URL: process.env.SOLSCAN_API_URL || 'https://public-api.solscan.io'
};

console.log('🚀 Nilo Backend Server Starting...');
console.log('📡 Bitquery API Key:', BITQUERY_CONFIG.API_KEY ? 'Configured ✅' : 'Missing ❌');
console.log('📡 Solscan API URL:', SOLSCAN_CONFIG.API_URL ? 'Configured ✅' : 'Missing ❌');

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

// Enhanced Solscan API functions
async function fetchSolscanHolders(tokenAddress) {
  try {
    console.log(`📡 Fetching holders from Solscan for token: ${tokenAddress}`);
    
    const holdersUrl = `${SOLSCAN_CONFIG.API_URL}/token/holders?tokenAddress=${tokenAddress}&limit=50&offset=0`;
    console.log(`🔗 Solscan holders URL: ${holdersUrl}`);
    
    const response = await fetch(holdersUrl, {
      headers: {
        'User-Agent': 'Nilo-Extension/2.0',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive'
      },
      timeout: 10000
    });
    
    if (!response.ok) {
      console.log(`⚠️ Solscan holders API returned status: ${response.status}`);
      const errorText = await response.text();
      console.log(`⚠️ Solscan error response: ${errorText}`);
      return { holders: [], count: 0, error: `HTTP ${response.status}` };
    }
    
    const data = await response.json();
    console.log('✅ Raw Solscan holders response:', JSON.stringify(data, null, 2));
    
    if (data.success === false) {
      console.log('⚠️ Solscan API returned success=false:', data);
      return { holders: [], count: 0, error: data.error || 'API returned success=false' };
    }
    
    // Handle different response formats
    let holdersArray = [];
    let totalCount = 0;
    
    if (data.data && Array.isArray(data.data)) {
      holdersArray = data.data;
      totalCount = data.total || data.data.length;
    } else if (Array.isArray(data)) {
      holdersArray = data;
      totalCount = data.length;
    } else if (data.holders && Array.isArray(data.holders)) {
      holdersArray = data.holders;
      totalCount = data.totalHolders || data.holders.length;
    }
    
    console.log(`📊 Processing ${holdersArray.length} holders from Solscan...`);
    
    const processedHolders = holdersArray.slice(0, 20).map((holder, index) => {
      const holderData = {
        rank: index + 1,
        address: holder.owner || holder.address || holder.account || `Unknown-${index}`,
        balance: holder.amount || holder.balance || holder.lamports || '0',
        percentage: holder.percentage || holder.percent || 0,
        decimals: holder.decimals || 9
      };
      
      // Calculate percentage if not provided
      if (!holderData.percentage && holder.amount && data.totalSupply) {
        const balanceNum = parseFloat(holderData.balance);
        const supplyNum = parseFloat(data.totalSupply);
        if (supplyNum > 0) {
          holderData.percentage = ((balanceNum / supplyNum) * 100).toFixed(4);
        }
      }
      
      console.log(`👤 Holder ${holderData.rank}: ${holderData.address.substring(0, 8)}... (${holderData.percentage}%)`);
      return holderData;
    });
    
    console.log(`✅ Successfully processed ${processedHolders.length} holders from Solscan`);
    
    return {
      holders: processedHolders,
      count: totalCount,
      error: null
    };
    
  } catch (error) {
    console.error('❌ Error fetching Solscan holders:', error.message);
    return {
      holders: [],
      count: 0,
      error: error.message
    };
  }
}

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'Nilo Backend API is working on Railway! 🚄',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    bitqueryConfigured: !!BITQUERY_CONFIG.API_KEY,
    solscanConfigured: !!SOLSCAN_CONFIG.API_URL
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

    // Get holder data from Enhanced Solscan API
    console.log('📡 Fetching enhanced holder data from Solscan...');
    const holdersResult = await fetchSolscanHolders(tokenAddress);
    const holdersData = holdersResult.holders;
    const holdersCount = holdersResult.count;
    const holdersError = holdersResult.error;
    
    if (holdersError) {
      console.log('⚠️ Solscan holders error:', holdersError);
    } else {
      console.log(`✅ Successfully fetched ${holdersData.length} holders (${holdersCount} total)`);
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
    console.log(`   • Holders: ${holders}`);
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
        solscan: tokenMetadata.fromSolscan || holdersData.length > 0 ? 'available' : 'unavailable',
        jupiter: tokenMetadata.fromJupiter ? 'available' : 'unavailable',
        solanaList: tokenMetadata.fromSolanaList ? 'available' : 'unavailable',
        bitquery: response.data?.solana ? 'available' : 'unavailable'
      },
      solscanHoldersError: holdersError
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