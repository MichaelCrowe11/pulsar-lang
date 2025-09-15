import { ConversationalAIStream } from './websocket-streaming';
import { EventEmitter } from 'events';

interface AgentConfig {
  agentId: string;
  apiKey: string;
  name: string;
  description?: string;
  firstMessage?: string;
  systemPrompt?: string;
  voiceId?: string;
  language?: string;
  customLLM?: {
    url: string;
    headers?: Record<string, string>;
    model?: string;
  };
  tools?: AgentTool[];
  variables?: Record<string, any>;
}

interface AgentTool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  handler: (params: any) => Promise<any>;
}

export class ConversationalAgent extends EventEmitter {
  private config: AgentConfig;
  private stream: ConversationalAIStream | null = null;
  private conversationId: string | null = null;
  private isActive: boolean = false;
  private conversationHistory: ConversationEntry[] = [];
  private audioBuffer: Buffer[] = [];
  private tools: Map<string, AgentTool> = new Map();

  constructor(config: AgentConfig) {
    super();
    this.config = config;

    // Register tools
    if (config.tools) {
      config.tools.forEach(tool => {
        this.tools.set(tool.name, tool);
      });
    }
  }

  async startConversation(): Promise<string> {
    try {
      this.stream = new ConversationalAIStream(
        this.config.agentId,
        this.config.apiKey
      );

      // Set up event listeners
      this.setupEventListeners();

      // Connect and get conversation ID
      this.conversationId = await this.stream.connect({
        customLLM: this.config.customLLM,
        variables: this.config.variables
      });

      this.isActive = true;
      this.emit('conversationStarted', { conversationId: this.conversationId });

      // Send first message if configured
      if (this.config.firstMessage) {
        this.sendText(this.config.firstMessage);
      }

      return this.conversationId;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  private setupEventListeners() {
    if (!this.stream) return;

    this.stream.on('audio', (audioBuffer: Buffer) => {
      this.audioBuffer.push(audioBuffer);
      this.emit('audio', audioBuffer);
    });

    this.stream.on('transcript', (text: string) => {
      this.addToHistory('agent', text);
      this.emit('agentSpoke', text);
    });

    this.stream.on('userTranscript', (text: string) => {
      this.addToHistory('user', text);
      this.emit('userSpoke', text);
    });

    this.stream.on('agentResponse', (text: string) => {
      this.emit('agentThinking', text);
      this.checkForToolCalls(text);
    });

    this.stream.on('interruption', () => {
      this.emit('interrupted');
    });

    this.stream.on('endOfTurn', () => {
      this.emit('turnEnded');
    });

    this.stream.on('conversationEnd', () => {
      this.isActive = false;
      this.emit('conversationEnded');
    });

    this.stream.on('error', (error: Error) => {
      this.emit('error', error);
    });
  }

  private async checkForToolCalls(response: string) {
    // Parse response for tool calls (format: [TOOL:toolName:params])
    const toolCallRegex = /\[TOOL:(\w+):(.+?)\]/g;
    let match;

    while ((match = toolCallRegex.exec(response)) !== null) {
      const toolName = match[1];
      const params = JSON.parse(match[2]);

      if (this.tools.has(toolName)) {
        const tool = this.tools.get(toolName)!;
        try {
          const result = await tool.handler(params);
          this.emit('toolExecuted', { tool: toolName, params, result });

          // Send tool result back to conversation
          this.sendText(`Tool ${toolName} result: ${JSON.stringify(result)}`);
        } catch (error) {
          this.emit('toolError', { tool: toolName, error });
        }
      }
    }
  }

  sendAudio(audioBuffer: Buffer) {
    if (this.isActive && this.stream) {
      this.stream.sendAudio(audioBuffer);
    }
  }

  sendText(text: string) {
    if (this.isActive && this.stream) {
      this.stream.sendText(text);
      this.addToHistory('user', text);
    }
  }

  interrupt() {
    if (this.isActive && this.stream) {
      this.stream.interrupt();
    }
  }

  endConversation() {
    if (this.isActive && this.stream) {
      this.stream.endConversation();
      this.isActive = false;
    }
  }

  private addToHistory(role: 'user' | 'agent', content: string) {
    this.conversationHistory.push({
      role,
      content,
      timestamp: new Date()
    });
  }

  getHistory(): ConversationEntry[] {
    return [...this.conversationHistory];
  }

  getAudioBuffer(): Buffer {
    return Buffer.concat(this.audioBuffer);
  }

  isConversationActive(): boolean {
    return this.isActive;
  }

  getConversationId(): string | null {
    return this.conversationId;
  }
}

interface ConversationEntry {
  role: 'user' | 'agent';
  content: string;
  timestamp: Date;
}

// Agent Factory for creating specialized agents
export class AgentFactory {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  createCustomerServiceAgent(options: {
    agentId: string;
    companyName: string;
    industry: string;
    voiceId?: string;
  }): ConversationalAgent {
    return new ConversationalAgent({
      agentId: options.agentId,
      apiKey: this.apiKey,
      name: `${options.companyName} Customer Service`,
      description: `Customer service agent for ${options.companyName}`,
      systemPrompt: `You are a helpful customer service agent for ${options.companyName}, a company in the ${options.industry} industry. Be professional, empathetic, and solution-oriented.`,
      firstMessage: `Hello! Thank you for contacting ${options.companyName}. How can I assist you today?`,
      voiceId: options.voiceId,
      tools: [
        {
          name: 'checkOrderStatus',
          description: 'Check the status of a customer order',
          parameters: { orderId: 'string' },
          handler: async (params) => {
            // Implement order status check
            return { status: 'Processing', estimatedDelivery: '2024-01-15' };
          }
        },
        {
          name: 'scheduleCallback',
          description: 'Schedule a callback for the customer',
          parameters: { time: 'string', phone: 'string' },
          handler: async (params) => {
            // Implement callback scheduling
            return { scheduled: true, confirmationId: 'CB123456' };
          }
        }
      ]
    });
  }

  createSalesAgent(options: {
    agentId: string;
    productName: string;
    targetAudience: string;
    voiceId?: string;
  }): ConversationalAgent {
    return new ConversationalAgent({
      agentId: options.agentId,
      apiKey: this.apiKey,
      name: `${options.productName} Sales Agent`,
      description: `Sales agent for ${options.productName}`,
      systemPrompt: `You are a knowledgeable sales agent for ${options.productName}. Your target audience is ${options.targetAudience}. Focus on understanding customer needs and providing value-based solutions.`,
      firstMessage: `Hi there! I'm here to help you learn about ${options.productName}. What brings you here today?`,
      voiceId: options.voiceId,
      tools: [
        {
          name: 'getProductInfo',
          description: 'Get detailed product information',
          parameters: { feature: 'string' },
          handler: async (params) => {
            // Implement product info retrieval
            return { feature: params.feature, details: 'Product details here' };
          }
        },
        {
          name: 'calculatePricing',
          description: 'Calculate custom pricing',
          parameters: { seats: 'number', plan: 'string' },
          handler: async (params) => {
            // Implement pricing calculation
            return { monthlyPrice: 99, annualPrice: 999 };
          }
        }
      ]
    });
  }

  createTechnicalSupportAgent(options: {
    agentId: string;
    productName: string;
    knowledgeBase?: string;
    voiceId?: string;
  }): ConversationalAgent {
    return new ConversationalAgent({
      agentId: options.agentId,
      apiKey: this.apiKey,
      name: `${options.productName} Technical Support`,
      description: `Technical support agent for ${options.productName}`,
      systemPrompt: `You are a technical support specialist for ${options.productName}. Help users troubleshoot issues, provide solutions, and escalate when necessary. ${options.knowledgeBase ? `Use this knowledge base: ${options.knowledgeBase}` : ''}`,
      firstMessage: `Hello! I'm here to help you with any technical issues. Can you describe what you're experiencing?`,
      voiceId: options.voiceId,
      tools: [
        {
          name: 'runDiagnostic',
          description: 'Run system diagnostic',
          parameters: { component: 'string' },
          handler: async (params) => {
            // Implement diagnostic
            return { component: params.component, status: 'OK', details: {} };
          }
        },
        {
          name: 'createTicket',
          description: 'Create support ticket',
          parameters: { issue: 'string', priority: 'string' },
          handler: async (params) => {
            // Implement ticket creation
            return { ticketId: 'TK789012', estimatedResolution: '24 hours' };
          }
        }
      ]
    });
  }

  createPersonalAssistant(options: {
    agentId: string;
    userName: string;
    preferences?: Record<string, any>;
    voiceId?: string;
  }): ConversationalAgent {
    return new ConversationalAgent({
      agentId: options.agentId,
      apiKey: this.apiKey,
      name: `Personal Assistant for ${options.userName}`,
      description: 'AI-powered personal assistant',
      systemPrompt: `You are a personal assistant for ${options.userName}. Be helpful, proactive, and maintain context across conversations. User preferences: ${JSON.stringify(options.preferences || {})}`,
      firstMessage: `Good to hear from you, ${options.userName}! What can I help you with?`,
      voiceId: options.voiceId,
      variables: options.preferences,
      tools: [
        {
          name: 'setReminder',
          description: 'Set a reminder',
          parameters: { text: 'string', time: 'string' },
          handler: async (params) => {
            return { reminderId: 'R456789', scheduled: true };
          }
        },
        {
          name: 'searchCalendar',
          description: 'Search calendar events',
          parameters: { query: 'string' },
          handler: async (params) => {
            return { events: [] };
          }
        }
      ]
    });
  }
}

// Conversation Manager for handling multiple concurrent conversations
export class ConversationManager {
  private conversations: Map<string, ConversationalAgent> = new Map();
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async createConversation(config: AgentConfig): Promise<string> {
    const agent = new ConversationalAgent(config);
    const conversationId = await agent.startConversation();

    this.conversations.set(conversationId, agent);

    return conversationId;
  }

  getConversation(conversationId: string): ConversationalAgent | undefined {
    return this.conversations.get(conversationId);
  }

  endConversation(conversationId: string) {
    const agent = this.conversations.get(conversationId);
    if (agent) {
      agent.endConversation();
      this.conversations.delete(conversationId);
    }
  }

  getActiveConversations(): string[] {
    return Array.from(this.conversations.keys());
  }

  endAllConversations() {
    this.conversations.forEach(agent => {
      agent.endConversation();
    });
    this.conversations.clear();
  }
}