// Content script for Solana Token Analyzer
// Detects Solana addresses on web pages and adds analysis buttons

(function() {
  'use strict';
  
  // Configuration
  const SOLANA_ADDRESS_REGEX = /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g;
  const PROCESSED_CLASS = 'solana-analyzer-processed';
  
  // Only run on supported sites
  const SUPPORTED_SITES = [
    'solscan.io',
    'solana.fm',
    'explorer.solana.com',
    'dexscreener.com',
    'birdeye.so',
    'jup.ag',
    'raydium.io'
  ];
  
  if (!SUPPORTED_SITES.some(site => window.location.hostname.includes(site))) {
    return;
  }
  
  console.log('Solana Token Analyzer content script loaded on:', window.location.hostname);
  
  // Create analysis button
  function createAnalysisButton(address) {
    const button = document.createElement('button');
    button.className = 'solana-analyzer-btn';
    button.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
        <path d="M12 22S2 16 2 9C2 7 4 5 6 5C8 5 10 6 12 8C14 6 16 5 18 5C20 5 22 7 22 9C22 16 12 22 12 22Z" stroke="currentColor" stroke-width="2"/>
      </svg>
      Analyze
    `;
    button.title = 'Analyze this Solana token with Solana Token Analyzer';
    
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      analyzeAddress(address);
    });
    
    return button;
  }
  
  // Analyze address function
  function analyzeAddress(address) {
    // Send message to background script
    chrome.runtime.sendMessage({
      action: 'analyzeToken',
      mintAddress: address
    }, (response) => {
      if (response && response.success) {
        showAnalysisResult(address, response.data);
      } else {
        console.error('Analysis failed:', response?.error);
        showError('Analysis failed. Please try again.');
      }
    });
  }
  
  // Show analysis result in a modal
  function showAnalysisResult(address, data) {
    // Remove existing modal
    const existingModal = document.getElementById('solana-analyzer-modal');
    if (existingModal) {
      existingModal.remove();
    }
    
    // Create modal
    const modal = document.createElement('div');
    modal.id = 'solana-analyzer-modal';
    modal.innerHTML = `
      <div class="solana-analyzer-overlay">
        <div class="solana-analyzer-modal">
          <div class="solana-analyzer-header">
            <h3>Solana Token Analysis</h3>
            <button class="solana-analyzer-close">&times;</button>
          </div>
          <div class="solana-analyzer-content">
            <div class="solana-analyzer-score">
              <div class="score-circle ${data.analysis.riskLevel}">
                ${data.analysis.trustScore}
              </div>
              <div class="score-info">
                <div class="score-title">Trust Score</div>
                <div class="score-subtitle">${data.analysis.riskLevel.toUpperCase()} RISK</div>
              </div>
            </div>
            
            <div class="solana-analyzer-details">
              <div class="detail-item">
                <span class="detail-label">Token:</span>
                <span class="detail-value">${data.metadata?.name || 'Unknown'} (${data.metadata?.symbol || 'UNK'})</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Mint Authority:</span>
                <span class="detail-value ${data.mintInfo?.data?.parsed?.info?.mintAuthority === null ? 'safe' : 'danger'}">
                  ${data.mintInfo?.data?.parsed?.info?.mintAuthority === null ? 'Burned ✓' : 'Active ⚠️'}
                </span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Freeze Authority:</span>
                <span class="detail-value ${data.mintInfo?.data?.parsed?.info?.freezeAuthority === null ? 'safe' : 'danger'}">
                  ${data.mintInfo?.data?.parsed?.info?.freezeAuthority === null ? 'Disabled ✓' : 'Active ⚠️'}
                </span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Holders:</span>
                <span class="detail-value">${data.holders?.length || 0}</span>
              </div>
            </div>
            
            ${data.analysis.riskFlags.length > 0 ? `
              <div class="solana-analyzer-risks">
                <div class="risks-title">⚠️ Risk Factors:</div>
                ${data.analysis.riskFlags.map(flag => `<div class="risk-item">• ${flag}</div>`).join('')}
              </div>
            ` : ''}
            
            <div class="solana-analyzer-actions">
              <button class="action-btn secondary" onclick="window.open('https://solscan.io/token/${address}', '_blank')">
                View on Solscan
              </button>
              <button class="action-btn primary" onclick="document.getElementById('solana-analyzer-modal').remove()">
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Add event listeners
    modal.querySelector('.solana-analyzer-close').addEventListener('click', () => {
      modal.remove();
    });
    
    modal.querySelector('.solana-analyzer-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        modal.remove();
      }
    });
    
    document.body.appendChild(modal);
  }
  
  // Show error message
  function showError(message) {
    const toast = document.createElement('div');
    toast.className = 'solana-analyzer-toast error';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }
  
  // Validate Solana address
  function isValidSolanaAddress(address) {
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    return address && base58Regex.test(address) && !address.startsWith('0x');
  }
  
  // Find and process Solana addresses
  function processAddresses() {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          // Skip already processed nodes
          if (node.parentElement?.classList.contains(PROCESSED_CLASS)) {
            return NodeFilter.FILTER_REJECT;
          }
          
          // Skip script and style tags
          const tagName = node.parentElement?.tagName.toLowerCase();
          if (tagName === 'script' || tagName === 'style') {
            return NodeFilter.FILTER_REJECT;
          }
          
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );
    
    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
      textNodes.push(node);
    }
    
    textNodes.forEach(textNode => {
      const text = textNode.textContent;
      const matches = text.match(SOLANA_ADDRESS_REGEX);
      
      if (matches) {
        matches.forEach(match => {
          if (isValidSolanaAddress(match)) {
            // Create a wrapper for the address with analysis button
            const wrapper = document.createElement('span');
            wrapper.className = 'solana-address-wrapper ' + PROCESSED_CLASS;
            wrapper.innerHTML = `
              <span class="solana-address">${match}</span>
              <span class="solana-analyzer-btn-wrapper">
                ${createAnalysisButton(match).outerHTML}
              </span>
            `;
            
            // Replace the text node
            const newText = text.replace(match, wrapper.outerHTML);
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = newText;
            
            while (tempDiv.firstChild) {
              textNode.parentNode.insertBefore(tempDiv.firstChild, textNode);
            }
            textNode.remove();
          }
        });
      }
    });
  }
  
  // Initialize
  function init() {
    // Add event listeners for dynamically created buttons
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('solana-analyzer-btn') || 
          e.target.closest('.solana-analyzer-btn')) {
        const button = e.target.classList.contains('solana-analyzer-btn') ? 
                     e.target : e.target.closest('.solana-analyzer-btn');
        const address = button.closest('.solana-address-wrapper')?.querySelector('.solana-address')?.textContent;
        if (address) {
          analyzeAddress(address);
        }
      }
    });
    
    // Process addresses on page load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', processAddresses);
    } else {
      processAddresses();
    }
    
    // Watch for dynamic content changes
    const observer = new MutationObserver((mutations) => {
      let shouldProcess = false;
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          shouldProcess = true;
        }
      });
      
      if (shouldProcess) {
        setTimeout(processAddresses, 500); // Debounce
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  
  // Start the content script
  init();
  
})(); 