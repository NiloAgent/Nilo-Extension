// Updated analyzeTokenMain function that uses backend API
async function analyzeTokenMainSecure() {
  const mintAddress = elements.mintAddress.value.trim();
  
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
  currentMintAddress = mintAddress;
  
  try {
    console.log('🔍 Starting secure analysis for:', mintAddress);
    
    // Call backend API
    const response = await fetch('http://localhost:3000/api/analyze-token', {
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

    const backendData = result.data;
    
    // Get additional metadata from Solana RPC
    const rpcMetadata = await getTokenMetadata(mintAddress);
    
    // Combine data
    const combinedData = {
      ...backendData,
      metadata: {
        ...backendData.metadata,
        ...rpcMetadata
      }
    };
    
    // Calculate risk score using existing function
    const analysis = calculateRiskScore(combinedData.holders || [], combinedData.metadata || {});
    
    // Update UI using existing functions
    await updateTokenInfo(mintAddress, combinedData);
    updateTrustScore(analysis, combinedData.status);
    
    console.log('✅ Secure analysis complete');
    showResults();
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    
    // Provide helpful error messages
    if (error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
      showError('Unable to connect to backend API. Make sure the backend server is running on localhost:3000');
    } else {
      showError(error.message || 'Analysis failed. Please try again.');
    }
  } finally {
    hideLoading();
  }
}

// Replace the original function
if (typeof analyzeTokenMain !== 'undefined') {
  window.analyzeTokenMainOriginal = analyzeTokenMain;
}
window.analyzeTokenMain = analyzeTokenMainSecure;

console.log('🔒 Secure backend integration loaded'); 