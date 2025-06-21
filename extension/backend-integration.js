// Backend API Integration for Secure Token Analysis
// This file replaces direct Bitquery API calls with secure backend proxy
// Cache Buster: 2024-01-15-v7

// Backend API Configuration with multiple fallbacks
const API_CONFIG = {
  // Primary endpoint - Latest Vercel deployment
  BACKEND_ENDPOINTS: [
    'https://nilo-kgogjvrqr-birticeks-projects.vercel.app/api/analyze-token',
    'https://nilo-gws7inbno-birticeks-projects.vercel.app/api/analyze-token',
    'https://nilo-do3dm11jl-birticeks-projects.vercel.app/api/analyze-token'
  ],
  // Test endpoints
  TEST_ENDPOINTS: [
    'https://nilo-kgogjvrqr-birticeks-projects.vercel.app/api/test',
    'https://nilo-gws7inbno-birticeks-projects.vercel.app/api/test',
    'https://nilo-do3dm11jl-birticeks-projects.vercel.app/api/test'
  ],
  // Timeout for each attempt
  TIMEOUT: 10000
};

console.log('🔧 Backend Integration Loaded - Multiple Endpoints:', API_CONFIG.BACKEND_ENDPOINTS);

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
    const response = await fetch(API_CONFIG.BACKEND_ENDPOINTS[0], {
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
    
    // Fallback: Return mock data for demonstration
    console.log('🔄 Using fallback mock data for demonstration...');
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
      status: {
        metadata: '✅ Demo Mode',
        holders: '✅ Demo Data',
        trades: '⚠️ Backend Unavailable'
      }
    };
  }
}

console.log('✅ Backend integration loaded successfully with endpoint:', API_CONFIG.BACKEND_ENDPOINTS[0]);
