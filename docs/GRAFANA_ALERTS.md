# Grafana Alert Rules for Forwarding Hardening
# docs/GRAFANA_ALERTS.md

## Overview
These Grafana alert rules monitor the forwarding hardening system for anomalies and issues.

## Prerequisites
- Grafana instance with Prometheus data source
- Metrics endpoint: `/api/metrics` (Prometheus format)
- Health endpoint: `/api/healthz/status-guard` (JSON format)

## Alert Rules

### 1. Illegal Status Transition Attempts
**Alert when there are too many illegal transition attempts**

```yaml
# grafana/alert-rules/illegal-transitions.yml
groups:
  - name: forwarding-hardening
    rules:
      - alert: IllegalStatusTransitions
        expr: |
          sum(rate(forwarding_illegal_transition_total[5m])) > 0.1
        for: 2m
        labels:
          severity: warning
          service: forwarding
        annotations:
          summary: "High rate of illegal status transition attempts"
          description: |
            {{ $value }} illegal status transition attempts per second detected.
            This may indicate a UI bug or malicious activity.
          runbook_url: "https://docs.example.com/runbooks/illegal-transitions"

      - alert: IllegalStatusTransitionsCritical
        expr: |
          sum(rate(forwarding_illegal_transition_total[5m])) > 1
        for: 1m
        labels:
          severity: critical
          service: forwarding
        annotations:
          summary: "Critical: Very high rate of illegal status transitions"
          description: |
            {{ $value }} illegal status transition attempts per second detected.
            Immediate investigation required.
```

### 2. Status Guard Disabled
**Alert when status guard is disabled**

```yaml
# grafana/alert-rules/status-guard.yml
groups:
  - name: forwarding-hardening
    rules:
      - alert: StatusGuardDisabled
        expr: |
          up{job="vah-backend"} == 1 and 
          (absent(forwarding_status_transition_total) or 
           label_replace(up{job="vah-backend"}, "flag", "STRICT_STATUS_GUARD", "", "") == 0)
        for: 5m
        labels:
          severity: critical
          service: forwarding
        annotations:
          summary: "Status guard is disabled"
          description: |
            STRICT_STATUS_GUARD is disabled or not working.
            This leaves the system vulnerable to status transition bugs.
```

### 3. BFF Guard Disabled
**Alert when BFF guard is disabled**

```yaml
# grafana/alert-rules/bff-guard.yml
groups:
  - name: forwarding-hardening
    rules:
      - alert: BFFGuardDisabled
        expr: |
          up{job="vah-backend"} == 1 and 
          rate(http_requests_total{method="POST",path=~"/api/bff/.*"}[5m]) > 0
        for: 2m
        labels:
          severity: warning
          service: forwarding
        annotations:
          summary: "BFF guard may be disabled"
          description: |
            POST requests to BFF routes detected.
            BFF_READS_ONLY should be set to 1.
```

### 4. No Status Activity
**Alert when there's no forwarding activity during business hours**

```yaml
# grafana/alert-rules/no-activity.yml
groups:
  - name: forwarding-hardening
    rules:
      - alert: NoForwardingActivity
        expr: |
          hour() >= 9 and hour() <= 17 and 
          sum(rate(forwarding_status_transition_total[30m])) == 0
        for: 30m
        labels:
          severity: warning
          service: forwarding
        annotations:
          summary: "No forwarding activity during business hours"
          description: |
            No status transitions detected for 30 minutes during business hours.
            This may indicate a system issue or unusual downtime.
```

### 5. High API Error Rate
**Alert when API error rate is too high**

```yaml
# grafana/alert-rules/api-errors.yml
groups:
  - name: forwarding-hardening
    rules:
      - alert: HighAPIErrorRate
        expr: |
          sum(rate(api_error_total{code=~"5.."}[5m])) > 0.1
        for: 5m
        labels:
          severity: critical
          service: forwarding
        annotations:
          summary: "High API error rate"
          description: |
            {{ $value }} 5xx errors per second detected.
            System may be experiencing issues.
```

## Dashboard Queries

### Status Transitions Over Time
```promql
sum(rate(forwarding_status_transition_total[5m])) by (from, to)
```

### Illegal Attempts by Type
```promql
sum(forwarding_illegal_transition_total) by (from, to)
```

### API Error Rate by Endpoint
```promql
sum(rate(api_error_total[5m])) by (endpoint, status)
```

### System Health Status
```promql
up{job="vah-backend"}
```

## Notification Channels

### Slack Integration
```yaml
# grafana/notifications/slack.yml
notifications:
  - name: slack-forwarding
    type: slack
    settings:
      url: "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"
      channel: "#alerts"
      title: "Forwarding Hardening Alert"
      text: |
        *Alert:* {{ .GroupLabels.alertname }}
        *Severity:* {{ .GroupLabels.severity }}
        *Description:* {{ .Annotations.description }}
        *Runbook:* {{ .Annotations.runbook_url }}
```

### Email Integration
```yaml
# grafana/notifications/email.yml
notifications:
  - name: email-forwarding
    type: email
    settings:
      addresses: "admin@example.com,devops@example.com"
      subject: "[{{ .GroupLabels.severity }}] {{ .GroupLabels.alertname }}"
      body: |
        Alert: {{ .GroupLabels.alertname }}
        Severity: {{ .GroupLabels.severity }}
        
        Description:
        {{ .Annotations.description }}
        
        Runbook: {{ .Annotations.runbook_url }}
```

## Runbook Actions

### When Illegal Transitions Alert Fires:
1. Check `/api/healthz/status-guard` for guard status
2. Review recent logs for offending requests
3. Check if UI is sending incorrect status values
4. Verify `STRICT_STATUS_GUARD=1` is set
5. If needed, temporarily disable guard: `STRICT_STATUS_GUARD=0`

### When Status Guard Disabled Alert Fires:
1. Check environment variables on deployment platform
2. Verify `STRICT_STATUS_GUARD=1` is set
3. Redeploy backend if needed
4. Run smoke tests to verify guard is active

### When BFF Guard Disabled Alert Fires:
1. Check `BFF_READS_ONLY=1` is set on frontend
2. Verify BFF middleware is deployed
3. Test BFF write blocking manually
4. Redeploy frontend if needed

### When No Activity Alert Fires:
1. Check if system is actually down
2. Verify admin users are active
3. Check for any blocking issues
4. Review recent deployment history

## Testing Alerts

### Test Illegal Transitions Alert:
```bash
# Generate some illegal transitions
for i in {1..10}; do
  curl -X POST "${BACKEND_URL}/api/admin/forwarding/requests/999/status" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"action": "mark_delivered"}'  # Illegal: Requested -> Delivered
done
```

### Test Status Guard Disabled:
```bash
# Temporarily disable guard
export STRICT_STATUS_GUARD=0
# Redeploy backend
# Wait for alert to fire
# Re-enable guard
export STRICT_STATUS_GUARD=1
# Redeploy backend
```

## Maintenance

### Weekly Tasks:
- Review alert firing frequency
- Update thresholds based on normal patterns
- Check for false positives
- Update runbook procedures

### Monthly Tasks:
- Review alert effectiveness
- Update notification channels
- Test alert procedures
- Review metrics retention policies
