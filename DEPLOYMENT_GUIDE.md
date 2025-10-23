# Zero-Downtime Deployment Guide

## Quick Start

### 1. Deploy with Zero Downtime
```bash
# Run the complete zero-downtime deployment
npm run deploy:zero-downtime
```

### 2. Check Deployment Status
```bash
# Check if deployment is healthy
npm run health:check

# Check migration status
npm run deploy:status
```

### 3. Rollback if Needed
```bash
# Rollback to previous version
npm run deploy:rollback

# Or use the deployment script
bash scripts/deploy.sh rollback
```

## How It Works

### 🚀 Zero-Downtime Deployment Process

1. **Pre-deployment Checks**
   - Database integrity check
   - Smoke tests
   - Frontend build verification

2. **Safe Database Migration**
   - Only additive changes (no data loss)
   - Automatic rollback on failure
   - Migration tracking

3. **Blue-Green Deployment**
   - Deploy new version alongside old
   - Health checks before switching
   - Instant rollback capability

4. **Post-deployment Verification**
   - API endpoint testing
   - User flow verification
   - Performance monitoring

### 🛡️ Safety Features

- **Automatic Rollback**: Triggers if error rate > 5% or consecutive failures
- **Health Monitoring**: Continuous monitoring of all services
- **Database Safety**: Only safe migrations allowed
- **User Session Preservation**: Sessions maintained across deployments

### 📊 Monitoring

The system continuously monitors:
- Database connectivity
- API response times
- Error rates
- Service health
- User experience metrics

## Environment Setup

### Required Environment Variables

```bash
# Database
DATABASE_URL=postgresql://...

# Redis (for sessions)
REDIS_URL=redis://...

# Application URLs
BACKEND_URL=https://your-backend.onrender.com
FRONTEND_URL=https://your-frontend.onrender.com

# Health Check Configuration
HEALTH_CHECK_INTERVAL=30000
MAX_FAILURES=3
ROLLBACK_THRESHOLD=5
```

### Render Configuration

1. **Backend Service**:
   - Build Command: `npm install && npm run build:prod`
   - Start Command: `npm run start:prod`
   - Health Check Path: `/api/health`

2. **Frontend Service**:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm run start`
   - Health Check Path: `/`

3. **Database**:
   - Enable connection pooling
   - Set up automated backups
   - Configure monitoring

## Best Practices

### ✅ Safe Deployment Practices

1. **Always test migrations locally first**
2. **Use feature flags for new functionality**
3. **Deploy during low-traffic periods**
4. **Monitor metrics after deployment**
5. **Keep rollback plan ready**

### ❌ What to Avoid

1. **Don't drop columns/tables in migrations**
2. **Don't deploy without health checks**
3. **Don't skip pre-deployment testing**
4. **Don't ignore error rates**
5. **Don't deploy during peak hours**

## Troubleshooting

### Common Issues

1. **Migration Fails**
   ```bash
   # Check migration status
   npm run deploy:status
   
   # Rollback specific migration
   npm run deploy:rollback <version>
   ```

2. **Health Check Fails**
   ```bash
   # Run manual health check
   npm run health:check
   
   # Check logs
   tail -f deployment.log
   ```

3. **Rollback Needed**
   ```bash
   # Automatic rollback
   bash scripts/deploy.sh rollback
   
   # Manual rollback
   npm run deploy:rollback
   ```

### Emergency Procedures

1. **Immediate Rollback**
   ```bash
   bash scripts/deploy.sh rollback
   ```

2. **Database Emergency**
   ```bash
   npm run db:rollback
   npm run db:restore
   ```

3. **Service Restart**
   ```bash
   # Restart backend
   npm run start:prod
   
   # Restart frontend
   npm run start
   ```

## Support

If you encounter issues:
1. Check the deployment logs: `tail -f deployment.log`
2. Run health checks: `npm run health:check`
3. Check migration status: `npm run deploy:status`
4. Review the troubleshooting section above
