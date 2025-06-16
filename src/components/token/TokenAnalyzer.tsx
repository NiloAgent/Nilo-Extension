"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Search, Loader2, Shield, TrendingUp, Users, AlertTriangle, CheckCircle } from 'lucide-react';
import { TokenInfoCard } from './TokenInfoCard';
import { HolderList } from './HolderList';
import { AuditResultsList } from './AuditResultRow';
import { heliusClient } from '@/lib/api/helius/client';
import { tokenAnalysisEngine } from '@/cursorRule/tokenAnalysisRules';
import { type TokenAnalysisData } from '@/lib/api/helius/types';

interface AnalysisResult {
  data: TokenAnalysisData;
  analysis: {
    overallScore: number;
    maxScore: number;
    trustScore: number;
    riskLevel: 'low' | 'medium' | 'high';
    ruleResults: any[];
    allRiskFlags: string[];
    summary: string;
  };
}

export function TokenAnalyzer() {
  const [mintAddress, setMintAddress] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validateInput = (address: string): { isValid: boolean; error?: string } => {
    if (!address.trim()) {
      return { isValid: false, error: 'Please enter a token contract address' };
    }

    if (!heliusClient.validateMintAddress(address)) {
      if (address.startsWith('0x')) {
        return { isValid: false, error: 'Ethereum addresses not supported. Please enter a Solana mint address.' };
      }
      if (address.endsWith('.sol')) {
        return { isValid: false, error: '.sol domains not supported. Please enter the actual mint address.' };
      }
      return { isValid: false, error: 'Invalid Solana mint address format (must be 32-44 base58 characters)' };
    }

    return { isValid: true };
  };

  const handleAnalyze = async () => {
    const validation = validateInput(mintAddress);
    if (!validation.isValid) {
      setError(validation.error!);
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      console.log('Starting token analysis...');
      const data = await heliusClient.analyzeToken(mintAddress);
      const analysis = tokenAnalysisEngine.analyzeToken(data);
      
      setResult({ data, analysis });
    } catch (err) {
      console.error('Analysis failed:', err);
      setError(err instanceof Error ? err.message : 'Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isAnalyzing) {
      handleAnalyze();
    }
  };

  const getTrustScoreBadge = (score: number, riskLevel: string) => {
    if (score >= 75) {
      return <Badge variant="default" className="bg-green-600">Low Risk ({score}/100)</Badge>;
    } else if (score >= 50) {
      return <Badge variant="secondary" className="bg-yellow-600">Medium Risk ({score}/100)</Badge>;
    } else {
      return <Badge variant="destructive">High Risk ({score}/100)</Badge>;
    }
  };

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low':
        return <CheckCircle className="h-6 w-6 text-green-400" />;
      case 'medium':
        return <AlertTriangle className="h-6 w-6 text-yellow-400" />;
      case 'high':
        return <Shield className="h-6 w-6 text-red-400" />;
      default:
        return <AlertTriangle className="h-6 w-6 text-gray-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">
            Solana Token Analyzer
          </h1>
          <p className="text-gray-400 text-lg">
            Comprehensive analysis of Solana token contracts using Helius API
          </p>
        </div>

        {/* Search Section */}
        <Card className="bg-gray-900 border-gray-700 mb-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Search className="h-5 w-5" />
              Token Contract Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Enter Solana token contract address (mint address)"
                value={mintAddress}
                onChange={(e) => setMintAddress(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                disabled={isAnalyzing}
              />
              <Button
                onClick={handleAnalyze}
                disabled={isAnalyzing || !mintAddress.trim()}
                className="bg-orange-600 hover:bg-orange-700 text-white px-6"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  'Analyze Token'
                )}
              </Button>
            </div>

            {error && (
              <div className="p-3 bg-red-900/50 border border-red-700 rounded-lg">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            <div className="text-xs text-gray-500">
              <p>• Enter a valid Solana mint address (32-44 base58 characters)</p>
              <p>• Analysis includes metadata, authority status, holder distribution, and creator audit</p>
              <p>• Powered by Helius RPC API for real-time data</p>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        {result && (
          <div className="space-y-6">
            {/* Trust Score Summary */}
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center gap-2">
                    {getRiskIcon(result.analysis.riskLevel)}
                    Trust Score Analysis
                  </CardTitle>
                  {getTrustScoreBadge(result.analysis.trustScore, result.analysis.riskLevel)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white mb-1">
                      {result.analysis.trustScore}
                    </div>
                    <div className="text-sm text-gray-400">Trust Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white mb-1">
                      {result.analysis.ruleResults.filter(r => r.passed).length}/{result.analysis.ruleResults.length}
                    </div>
                    <div className="text-sm text-gray-400">Rules Passed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white mb-1">
                      {result.analysis.allRiskFlags.length}
                    </div>
                    <div className="text-sm text-gray-400">Risk Factors</div>
                  </div>
                </div>
                
                <div className="p-3 bg-gray-800 rounded-lg">
                  <p className="text-sm text-gray-300">{result.analysis.summary}</p>
                </div>
              </CardContent>
            </Card>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Token Information */}
              <div className="space-y-6">
                <TokenInfoCard metadata={result.data.metadata} />
                
                {/* Quick Stats */}
                <Card className="bg-gray-900 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Quick Stats
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-400 mb-1">Holders</p>
                        <p className="text-white font-semibold">
                          {result.data.holders.length.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 mb-1">Creator Transactions</p>
                        <p className="text-white font-semibold">
                          {result.data.creatorSignatures.length}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 mb-1">Mint Authority</p>
                        <p className={`font-semibold ${
                          result.data.metadata.mintAuthority === null ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {result.data.metadata.mintAuthority === null ? 'Burned' : 'Active'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 mb-1">Freeze Authority</p>
                        <p className={`font-semibold ${
                          result.data.metadata.freezeAuthority === null ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {result.data.metadata.freezeAuthority === null ? 'Disabled' : 'Active'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Holder Distribution */}
              <HolderList holders={result.data.holders} />
            </div>

            {/* Detailed Analysis Results */}
            <div>
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <Shield className="h-6 w-6" />
                Detailed Analysis Results
              </h2>
              <AuditResultsList results={result.analysis.ruleResults} />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center text-gray-500 text-sm">
          <p>Powered by Helius RPC API • Built for Solana token due diligence</p>
        </div>
      </div>
    </div>
  );
} 