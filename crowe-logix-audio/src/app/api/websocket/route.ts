import { NextRequest } from 'next/server';
import { ElevenLabsWebSocketStream, ConversationalAIStream } from '@/lib/websocket-streaming';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const voiceId = searchParams.get('voiceId');
  const agentId = searchParams.get('agentId');

  if (!process.env.ELEVENLABS_API_KEY) {
    return new Response('API key not configured', { status: 500 });
  }

  try {
    switch (type) {
      case 'text-to-speech': {
        if (!voiceId) {
          return new Response('Voice ID required', { status: 400 });
        }

        const stream = new ElevenLabsWebSocketStream({
          voiceId,
          xi_api_key: process.env.ELEVENLABS_API_KEY,
          modelId: searchParams.get('modelId') || undefined,
          enableSSML: searchParams.get('enableSSML') === 'true'
        });

        await stream.connect();

        // Return WebSocket upgrade headers
        return new Response(null, {
          status: 101,
          headers: {
            'Upgrade': 'websocket',
            'Connection': 'Upgrade'
          }
        });
      }

      case 'conversational': {
        if (!agentId) {
          return new Response('Agent ID required', { status: 400 });
        }

        const stream = new ConversationalAIStream(
          agentId,
          process.env.ELEVENLABS_API_KEY
        );

        const conversationId = await stream.connect();

        return new Response(JSON.stringify({ conversationId }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }

      default:
        return new Response('Invalid stream type', { status: 400 });
    }
  } catch (error) {
    console.error('WebSocket error:', error);
    return new Response('Failed to establish WebSocket connection', { status: 500 });
  }
}

// Handle WebSocket upgrade
export async function SOCKET(request: NextRequest) {
  // This would be handled by a WebSocket server in production
  // For Next.js, you'd typically use a separate WebSocket server
  return new Response('WebSocket endpoint', { status: 200 });
}