# ElevenLabs CLI Setup & Installation Guide

## Installation Methods

### Option 1: NPM Installation (Recommended)
```bash
npm install -g @elevenlabs/convai-cli
```

### Option 2: Python Installation
```bash
pip install elevenlabs-convai
```

### Option 3: Direct Download
Visit: https://elevenlabs.io/conversational-ai/downloads

## First-Time Setup

1. **Get your API Key**
   - Go to: https://elevenlabs.io/app/conversational-ai/agents
   - Navigate to Settings → API Keys
   - Create a new API key for CLI access

2. **Authenticate the CLI**
   ```bash
   convai login
   # Enter your API key when prompted
   ```

3. **Verify Installation**
   ```bash
   convai --version
   convai agent list
   ```

## Manual Deployment Without CLI

If the CLI is not available, you can deploy using the ElevenLabs API directly:

### Using cURL
```bash
# Set your API key
export ELEVENLABS_API_KEY="your_api_key_here"

# Deploy Reception Agent
curl -X POST https://api.elevenlabs.io/v1/convai/agents \
  -H "xi-api-key: $ELEVENLABS_API_KEY" \
  -H "Content-Type: application/json" \
  -d @enhanced_reception_config_staging.json

# Deploy Sales Agent
curl -X POST https://api.elevenlabs.io/v1/convai/agents \
  -H "xi-api-key: $ELEVENLABS_API_KEY" \
  -H "Content-Type: application/json" \
  -d @enhanced_sales_config_staging.json

# Deploy Finance Agent
curl -X POST https://api.elevenlabs.io/v1/convai/agents \
  -H "xi-api-key: $ELEVENLABS_API_KEY" \
  -H "Content-Type: application/json" \
  -d @enhanced_finance_config_staging.json
```

### Using Python
```python
import requests
import json

API_KEY = "your_api_key_here"
BASE_URL = "https://api.elevenlabs.io/v1/convai"

headers = {
    "xi-api-key": API_KEY,
    "Content-Type": "application/json"
}

# Deploy agents
agents = [
    ("enhanced_reception_config_staging.json", "Reception"),
    ("enhanced_sales_config_staging.json", "Sales"),
    ("enhanced_finance_config_staging.json", "Finance")
]

for config_file, agent_type in agents:
    with open(config_file, 'r') as f:
        config = json.load(f)

    response = requests.post(
        f"{BASE_URL}/agents",
        headers=headers,
        json=config
    )

    if response.status_code == 201:
        print(f"✅ {agent_type} agent deployed successfully")
    else:
        print(f"❌ Error deploying {agent_type}: {response.text}")
```

## Web Console Deployment

You can also deploy directly through the web interface:

1. Go to: https://elevenlabs.io/app/conversational-ai/agents
2. Click "Create Agent"
3. Choose "Import Configuration"
4. Upload each JSON file:
   - `enhanced_reception_config_staging.json`
   - `enhanced_sales_config_staging.json`
   - `enhanced_finance_config_staging.json`
5. Configure webhook endpoints in Settings
6. Upload knowledge base documents in Knowledge Base tab

## Testing Your Deployed Agents

### Via Web Console
1. Open agent in ElevenLabs dashboard
2. Click "Test Agent" button
3. Use the built-in chat interface

### Via API
```bash
curl -X POST https://api.elevenlabs.io/v1/convai/conversation \
  -H "xi-api-key: $ELEVENLABS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "your_agent_id",
    "message": "What are your hours on Saturday?"
  }'
```

### Via SDK
```javascript
const { ElevenLabs } = require('elevenlabs');

const client = new ElevenLabs({
  apiKey: process.env.ELEVENLABS_API_KEY
});

const response = await client.conversationalAI.startConversation({
  agentId: 'your_agent_id',
  initialMessage: 'Hello, I need help with financing'
});
```

## Monitoring & Analytics

Access analytics dashboard at:
https://elevenlabs.io/app/conversational-ai/analytics

Key metrics to monitor:
- Response latency
- Tool success rate
- Customer satisfaction
- Conversation completion rate
- Escalation frequency

## Troubleshooting

### Common Issues

1. **Authentication Failed**
   - Verify API key is correct
   - Check API key has proper permissions
   - Ensure you're in the correct workspace

2. **Agent Creation Failed**
   - Validate JSON configuration syntax
   - Check tool webhook URLs are accessible
   - Verify LLM model is available in your plan

3. **Tools Not Working**
   - Confirm webhook endpoints are live
   - Check API authentication headers
   - Review timeout settings (increase if needed)

4. **Knowledge Base Issues**
   - Ensure documents are in supported format
   - Check file size limits (max 10MB per document)
   - Verify embedding model is enabled

## Support Resources

- Documentation: https://docs.elevenlabs.io/conversational-ai
- API Reference: https://docs.elevenlabs.io/api-reference
- Community: https://discord.gg/elevenlabs
- Support: support@elevenlabs.io