// Secure Bitquery API Proxy for Solana Token Analysis
// This endpoint keeps the API key server-side for Chrome Web Store compliance

// Bitquery API Configuration
const BITQUERY_CONFIG = {
  EAP_ENDPOINT: 'https://streaming.bitquery.io/eap',
  API_KEY: process.env.BITQUERY_API_KEY // Secure server-side API key
};

// GraphQL Queries (same as frontend)
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

const GET_DEX_TRADES = `
  query GetDexTrades($mintAddress: String!, $limit: Int = 50) {
    Solana {
      DEXTrades(
        where: {
          Trade: {
            Currency: { MintAddress: { is: $mintAddress } }
          }
        }
        limit: { count: $limit }
        orderBy: { descending: Block_Time }
      ) {
        Trade {
          Account {
            Address
          }
          Currency {
            Symbol
            Name
            MintAddress
          }
          Side
          Price
          Amount
          AmountInUSD
        }
        Block {
          Time
        }
      }
    }
  }
`;

// Validate Solana address
function validateSolanaAddress(address) {
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return address && typeof address === 'string' && base58Regex.test(address);
}

// Make secure Bitquery request
async function makeBitqueryRequest(query, variables = {}) {
  if (!BITQUERY_CONFIG.API_KEY) {
    throw new Error('Bitquery API key not configured');
  }

  console.log(' Secure Bitquery Request:', { query: query.substring(0, 100) + '...', variables });
  
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
  console.log(' Bitquery Response:', data.data ? ' Success' : ' No data');
  
  if (data.errors && data.errors.length > 0) {
    console.error(' GraphQL errors:', data.errors);
    throw new Error(`GraphQL errors: ${data.errors.map(e => e.message).join(', ')}`);
  }

  return data.data;
}

// Get token metadata (placeholder for Solana RPC calls)
async function getTokenMetadata(mintAddress) {
  // This would typically make Solana RPC calls
  // For now, return basic structure
  return {
    name: null,
    symbol: null,
    mintAuthority: null,
    freezeAuthority: null,
    supply: null,
    decimals: null
  };
}

// Get top holders
async function getTopHolders(mintAddress) {
  try {
    const data = await makeBitqueryRequest(GET_TOKEN_HOLDERS, { 
      mintAddress,
      limit: 20 
    });

    if (!data?.Solana?.BalanceUpdates) {
      return [];
    }

    return data.Solana.BalanceUpdates.map(update => ({
      address: update.BalanceUpdate.Account.Address,
      balance: update.BalanceUpdate.PostBalance,
      value: update.BalanceUpdate.PostBalance,
      percentage: 0 // Will be calculated on frontend
    }));
  } catch (error) {
    console.error(' Failed to get holders:', error);
    return [];
  }
}

// Get DEX trades
async function getDexTrades(mintAddress) {
  try {
    const data = await makeBitqueryRequest(GET_DEX_TRADES, { 
      mintAddress,
      limit: 100 
    });

    if (!data?.Solana?.DEXTrades) {
      return {
        trades: [],
        totalTrades: 0,
        uniqueTraders: 0
      };
    }

    const trades = data.Solana.DEXTrades;
    const uniqueTraders = new Set(trades.map(t => t.Trade.Account.Address)).size;

    return {
      trades: trades.map(trade => ({
        account: trade.Trade.Account.Address,
        side: trade.Trade.Side,
        price: trade.Trade.Price,
        amount: trade.Trade.Amount,
        amountUSD: trade.Trade.AmountInUSD,
        timestamp: trade.Block.Time
      })),
      totalTrades: trades.length,
      uniqueTraders
    };
  } catch (error) {
    console.error(' Failed to get DEX trades:', error);
    return {
      trades: [],
      totalTrades: 0,
      uniqueTraders: 0
    };
  }
}

// Main analysis function
async function analyzeToken(mintAddress) {
  console.log(` Analyzing token: ${mintAddress}`);

  // Fetch all data in parallel
  const [metadataResult, holdersResult, dexResult] = await Promise.allSettled([
    getTokenMetadata(mintAddress),
    getTopHolders(mintAddress),
    getDexTrades(mintAddress)
  ]);

  const results = {
    metadata: metadataResult.status === 'fulfilled' ? metadataResult.value : null,
    holders: holdersResult.status === 'fulfilled' ? holdersResult.value : [],
    dexData: dexResult.status === 'fulfilled' ? dexResult.value : { trades: [], totalTrades: 0, uniqueTraders: 0 },
    status: {
      metadata: metadataResult.status === 'fulfilled' ? ' Found' : ' Failed',
      holders: holdersResult.status === 'fulfilled' ? 
        ` Found ${holdersResult.value.length}` : ' Failed',
      trades: dexResult.status === 'fulfilled' ? 
        ` Found ${dexResult.value.totalTrades} (${dexResult.value.uniqueTraders} traders)` : ' Failed'
    }
  };

  console.log(' Analysis complete:', results);
  return results;
}

// API Route Handler
export default async function handler(req, res) {
  // Enable CORS for extension - Allow all origins for now
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Allow both GET and POST for testing
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed. Use POST or GET.' 
    });
  }

  // Handle GET request for testing
  if (req.method === 'GET') {
    return res.status(200).json({
      success: true,
      message: 'Nilo Backend API is running',
      timestamp: new Date().toISOString()
    });
  }

  try {
    const { mintAddress, action } = req.body;

    // Validate input
    if (!mintAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing mintAddress parameter'
      });
    }

    if (!validateSolanaAddress(mintAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Solana mint address format'
      });
    }

    // Check API key
    if (!BITQUERY_CONFIG.API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'Server configuration error: API key not found'
      });
    }

    // Perform analysis
    const analysisData = await analyzeToken(mintAddress);

    // Return results
    res.status(200).json({
      success: true,
      data: analysisData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(' API Error:', error);
    
    res.status(500).json({
      success: false,
      error: error.message || 'Analysis failed',
      timestamp: new Date().toISOString()
    });
  }
}
