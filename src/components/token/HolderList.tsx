import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ExternalLink, Users, AlertTriangle } from 'lucide-react';
import { type TokenHolder } from '@/lib/api/helius/types';

interface HolderListProps {
  holders: TokenHolder[];
  className?: string;
}

export function HolderList({ holders, className }: HolderListProps) {
  if (holders.length === 0) {
    return (
      <Card className={`bg-gray-900 border-gray-700 ${className}`}>
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="h-5 w-5" />
            Token Holders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <p className="text-gray-400">No holder data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalSupply = holders.reduce((sum, holder) => sum + holder.uiAmount, 0);
  
  const formatAmount = (amount: number) => {
    if (amount >= 1e9) {
      return `${(amount / 1e9).toFixed(2)}B`;
    } else if (amount >= 1e6) {
      return `${(amount / 1e6).toFixed(2)}M`;
    } else if (amount >= 1e3) {
      return `${(amount / 1e3).toFixed(2)}K`;
    }
    return amount.toLocaleString();
  };

  const getConcentrationRisk = () => {
    const topHolderPercent = totalSupply > 0 ? (holders[0]?.uiAmount || 0) / totalSupply * 100 : 0;
    const top3Percent = totalSupply > 0 ? 
      holders.slice(0, 3).reduce((sum, holder) => sum + holder.uiAmount, 0) / totalSupply * 100 : 0;

    if (topHolderPercent > 50) return 'high';
    if (top3Percent > 60) return 'high';
    if (topHolderPercent > 25) return 'medium';
    if (top3Percent > 40) return 'medium';
    return 'low';
  };

  const concentrationRisk = getConcentrationRisk();
  const topHolderPercent = totalSupply > 0 ? (holders[0]?.uiAmount || 0) / totalSupply * 100 : 0;
  const top3Percent = totalSupply > 0 ? 
    holders.slice(0, 3).reduce((sum, holder) => sum + holder.uiAmount, 0) / totalSupply * 100 : 0;

  const getRiskBadge = () => {
    switch (concentrationRisk) {
      case 'high':
        return <Badge variant="destructive">High Risk</Badge>;
      case 'medium':
        return <Badge variant="secondary" className="bg-yellow-600">Medium Risk</Badge>;
      case 'low':
        return <Badge variant="default" className="bg-green-600">Low Risk</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <Card className={`bg-gray-900 border-gray-700 ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="h-5 w-5" />
            Token Holders ({holders.length.toLocaleString()})
          </CardTitle>
          {getRiskBadge()}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Concentration Summary */}
        <div className="grid grid-cols-2 gap-4 p-3 bg-gray-800 rounded-lg">
          <div>
            <p className="text-xs text-gray-500 mb-1">Top Holder</p>
            <p className="text-lg font-semibold text-white">{topHolderPercent.toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Top 3 Holders</p>
            <p className="text-lg font-semibold text-white">{top3Percent.toFixed(1)}%</p>
          </div>
        </div>

        {/* Holder List */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-300">Top 10 Holders</h4>
          {holders.slice(0, 10).map((holder, index) => {
            const percentage = totalSupply > 0 ? (holder.uiAmount / totalSupply) * 100 : 0;
            const isHighConcentration = percentage > 20;
            
            return (
              <div key={holder.address} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-500 w-6">
                      #{index + 1}
                    </span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <code className="text-xs font-mono text-gray-400 hover:text-white cursor-pointer">
                            {holder.address.slice(0, 8)}...{holder.address.slice(-8)}
                          </code>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-mono text-xs">{holder.address}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <a
                      href={`https://solscan.io/account/${holder.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-500 hover:text-white transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white font-medium">
                      {formatAmount(holder.uiAmount)}
                    </span>
                    <span className={`text-xs font-medium ${
                      isHighConcentration ? 'text-red-400' : 'text-gray-400'
                    }`}>
                      ({percentage.toFixed(2)}%)
                    </span>
                    {isHighConcentration && (
                      <AlertTriangle className="h-3 w-3 text-red-400" />
                    )}
                  </div>
                </div>
                
                <Progress 
                  value={percentage} 
                  className="h-1"
                  style={{
                    '--progress-background': isHighConcentration ? '#ef4444' : '#f97316'
                  } as React.CSSProperties}
                />
              </div>
            );
          })}
        </div>

        {/* Distribution Analysis */}
        <div className="p-3 bg-gray-800 rounded-lg">
          <h4 className="text-sm font-medium text-gray-300 mb-2">Distribution Analysis</h4>
          <div className="space-y-1 text-xs">
            {concentrationRisk === 'high' && (
              <p className="text-red-400">
                🚨 High concentration risk - few holders control majority of supply
              </p>
            )}
            {concentrationRisk === 'medium' && (
              <p className="text-yellow-400">
                ⚠️ Moderate concentration - watch for large holder movements
              </p>
            )}
            {concentrationRisk === 'low' && (
              <p className="text-green-400">
                ✅ Good distribution - supply is well distributed among holders
              </p>
            )}
            
            <p className="text-gray-400">
              Total tracked supply: {formatAmount(totalSupply)} tokens
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 