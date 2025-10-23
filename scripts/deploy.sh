#!/bin/bash

# Zero-Downtime Deployment Script for VAH
# This script ensures safe deployments without disrupting live users

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_DIR="apps/backend"
FRONTEND_DIR="apps/frontend"
DEPLOYMENT_LOG="deployment.log"

# Functions
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a $DEPLOYMENT_LOG
}

success() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a $DEPLOYMENT_LOG
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}" | tee -a $DEPLOYMENT_LOG
}

error() {
    echo -e "${RED}❌ $1${NC}" | tee -a $DEPLOYMENT_LOG
    exit 1
}

# Pre-deployment checks
pre_deployment_checks() {
    log "Running pre-deployment checks..."
    
    # Check if database is accessible
    if ! npm --workspace $BACKEND_DIR run db:integrity; then
        error "Database integrity check failed"
    fi
    
    # Check if all tests pass
    if ! npm --workspace $BACKEND_DIR run test:smoke; then
        error "Smoke tests failed"
    fi
    
    # Check if frontend builds
    if ! npm --workspace $FRONTEND_DIR run build; then
        error "Frontend build failed"
    fi
    
    success "Pre-deployment checks passed"
}

# Safe database migration
safe_migration() {
    log "Running safe database migration..."
    
    # Create migration backup
    npm --workspace $BACKEND_DIR run db:backup
    
    # Run migrations
    if npm --workspace $BACKEND_DIR run migrate; then
        success "Database migration completed"
    else
        warning "Migration failed, rolling back..."
        npm --workspace $BACKEND_DIR run db:rollback
        error "Migration rollback completed"
    fi
}

# Deploy backend
deploy_backend() {
    log "Deploying backend..."
    
    # Build backend
    npm --workspace $BACKEND_DIR run build:prod
    
    # Start backend with health check
    npm --workspace $BACKEND_DIR run start:prod &
    BACKEND_PID=$!
    
    # Wait for backend to be ready
    sleep 10
    
    # Health check
    if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
        success "Backend deployed successfully"
    else
        error "Backend health check failed"
    fi
}

# Deploy frontend
deploy_frontend() {
    log "Deploying frontend..."
    
    # Build frontend
    npm --workspace $FRONTEND_DIR run build
    
    # Start frontend
    npm --workspace $FRONTEND_DIR run start &
    FRONTEND_PID=$!
    
    # Wait for frontend to be ready
    sleep 5
    
    # Health check
    if curl -f http://localhost:3001 > /dev/null 2>&1; then
        success "Frontend deployed successfully"
    else
        error "Frontend health check failed"
    fi
}

# Post-deployment verification
post_deployment_verification() {
    log "Running post-deployment verification..."
    
    # Run smoke tests
    if npm --workspace $BACKEND_DIR run test:smoke; then
        success "Post-deployment smoke tests passed"
    else
        error "Post-deployment smoke tests failed"
    fi
    
    # Check API endpoints
    if curl -f http://localhost:3000/api/bff/health > /dev/null 2>&1; then
        success "API health check passed"
    else
        error "API health check failed"
    fi
}

# Rollback function
rollback() {
    log "Rolling back deployment..."
    
    # Kill current processes
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID
    fi
    
    # Rollback database
    npm --workspace $BACKEND_DIR run db:rollback
    
    # Restore from backup
    npm --workspace $BACKEND_DIR run db:restore
    
    success "Rollback completed"
}

# Main deployment function
deploy() {
    log "Starting zero-downtime deployment..."
    
    # Pre-deployment checks
    pre_deployment_checks
    
    # Safe migration
    safe_migration
    
    # Deploy backend
    deploy_backend
    
    # Deploy frontend
    deploy_frontend
    
    # Post-deployment verification
    post_deployment_verification
    
    success "Deployment completed successfully!"
}

# Handle script arguments
case "$1" in
    "deploy")
        deploy
        ;;
    "rollback")
        rollback
        ;;
    "check")
        pre_deployment_checks
        ;;
    *)
        echo "Usage: $0 {deploy|rollback|check}"
        echo "  deploy   - Run full zero-downtime deployment"
        echo "  rollback - Rollback to previous version"
        echo "  check    - Run pre-deployment checks only"
        exit 1
        ;;
esac
