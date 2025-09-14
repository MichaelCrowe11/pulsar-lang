#!/bin/bash

# Crowe-Lang Payment Testing Script
echo "🧪 Testing Crowe-Lang Payment Flow..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
STRIPE_CLI="./stripe.exe"
API_URL="http://localhost:3000/api"

echo -e "${YELLOW}Step 1: Creating test customer...${NC}"
CUSTOMER_ID=$($STRIPE_CLI customers create \
  --email="test@crowelang.com" \
  --name="Test Developer" \
  --description="Testing Crowe-Lang payment" \
  --format json | grep -o '"id": "[^"]*' | grep -o '[^"]*$' | head -1)

echo -e "${GREEN}✅ Customer created: $CUSTOMER_ID${NC}"

echo -e "${YELLOW}Step 2: Creating checkout session...${NC}"
SESSION=$($STRIPE_CLI checkout sessions create \
  --customer=$CUSTOMER_ID \
  --success-url="https://lang.crowetrade.com/success?session_id={CHECKOUT_SESSION_ID}" \
  --cancel-url="https://lang.crowetrade.com/pricing" \
  --mode=subscription \
  --line-items="price_data[product_data][name]=Crowe-Lang Personal,price_data[unit_amount]=9900,price_data[currency]=usd,price_data[recurring][interval]=year,quantity=1" \
  --metadata="plan=personal" \
  --metadata="userId=test123" \
  --format json)

SESSION_ID=$(echo $SESSION | grep -o '"id": "[^"]*' | grep -o '[^"]*$' | head -1)
SESSION_URL=$(echo $SESSION | grep -o '"url": "[^"]*' | grep -o '[^"]*$' | head -1)

echo -e "${GREEN}✅ Checkout session created: $SESSION_ID${NC}"
echo -e "${GREEN}🔗 Payment URL: $SESSION_URL${NC}"

echo -e "${YELLOW}Step 3: Simulating successful payment...${NC}"
$STRIPE_CLI trigger checkout.session.completed \
  --add="metadata.plan=personal" \
  --add="metadata.userId=test123"

echo -e "${GREEN}✅ Payment simulation complete!${NC}"

echo -e "${YELLOW}Step 4: Checking recent events...${NC}"
$STRIPE_CLI events list --limit 3

echo -e "${GREEN}🎉 Payment test complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Check your MongoDB for the new license"
echo "2. Test license validation endpoint"
echo "3. Verify webhook was received"