import { WebSocket } from 'ws';
import { EventEmitter } from 'events';

interface StreamingOptions {
  voiceId: string;
  modelId?: string;
  voiceSettings?: {
    stability?: number;
    similarity_boost?: number;
    style?: number;
    use_speaker_boost?: boolean;
  };
  generationConfig?: {
    chunk_length_schedule?: number[];
  };
  enableSSML?: boolean;
  xi_api_key: string;
}

export class ElevenLabsWebSocketStream extends EventEmitter {
  private ws: WebSocket | null = null;
  private url: string;
  private options: StreamingOptions;
  private isConnected: boolean = false;
  private audioQueue: Buffer[] = [];
  private messageQueue: string[] = [];

  constructor(options: StreamingOptions) {
    super();
    this.options = options;
    this.url = `wss://api.elevenlabs.io/v1/text-to-speech/${options.voiceId}/stream-input?model_id=${options.modelId || 'eleven_monolingual_v1'}`;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url, {
          headers: {
            'xi-api-key': this.options.xi_api_key
          }
        });

        this.ws.on('open', () => {
          this.isConnected = true;
          this.emit('connected');

          // Send initial configuration
          const initMessage = {
            text: ' ',
            voice_settings: this.options.voiceSettings || {
              stability: 0.5,
              similarity_boost: 0.75,
              style: 0.0,
              use_speaker_boost: true
            },
            generation_config: this.options.generationConfig || {
              chunk_length_schedule: [120, 160, 250, 290]
            },
            xi_api_key: this.options.xi_api_key
          };

          if (this.ws) {
            this.ws.send(JSON.stringify(initMessage));
          }

          // Process any queued messages
          while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            if (message) {
              this.send(message);
            }
          }

          resolve();
        });

        this.ws.on('message', (data: Buffer) => {
          try {
            const message = JSON.parse(data.toString());

            if (message.audio) {
              // Convert base64 audio to buffer
              const audioBuffer = Buffer.from(message.audio, 'base64');
              this.audioQueue.push(audioBuffer);
              this.emit('audio', audioBuffer);
            }

            if (message.isFinal) {
              this.emit('final');
            }

            if (message.normalizedAlignment) {
              this.emit('alignment', message.normalizedAlignment);
            }

          } catch (error) {
            // If not JSON, it might be binary audio data
            this.audioQueue.push(data);
            this.emit('audio', data);
          }
        });

        this.ws.on('error', (error) => {
          this.emit('error', error);
          reject(error);
        });

        this.ws.on('close', (code, reason) => {
          this.isConnected = false;
          this.emit('close', { code, reason: reason.toString() });
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  send(text: string, flush: boolean = false) {
    const message = {
      text,
      flush
    };

    if (this.isConnected && this.ws) {
      this.ws.send(JSON.stringify(message));
    } else {
      // Queue the message if not connected
      this.messageQueue.push(text);
    }
  }

  sendChunk(text: string) {
    this.send(text, false);
  }

  flush() {
    this.send('', true);
  }

  close() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }

  getAudioQueue(): Buffer[] {
    const queue = [...this.audioQueue];
    this.audioQueue = [];
    return queue;
  }

  isReady(): boolean {
    return this.isConnected;
  }
}

// Conversational AI WebSocket Stream
export class ConversationalAIStream extends EventEmitter {
  private ws: WebSocket | null = null;
  private url: string;
  private apiKey: string;
  private agentId: string;
  private isConnected: boolean = false;

  constructor(agentId: string, apiKey: string) {
    super();
    this.agentId = agentId;
    this.apiKey = apiKey;
    this.url = `wss://api.elevenlabs.io/v1/convai/conversation`;
  }

  async connect(options?: {
    customLLM?: {
      url: string;
      headers?: Record<string, string>;
    };
    variables?: Record<string, any>;
  }): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        // First, initialize the conversation
        const initPayload = {
          agent_id: this.agentId,
          custom_llm: options?.customLLM,
          variables: options?.variables
        };

        this.ws = new WebSocket(this.url, {
          headers: {
            'xi-api-key': this.apiKey
          }
        });

        this.ws.on('open', () => {
          this.isConnected = true;
          this.emit('connected');

          // Send initialization
          if (this.ws) {
            this.ws.send(JSON.stringify({
              type: 'conversation.init',
              ...initPayload
            }));
          }
        });

        this.ws.on('message', (data: Buffer) => {
          try {
            const message = JSON.parse(data.toString());

            switch (message.type) {
              case 'conversation.init.success':
                const conversationId = message.conversation_id;
                resolve(conversationId);
                this.emit('initialized', { conversationId });
                break;

              case 'audio':
                const audioBuffer = Buffer.from(message.audio, 'base64');
                this.emit('audio', audioBuffer);
                break;

              case 'transcript':
                this.emit('transcript', message.text);
                break;

              case 'user_transcript':
                this.emit('userTranscript', message.text);
                break;

              case 'agent_response':
                this.emit('agentResponse', message.text);
                break;

              case 'interruption':
                this.emit('interruption');
                break;

              case 'end_of_turn':
                this.emit('endOfTurn');
                break;

              case 'conversation.end':
                this.emit('conversationEnd');
                this.close();
                break;

              case 'error':
                this.emit('error', new Error(message.message));
                break;

              default:
                this.emit('message', message);
            }
          } catch (error) {
            this.emit('error', error);
          }
        });

        this.ws.on('error', (error) => {
          this.emit('error', error);
          reject(error);
        });

        this.ws.on('close', (code, reason) => {
          this.isConnected = false;
          this.emit('close', { code, reason: reason.toString() });
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  sendAudio(audioBuffer: Buffer) {
    if (this.isConnected && this.ws) {
      const message = {
        type: 'audio',
        audio: audioBuffer.toString('base64')
      };
      this.ws.send(JSON.stringify(message));
    }
  }

  sendText(text: string) {
    if (this.isConnected && this.ws) {
      const message = {
        type: 'text',
        text
      };
      this.ws.send(JSON.stringify(message));
    }
  }

  interrupt() {
    if (this.isConnected && this.ws) {
      this.ws.send(JSON.stringify({ type: 'interrupt' }));
    }
  }

  endConversation() {
    if (this.isConnected && this.ws) {
      this.ws.send(JSON.stringify({ type: 'conversation.end' }));
    }
  }

  close() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }
}

// Audio Input Stream for real-time processing
export class AudioInputStream extends EventEmitter {
  private ws: WebSocket | null = null;
  private url: string;
  private apiKey: string;
  private isConnected: boolean = false;
  private sampleRate: number;
  private encoding: string;

  constructor(apiKey: string, options?: {
    sampleRate?: number;
    encoding?: 'pcm16' | 'mulaw';
  }) {
    super();
    this.apiKey = apiKey;
    this.sampleRate = options?.sampleRate || 16000;
    this.encoding = options?.encoding || 'pcm16';
    this.url = `wss://api.elevenlabs.io/v1/stream-audio-input`;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url, {
          headers: {
            'xi-api-key': this.apiKey
          }
        });

        this.ws.on('open', () => {
          this.isConnected = true;
          this.emit('connected');

          // Send audio format configuration
          if (this.ws) {
            this.ws.send(JSON.stringify({
              type: 'config',
              sample_rate: this.sampleRate,
              encoding: this.encoding
            }));
          }

          resolve();
        });

        this.ws.on('message', (data: Buffer) => {
          try {
            const message = JSON.parse(data.toString());

            switch (message.type) {
              case 'speech_start':
                this.emit('speechStart');
                break;

              case 'speech_end':
                this.emit('speechEnd');
                break;

              case 'transcript':
                this.emit('transcript', message.text);
                break;

              case 'partial_transcript':
                this.emit('partialTranscript', message.text);
                break;

              default:
                this.emit('message', message);
            }
          } catch (error) {
            this.emit('error', error);
          }
        });

        this.ws.on('error', (error) => {
          this.emit('error', error);
          reject(error);
        });

        this.ws.on('close', (code, reason) => {
          this.isConnected = false;
          this.emit('close', { code, reason: reason.toString() });
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  sendAudioChunk(audioBuffer: Buffer) {
    if (this.isConnected && this.ws) {
      // Send raw audio bytes
      this.ws.send(audioBuffer);
    }
  }

  close() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }
}

export default {
  ElevenLabsWebSocketStream,
  ConversationalAIStream,
  AudioInputStream
};