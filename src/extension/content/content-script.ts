// Content script for injecting risk indicators on websites
import { 
  AnalysisRequest,
  ChromeMessage,
  validateSolanaAddress,
  validateSolDomain
} from '@/types/extension'

// Solana address patterns for detection
const SOLANA_ADDRESS_PATTERN = /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g
const SOLANA_DOMAIN_PATTERN = /\b[a-zA-Z0-9-_]+\.sol\b/g

// Website patterns where we should inject risk indicators
const SUPPORTED_WEBSITES = [
  'solscan.io',           // Solana explorer
  'solana.fm',            // Solana explorer
  'explorer.solana.com',  // Official Solana explorer
  'twitter.com',          // Social media
  'x.com',               // Social media (new Twitter)
  'github.com',          // Code repositories
  'magic-eden.io',       // NFT marketplace
  'tensor.trade',        // NFT marketplace
  'dexscreener.com',     // Token analytics
  'birdeye.so',          // Token analytics
  'jupiter.ag',          // DEX aggregator
  'raydium.io',          // DEX
  'orca.so',             // DEX
]

// Detected addresses cache
const detectedSolanaAddresses = new Set<string>()
const detectedSolDomains = new Set<string>()

// Injection styles
const RISK_INDICATOR_STYLES = `
.nilo-risk-indicator {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 10px;
  font-weight: 500;
  margin-left: 6px;
  vertical-align: middle;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 999999;
  position: relative;
}

.nilo-risk-indicator:hover {
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}

.nilo-risk-low {
  background: #10b981;
  color: white;
}

.nilo-risk-medium {
  background: #f59e0b;
  color: white;
}

.nilo-risk-high {
  background: #ef4444;
  color: white;
}

.nilo-risk-loading {
  background: #6b7280;
  color: white;
  animation: pulse 1.5s ease-in-out infinite alternate;
}

@keyframes pulse {
  from { opacity: 0.6; }
  to { opacity: 1; }
}

.nilo-risk-indicator::before {
  content: '🔍';
  margin-right: 2px;
}

.nilo-risk-low::before { content: '✅'; }
.nilo-risk-medium::before { content: '⚠️'; }
.nilo-risk-high::before { content: '🚨'; }
.nilo-risk-loading::before { content: '⏳'; }

.nilo-tooltip {
  position: absolute;
  background: #1f2937;
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  min-width: 200px;
  max-width: 300px;
  z-index: 1000000;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  border: 1px solid #374151;
  display: none;
  pointer-events: none;
}

.nilo-tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  margin-left: -5px;
  border-width: 5px;
  border-style: solid;
  border-color: #1f2937 transparent transparent transparent;
}
`

// Solana-specific website handlers
const websiteHandlers = {
  'solscan.io': {
    selector: '[data-address], .address, .hash',
    addressExtractor: (element: Element) => {
      const text = element.textContent?.trim() || ''
      return extractSolanaAddressFromText(text)
    }
  },
  'solana.fm': {
    selector: '.address, [data-address], .account-address',
    addressExtractor: (element: Element) => {
      const text = element.textContent?.trim() || ''
      return extractSolanaAddressFromText(text)
    }
  },
  'explorer.solana.com': {
    selector: '.address-label, .account-address, [data-address]',
    addressExtractor: (element: Element) => {
      const text = element.textContent?.trim() || ''
      return extractSolanaAddressFromText(text)
    }
  },
  'twitter.com': {
    selector: '[data-testid="tweetText"], .tweet-content, .tweet-text',
    addressExtractor: (element: Element) => {
      const text = element.textContent?.trim() || ''
      return [...extractSolanaAddressesFromText(text), ...extractSolDomainsFromText(text)]
    }
  },
  'x.com': {
    selector: '[data-testid="tweetText"], .tweet-content, .tweet-text',
    addressExtractor: (element: Element) => {
      const text = element.textContent?.trim() || ''
      return [...extractSolanaAddressesFromText(text), ...extractSolDomainsFromText(text)]
    }
  },
  'github.com': {
    selector: '.blob-code, .highlight, .readme',
    addressExtractor: (element: Element) => {
      const text = element.textContent?.trim() || ''
      return extractSolanaAddressesFromText(text)
    }
  },
  'magic-eden.io': {
    selector: '.address, [data-address]',
    addressExtractor: (element: Element) => {
      const text = element.textContent?.trim() || ''
      return extractSolanaAddressFromText(text)
    }
  }
}

// Text extraction functions
function extractSolanaAddressFromText(text: string): string | null {
  const addresses = extractSolanaAddressesFromText(text)
  return addresses.length > 0 ? addresses[0] : null
}

function extractSolanaAddressesFromText(text: string): string[] {
  const matches = text.match(SOLANA_ADDRESS_PATTERN) || []
  return matches.filter(address => {
    // Additional validation to ensure it's a valid Solana address
    return validateSolanaAddress(address.trim()).valid
  })
}

function extractSolDomainsFromText(text: string): string[] {
  const matches = text.match(SOLANA_DOMAIN_PATTERN) || []
  return matches.filter(domain => {
    return validateSolDomain(domain.trim()).valid
  })
}

// Risk indicator creation
function createRiskIndicator(address: string, riskLevel?: string): HTMLElement {
  const indicator = document.createElement('span')
  indicator.className = `nilo-risk-indicator ${riskLevel ? `nilo-risk-${riskLevel}` : 'nilo-risk-loading'}`
  indicator.textContent = riskLevel ? riskLevel.toUpperCase() : 'Analyzing...'
  indicator.setAttribute('data-address', address)
  indicator.setAttribute('data-nilo-injected', 'true')
  
  // Add click handler
  indicator.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Send message to popup to analyze this address
    chrome.runtime.sendMessage({
      type: 'ANALYZE_FROM_CONTENT',
      payload: { address, source: window.location.hostname },
      timestamp: Date.now()
    })
  })
  
  // Add tooltip on hover
  let tooltip: HTMLElement | null = null
  
  indicator.addEventListener('mouseenter', (e) => {
    tooltip = createTooltip(address, riskLevel)
    document.body.appendChild(tooltip)
    
    const rect = indicator.getBoundingClientRect()
    tooltip.style.left = `${rect.left + rect.width / 2 - tooltip.offsetWidth / 2}px`
    tooltip.style.top = `${rect.top - tooltip.offsetHeight - 10}px`
    tooltip.style.display = 'block'
  })
  
  indicator.addEventListener('mouseleave', () => {
    if (tooltip) {
      tooltip.remove()
      tooltip = null
    }
  })
  
  return indicator
}

function createTooltip(address: string, riskLevel?: string): HTMLElement {
  const tooltip = document.createElement('div')
  tooltip.className = 'nilo-tooltip'
  
  const addressShort = `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
  const riskText = riskLevel ? 
    `Risk Level: ${riskLevel.toUpperCase()}` : 
    'Risk analysis in progress...'
  
  tooltip.innerHTML = `
    <div style="font-weight: 600; margin-bottom: 4px;">Solana Address</div>
    <div style="font-family: monospace; margin-bottom: 6px;">${addressShort}</div>
    <div style="color: #9ca3af;">${riskText}</div>
    <div style="color: #6b7280; margin-top: 4px; font-size: 10px;">Click to analyze • Powered by Nilo</div>
  `
  
  return tooltip
}

// Address analysis and caching
const addressCache = new Map<string, { riskLevel: string; timestamp: number }>()

async function analyzeAddressAndUpdateIndicator(address: string, indicator: HTMLElement) {
  // Check cache first (5 minutes)
  const cached = addressCache.get(address)
  if (cached && Date.now() - cached.timestamp < 300000) {
    updateIndicatorWithRisk(indicator, cached.riskLevel)
    return
  }
  
  try {
    // Request analysis
    const request: AnalysisRequest = {
      type: 'wallet',
      target: address,
      options: { source: 'content-script', hostname: window.location.hostname }
    }
    
    const response = await chrome.runtime.sendMessage({
      type: 'ANALYZE_REQUEST',
      payload: request,
      timestamp: Date.now()
    })
    
    if (response.success && response.data) {
      const riskLevel = response.data.overallRisk
      addressCache.set(address, { riskLevel, timestamp: Date.now() })
      updateIndicatorWithRisk(indicator, riskLevel)
    } else {
      updateIndicatorWithRisk(indicator, 'unknown')
    }
  } catch (error) {
    console.error('Error analyzing Solana address:', error)
    updateIndicatorWithRisk(indicator, 'error')
  }
}

function updateIndicatorWithRisk(indicator: HTMLElement, riskLevel: string) {
  indicator.className = `nilo-risk-indicator nilo-risk-${riskLevel}`
  indicator.textContent = riskLevel.toUpperCase()
}

// Main injection logic
function injectRiskIndicators() {
  const hostname = window.location.hostname
  const handler = websiteHandlers[hostname as keyof typeof websiteHandlers]
  
  if (!handler) {
    // Generic detection for any website
    return injectGenericSolanaDetection()
  }
  
  const elements = document.querySelectorAll(handler.selector)
  
  elements.forEach(element => {
    // Skip if already processed
    if (element.hasAttribute('data-nilo-processed')) return
    element.setAttribute('data-nilo-processed', 'true')
    
    const addresses = handler.addressExtractor(element)
    if (!addresses || (Array.isArray(addresses) ? addresses.length === 0 : !addresses)) return
    
    const addressList = Array.isArray(addresses) ? addresses : [addresses]
    
    addressList.forEach(address => {
      if (!address) return
      
      // Skip if we've already detected this address
      if (detectedSolanaAddresses.has(address) || detectedSolDomains.has(address)) return
      
      // Validate the address/domain
      const isValidAddress = validateSolanaAddress(address).valid
      const isValidDomain = validateSolDomain(address).valid
      
      if (!isValidAddress && !isValidDomain) return
      
      // Add to cache
      if (isValidAddress) {
        detectedSolanaAddresses.add(address)
      } else {
        detectedSolDomains.add(address)
      }
      
      // Create and inject indicator
      const indicator = createRiskIndicator(address)
      
      // Find the best place to inject
      let targetElement = element
      
      // For Twitter/X, try to find the tweet container
      if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
        const tweetContainer = element.closest('article, [data-testid="tweet"]')
        if (tweetContainer) {
          targetElement = tweetContainer.querySelector('[data-testid="tweetText"]') || element
        }
      }
      
      targetElement.appendChild(indicator)
      
      // Start analysis
      if (isValidAddress) {
        analyzeAddressAndUpdateIndicator(address, indicator)
      }
    })
  })
}

function injectGenericSolanaDetection() {
  // Generic text scanning for Solana addresses
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        // Skip script/style elements
        const parent = node.parentElement
        if (!parent || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(parent.tagName)) {
          return NodeFilter.FILTER_REJECT
        }
        
        // Skip if already processed
        if (parent.hasAttribute('data-nilo-processed')) {
          return NodeFilter.FILTER_REJECT
        }
        
        return NodeFilter.FILTER_ACCEPT
      }
    }
  )
  
  const textNodes: Node[] = []
  let node
  while (node = walker.nextNode()) {
    textNodes.push(node)
  }
  
  textNodes.forEach(textNode => {
    const text = textNode.textContent || ''
    const addresses = extractSolanaAddressesFromText(text)
    const domains = extractSolDomainsFromText(text)
    
    if (addresses.length === 0 && domains.length === 0) return
    
    const parent = textNode.parentElement
    if (!parent) return
    
    parent.setAttribute('data-nilo-processed', 'true')
    
    // Replace text with highlighted version
    let newHTML = text
    
    addresses.forEach(address => {
      if (detectedSolanaAddresses.has(address)) return
      detectedSolanaAddresses.add(address)
      
      const indicator = createRiskIndicator(address)
      const span = document.createElement('span')
      span.style.position = 'relative'
      span.textContent = address
      span.appendChild(indicator)
      
      parent.innerHTML = parent.innerHTML.replace(
        address,
        span.outerHTML
      )
      
      // Analyze the address
      const injectedIndicator = parent.querySelector(`[data-address="${address}"]`) as HTMLElement
      if (injectedIndicator) {
        analyzeAddressAndUpdateIndicator(address, injectedIndicator)
      }
    })
  })
}

// Initialize content script
function initializeContentScript() {
  // Check if we should run on this website
  const hostname = window.location.hostname
  const shouldRun = SUPPORTED_WEBSITES.some(site => hostname.includes(site)) || 
                   hostname.includes('solana') || 
                   hostname.includes('sol')
  
  if (!shouldRun) {
    console.log('Nilo: Not running on', hostname)
    return
  }
  
  console.log('Nilo Solana Content Script initialized on', hostname)
  
  // Inject styles
  const styleElement = document.createElement('style')
  styleElement.textContent = RISK_INDICATOR_STYLES
  document.head.appendChild(styleElement)
  
  // Initial injection
  injectRiskIndicators()
  
  // Set up observer for dynamic content
  const observer = new MutationObserver((mutations) => {
    let shouldReinject = false
    
    mutations.forEach(mutation => {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        // Check if new nodes contain text or elements we care about
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element
            const text = element.textContent || ''
            
            if (extractSolanaAddressesFromText(text).length > 0 || 
                extractSolDomainsFromText(text).length > 0) {
              shouldReinject = true
            }
          }
        })
      }
    })
    
    if (shouldReinject) {
      setTimeout(() => injectRiskIndicators(), 500)
    }
  })
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  })
  
  // Periodic re-injection for SPAs
  setInterval(() => {
    injectRiskIndicators()
  }, 3000)
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeContentScript)
} else {
  initializeContentScript()
} 