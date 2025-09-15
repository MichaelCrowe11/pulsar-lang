# Crowe Logix Audio Platform

Next-generation audio platform powered by ElevenLabs' comprehensive API suite.

## Features

### Core Audio Capabilities
- **Text-to-Speech (TTS)**: Convert text to natural-sounding speech with 100+ voices
- **Speech-to-Speech (STS)**: Transform audio while preserving emotional nuance
- **Voice Cloning**: Create custom voices from audio samples
- **Professional Voice Cloning (PVC)**: High-fidelity voice replication
- **Audio Isolation**: Remove background noise and isolate speech
- **Sound Effects Generation**: AI-powered sound effect creation
- **Audio Dubbing**: Multi-language video dubbing with lip-sync
- **Conversational AI**: Build interactive voice agents

### Platform Features
- **Audio Production Studio**: Professional web-based audio editing interface
- **Real-time Streaming**: WebSocket-based audio streaming
- **Voice Library Management**: Organize and manage custom voices
- **Conversation Management**: Handle multiple concurrent AI conversations
- **Analytics Dashboard**: Track usage and performance metrics
- **API Integration**: RESTful API for all audio operations

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, WebSocket
- **Audio Processing**: ElevenLabs API, WaveSurfer.js, Tone.js
- **Database**: PostgreSQL with Prisma ORM
- **Caching**: Redis
- **Storage**: AWS S3
- **Real-time**: Socket.io, WebSocket
- **Authentication**: JWT, NextAuth.js

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Redis server
- ElevenLabs API key
- AWS S3 bucket (optional, for audio storage)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-org/crowe-logix-audio.git
cd crowe-logix-audio
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Set up the database:
```bash
npx prisma generate
npx prisma db push
```

5. Start the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## API Usage

### Text-to-Speech
```javascript
const response = await fetch('/api/audio', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'text-to-speech',
    text: 'Hello, world!',
    voiceId: 'voice_id_here',
    options: {
      modelId: 'eleven_multilingual_v2',
      voiceSettings: {
        stability: 0.5,
        similarity_boost: 0.75
      }
    }
  })
});

const audioBlob = await response.blob();
```

### Voice Cloning
```javascript
const formData = new FormData();
formData.append('name', 'Custom Voice');
formData.append('description', 'My cloned voice');
formData.append('files', audioFile);

const response = await fetch('/api/audio', {
  method: 'POST',
  body: formData
});
```

### Conversational AI Agent
```javascript
import { ConversationalAgent } from '@/lib/conversational-agent';

const agent = new ConversationalAgent({
  agentId: 'agent_id',
  apiKey: 'api_key',
  name: 'Assistant',
  firstMessage: 'Hello! How can I help you?'
});

const conversationId = await agent.startConversation();

agent.on('audio', (audioBuffer) => {
  // Play audio
});

agent.on('userSpoke', (text) => {
  console.log('User said:', text);
});

agent.sendText('Tell me about the weather');
```

## WebSocket Streaming

### Text-to-Speech Streaming
```javascript
const ws = new WebSocket('ws://localhost:3001/tts');

ws.onopen = () => {
  ws.send(JSON.stringify({
    text: 'Stream this text',
    voiceId: 'voice_id',
    voiceSettings: {
      stability: 0.5,
      similarity_boost: 0.75
    }
  }));
};

ws.onmessage = (event) => {
  const audioData = event.data;
  // Process audio chunks
};
```

## Architecture

```
crowe-logix-audio/
├── src/
│   ├── app/                   # Next.js app directory
│   │   ├── api/               # API routes
│   │   │   ├── audio/         # Audio processing endpoints
│   │   │   └── websocket/     # WebSocket endpoints
│   │   ├── studio/           # Audio studio interface
│   │   └── page.tsx          # Home page
│   ├── lib/                  # Core libraries
│   │   ├── elevenlabs-client.ts    # ElevenLabs API wrapper
│   │   ├── websocket-streaming.ts  # WebSocket handlers
│   │   └── conversational-agent.ts # AI agent system
│   └── components/           # React components
├── prisma/                   # Database schema
├── public/                   # Static assets
└── package.json             # Dependencies
```

## Key Components

### CroweLogixAudioEngine
Main class for interacting with all ElevenLabs APIs:
- Text-to-Speech
- Speech-to-Speech
- Voice Cloning
- Audio Isolation
- Sound Generation
- Dubbing
- Voice Management

### ConversationalAgent
Manages AI-powered voice conversations:
- Real-time audio streaming
- Tool integration
- Conversation history
- Multi-agent support

### AudioStudio
Professional web interface for audio production:
- Waveform visualization
- Recording capabilities
- Real-time processing
- Multi-format export

## Deployment

### Production Build
```bash
npm run build
npm start
```

### Docker Deployment
```bash
docker build -t crowe-logix-audio .
docker run -p 3000:3000 crowe-logix-audio
```

### Environment Variables for Production
- Set `NODE_ENV=production`
- Use secure JWT secrets
- Configure production database
- Set up CDN for audio delivery
- Enable rate limiting

## Performance Optimization

- Audio caching with Redis
- CDN integration for audio delivery
- WebSocket connection pooling
- Batch processing for multiple requests
- Progressive audio loading

## Security

- API key rotation
- Rate limiting per user/IP
- Audio file validation
- Secure WebSocket connections (WSS)
- Content Security Policy headers

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

MIT License - see LICENSE file for details

## Support

For support, email support@crowelogix.com or open an issue on GitHub.