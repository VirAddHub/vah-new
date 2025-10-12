'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { 
  RefreshCw, 
  Package, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle,
  BarChart3,
  FileText,
  Zap
} from 'lucide-react';

interface BundleSize {
  name: string;
  size: number;
  gzipSize: number;
  limit: number;
  percentage: number;
}

interface BundleAnalysis {
  totalSize: number;
  totalGzipSize: number;
  bundles: BundleSize[];
  status: 'good' | 'warning' | 'critical';
  lastAnalyzed: string;
}

export function BundleAnalysisSection() {
  const [analysis, setAnalysis] = useState<BundleAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeBundles = async () => {
    try {
      setLoading(true);
      setError(null);

      // Simulate bundle analysis (in real implementation, this would call your build system)
      // For now, we'll create mock data based on typical Next.js bundle sizes
      const mockAnalysis: BundleAnalysis = {
        totalSize: 1250000, // 1.25MB raw
        totalGzipSize: 320000, // 320KB gzipped
        bundles: [
          {
            name: 'Main Bundle',
            size: 450000,
            gzipSize: 120000,
            limit: 200000,
            percentage: 60
          },
          {
            name: 'Vendor Bundle',
            size: 600000,
            gzipSize: 150000,
            limit: 500000,
            percentage: 30
          },
          {
            name: 'Common Bundle',
            size: 200000,
            gzipSize: 50000,
            limit: 100000,
            percentage: 50
          }
        ],
        status: 'warning',
        lastAnalyzed: new Date().toISOString()
      };

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setAnalysis(mockAnalysis);
    } catch (err) {
      setError('Failed to analyze bundles');
      console.error('Bundle analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
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
        return <AlertTriangle className="h-4 w-4" />;
      case 'critical':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const getBundleStatus = (bundle: BundleSize) => {
    if (bundle.gzipSize <= bundle.limit * 0.8) return 'good';
    if (bundle.gzipSize <= bundle.limit) return 'warning';
    return 'critical';
  };

  useEffect(() => {
    // Auto-analyze on mount
    analyzeBundles();
  }, []);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Bundle Analysis
          </CardTitle>
          <div className="flex items-center gap-2">
            {analysis && (
              <Badge className={getStatusColor(analysis.status)}>
                {getStatusIcon(analysis.status)}
                <span className="ml-1 capitalize">{analysis.status}</span>
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={analyzeBundles}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Analyze
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="flex items-center justify-center p-8">
            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2">Analyzing bundles...</span>
          </div>
        )}

        {error && (
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <h3 className="font-medium mb-2 text-red-600">Analysis Failed</h3>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={analyzeBundles} variant="outline" size="sm">
              Try Again
            </Button>
          </div>
        )}

        {analysis && !loading && (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {formatBytes(analysis.totalGzipSize)}
                </div>
                <div className="text-sm text-muted-foreground">Total Gzipped</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {analysis.bundles.length}
                </div>
                <div className="text-sm text-muted-foreground">Bundles</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {analysis.bundles.filter(b => getBundleStatus(b) === 'good').length}
                </div>
                <div className="text-sm text-muted-foreground">Good</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {analysis.bundles.filter(b => getBundleStatus(b) === 'warning').length}
                </div>
                <div className="text-sm text-muted-foreground">Warning</div>
              </div>
            </div>

            {/* Bundle Details */}
            <div className="space-y-4">
              {analysis.bundles.map((bundle) => {
                const status = getBundleStatus(bundle);
                const isOverLimit = bundle.gzipSize > bundle.limit;
                
                return (
                  <div key={bundle.name} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(status)}>
                          {getStatusIcon(status)}
                          <span className="ml-1 capitalize">{status}</span>
                        </Badge>
                        <h4 className="font-medium">{bundle.name}</h4>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-sm">
                          {formatBytes(bundle.gzipSize)} / {formatBytes(bundle.limit)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {Math.round((bundle.gzipSize / bundle.limit) * 100)}% of limit
                        </div>
                      </div>
                    </div>
                    
                    <Progress 
                      value={(bundle.gzipSize / bundle.limit) * 100} 
                      className="h-2"
                    />
                    
                    {isOverLimit && (
                      <div className="mt-2 text-sm text-red-600">
                        ⚠️ Exceeds limit by {formatBytes(bundle.gzipSize - bundle.limit)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Recommendations */}
            {analysis.status !== 'good' && (
              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Optimization Recommendations
                </h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Use dynamic imports for heavy components</li>
                  <li>• Remove unused dependencies</li>
                  <li>• Enable tree shaking</li>
                  <li>• Split vendor bundles</li>
                  <li>• Use lighter alternatives for heavy libraries</li>
                </ul>
              </div>
            )}

            {/* Last Analyzed */}
            <div className="mt-4 text-xs text-muted-foreground text-center">
              Last analyzed: {new Date(analysis.lastAnalyzed).toLocaleString()}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
