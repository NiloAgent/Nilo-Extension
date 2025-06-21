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

console.log('🚀 Nilo Backend Server Starting...');
console.log('📡 Bitquery API Key:', BITQUERY_CONFIG.API_KEY ? 'Configured ✅' : 'Missing ❌');

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

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'Nilo Backend API is working on Railway! 🚄',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    bitqueryConfigured: !!BITQUERY_CONFIG.API_KEY
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

    // Bitquery GraphQL query for Solana (updated for Solana network)
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
          address(address: {is: $tokenAddress}) {
            balances(
              currency: {is: $tokenAddress}
              options: {limit: 20, desc: "value"}
            ) {
              currency {
                symbol
                name
                totalSupply
              }
              value
              address {
                address
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

    // Process the response
    if (response.errors) {
      console.error('❌ Bitquery API errors:', response.errors);
      throw new Error(`Bitquery API error: ${JSON.stringify(response.errors)}`);
    }

    const data = response.data?.solana;
    if (!data) {
      console.error('❌ No data returned from Bitquery API');
      throw new Error('No data returned from Bitquery API');
    }

    // Extract token information
    const balances = data.address?.[0]?.balances || [];
    const transfers = data.transfers || [];
    const tokenInfo = balances[0]?.currency || {};

    // Calculate analysis metrics
    const holders = balances.length;
    const transactions = transfers.length;
    const totalSupply = tokenInfo.totalSupply || '0';
    
    // Simple risk scoring (1-10, where 10 is safest)
    let riskScore = 5; // Default medium risk
    
    if (holders > 100) riskScore += 2;
    if (transactions > 50) riskScore += 1;
    if (totalSupply && parseFloat(totalSupply) > 1000000) riskScore += 1;
    
    riskScore = Math.min(10, Math.max(1, riskScore));

    console.log(`✅ Analysis complete for ${tokenAddress}: ${holders} holders, ${transactions} transactions`);

    // Return analysis results
    res.json({
      success: true,
      platform: 'Railway',
      tokenAddress,
      symbol: tokenInfo.symbol || 'UNKNOWN',
      name: tokenInfo.name || 'Unknown Token',
      totalSupply: totalSupply,
      holders,
      transactions,
      riskScore,
      analysis: {
        liquidityScore: Math.min(10, holders / 10),
        holderDistribution: Math.min(10, Math.max(1, 10 - (holders / 20))),
        transactionVolume: Math.min(10, transactions / 10)
      },
      holders: balances.slice(0, 10).map(balance => ({
        address: balance.address?.address || '',
        balance: balance.value || '0',
        percentage: totalSupply ? ((parseFloat(balance.value || '0') / parseFloat(totalSupply)) * 100).toFixed(2) : '0'
      })),
      recentTransactions: transfers.slice(0, 5).map(transfer => ({
        from: transfer.sender?.address || '',
        to: transfer.receiver?.address || '',
        amount: transfer.amount || '0',
        timestamp: transfer.block?.timestamp?.time || ''
      }))
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