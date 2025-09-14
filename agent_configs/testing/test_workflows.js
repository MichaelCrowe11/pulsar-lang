// Eleven Labs Agent Workflow Testing Suite
// Automated tests for agent conversations and tool executions

const axios = require('axios');
const { expect } = require('chai');

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const WEBHOOK_SERVER_URL = process.env.WEBHOOK_SERVER_URL || 'http://localhost:3000';
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

class AgentTester {
    constructor(agentId, apiKey) {
        this.agentId = agentId;
        this.apiKey = apiKey;
        this.conversationId = null;
    }

    // Start a new conversation
    async startConversation() {
        try {
            const response = await axios.post(
                `${ELEVENLABS_API_URL}/agents/${this.agentId}/conversations`,
                {},
                {
                    headers: {
                        'xi-api-key': this.apiKey,
                        'Content-Type': 'application/json'
                    }
                }
            );

            this.conversationId = response.data.conversation_id;
            return this.conversationId;
        } catch (error) {
            console.error('Failed to start conversation:', error.message);
            throw error;
        }
    }

    // Send a message to the agent
    async sendMessage(message) {
        try {
            const response = await axios.post(
                `${ELEVENLABS_API_URL}/agents/${this.agentId}/conversations/${this.conversationId}/messages`,
                {
                    text: message,
                    role: 'user'
                },
                {
                    headers: {
                        'xi-api-key': this.apiKey,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data;
        } catch (error) {
            console.error('Failed to send message:', error.message);
            throw error;
        }
    }

    // Wait for agent response
    async waitForResponse(timeout = 10000) {
        const startTime = Date.now();

        while (Date.now() - startTime < timeout) {
            try {
                const response = await axios.get(
                    `${ELEVENLABS_API_URL}/agents/${this.agentId}/conversations/${this.conversationId}/messages`,
                    {
                        headers: {
                            'xi-api-key': this.apiKey
                        }
                    }
                );

                const messages = response.data.messages;
                const lastMessage = messages[messages.length - 1];

                if (lastMessage && lastMessage.role === 'agent') {
                    return lastMessage;
                }
            } catch (error) {
                console.error('Error checking for response:', error.message);
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        throw new Error('Timeout waiting for agent response');
    }

    // End conversation
    async endConversation() {
        try {
            await axios.delete(
                `${ELEVENLABS_API_URL}/agents/${this.agentId}/conversations/${this.conversationId}`,
                {
                    headers: {
                        'xi-api-key': this.apiKey
                    }
                }
            );
        } catch (error) {
            console.error('Failed to end conversation:', error.message);
        }
    }
}

// Test Scenarios
const testScenarios = {
    // Dealer Logic Sales Flow
    dealerSalesFlow: {
        agentId: 'dealer_logic_sales_v2',
        name: 'Complete Vehicle Purchase Journey',
        steps: [
            {
                message: "Hi, I'm looking for a new sedan under $30,000",
                expectedTools: ['inventory_lookup'],
                validateResponse: (response) => {
                    expect(response.text).to.include.oneOf(['sedan', 'available', 'Honda', 'Toyota']);
                }
            },
            {
                message: "I'm interested in the Honda Accord. What financing options do you have?",
                expectedTools: ['calculate_financing'],
                validateResponse: (response) => {
                    expect(response.text).to.include.oneOf(['financing', 'monthly', 'APR', 'payment']);
                }
            },
            {
                message: "I have a 2018 Toyota Camry to trade in with 45,000 miles",
                expectedTools: ['check_trade_in_value'],
                validateResponse: (response) => {
                    expect(response.text).to.include.oneOf(['trade', 'value', 'estimate']);
                }
            },
            {
                message: "Great! I'd like to schedule a test drive for tomorrow at 2 PM",
                expectedTools: ['schedule_test_drive', 'open_calendar'],
                validateResponse: (response) => {
                    expect(response.text).to.include.oneOf(['scheduled', 'appointment', 'confirmed']);
                }
            }
        ]
    },

    // Research Agent Flow
    researchFlow: {
        agentId: 'dr._michael_b._crowe',
        name: 'Scientific Research Inquiry',
        steps: [
            {
                message: "Can you explain the latest research on mycorrhizal fungi?",
                expectedTools: ['knowledge_base_search'],
                validateResponse: (response) => {
                    expect(response.text).to.include.oneOf(['fungi', 'mycorrhizal', 'research']);
                }
            },
            {
                message: "What are the pharmaceutical applications?",
                expectedTools: ['data_analysis'],
                validateResponse: (response) => {
                    expect(response.text).to.include.oneOf(['pharmaceutical', 'drug', 'compound']);
                }
            }
        ]
    },

    // Multi-Agent Handoff Flow
    handoffFlow: {
        agentId: 'dealer_logic_reception_v2',
        name: 'Agent Handoff Workflow',
        steps: [
            {
                message: "I need help with financing for a car",
                expectedTools: ['transfer_to_specialist'],
                validateResponse: (response) => {
                    expect(response.text).to.include.oneOf(['transfer', 'finance', 'specialist']);
                }
            }
        ]
    }
};

// Test Runner
class WorkflowTestRunner {
    constructor() {
        this.results = [];
    }

    async runTest(scenario) {
        console.log(`\n🧪 Testing: ${scenario.name}`);
        console.log('=' . repeat(50));

        const tester = new AgentTester(scenario.agentId, ELEVENLABS_API_KEY);
        const testResult = {
            scenario: scenario.name,
            agentId: scenario.agentId,
            steps: [],
            passed: true
        };

        try {
            // Start conversation
            await tester.startConversation();
            console.log('✅ Conversation started');

            // Execute each step
            for (let i = 0; i < scenario.steps.length; i++) {
                const step = scenario.steps[i];
                console.log(`\n📝 Step ${i + 1}: "${step.message}"`);

                const stepResult = {
                    stepNumber: i + 1,
                    message: step.message,
                    success: false,
                    response: null,
                    errors: []
                };

                try {
                    // Send message
                    await tester.sendMessage(step.message);

                    // Wait for response
                    const response = await tester.waitForResponse();
                    stepResult.response = response.text;

                    console.log(`💬 Response: ${response.text.substring(0, 100)}...`);

                    // Validate response
                    step.validateResponse(response);
                    stepResult.success = true;

                    console.log(`✅ Step ${i + 1} passed`);
                } catch (error) {
                    stepResult.errors.push(error.message);
                    testResult.passed = false;
                    console.log(`❌ Step ${i + 1} failed: ${error.message}`);
                }

                testResult.steps.push(stepResult);
            }

            // End conversation
            await tester.endConversation();
            console.log('\n✅ Conversation ended');

        } catch (error) {
            testResult.passed = false;
            testResult.error = error.message;
            console.log(`\n❌ Test failed: ${error.message}`);
        }

        this.results.push(testResult);
        return testResult;
    }

    async runAllTests() {
        console.log('🚀 Starting Eleven Labs Agent Workflow Tests');
        console.log('=' . repeat(60));

        for (const [key, scenario] of Object.entries(testScenarios)) {
            await this.runTest(scenario);
            // Wait between tests to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        this.printSummary();
    }

    printSummary() {
        console.log('\n' + '=' . repeat(60));
        console.log('📊 TEST SUMMARY');
        console.log('=' . repeat(60));

        const total = this.results.length;
        const passed = this.results.filter(r => r.passed).length;
        const failed = total - passed;

        console.log(`Total Tests: ${total}`);
        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

        if (failed > 0) {
            console.log('\n❌ Failed Tests:');
            this.results.filter(r => !r.passed).forEach(result => {
                console.log(`  - ${result.scenario}`);
                result.steps.filter(s => !s.success).forEach(step => {
                    console.log(`    Step ${step.stepNumber}: ${step.errors.join(', ')}`);
                });
            });
        }

        // Generate report file
        this.generateReport();
    }

    generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                total: this.results.length,
                passed: this.results.filter(r => r.passed).length,
                failed: this.results.filter(r => !r.passed).length
            },
            results: this.results
        };

        const fs = require('fs');
        const reportPath = `test_report_${Date.now()}.json`;

        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`\n📄 Detailed report saved to: ${reportPath}`);
    }
}

// Webhook Server Tests
async function testWebhookEndpoints() {
    console.log('\n🔌 Testing Webhook Endpoints');
    console.log('=' . repeat(50));

    const endpoints = [
        {
            name: 'Inventory Search',
            url: '/api/inventory/search',
            method: 'POST',
            data: { make: 'Honda', max_price: 30000 }
        },
        {
            name: 'Calculate Financing',
            url: '/api/finance/calculate',
            method: 'POST',
            data: { vehicle_price: 25000, loan_term_months: 60 }
        },
        {
            name: 'Trade-in Valuation',
            url: '/api/tradein/evaluate',
            method: 'POST',
            data: { make: 'Toyota', model: 'Camry', year: 2018, mileage: 45000, condition: 'good' }
        }
    ];

    for (const endpoint of endpoints) {
        try {
            console.log(`\nTesting: ${endpoint.name}`);

            const response = await axios({
                method: endpoint.method,
                url: `${WEBHOOK_SERVER_URL}${endpoint.url}`,
                data: endpoint.data,
                headers: {
                    'Authorization': `Bearer ${process.env.DEALER_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log(`✅ ${endpoint.name}: Status ${response.status}`);
            console.log(`   Response: ${JSON.stringify(response.data).substring(0, 100)}...`);

        } catch (error) {
            console.log(`❌ ${endpoint.name}: Failed - ${error.message}`);
        }
    }
}

// Main execution
async function main() {
    // Check environment variables
    if (!ELEVENLABS_API_KEY) {
        console.error('❌ ELEVENLABS_API_KEY not set');
        process.exit(1);
    }

    // Test webhook endpoints first
    await testWebhookEndpoints();

    // Run agent workflow tests
    const runner = new WorkflowTestRunner();
    await runner.runAllTests();
}

// Run tests if executed directly
if (require.main === module) {
    main().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = { AgentTester, WorkflowTestRunner, testWebhookEndpoints };