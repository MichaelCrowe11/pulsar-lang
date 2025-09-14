#!/bin/bash

# Pipedream Trading System Setup Script
# Run this to automatically set up and deploy your trading system

echo "🚀 Pipedream Autonomous Trading System Setup"
echo "==========================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Prerequisites checked"
echo ""

# Step 1: Install Pipedream SDK
echo "📦 Installing Pipedream SDK..."
npm install @pipedream/sdk
echo "✅ SDK installed"
echo ""

# Step 2: Get API credentials
echo "🔑 Setting up API credentials..."
echo ""
echo "Please provide your Pipedream API keys:"
echo "(Get them from: https://pipedream.com/settings/account)"
echo ""

read -p "Enter your Pipedream PUBLIC KEY: " PD_PUBLIC_KEY
read -p "Enter your Pipedream SECRET KEY: " PD_SECRET_KEY
read -p "Enter your Pipedream USERNAME: " PD_USERNAME
read -p "Enter your Pipedream PROJECT ID (optional): " PD_PROJECT_ID

# Step 3: Create .env file
echo "📝 Creating .env file..."
cat > .env << EOF
# Pipedream Configuration
PIPEDREAM_PUBLIC_KEY=$PD_PUBLIC_KEY
PIPEDREAM_SECRET_KEY=$PD_SECRET_KEY
PIPEDREAM_USERNAME=$PD_USERNAME
PIPEDREAM_PROJECT_ID=$PD_PROJECT_ID

# Exchange APIs (Add your keys here)
COINBASE_API_KEY=
COINBASE_SECRET=
BINANCE_API_KEY=
BINANCE_SECRET=

# AI Services (Add your keys here)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# Trading Configuration
MAX_POSITION_SIZE=100
MAX_DAILY_LOSS=50
MAX_DRAWDOWN_PERCENT=10
TARGET_SHARPE_RATIO=2.0
ENABLE_LIVE_TRADING=false
AI_CONFIDENCE_THRESHOLD=0.7

# Database (Add your connection string)
DATABASE_URL=

# Notifications
SLACK_WEBHOOK_URL=
EOF

echo "✅ .env file created"
echo ""

# Step 4: Install dependencies
echo "📦 Installing additional dependencies..."
npm install dotenv axios technicalindicators
echo "✅ Dependencies installed"
echo ""

# Step 5: Deploy the workflow
echo "🚀 Deploying trading system to Pipedream..."
echo ""

# Check if deployment script exists
if [ -f "pipedream_sdk_deployment.js" ]; then
    echo "Running deployment script..."
    node pipedream_sdk_deployment.js
else
    echo "❌ Deployment script not found. Please ensure pipedream_sdk_deployment.js is in the current directory."
    exit 1
fi

echo ""
echo "======================================"
echo "✅ SETUP COMPLETE!"
echo "======================================"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Edit .env file and add your API keys:"
echo "   • Coinbase API credentials"
echo "   • Binance API credentials (optional)"
echo "   • OpenAI API key for AI trading signals"
echo "   • Database connection string"
echo ""
echo "2. Go to your Pipedream dashboard:"
echo "   https://pipedream.com/@$PD_USERNAME"
echo ""
echo "3. Connect required apps in Pipedream:"
echo "   • PostgreSQL or MySQL"
echo "   • Redis (for caching)"
echo "   • Slack (for notifications)"
echo ""
echo "4. Test the system:"
echo "   • Run in mock mode for 48 hours"
echo "   • Monitor performance metrics"
echo "   • Check circuit breaker functionality"
echo ""
echo "5. Go live:"
echo "   • Set ENABLE_LIVE_TRADING=true in .env"
echo "   • Start with small amounts ($100-$500)"
echo "   • Scale up gradually"
echo ""
echo "🎉 Happy Trading!"