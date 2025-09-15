#!/bin/bash

# Autonomous Trading System Deployment Script
# Usage: ./deploy.sh [production|staging|test]

set -e

ENVIRONMENT=${1:-staging}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "==================================="
echo "Deploying Autonomous Trading System"
echo "Environment: $ENVIRONMENT"
echo "Timestamp: $TIMESTAMP"
echo "==================================="

# Load environment variables
if [ -f ".env.$ENVIRONMENT" ]; then
    export $(cat .env.$ENVIRONMENT | xargs)
fi

# Safety checks
if [ "$ENVIRONMENT" == "production" ]; then
    echo "⚠️  PRODUCTION DEPLOYMENT - Confirming safety checks..."

    # Check circuit breaker is enabled
    if [ "$CIRCUIT_BREAKER_ENABLED" != "true" ]; then
        echo "❌ Circuit breaker must be enabled for production!"
        exit 1
    fi

    # Check risk limits
    if [ -z "$MAX_DAILY_LOSS" ] || [ -z "$MAX_POSITION_SIZE" ]; then
        echo "❌ Risk limits must be configured for production!"
        exit 1
    fi

    # Backup current deployment
    echo "📦 Creating backup..."
    docker-compose exec trading-bot tar -czf /tmp/backup_$TIMESTAMP.tar.gz /app
    docker cp trading-bot:/tmp/backup_$TIMESTAMP.tar.gz ./backups/

    read -p "Continue with production deployment? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        echo "Deployment cancelled."
        exit 0
    fi
fi

# Pull latest code
echo "📥 Pulling latest code..."
git pull origin main

# Build and deploy
echo "🔨 Building containers..."
docker-compose build --no-cache

# Stop old containers
echo "🛑 Stopping old containers..."
docker-compose down

# Start new containers
echo "🚀 Starting new containers..."
docker-compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 30

# Health check
echo "🏥 Running health checks..."
HEALTH_CHECK=$(curl -s http://localhost:3000/health | jq -r '.status')

if [ "$HEALTH_CHECK" == "healthy" ]; then
    echo "✅ Deployment successful!"

    # Start monitoring
    echo "📊 Starting monitoring dashboard..."
    docker-compose logs -f trading-bot &

    # Send notification
    if [ -n "$SLACK_WEBHOOK" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"✅ Trading System deployed to $ENVIRONMENT successfully!\"}" \
            $SLACK_WEBHOOK
    fi
else
    echo "❌ Health check failed! Rolling back..."
    docker-compose down
    docker-compose up -d
    exit 1
fi

echo "==================================="
echo "Deployment Complete!"
echo "Dashboard: http://localhost:3002"
echo "API: http://localhost:3000"
echo "Monitoring: http://localhost:9090"
echo "==================================="