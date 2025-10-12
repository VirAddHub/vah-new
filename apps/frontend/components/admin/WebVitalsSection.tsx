'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { RefreshCw, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface WebVitalsData {
  metric: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
}

interface WebVitalsSummary {
  total: number;
  good: number;
  needsImprovement: number;
  poor: number;
  averageScore: number;
}

export function WebVitalsSection() {
  const [vitals, setVitals] = useState<WebVitalsData[]>([]);
  const [summary, setSummary] = useState<WebVitalsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const thresholds = {
    CLS: 0.1,
    FID: 100,
    FCP: 1800,
    LCP: 2500,
    TTFB: 800,
    INP: 200,
  };

  const formatValue = (metric: string, value: number) => {
    switch (metric) {
      case 'CLS':
        return value.toFixed(3);
      case 'FID':
      case 'FCP':
      case 'LCP':
      case 'TTFB':
      case 'INP':
        return `${Math.round(value)}ms`;
      default:
        return value.toString();
    }
  };

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'good':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'needs-improvement':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'poor':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRatingIcon = (rating: string) => {
    switch (rating) {
      case 'good':
        return <CheckCircle className="h-4 w-4" />;
      case 'needs-improvement':
        return <AlertTriangle className="h-4 w-4" />;
      case 'poor':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const fetchWebVitals = async () => {
    try {
      setLoading(true);
      
      // In a real implementation, you'd fetch from your analytics endpoint
      // For now, we'll simulate with localStorage data
      const vitalsData: WebVitalsData[] = [];
      
      // Get vitals from localStorage (where our web-vitals library stores them)
      Object.keys(thresholds).forEach(metric => {
        const key = `web-vitals-${metric}`;
        const history = JSON.parse(localStorage.getItem(key) || '[]');
        
        if (history.length > 0) {
          const latest = history[history.length - 1];
          vitalsData.push({
            metric,
            value: latest.value,
            rating: latest.rating,
            timestamp: latest.timestamp,
          });
        }
      });

      setVitals(vitalsData);

      // Calculate summary
      if (vitalsData.length > 0) {
        const good = vitalsData.filter(v => v.rating === 'good').length;
        const needsImprovement = vitalsData.filter(v => v.rating === 'needs-improvement').length;
        const poor = vitalsData.filter(v => v.rating === 'poor').length;
        
        const averageScore = Math.round((good / vitalsData.length) * 100);
        
        setSummary({
          total: vitalsData.length,
          good,
          needsImprovement,
          poor,
          averageScore,
        });
      }
    } catch (error) {
      console.error('Error fetching web vitals:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWebVitals();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchWebVitals, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Web Vitals Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Web Vitals Performance
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchWebVitals}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {summary && (
          <div className="mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{summary.good}</div>
                <div className="text-sm text-muted-foreground">Good</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{summary.needsImprovement}</div>
                <div className="text-sm text-muted-foreground">Needs Improvement</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{summary.poor}</div>
                <div className="text-sm text-muted-foreground">Poor</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{summary.averageScore}%</div>
                <div className="text-sm text-muted-foreground">Average Score</div>
              </div>
            </div>
          </div>
        )}

        {vitals.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="font-medium mb-2">No Web Vitals Data</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Web vitals will appear here as users interact with your site
            </p>
            <div className="text-xs text-muted-foreground">
              <p>• LCP: Largest Contentful Paint (load speed)</p>
              <p>• FID: First Input Delay (responsiveness)</p>
              <p>• CLS: Cumulative Layout Shift (visual stability)</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {vitals.map((vital) => (
              <div key={vital.metric} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getRatingIcon(vital.rating)}
                  <div>
                    <div className="font-medium">{vital.metric}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatValue(vital.metric, vital.value)}
                    </div>
                  </div>
                </div>
                <Badge className={getRatingColor(vital.rating)}>
                  {vital.rating.replace('-', ' ')}
                </Badge>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium mb-2">Performance Thresholds</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>LCP: &lt; 2.5s (Good)</div>
            <div>FID: &lt; 100ms (Good)</div>
            <div>CLS: &lt; 0.1 (Good)</div>
            <div>FCP: &lt; 1.8s (Good)</div>
            <div>TTFB: &lt; 800ms (Good)</div>
            <div>INP: &lt; 200ms (Good)</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
