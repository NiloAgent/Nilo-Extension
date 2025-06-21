// Netlify Function for Secure Token Analysis
// This replaces the Vercel API endpoint with a Netlify function

const https = require('https');

// Bitquery API Configuration
const BITQUERY_CONFIG = {
  ENDPOINT: 'https://graphql.bitquery.io',
  API_KEY: process.env.BITQUERY_API_KEY
};

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

// Main handler function
exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { tokenAddress } = body;

    if (!tokenAddress) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Token address is required' })
      };
    }

    // Check if API key is available
    if (!BITQUERY_CONFIG.API_KEY) {
      console.error('BITQUERY_API_KEY not found in environment variables');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'API configuration error',
          fallback: true,
          data: {
            tokenAddress,
            symbol: 'DEMO',
            name: 'Demo Token',
            totalSupply: '1000000',
            holders: 150,
            transactions: 2500,
            riskScore: 3,
            analysis: {
              liquidityScore: 7,
              holderDistribution: 8,
              transactionVolume: 6
            }
          }
        })
      };
    }

    // Bitquery GraphQL query
    const query = `
      query ($tokenAddress: String!) {
        ethereum(network: bsc) {
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

    const response = await makeRequest(options, requestData);

    // Process the response
    if (response.errors) {
      throw new Error(`Bitquery API error: ${JSON.stringify(response.errors)}`);
    }

    const data = response.data?.ethereum;
    if (!data) {
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

    // Return analysis results
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
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
      })
    };

  } catch (error) {
    console.error('Error in analyze-token function:', error);
    
    // Return fallback data on error
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        fallback: true,
        error: error.message,
        tokenAddress: JSON.parse(event.body || '{}').tokenAddress || 'unknown',
        symbol: 'DEMO',
        name: 'Demo Token (Fallback)',
        totalSupply: '1000000',
        holders: 150,
        transactions: 2500,
        riskScore: 5,
        analysis: {
          liquidityScore: 7,
          holderDistribution: 8,
          transactionVolume: 6
        },
        holders: [
          { address: '0x1234...5678', balance: '100000', percentage: '10.00' },
          { address: '0x2345...6789', balance: '50000', percentage: '5.00' },
          { address: '0x3456...7890', balance: '25000', percentage: '2.50' }
        ],
        recentTransactions: [
          { from: '0x1111...2222', to: '0x3333...4444', amount: '1000', timestamp: '2024-01-15T10:30:00Z' },
          { from: '0x5555...6666', to: '0x7777...8888', amount: '500', timestamp: '2024-01-15T10:25:00Z' }
        ]
      })
    };
  }
}; 