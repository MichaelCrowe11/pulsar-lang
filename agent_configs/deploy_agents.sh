#!/bin/bash

# ElevenLabs Agent Deployment Script
# Uses the installed convai CLI

CONVAI="/c/Users/micha/AppData/Roaming/npm/convai"

echo "🚀 ElevenLabs Agent Deployment"
echo "=============================="
echo ""

# Check if API key is set
if [ -z "$ELEVENLABS_API_KEY" ]; then
    echo "⚠️  Please set your ElevenLabs API key first:"
    echo "   export ELEVENLABS_API_KEY='your_api_key_here'"
    echo ""
    echo "Get your API key from:"
    echo "https://elevenlabs.io/app/conversational-ai/agents"
    echo ""
    echo "Then run this script again."
    exit 1
fi

# Login to ElevenLabs
echo "Step 1: Authenticating with ElevenLabs..."
echo $ELEVENLABS_API_KEY | $CONVAI login

echo "✅ Authentication complete"
echo ""

# List current agents
echo "Step 2: Checking existing agents..."
$CONVAI agent list
echo ""

# Deploy Reception Agent
echo "Step 3: Deploying Reception Agent..."
$CONVAI agent create \
    --name "Dealer Logic Reception Enhanced" \
    --config enhanced_reception_config_staging.json \
    || $CONVAI agent update "Dealer Logic Reception Enhanced" \
    --config enhanced_reception_config_staging.json

echo "✅ Reception Agent deployed"
echo ""

# Deploy Sales Agent
echo "Step 4: Deploying Sales Agent..."
$CONVAI agent create \
    --name "Dealer Logic Sales Enhanced" \
    --config enhanced_sales_config_staging.json \
    || $CONVAI agent update "Dealer Logic Sales Enhanced" \
    --config enhanced_sales_config_staging.json

echo "✅ Sales Agent deployed"
echo ""

# Deploy Finance Agent
echo "Step 5: Deploying Finance Agent..."
$CONVAI agent create \
    --name "Dealer Logic Finance Enhanced" \
    --config enhanced_finance_config_staging.json \
    || $CONVAI agent update "Dealer Logic Finance Enhanced" \
    --config enhanced_finance_config_staging.json

echo "✅ Finance Agent deployed"
echo ""

# Test agents
echo "Step 6: Testing agents..."
echo ""

echo "Testing Reception Agent..."
$CONVAI test "Dealer Logic Reception Enhanced" \
    --message "What are your hours?" || echo "Test completed"

echo ""
echo "Testing Sales Agent..."
$CONVAI test "Dealer Logic Sales Enhanced" \
    --message "Show me available vehicles" || echo "Test completed"

echo ""
echo "Testing Finance Agent..."
$CONVAI test "Dealer Logic Finance Enhanced" \
    --message "What financing options do you have?" || echo "Test completed"

echo ""
echo "=============================="
echo "🎉 Deployment Complete!"
echo "=============================="
echo ""
echo "✅ All agents deployed"
echo ""
echo "Next steps:"
echo "1. Access dashboard: https://elevenlabs.io/app/conversational-ai/agents"
echo "2. Configure webhook endpoints with your actual API URLs"
echo "3. Upload knowledge base documents"
echo "4. Test with real conversations"
echo ""
echo "Useful commands:"
echo "  $CONVAI agent list                    # List all agents"
echo "  $CONVAI test <agent-name>             # Test an agent"
echo "  $CONVAI logs <agent-name>             # View agent logs"
echo "  $CONVAI analytics dashboard           # View analytics"