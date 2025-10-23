#!/usr/bin/env node

/**
 * Health Check System
 * Monitors application health and triggers rollbacks if needed
 */

const http = require('http');
const https = require('https');
const { Pool } = require('pg');

class HealthChecker {
  constructor(config) {
    this.config = {
      backendUrl: config.backendUrl || 'http://localhost:3000',
      frontendUrl: config.frontendUrl || 'http://localhost:3001',
      databaseUrl: config.databaseUrl || process.env.DATABASE_URL,
      checkInterval: config.checkInterval || 30000, // 30 seconds
      maxFailures: config.maxFailures || 3,
      rollbackThreshold: config.rollbackThreshold || 5, // 5% error rate
      ...config
    };
    
    this.failures = 0;
    this.checks = [];
    this.isHealthy = true;
    this.metrics = {
      totalChecks: 0,
      failedChecks: 0,
      errorRate: 0,
      lastCheck: null,
      uptime: Date.now()
    };
  }

  async checkDatabase() {
    try {
      const pool = new Pool({
        connectionString: this.config.databaseUrl,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        max: 1,
        idleTimeoutMillis: 5000,
        connectionTimeoutMillis: 5000,
      });

      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      await pool.end();
      
      return { status: 'healthy', responseTime: Date.now() };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }

  async checkBackend() {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const url = `${this.config.backendUrl}/api/health`;
      
      const request = http.get(url, (res) => {
        const responseTime = Date.now() - startTime;
        const isHealthy = res.statusCode === 200;
        
        resolve({
          status: isHealthy ? 'healthy' : 'unhealthy',
          statusCode: res.statusCode,
          responseTime,
          headers: res.headers
        });
      });
      
      request.on('error', (error) => {
        resolve({
          status: 'unhealthy',
          error: error.message,
          responseTime: Date.now() - startTime
        });
      });
      
      request.setTimeout(5000, () => {
        request.destroy();
        resolve({
          status: 'unhealthy',
          error: 'Request timeout',
          responseTime: Date.now() - startTime
        });
      });
    });
  }

  async checkFrontend() {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const url = `${this.config.frontendUrl}/`;
      
      const request = http.get(url, (res) => {
        const responseTime = Date.now() - startTime;
        const isHealthy = res.statusCode === 200;
        
        resolve({
          status: isHealthy ? 'healthy' : 'unhealthy',
          statusCode: res.statusCode,
          responseTime,
          headers: res.headers
        });
      });
      
      request.on('error', (error) => {
        resolve({
          status: 'unhealthy',
          error: error.message,
          responseTime: Date.now() - startTime
        });
      });
      
      request.setTimeout(5000, () => {
        request.destroy();
        resolve({
          status: 'unhealthy',
          error: 'Request timeout',
          responseTime: Date.now() - startTime
        });
      });
    });
  }

  async checkApiEndpoints() {
    const endpoints = [
      '/api/health',
      '/api/bff/health',
      '/api/auth/whoami'
    ];
    
    const results = [];
    
    for (const endpoint of endpoints) {
      const result = await new Promise((resolve) => {
        const startTime = Date.now();
        const url = `${this.config.backendUrl}${endpoint}`;
        
        const request = http.get(url, (res) => {
          const responseTime = Date.now() - startTime;
          const isHealthy = res.statusCode === 200;
          
          resolve({
            endpoint,
            status: isHealthy ? 'healthy' : 'unhealthy',
            statusCode: res.statusCode,
            responseTime
          });
        });
        
        request.on('error', (error) => {
          resolve({
            endpoint,
            status: 'unhealthy',
            error: error.message,
            responseTime: Date.now() - startTime
          });
        });
        
        request.setTimeout(5000, () => {
          request.destroy();
          resolve({
            endpoint,
            status: 'unhealthy',
            error: 'Request timeout',
            responseTime: Date.now() - startTime
          });
        });
      });
      
      results.push(result);
    }
    
    return results;
  }

  async runHealthCheck() {
    const startTime = Date.now();
    this.metrics.lastCheck = new Date();
    this.metrics.totalChecks++;
    
    console.log(`\n🔍 Running health check at ${this.metrics.lastCheck.toISOString()}`);
    
    try {
      // Run all checks in parallel
      const [database, backend, frontend, apiEndpoints] = await Promise.all([
        this.checkDatabase(),
        this.checkBackend(),
        this.checkFrontend(),
        this.checkApiEndpoints()
      ]);
      
      const checkResults = {
        timestamp: this.metrics.lastCheck,
        database,
        backend,
        frontend,
        apiEndpoints,
        overallStatus: 'healthy'
      };
      
      // Determine overall health
      const unhealthyServices = [];
      
      if (database.status !== 'healthy') unhealthyServices.push('database');
      if (backend.status !== 'healthy') unhealthyServices.push('backend');
      if (frontend.status !== 'healthy') unhealthyServices.push('frontend');
      
      const unhealthyEndpoints = apiEndpoints.filter(ep => ep.status !== 'healthy');
      if (unhealthyEndpoints.length > 0) {
        unhealthyServices.push('api-endpoints');
      }
      
      if (unhealthyServices.length > 0) {
        checkResults.overallStatus = 'unhealthy';
        checkResults.unhealthyServices = unhealthyServices;
        this.metrics.failedChecks++;
        this.failures++;
      } else {
        this.failures = 0; // Reset failure count on successful check
      }
      
      // Calculate error rate
      this.metrics.errorRate = (this.metrics.failedChecks / this.metrics.totalChecks) * 100;
      
      // Log results
      this.logHealthResults(checkResults);
      
      // Check if rollback is needed
      if (this.shouldRollback(checkResults)) {
        await this.triggerRollback(checkResults);
      }
      
      this.checks.push(checkResults);
      
      // Keep only last 100 checks
      if (this.checks.length > 100) {
        this.checks = this.checks.slice(-100);
      }
      
    } catch (error) {
      console.error('❌ Health check failed:', error.message);
      this.metrics.failedChecks++;
      this.failures++;
    }
  }

  logHealthResults(results) {
    const { database, backend, frontend, apiEndpoints, overallStatus } = results;
    
    console.log(`📊 Overall Status: ${overallStatus === 'healthy' ? '✅ Healthy' : '❌ Unhealthy'}`);
    console.log(`🗄️  Database: ${database.status === 'healthy' ? '✅' : '❌'} ${database.responseTime || database.error || 'N/A'}`);
    console.log(`🔧 Backend: ${backend.status === 'healthy' ? '✅' : '❌'} ${backend.responseTime || backend.error || 'N/A'}ms`);
    console.log(`🌐 Frontend: ${frontend.status === 'healthy' ? '✅' : '❌'} ${frontend.responseTime || frontend.error || 'N/A'}ms`);
    
    console.log('🔗 API Endpoints:');
    apiEndpoints.forEach(ep => {
      console.log(`  ${ep.status === 'healthy' ? '✅' : '❌'} ${ep.endpoint} (${ep.responseTime || ep.error || 'N/A'}ms)`);
    });
    
    console.log(`📈 Error Rate: ${this.metrics.errorRate.toFixed(2)}%`);
    console.log(`🔄 Failures: ${this.failures}/${this.config.maxFailures}`);
  }

  shouldRollback(results) {
    // Rollback if too many consecutive failures
    if (this.failures >= this.config.maxFailures) {
      console.log(`⚠️  Rollback triggered: ${this.failures} consecutive failures`);
      return true;
    }
    
    // Rollback if error rate is too high
    if (this.metrics.errorRate >= this.config.rollbackThreshold) {
      console.log(`⚠️  Rollback triggered: Error rate ${this.metrics.errorRate.toFixed(2)}% >= ${this.config.rollbackThreshold}%`);
      return true;
    }
    
    // Rollback if critical services are down
    if (results.database.status !== 'healthy') {
      console.log('⚠️  Rollback triggered: Database is unhealthy');
      return true;
    }
    
    return false;
  }

  async triggerRollback(results) {
    console.log('🚨 TRIGGERING ROLLBACK');
    console.log('======================');
    console.log('Reason:', results.unhealthyServices?.join(', ') || 'Multiple failures');
    console.log('Error Rate:', this.metrics.errorRate.toFixed(2) + '%');
    console.log('Consecutive Failures:', this.failures);
    
    // Here you would implement your rollback logic
    // For example, calling your deployment script with rollback command
    const { spawn } = require('child_process');
    
    const rollbackProcess = spawn('bash', ['scripts/deploy.sh', 'rollback'], {
      stdio: 'inherit'
    });
    
    rollbackProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Rollback completed successfully');
        this.failures = 0; // Reset failure count
      } else {
        console.error('❌ Rollback failed');
      }
    });
  }

  start() {
    console.log('🏥 Starting health check system...');
    console.log(`Backend: ${this.config.backendUrl}`);
    console.log(`Frontend: ${this.config.frontendUrl}`);
    console.log(`Check Interval: ${this.config.checkInterval}ms`);
    console.log(`Max Failures: ${this.config.maxFailures}`);
    console.log(`Rollback Threshold: ${this.config.rollbackThreshold}%`);
    
    // Run initial check
    this.runHealthCheck();
    
    // Schedule regular checks
    this.interval = setInterval(() => {
      this.runHealthCheck();
    }, this.config.checkInterval);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      console.log('🛑 Health check system stopped');
    }
  }

  getMetrics() {
    return {
      ...this.metrics,
      uptime: Date.now() - this.metrics.uptime,
      currentFailures: this.failures,
      isHealthy: this.failures < this.config.maxFailures && this.metrics.errorRate < this.config.rollbackThreshold
    };
  }
}

// CLI Interface
if (require.main === module) {
  const config = {
    backendUrl: process.env.BACKEND_URL || 'http://localhost:3000',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3001',
    databaseUrl: process.env.DATABASE_URL,
    checkInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL) || 30000,
    maxFailures: parseInt(process.env.MAX_FAILURES) || 3,
    rollbackThreshold: parseInt(process.env.ROLLBACK_THRESHOLD) || 5
  };
  
  const healthChecker = new HealthChecker(config);
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down health check system...');
    healthChecker.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down health check system...');
    healthChecker.stop();
    process.exit(0);
  });
  
  healthChecker.start();
}

module.exports = HealthChecker;
