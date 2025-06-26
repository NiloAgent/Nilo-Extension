// Backend API Integration for Secure Token Analysis
// This file replaces direct Bitquery API calls with secure backend proxy
// Cache Buster: 2024-01-15-v8-railway

// Backend API Configuration with Railway endpoints
const API_CONFIG = {
  // Primary Railway endpoint
  BACKEND_ENDPOINTS: [
    'https://nilo-backend-production.up.railway.app/api/analyze-token'
  ],
  // Test endpoints
  TEST_ENDPOINTS: [
    'https://nilo-backend-production.up.railway.app/api/test'
  ],
  // Timeout for each attempt
  TIMEOUT: 10000
};

console.log('🔧 Backend Integration Loaded - Railway Endpoints:', API_CONFIG.BACKEND_ENDPOINTS);

// Enhanced API call with multiple endpoint fallback
async function callBackendAPIWithFallback(tokenAddress) {
  const errors = [];
  
  // Try each endpoint in order
  for (let i = 0; i < API_CONFIG.BACKEND_ENDPOINTS.length; i++) {
    const endpoint = API_CONFIG.BACKEND_ENDPOINTS[i];
    
    try {
      console.log(`🔄 Attempting backend call ${i + 1}/${API_CONFIG.BACKEND_ENDPOINTS.length}: ${endpoint}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tokenAddress }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ Backend API call successful:', endpoint);
      return data;
      
    } catch (error) {
      console.warn(`❌ Backend endpoint ${i + 1} failed:`, endpoint, error.message);
      errors.push(`Endpoint ${i + 1}: ${error.message}`);
      
      // Continue to next endpoint
      continue;
    }
  }
  
  // All endpoints failed
  console.error('🚨 All backend endpoints failed:', errors);
  throw new Error(`All backend endpoints failed: ${errors.join('; ')}`);
}

// Secure Backend API Call
async function analyzeTokenViaBackend(mintAddress) {
  console.log('🔄 Making secure backend API call for:', mintAddress);
  console.log('🌐 Using endpoint:', API_CONFIG.BACKEND_ENDPOINTS[0]);
  
  try {
    const requestBody = { tokenAddress: mintAddress };
    console.log('📤 Request body:', JSON.stringify(requestBody));
    
    const response = await fetch(API_CONFIG.BACKEND_ENDPOINTS[0], {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    console.log('📡 Response status:', response.status, response.statusText);
    
    let result;
    try {
      result = await response.json();
    } catch (parseError) {
      console.error('❌ Failed to parse response as JSON:', parseError);
      throw new Error(`Invalid JSON response from backend: ${response.status}`);
    }
    
    console.log('📊 Backend API Response:', result);

    // Handle successful response (200 OK)
    if (response.ok && result.success) {
      console.log('✅ Backend returned successful data');
      
      // Transform backend response to match frontend expectations
      const transformedData = {
        metadata: {
          name: result.name || 'Unknown Token',
          symbol: result.symbol || 'N/A',
          supply: result.totalSupply || '0',
          decimals: 9,
          mintAuthority: 'null',
          freezeAuthority: 'null',
          logoURI: null
        },
        holders: result.holders || [],
        dexData: {
          trades: result.recentTransactions || [],
          totalTrades: result.transactions || 0,
          uniqueTraders: 0
        },
        trustScore: result.riskScore || 5,
        analysis: result.analysis || {
          liquidityScore: 5,
          holderDistribution: 5,
          transactionVolume: 5
        },
        status: {
          metadata: '✅ Railway Backend',
          holders: `✅ ${result.holders?.length || 0} holders`,
          trades: `✅ ${result.transactions || 0} transactions`
        }
      };

      console.log('✅ Successfully transformed backend data');
      return transformedData;
    }
    
    // Handle error responses (400, 500, etc.)
    if (!response.ok) {
      console.error('❌ Backend returned error:', response.status, result);
      
      // Log specific error details for debugging
      if (result.error) {
        console.error('❌ Error details:', result.error);
      }
      
      // Don't throw error, just fall through to fallback data
      console.log('⚠️ Using fallback data due to backend error');
    }
    
    // Handle cases where response is OK but success is false
    if (response.ok && !result.success) {
      console.warn('⚠️ Backend response OK but success=false:', result);
      console.log('⚠️ Using fallback data');
    }
    
  } catch (error) {
    console.error('❌ Network or fetch error:', error.message);
    console.log('⚠️ Using fallback data due to network error');
  }
  
  // Fallback: Always return valid data structure
  console.log('🔄 Returning fallback demo data...');
  return {
    metadata: {
      name: 'Demo Token',
      symbol: 'DEMO', 
      supply: 1000000000,
      decimals: 9,
      mintAuthority: 'null',
      freezeAuthority: 'null',
      logoURI: null
    },
    holders: [
      { address: 'Demo1...', balance: 100000, percentage: 10 },
      { address: 'Demo2...', balance: 50000, percentage: 5 },
      { address: 'Demo3...', balance: 30000, percentage: 3 }
    ],
    dexData: {
      trades: [],
      totalTrades: 0,
      uniqueTraders: 0
    },
    trustScore: 5,
    analysis: {
      liquidityScore: 5,
      holderDistribution: 5,
      transactionVolume: 5
    },
    status: {
      metadata: '⚠️ Demo Mode',
      holders: '⚠️ Backend Unavailable',
      trades: '⚠️ Using Fallback Data'
    }
  };
}

console.log('✅ Backend integration loaded successfully with endpoint:', API_CONFIG.BACKEND_ENDPOINTS[0]);
