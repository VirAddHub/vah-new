'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Package, AlertTriangle, CheckCircle, Zap } from 'lucide-react';

interface BundleWidgetProps {
  onViewDetails?: () => void;
}

export function BundleAnalysisWidget({ onViewDetails }: BundleWidgetProps) {
  const [bundleData, setBundleData] = useState<{
    totalSize: number;
    status: 'good' | 'warning' | 'critical';
    bundles: Array<{
      name: string;
      size: number;
      limit: number;
    }>;
  } | null>(null);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good':
        return <CheckCircle className="h-4 w-4" />;
      case 'warning':
      case 'critical':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  useEffect(() => {
    // Simulate bundle analysis
    const mockData = {
      totalSize: 320000, // 320KB gzipped
      status: 'warning' as const,
      bundles: [
        { name: 'Main', size: 120000, limit: 200000 },
        { name: 'Vendor', size: 150000, limit: 500000 },
        { name: 'Common', size: 50000, limit: 100000 },
      ]
    };
    
    setBundleData(mockData);
  }, []);

  if (!bundleData) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5" />
            Bundle Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const criticalBundles = bundleData.bundles.filter(b => b.size > b.limit).length;
  const warningBundles = bundleData.bundles.filter(b => b.size > b.limit * 0.8 && b.size <= b.limit).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5" />
            Bundle Analysis
          </CardTitle>
          <Badge className={getStatusColor(bundleData.status)}>
            {getStatusIcon(bundleData.status)}
            <span className="ml-1 capitalize">{bundleData.status}</span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-blue-600">
              {formatBytes(bundleData.totalSize)}
            </div>
            <div className="text-xs text-muted-foreground">Total Size</div>
          </div>
          <div>
            <div className="text-lg font-bold text-green-600">
              {bundleData.bundles.length - criticalBundles - warningBundles}
            </div>
            <div className="text-xs text-muted-foreground">Good</div>
          </div>
          <div>
            <div className="text-lg font-bold text-yellow-600">
              {warningBundles + criticalBundles}
            </div>
            <div className="text-xs text-muted-foreground">Issues</div>
          </div>
        </div>

        {/* Bundle Status */}
        <div className="space-y-2">
          {bundleData.bundles.map((bundle) => {
            const isOverLimit = bundle.size > bundle.limit;
            const isWarning = bundle.size > bundle.limit * 0.8 && !isOverLimit;
            
            return (
              <div key={bundle.name} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{bundle.name}</span>
                  <span className="text-muted-foreground">
                    {formatBytes(bundle.size)} / {formatBytes(bundle.limit)}
                  </span>
                </div>
                <Progress 
                  value={(bundle.size / bundle.limit) * 100} 
                  className="h-1"
                />
                {isOverLimit && (
                  <div className="text-xs text-red-600">
                    ⚠️ Exceeds limit
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Action Button */}
        {onViewDetails && (
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={onViewDetails}
          >
            <Zap className="h-4 w-4 mr-2" />
            View Detailed Analysis
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
