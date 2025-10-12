// apps/backend/src/lib/metrics.ts
// Observability metrics for status transitions

interface MetricsData {
  forwardingStatusTransitions: Map<string, number>;
  illegalTransitions: Map<string, number>;
  apiErrors: Map<string, number>;
}

class MetricsCollector {
  private data: MetricsData = {
    forwardingStatusTransitions: new Map(),
    illegalTransitions: new Map(),
    apiErrors: new Map()
  };

  // Increment status transition counter
  recordStatusTransition(from: string, to: string) {
    const key = `${from}→${to}`;
    const current = this.data.forwardingStatusTransitions.get(key) || 0;
    this.data.forwardingStatusTransitions.set(key, current + 1);
    
    console.log(`[METRICS] Status transition: ${key} (total: ${current + 1})`);
  }

  // Record illegal transition attempt
  recordIllegalTransition(from: string, to: string, requestId?: number) {
    const key = `${from}→${to}`;
    const current = this.data.illegalTransitions.get(key) || 0;
    this.data.illegalTransitions.set(key, current + 1);
    
    console.warn(`[METRICS] Illegal transition attempt: ${key} (total: ${current + 1})${requestId ? ` [Request: ${requestId}]` : ''}`);
  }

  // Record API error
  recordApiError(endpoint: string, statusCode: number) {
    const key = `${endpoint}:${statusCode}`;
    const current = this.data.apiErrors.get(key) || 0;
    this.data.apiErrors.set(key, current + 1);
    
    console.error(`[METRICS] API error: ${key} (total: ${current + 1})`);
  }

  // Get metrics summary
  getSummary() {
    return {
      statusTransitions: Object.fromEntries(this.data.forwardingStatusTransitions),
      illegalTransitions: Object.fromEntries(this.data.illegalTransitions),
      apiErrors: Object.fromEntries(this.data.apiErrors),
      timestamp: new Date().toISOString()
    };
  }

  // Reset metrics (useful for testing)
  reset() {
    this.data.forwardingStatusTransitions.clear();
    this.data.illegalTransitions.clear();
    this.data.apiErrors.clear();
  }
}

export const metrics = new MetricsCollector();

// Prometheus-style metrics export
export function exportMetrics() {
  const summary = metrics.getSummary();
  
  const prometheusFormat = [
    '# HELP forwarding_status_transition_total Total number of status transitions',
    '# TYPE forwarding_status_transition_total counter',
    ...Object.entries(summary.statusTransitions).map(([key, count]) => 
      `forwarding_status_transition_total{from="${key.split('→')[0]}",to="${key.split('→')[1]}"} ${count}`
    ),
    '',
    '# HELP forwarding_illegal_transition_total Total number of illegal transition attempts',
    '# TYPE forwarding_illegal_transition_total counter',
    ...Object.entries(summary.illegalTransitions).map(([key, count]) => 
      `forwarding_illegal_transition_total{from="${key.split('→')[0]}",to="${key.split('→')[1]}"} ${count}`
    ),
    '',
    '# HELP api_error_total Total number of API errors by endpoint and status',
    '# TYPE api_error_total counter',
    ...Object.entries(summary.apiErrors).map(([key, count]) => 
      `api_error_total{endpoint="${key.split(':')[0]}",status="${key.split(':')[1]}"} ${count}`
    )
  ].join('\n');

  return prometheusFormat;
}
