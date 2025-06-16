import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import {
  ExtensionState,
  AnalysisRequest,
  AnalysisResult,
  ChromeMessage,
  STORAGE_KEYS,
  SOLANA_CONSTANTS,
  SolanaTokenAnalysis,
  validateSolanaTokenAddress
} from '@/types/extension'

interface ExtensionStore extends ExtensionState {
  // Actions
  setAnalyzing: (analyzing: boolean) => void
  setCurrentAnalysis: (analysis: AnalysisResult | undefined) => void
  addToRecentAnalyses: (analysis: AnalysisResult) => void
  requestAnalysis: (request: AnalysisRequest) => Promise<void>
  updateSettings: (settings: Partial<ExtensionState['settings']>) => void
  clearCache: () => void
  setCurrentTokenAddress: (address: string) => void
  analyzeToken: (contractAddress: string) => Promise<void>
  clearAnalysis: () => void
  getCachedAnalysis: (contractAddress: string) => SolanaTokenAnalysis | null
  setCachedAnalysis: (contractAddress: string, analysis: SolanaTokenAnalysis) => void
}

// Create store with persistence using Chrome storage
export const useExtensionStore = create<ExtensionStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        isAnalyzing: false,
        currentAnalysis: undefined,
        recentAnalyses: [],
        settings: {
          autoAnalyze: true,
          riskThreshold: 'medium',
          notificationsEnabled: true,
          cacheEnabled: true,
          cacheTimeout: 5, // 5 minutes
          solanaRpcEndpoint: SOLANA_CONSTANTS.RPC_ENDPOINTS.MAINNET
        },
        currentTokenAddress: '',
        tokenAnalysis: null,
        analysisError: null,
        analysisCache: {},

        // Actions
        setAnalyzing: (analyzing: boolean) => {
          set({ isAnalyzing: analyzing }, false, 'setAnalyzing')
        },

        setCurrentAnalysis: (analysis: AnalysisResult | undefined) => {
          set({ currentAnalysis: analysis }, false, 'setCurrentAnalysis')
        },

        addToRecentAnalyses: (analysis: AnalysisResult) => {
          set((state) => ({
            recentAnalyses: [
              analysis,
              ...state.recentAnalyses.filter(a => a.id !== analysis.id)
            ].slice(0, 10) // Keep only 10 most recent
          }), false, 'addToRecentAnalyses')
        },

        requestAnalysis: async (request: AnalysisRequest) => {
          const { setAnalyzing, setCurrentAnalysis, addToRecentAnalyses } = get()
          
          try {
            setAnalyzing(true)
            
            // Send message to background script
            const message: ChromeMessage = {
              type: 'ANALYZE_REQUEST',
              payload: request,
              timestamp: Date.now()
            }
            
            const response = await new Promise<{ success: boolean; data?: AnalysisResult; error?: string }>((resolve) => {
              chrome.runtime.sendMessage(message, resolve)
            })
            
            if (response.success && response.data) {
              const analysis = response.data
              setCurrentAnalysis(analysis)
              addToRecentAnalyses(analysis)
              
              // Send notification for high-risk results
              const { settings } = get()
              if (settings.notificationsEnabled && analysis.overallRisk === 'high') {
                chrome.notifications?.create({
                  type: 'basic',
                  iconUrl: 'icon-48.png',
                  title: 'High Risk Detected!',
                  message: `Solana ${request.type} analysis shows high risk: ${analysis.target.substring(0, 10)}...`
                })
              }
            } else {
              console.error('Analysis failed:', response.error)
            }
          } catch (error) {
            console.error('Error requesting analysis:', error)
          } finally {
            setAnalyzing(false)
          }
        },

        updateSettings: (newSettings: Partial<ExtensionState['settings']>) => {
          set((state) => ({
            settings: { ...state.settings, ...newSettings }
          }), false, 'updateSettings')
        },

        clearCache: () => {
          set({
            currentAnalysis: undefined,
            recentAnalyses: [],
            currentTokenAddress: '',
            tokenAnalysis: null,
            analysisError: null,
            analysisCache: {}
          }, false, 'clearCache')
          
          // Clear Chrome storage cache
          chrome.storage?.local.remove([STORAGE_KEYS.ANALYSIS_CACHE])
        },

        setCurrentTokenAddress: (address: string) => {
          set({ currentTokenAddress: address, analysisError: null })
        },

        analyzeToken: async (contractAddress: string) => {
          if (!validateSolanaTokenAddress(contractAddress)) {
            set({ analysisError: 'Invalid Solana token contract address' })
            return
          }
          
          set({ isAnalyzing: true, analysisError: null })
          
          try {
            // Check cache first
            const cached = get().getCachedAnalysis(contractAddress)
            if (cached) {
              set({ 
                tokenAnalysis: cached, 
                currentTokenAddress: contractAddress,
                isAnalyzing: false 
              })
              return
            }
            
            // Send message to background script for analysis
            const response = await chrome.runtime.sendMessage({
              type: 'ANALYZE_TOKEN',
              contractAddress
            })
            
            if (response.success) {
              const analysis = response.data as SolanaTokenAnalysis
              
              // Cache the result
              get().setCachedAnalysis(contractAddress, analysis)
              
              set({ 
                tokenAnalysis: analysis,
                currentTokenAddress: contractAddress,
                isAnalyzing: false 
              })
            } else {
              throw new Error(response.error || 'Analysis failed')
            }
          } catch (error) {
            console.error('Token analysis error:', error)
            set({ 
              analysisError: error instanceof Error ? error.message : 'Analysis failed',
              isAnalyzing: false 
            })
          }
        },

        clearAnalysis: () => {
          set({ 
            tokenAnalysis: null, 
            currentTokenAddress: '', 
            analysisError: null 
          })
        },

        getCachedAnalysis: (contractAddress: string) => {
          const cache = get().analysisCache
          const cached = cache[contractAddress]
          
          if (!cached) return null
          
          // Check if cache is expired
          const cacheTimeout = get().settings.cacheTimeout * 60 * 1000 // Convert to ms
          const isExpired = Date.now() - cached.timestamp > cacheTimeout
          
          if (isExpired) {
            // Remove expired cache entry
            const newCache = { ...cache }
            delete newCache[contractAddress]
            set({ analysisCache: newCache })
            return null
          }
          
          return cached
        },

        setCachedAnalysis: (contractAddress: string, analysis: SolanaTokenAnalysis) => {
          set(state => ({
            analysisCache: {
              ...state.analysisCache,
              [contractAddress]: analysis
            }
          }))
        }
      }),
      {
        name: STORAGE_KEYS.EXTENSION_STATE,
        partialize: (state) => ({
          recentAnalyses: state.recentAnalyses,
          settings: state.settings,
          analysisCache: state.analysisCache
        })
      }
    ),
    { name: 'extension-store' }
  )
)

// Message listener for background script updates
if (typeof chrome !== 'undefined' && chrome.runtime) {
  chrome.runtime.onMessage.addListener((message: ChromeMessage) => {
    if (message.type === 'ANALYSIS_RESULT' && message.payload) {
      const store = useExtensionStore.getState()
      store.setCurrentAnalysis(message.payload as AnalysisResult)
      store.addToRecentAnalyses(message.payload as AnalysisResult)
    }
  })
} 