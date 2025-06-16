import React, { useState, useEffect } from 'react'
import { Search, Wallet, Twitter, Github, Activity, AlertTriangle, CheckCircle, XCircle, Clock, TrendingUp, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useExtensionStore } from '@/stores/extension-store'
import { formatCurrency, formatNumber, truncateAddress } from '@/lib/utils'
import { AnalysisRequest, RiskLevel, isValidSolanaInput, SOLANA_CONSTANTS } from '@/types/extension'

// Risk level color mapping
const getRiskColor = (level: RiskLevel) => {
  switch (level) {
    case 'low': return 'success'
    case 'medium': return 'warning'  
    case 'high': return 'danger'
    default: return 'secondary'
  }
}

// Risk level icon mapping
const getRiskIcon = (level: RiskLevel) => {
  switch (level) {
    case 'low': return <CheckCircle className="w-4 h-4" />
    case 'medium': return <AlertTriangle className="w-4 h-4" />
    case 'high': return <XCircle className="w-4 h-4" />
    default: return <Clock className="w-4 h-4" />
  }
}

// Analysis section component
const AnalysisSection: React.FC<{
  title: string
  icon: React.ReactNode
  riskLevel: RiskLevel
  isAnalyzing: boolean
  data?: any
  onAnalyze: () => void
}> = ({ title, icon, riskLevel, isAnalyzing, data, onAnalyze }) => {
  return (
    <Card className="relative">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            {icon}
            {title}
          </div>
          <Badge variant={getRiskColor(riskLevel)} className="text-xs">
            {getRiskIcon(riskLevel)}
            {riskLevel.toUpperCase()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isAnalyzing ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="animate-spin w-4 h-4 border-2 border-brand border-t-transparent rounded-full" />
            Analyzing...
          </div>
        ) : data ? (
          <div className="space-y-1 text-xs">
            {Object.entries(data).slice(0, 3).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="text-muted-foreground capitalize">
                  {key.replace(/([A-Z])/g, ' $1').toLowerCase()}:
                </span>
                <span className="font-mono">{String(value)}</span>
              </div>
            ))}
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={onAnalyze}
            className="w-full h-8 text-xs"
          >
            Start Analysis
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

// Main popup component
export const ExtensionPopup: React.FC = () => {
  const [searchValue, setSearchValue] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [inputType, setInputType] = useState<'address' | 'domain' | null>(null)
  
  const {
    isAnalyzing,
    currentAnalysis,
    recentAnalyses,
    settings,
    requestAnalysis,
    setCurrentAnalysis
  } = useExtensionStore()

  // Validate input as user types
  useEffect(() => {
    if (!searchValue.trim()) {
      setValidationError(null)
      setInputType(null)
      return
    }

    const validation = isValidSolanaInput(searchValue.trim())
    
    if (validation.valid) {
      setValidationError(null)
      setInputType(validation.type)
    } else {
      setValidationError(validation.error || 'Invalid input')
      setInputType(null)
    }
  }, [searchValue])

  // Auto-analyze on search if enabled and valid
  useEffect(() => {
    if (settings.autoAnalyze && searchValue && inputType && !validationError) {
      const timer = setTimeout(() => {
        handleWalletAnalysis()
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [searchValue, inputType, validationError, settings.autoAnalyze])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchValue.trim() && !validationError) {
      handleWalletAnalysis()
    }
  }

  const handleWalletAnalysis = () => {
    if (!searchValue.trim() || validationError) return
    
    let target = searchValue.trim()
    
    // If it's a .sol domain, we would resolve it to an address in a real implementation
    // For now, we'll use a placeholder address
    if (inputType === 'domain') {
      // In reality, you'd resolve the .sol domain to a Solana address
      target = 'DemoSolanaAddressFromDomainResolution1234567890'
    }
    
    const request: AnalysisRequest = {
      type: 'wallet',
      target,
      options: { originalInput: searchValue.trim() }
    }
    requestAnalysis(request)
  }

  const handleTwitterAnalysis = () => {
    const username = currentAnalysis?.target || 'solana_project'
    const request: AnalysisRequest = {
      type: 'twitter',
      target: username,
      options: {}
    }
    requestAnalysis(request)
  }

  const handleGitHubAnalysis = () => {
    const repo = 'solana-labs/solana'
    const request: AnalysisRequest = {
      type: 'github',
      target: repo,
      options: {}
    }
    requestAnalysis(request)
  }

  const handleTransactionAnalysis = () => {
    // Generate a mock Solana transaction signature (base58, ~88 chars)
    const mockSignature = `${Math.random().toString(36).substr(2, 88)}SolTx`
    const request: AnalysisRequest = {
      type: 'transaction',
      target: mockSignature,
      options: {}
    }
    requestAnalysis(request)
  }

  return (
    <TooltipProvider>
      <div className="extension-popup bg-background text-foreground">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Nilo</h1>
              <p className="text-xs text-muted-foreground">Solana Analysis Tool</p>
            </div>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Enter Solana address or .sol domain..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className={`pl-10 text-sm ${validationError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
              />
              {inputType === 'domain' && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <Badge variant="secondary" className="text-xs">
                    .sol
                  </Badge>
                </div>
              )}
            </div>
            
            {/* Validation Error */}
            {validationError && (
              <div className="flex items-center gap-2 text-xs text-red-500">
                <AlertCircle className="w-3 h-3" />
                {validationError}
              </div>
            )}
            
            {/* Input Type Indicator */}
            {inputType && !validationError && (
              <div className="flex items-center gap-2 text-xs text-green-600">
                <CheckCircle className="w-3 h-3" />
                Valid Solana {inputType === 'domain' ? '.sol domain' : 'address'}
              </div>
            )}
            
            <Button 
              type="submit" 
              className="w-full" 
              size="sm"
              disabled={!!validationError || !searchValue.trim()}
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyze Solana Wallet'}
            </Button>
          </form>
        </div>

        {/* Overall Risk Display */}
        {currentAnalysis && (
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-sm">Overall Risk Assessment</h2>
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant={getRiskColor(currentAnalysis.overallRisk)} className="text-xs">
                    {getRiskIcon(currentAnalysis.overallRisk)}
                    {currentAnalysis.overallRisk.toUpperCase()}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs">
                    <div>Risk Score: {currentAnalysis.riskScore}/10</div>
                    <div>Target: {truncateAddress(currentAnalysis.target)}</div>
                    {currentAnalysis.solanaWalletAnalysis && (
                      <div>SOL: {currentAnalysis.solanaWalletAnalysis.balance.toFixed(4)}</div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  currentAnalysis.overallRisk === 'high' 
                    ? 'bg-red-500' 
                    : currentAnalysis.overallRisk === 'medium' 
                    ? 'bg-yellow-500' 
                    : 'bg-green-500'
                }`}
                style={{ width: `${(currentAnalysis.riskScore / 10) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Low Risk</span>
              <span>High Risk</span>
            </div>
          </div>
        )}

        {/* Analysis Sections */}
        <div className="p-4 space-y-3">
          <h2 className="font-semibold text-sm mb-3">Analysis Sections</h2>
          
          <div className="grid grid-cols-1 gap-3">
            {/* Solana Wallet Activity */}
            <AnalysisSection
              title="Solana Wallet Activity"
              icon={<Wallet className="w-4 h-4" />}
              riskLevel={currentAnalysis?.solanaWalletAnalysis?.riskLevel || 'low'}
              isAnalyzing={isAnalyzing && currentAnalysis?.type === 'wallet'}
              data={currentAnalysis?.solanaWalletAnalysis && {
                solBalance: `${currentAnalysis.solanaWalletAnalysis.balance.toFixed(4)} SOL`,
                tokenAccounts: formatNumber(currentAnalysis.solanaWalletAnalysis.tokenAccounts),
                transactions: formatNumber(currentAnalysis.solanaWalletAnalysis.transactionCount)
              }}
              onAnalyze={handleWalletAnalysis}
            />

            {/* Twitter Presence */}
            <AnalysisSection
              title="Twitter Presence"
              icon={<Twitter className="w-4 h-4" />}
              riskLevel={currentAnalysis?.twitterAnalysis?.riskLevel || 'medium'}
              isAnalyzing={isAnalyzing && currentAnalysis?.type === 'twitter'}
              data={currentAnalysis?.twitterAnalysis && {
                followers: formatNumber(currentAnalysis.twitterAnalysis.followers),
                botScore: `${currentAnalysis.twitterAnalysis.botScore}%`,
                verified: currentAnalysis.twitterAnalysis.verified ? 'Yes' : 'No'
              }}
              onAnalyze={handleTwitterAnalysis}
            />

            {/* GitHub Repository */}
            <AnalysisSection
              title="GitHub Repository"
              icon={<Github className="w-4 h-4" />}
              riskLevel={currentAnalysis?.githubAnalysis?.riskLevel || 'medium'}
              isAnalyzing={isAnalyzing && currentAnalysis?.type === 'github'}
              data={currentAnalysis?.githubAnalysis && {
                stars: formatNumber(currentAnalysis.githubAnalysis.stars),
                commits: formatNumber(currentAnalysis.githubAnalysis.commits),
                contributors: currentAnalysis.githubAnalysis.contributors
              }}
              onAnalyze={handleGitHubAnalysis}
            />

            {/* Solana Transaction Analysis */}
            <AnalysisSection
              title="Solana Transaction Analysis"
              icon={<Activity className="w-4 h-4" />}
              riskLevel={currentAnalysis?.solanaTransactionBundle?.riskLevel || 'low'}
              isAnalyzing={isAnalyzing && currentAnalysis?.type === 'transaction'}
              data={currentAnalysis?.solanaTransactionBundle && {
                solTransferred: `${currentAnalysis.solanaTransactionBundle.solTransferred.toFixed(4)} SOL`,
                feeInSol: `${(currentAnalysis.solanaTransactionBundle.fee / SOLANA_CONSTANTS.LAMPORTS_PER_SOL).toFixed(6)} SOL`,
                programs: currentAnalysis.solanaTransactionBundle.programIds.length
              }}
              onAnalyze={handleTransactionAnalysis}
            />
          </div>
        </div>

        {/* Recent Analysis */}
        {recentAnalyses.length > 0 && (
          <div className="p-4 border-t border-border">
            <h3 className="font-semibold text-sm mb-2">Recent Solana Analysis</h3>
            <div className="space-y-2">
              {recentAnalyses.slice(0, 3).map((analysis) => (
                <div
                  key={analysis.id}
                  className="flex items-center justify-between p-2 rounded-md bg-secondary/50 cursor-pointer hover:bg-secondary"
                  onClick={() => setCurrentAnalysis(analysis)}
                >
                  <div className="flex items-center gap-2">
                    <Badge variant={getRiskColor(analysis.overallRisk)} className="text-xs px-1">
                      {analysis.overallRisk.charAt(0).toUpperCase()}
                    </Badge>
                    <span className="text-xs font-mono">
                      {truncateAddress(analysis.target)}
                    </span>
                    {analysis.solanaWalletAnalysis && (
                      <span className="text-xs text-muted-foreground">
                        {analysis.solanaWalletAnalysis.balance.toFixed(2)} SOL
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(analysis.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Solana Footer */}
        <div className="p-4 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">
            Powered by Solana cursorRule Engine
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            SOL only • No Ethereum support
          </p>
        </div>
      </div>
    </TooltipProvider>
  )
} 