import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';
import { type CursorRuleResult } from '@/cursorRule/tokenAnalysisRules';

interface AuditResultRowProps {
  result: CursorRuleResult;
  className?: string;
}

export function AuditResultRow({ result, className }: AuditResultRowProps) {
  const scorePercentage = (result.score / result.maxScore) * 100;
  
  const getStatusIcon = () => {
    if (result.passed) {
      return <CheckCircle className="h-5 w-5 text-green-400" />;
    } else if (result.riskFlags.length > 0) {
      return <XCircle className="h-5 w-5 text-red-400" />;
    } else {
      return <AlertCircle className="h-5 w-5 text-yellow-400" />;
    }
  };

  const getStatusBadge = () => {
    if (result.passed) {
      return <Badge variant="default" className="bg-green-600">Passed</Badge>;
    } else if (result.riskFlags.length > 0) {
      return <Badge variant="destructive">Failed</Badge>;
    } else {
      return <Badge variant="secondary" className="bg-yellow-600">Warning</Badge>;
    }
  };

  const getProgressColor = () => {
    if (scorePercentage >= 80) return 'bg-green-500';
    if (scorePercentage >= 60) return 'bg-yellow-500';
    if (scorePercentage >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <Card className={`bg-gray-900 border-gray-700 ${className}`}>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getStatusIcon()}
              <div>
                <h3 className="font-semibold text-white">{result.ruleName}</h3>
                <p className="text-sm text-gray-400">
                  Score: {result.score}/{result.maxScore} ({scorePercentage.toFixed(0)}%)
                </p>
              </div>
            </div>
            {getStatusBadge()}
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <Progress value={scorePercentage} className="h-2" />
            <div className="flex justify-between text-xs text-gray-500">
              <span>0</span>
              <span>{result.maxScore}</span>
            </div>
          </div>

          {/* Risk Flags */}
          {result.riskFlags.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-red-400 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                Risk Factors ({result.riskFlags.length})
              </h4>
              <div className="space-y-1">
                {result.riskFlags.map((flag, index) => (
                  <div key={index} className="flex items-start gap-2 text-sm">
                    <span className="text-red-400 mt-0.5">•</span>
                    <span className="text-red-300">{flag}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Details */}
          {result.details && (
            <div className="space-y-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <h4 className="text-sm font-medium text-gray-300 flex items-center gap-1 cursor-help">
                      <Info className="h-4 w-4" />
                      Analysis Details
                    </h4>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Detailed breakdown of the analysis</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <div className="bg-gray-800 rounded-lg p-3">
                <div className="space-y-1 text-sm">
                  {result.details.split('\n').map((line, index) => {
                    if (!line.trim()) return null;
                    
                    const isPositive = line.includes('✅');
                    const isNegative = line.includes('🚨') || line.includes('❌');
                    const isWarning = line.includes('⚠️');
                    
                    let textColor = 'text-gray-300';
                    if (isPositive) textColor = 'text-green-400';
                    else if (isNegative) textColor = 'text-red-400';
                    else if (isWarning) textColor = 'text-yellow-400';
                    
                    return (
                      <div key={index} className={`${textColor} leading-relaxed`}>
                        {line}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface AuditResultsListProps {
  results: CursorRuleResult[];
  className?: string;
}

export function AuditResultsList({ results, className }: AuditResultsListProps) {
  const passedCount = results.filter(r => r.passed).length;
  const totalRiskFlags = results.reduce((sum, r) => sum + r.riskFlags.length, 0);
  
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Summary */}
      <Card className="bg-gray-900 border-gray-700">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-white mb-1">Analysis Summary</h3>
              <p className="text-sm text-gray-400">
                {passedCount}/{results.length} rules passed
                {totalRiskFlags > 0 && ` • ${totalRiskFlags} risk factors identified`}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              {passedCount === results.length ? (
                <Badge variant="default" className="bg-green-600">All Passed</Badge>
              ) : totalRiskFlags > 0 ? (
                <Badge variant="destructive">Risks Found</Badge>
              ) : (
                <Badge variant="secondary" className="bg-yellow-600">Warnings</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Results */}
      {results.map((result, index) => (
        <AuditResultRow key={index} result={result} />
      ))}
    </div>
  );
} 