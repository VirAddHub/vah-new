"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw,
  ExternalLink,
  Clock,
  Activity
} from 'lucide-react';

interface ServiceStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  lastCheck: number;
  lastWebhook: number | null;
  responseTime: number | null;
  errorCount: number;
  uptime: number;
  description: string;
  dashboardUrl: string;
}

interface ServiceMonitoringProps {
  className?: string;
}

export function ServiceMonitoring({ className }: ServiceMonitoringProps) {
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now());

  const fetchServiceStatus = async () => {
    try {
      setLoading(true);
      
      // Check each service
      const serviceChecks = await Promise.allSettled([
        checkGoCardless(),
        checkSumsub(),
        checkPostmark(),
        checkOneDrive()
      ]);

      const serviceStatuses: ServiceStatus[] = serviceChecks.map((result, index) => {
        const serviceNames = ['GoCardless', 'Sumsub', 'Postmark', 'OneDrive'];
        const serviceUrls = [
          'https://manage.gocardless.com',
          'https://sumsub.com',
          'https://postmarkapp.com',
          'https://admin.microsoft.com'
        ];
        
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          return {
            name: serviceNames[index],
            status: 'down' as const,
            lastCheck: Date.now(),
            lastWebhook: null,
            responseTime: null,
            errorCount: 1,
            uptime: 0,
            description: `Service check failed: ${result.reason}`,
            dashboardUrl: serviceUrls[index]
          };
        }
      });

      setServices(serviceStatuses);
      setLastRefresh(Date.now());
    } catch (error) {
      console.error('Failed to fetch service status:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkGoCardless = async (): Promise<ServiceStatus> => {
    const startTime = Date.now();
    
    try {
      // Check webhook logs for recent GoCardless activity
      const response = await fetch('/api/admin/service-status/gocardless', {
        credentials: 'include'
      });
      
      const data = await response.json();
      const responseTime = Date.now() - startTime;
      
      if (data.ok) {
        return {
          name: 'GoCardless',
          status: data.status || 'healthy',
          lastCheck: Date.now(),
          lastWebhook: data.lastWebhook,
          responseTime,
          errorCount: data.errorCount || 0,
          uptime: data.uptime || 99.9,
          description: 'Payment processing and subscription management',
          dashboardUrl: 'https://manage.gocardless.com'
        };
      } else {
        throw new Error(data.error || 'Service check failed');
      }
    } catch (error) {
      return {
        name: 'GoCardless',
        status: 'down',
        lastCheck: Date.now(),
        lastWebhook: null,
        responseTime: Date.now() - startTime,
        errorCount: 1,
        uptime: 0,
        description: `Payment service error: ${error}`,
        dashboardUrl: 'https://manage.gocardless.com'
      };
    }
  };

  const checkSumsub = async (): Promise<ServiceStatus> => {
    const startTime = Date.now();
    
    try {
      const response = await fetch('/api/admin/service-status/sumsub', {
        credentials: 'include'
      });
      
      const data = await response.json();
      const responseTime = Date.now() - startTime;
      
      if (data.ok) {
        return {
          name: 'Sumsub',
          status: data.status || 'healthy',
          lastCheck: Date.now(),
          lastWebhook: data.lastWebhook,
          responseTime,
          errorCount: data.errorCount || 0,
          uptime: data.uptime || 99.9,
          description: 'KYC verification and identity checks',
          dashboardUrl: 'https://sumsub.com'
        };
      } else {
        throw new Error(data.error || 'Service check failed');
      }
    } catch (error) {
      return {
        name: 'Sumsub',
        status: 'down',
        lastCheck: Date.now(),
        lastWebhook: null,
        responseTime: Date.now() - startTime,
        errorCount: 1,
        uptime: 0,
        description: `KYC service error: ${error}`,
        dashboardUrl: 'https://sumsub.com'
      };
    }
  };

  const checkPostmark = async (): Promise<ServiceStatus> => {
    const startTime = Date.now();
    
    try {
      const response = await fetch('/api/admin/service-status/postmark', {
        credentials: 'include'
      });
      
      const data = await response.json();
      const responseTime = Date.now() - startTime;
      
      if (data.ok) {
        return {
          name: 'Postmark',
          status: data.status || 'healthy',
          lastCheck: Date.now(),
          lastWebhook: data.lastWebhook,
          responseTime,
          errorCount: data.errorCount || 0,
          uptime: data.uptime || 99.9,
          description: 'Email delivery and bounce handling',
          dashboardUrl: 'https://postmarkapp.com'
        };
      } else {
        throw new Error(data.error || 'Service check failed');
      }
    } catch (error) {
      return {
        name: 'Postmark',
        status: 'down',
        lastCheck: Date.now(),
        lastWebhook: null,
        responseTime: Date.now() - startTime,
        errorCount: 1,
        uptime: 0,
        description: `Email service error: ${error}`,
        dashboardUrl: 'https://postmarkapp.com'
      };
    }
  };

  const checkOneDrive = async (): Promise<ServiceStatus> => {
    const startTime = Date.now();
    
    try {
      const response = await fetch('/api/admin/service-status/onedrive', {
        credentials: 'include'
      });
      
      const data = await response.json();
      const responseTime = Date.now() - startTime;
      
      if (data.ok) {
        return {
          name: 'OneDrive',
          status: data.status || 'healthy',
          lastCheck: Date.now(),
          lastWebhook: data.lastWebhook,
          responseTime,
          errorCount: data.errorCount || 0,
          uptime: data.uptime || 99.9,
          description: 'Mail scanning and file storage',
          dashboardUrl: 'https://admin.microsoft.com'
        };
      } else {
        throw new Error(data.error || 'Service check failed');
      }
    } catch (error) {
      return {
        name: 'OneDrive',
        status: 'down',
        lastCheck: Date.now(),
        lastWebhook: null,
        responseTime: Date.now() - startTime,
        errorCount: 1,
        uptime: 0,
        description: `File storage error: ${error}`,
        dashboardUrl: 'https://admin.microsoft.com'
      };
    }
  };

  useEffect(() => {
    fetchServiceStatus();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchServiceStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'down':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'down':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatLastWebhook = (timestamp: number | null) => {
    if (!timestamp) return 'Never';
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Service Monitoring
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchServiceStatus}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <span className="text-xs text-muted-foreground">
              Last updated: {new Date(lastRefresh).toLocaleTimeString()}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {services.map((service) => (
              <Card key={service.name} className="border-l-4 border-l-primary">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(service.status)}
                      <h3 className="font-semibold">{service.name}</h3>
                    </div>
                    <Badge className={getStatusColor(service.status)}>
                      {service.status}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-3">
                    {service.description}
                  </p>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Uptime:</span>
                      <span className="font-medium">{service.uptime.toFixed(1)}%</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last webhook:</span>
                      <span className="font-medium">
                        {formatLastWebhook(service.lastWebhook)}
                      </span>
                    </div>
                    
                    {service.responseTime && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Response time:</span>
                        <span className="font-medium">{service.responseTime}ms</span>
                      </div>
                    )}
                    
                    {service.errorCount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Errors (24h):</span>
                        <span className="font-medium text-red-600">{service.errorCount}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-3 pt-3 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => window.open(service.dashboardUrl, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open Dashboard
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {services.length === 0 && !loading && (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No service data available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
