import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ExternalLink, Shield, ShieldAlert, ShieldCheck } from 'lucide-react';
import { type TokenMetadata } from '@/lib/api/helius/types';

interface TokenInfoCardProps {
  metadata: TokenMetadata;
  className?: string;
}

export function TokenInfoCard({ metadata, className }: TokenInfoCardProps) {
  const formatSupply = (supply: number, decimals: number) => {
    const adjustedSupply = supply / Math.pow(10, decimals);
    if (adjustedSupply >= 1e9) {
      return `${(adjustedSupply / 1e9).toFixed(2)}B`;
    } else if (adjustedSupply >= 1e6) {
      return `${(adjustedSupply / 1e6).toFixed(2)}M`;
    } else if (adjustedSupply >= 1e3) {
      return `${(adjustedSupply / 1e3).toFixed(2)}K`;
    }
    return adjustedSupply.toLocaleString();
  };

  const getMetadataSourceBadge = () => {
    if (!metadata.metadataUri) {
      return <Badge variant="destructive">No URI</Badge>;
    }
    
    if (metadata.metadataUri.includes('arweave.net')) {
      return <Badge variant="default" className="bg-green-600">Arweave</Badge>;
    } else if (metadata.metadataUri.includes('ipfs')) {
      return <Badge variant="default" className="bg-blue-600">IPFS</Badge>;
    } else {
      return <Badge variant="secondary">Centralized</Badge>;
    }
  };

  const getAuthorityStatus = (authority: string | null, type: 'mint' | 'freeze') => {
    if (authority === null) {
      return (
        <div className="flex items-center gap-1 text-green-400">
          <ShieldCheck className="h-4 w-4" />
          <span className="text-sm">Disabled</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-1 text-red-400">
          <ShieldAlert className="h-4 w-4" />
          <span className="text-sm">Active</span>
        </div>
      );
    }
  };

  return (
    <Card className={`bg-gray-900 border-gray-700 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {metadata.image && (
              <img 
                src={metadata.image} 
                alt={metadata.name}
                className="w-12 h-12 rounded-lg object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}
            <div>
              <CardTitle className="text-xl text-white flex items-center gap-2">
                {metadata.name}
                {metadata.tokenStandard && (
                  <Badge variant="outline" className="text-xs">
                    {metadata.tokenStandard}
                  </Badge>
                )}
              </CardTitle>
              <p className="text-gray-400 font-mono text-sm">{metadata.symbol}</p>
            </div>
          </div>
          
          {metadata.metadataUri && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href={metadata.metadataUri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </TooltipTrigger>
                <TooltipContent>
                  <p>View metadata</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Description */}
        {metadata.description && (
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-1">Description</h4>
            <p className="text-sm text-gray-400 leading-relaxed">{metadata.description}</p>
          </div>
        )}

        {/* Token Details */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-1">Total Supply</h4>
            <p className="text-lg font-semibold text-white">
              {formatSupply(metadata.supply, metadata.decimals)}
            </p>
            <p className="text-xs text-gray-500">{metadata.decimals} decimals</p>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-1">Metadata Source</h4>
            <div className="flex items-center gap-2">
              {getMetadataSourceBadge()}
            </div>
          </div>
        </div>

        {/* Authority Status */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-300">Authority Status</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Mint Authority</p>
              {getAuthorityStatus(metadata.mintAuthority, 'mint')}
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Freeze Authority</p>
              {getAuthorityStatus(metadata.freezeAuthority, 'freeze')}
            </div>
          </div>
        </div>

        {/* Creators */}
        {metadata.creators && metadata.creators.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-2">Creators</h4>
            <div className="space-y-2">
              {metadata.creators.map((creator, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span className="font-mono text-gray-400 truncate">
                    {creator.address.slice(0, 8)}...{creator.address.slice(-8)}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">{creator.share}%</span>
                    {creator.verified && (
                      <Badge variant="default" className="bg-green-600 text-xs">
                        Verified
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contract Address */}
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-1">Contract Address</h4>
          <div className="flex items-center gap-2">
            <code className="text-xs font-mono text-gray-400 bg-gray-800 px-2 py-1 rounded">
              {metadata.mint}
            </code>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => navigator.clipboard.writeText(metadata.mint)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Copy address</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 