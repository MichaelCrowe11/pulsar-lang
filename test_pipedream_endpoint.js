// Test script for your Pipedream endpoint with Bearer authentication
// Run this to verify your endpoint is working correctly

// Use built-in fetch for Node.js 18+
const fetch = globalThis.fetch || (() => {
    try {
        return require('node-fetch');
    } catch (e) {
        console.log('⚠️ Using native fetch (Node.js 18+)');
        return globalThis.fetch;
    }
})();

const PIPEDREAM_URL = 'https://eopp6bs30sepig.m.pipedream.net';
const BEARER_TOKEN = 'SClWOVEDqjjVQwiXmOJOx8VgcMmMWwdN5RgoXLcxD9w';

// Test function
async function testPipedreamEndpoint() {
    console.log('🧪 Testing Pipedream Endpoint');
    console.log('===============================');
    console.log(`Endpoint: ${PIPEDREAM_URL}`);
    console.log(`Auth: Bearer Token (${BEARER_TOKEN.substring(0, 10)}...)`);
    console.log('');

    // Test 1: Basic connectivity test
    console.log('Test 1: Basic Connectivity');
    console.log('----------------------------');

    try {
        const response = await fetch(PIPEDREAM_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${BEARER_TOKEN}`
            },
            body: JSON.stringify({
                test: true,
                timestamp: new Date().toISOString()
            })
        });

        console.log(`✅ Status: ${response.status} ${response.statusText}`);
        console.log(`✅ Headers: ${JSON.stringify(Object.fromEntries(response.headers), null, 2)}`);

        const result = await response.text();
        console.log(`✅ Response: ${result}`);

    } catch (error) {
        console.log(`❌ Connection Error: ${error.message}`);
    }

    console.log('');

    // Test 2: Mock trade execution
    console.log('Test 2: Mock Trade Execution');
    console.log('-----------------------------');

    try {
        const tradeData = {
            symbol: 'BTC-USD',
            side: 'BUY',
            quantity: 0.001,
            price: 50000,
            urgency: 'normal',
            mode: 'mock',
            timestamp: Date.now()
        };

        console.log('Sending trade data:', JSON.stringify(tradeData, null, 2));

        const response = await fetch(PIPEDREAM_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${BEARER_TOKEN}`
            },
            body: JSON.stringify(tradeData)
        });

        console.log(`✅ Trade Status: ${response.status} ${response.statusText}`);

        const result = await response.text();
        console.log(`✅ Trade Response: ${result}`);

    } catch (error) {
        console.log(`❌ Trade Error: ${error.message}`);
    }

    console.log('');

    // Test 3: Different trading pairs
    console.log('Test 3: Multiple Trading Pairs');
    console.log('-------------------------------');

    const testPairs = [
        { symbol: 'ETH-USD', price: 3500 },
        { symbol: 'SOL-USD', price: 150 },
        { symbol: 'DOGE-USD', price: 0.15 }
    ];

    for (const pair of testPairs) {
        try {
            const tradeData = {
                symbol: pair.symbol,
                side: 'BUY',
                quantity: 0.01,
                price: pair.price,
                mode: 'mock'
            };

            const response = await fetch(PIPEDREAM_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${BEARER_TOKEN}`
                },
                body: JSON.stringify(tradeData)
            });

            const result = await response.text();
            console.log(`✅ ${pair.symbol}: ${response.status} - ${result.substring(0, 100)}...`);

        } catch (error) {
            console.log(`❌ ${pair.symbol}: ${error.message}`);
        }
    }

    console.log('');

    // Test 4: Error handling
    console.log('Test 4: Error Handling');
    console.log('----------------------');

    try {
        // Send invalid data to test error handling
        const response = await fetch(PIPEDREAM_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${BEARER_TOKEN}`
            },
            body: JSON.stringify({
                symbol: 'INVALID-PAIR',
                side: 'INVALID_SIDE',
                quantity: -1,
                price: 'not_a_number'
            })
        });

        const result = await response.text();
        console.log(`✅ Error Test: ${response.status} - ${result}`);

    } catch (error) {
        console.log(`✅ Error handled correctly: ${error.message}`);
    }

    console.log('');

    // Test 5: Performance test
    console.log('Test 5: Performance Test');
    console.log('------------------------');

    const startTime = Date.now();
    const promises = [];

    for (let i = 0; i < 5; i++) {
        promises.push(
            fetch(PIPEDREAM_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${BEARER_TOKEN}`
                },
                body: JSON.stringify({
                    symbol: 'BTC-USD',
                    side: 'BUY',
                    quantity: 0.001,
                    price: 50000 + i,
                    test_id: i
                })
            })
        );
    }

    try {
        const responses = await Promise.all(promises);
        const endTime = Date.now();
        const duration = endTime - startTime;

        console.log(`✅ Sent 5 concurrent requests in ${duration}ms`);
        console.log(`✅ Average response time: ${duration / 5}ms`);

        for (let i = 0; i < responses.length; i++) {
            console.log(`   Request ${i + 1}: ${responses[i].status}`);
        }

    } catch (error) {
        console.log(`❌ Performance test failed: ${error.message}`);
    }

    console.log('');
    console.log('🎉 Testing Complete!');
    console.log('====================');
    console.log('Next Steps:');
    console.log('1. If tests passed, your endpoint is working correctly');
    console.log('2. Open trading_ui.html to use the web interface');
    console.log('3. Start with mock trades to test the system');
    console.log('4. Monitor the Pipedream workflow logs');
    console.log('5. When ready, switch to live trading mode');
}

// Run the test
if (require.main === module) {
    testPipedreamEndpoint().catch(console.error);
}

module.exports = { testPipedreamEndpoint };