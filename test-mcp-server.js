const { spawn } = require('child_process');

console.log('🧪 Testing MCP Server connection...\n');

// Set environment variables
const env = {
  ...process.env,
  STRIPE_SECRET_KEY: 'sk_test_51RkUYkQ6s74Bq3bWSrntSg2zDY7oTIkEei66oIN7tizeqXPU1joGlJ9fIcbqRUtSkiOkIPeLhSwgedKb4vp7ibHA008b8JuWVJ',
  API_BASE_URL: 'http://localhost:3000/api',
  NODE_ENV: 'development'
};

// Start the MCP server
const mcpServer = spawn('node', ['C:\\Users\\micha\\mcp-server\\server.js'], {
  env,
  stdio: 'pipe'
});

let serverReady = false;

mcpServer.stdout.on('data', (data) => {
  const output = data.toString();
  console.log('📡 MCP Server:', output.trim());
  
  if (output.includes('MCP Server running')) {
    serverReady = true;
    console.log('✅ MCP Server is ready!\n');
    testMCPFunctions();
  }
});

mcpServer.stderr.on('data', (data) => {
  console.error('❌ MCP Error:', data.toString().trim());
});

mcpServer.on('close', (code) => {
  console.log(`🔄 MCP Server exited with code ${code}`);
});

function testMCPFunctions() {
  console.log('🔧 Testing MCP tools...\n');
  
  // Test 1: List tools
  console.log('1️⃣ Testing list_tools...');
  sendMCPMessage({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list'
  });
  
  setTimeout(() => {
    // Test 2: List products
    console.log('2️⃣ Testing list_products...');
    sendMCPMessage({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'list_products',
        arguments: {}
      }
    });
    
    setTimeout(() => {
      // Test 3: Create checkout session
      console.log('3️⃣ Testing create_checkout_session...');
      sendMCPMessage({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'create_checkout_session',
          arguments: {
            plan: 'personal',
            customer_email: 'test@example.com'
          }
        }
      });
      
      setTimeout(() => {
        console.log('\n✅ MCP Server test completed!');
        console.log('🎯 Ready to connect to Claude Desktop');
        mcpServer.kill();
      }, 2000);
    }, 2000);
  }, 2000);
}

function sendMCPMessage(message) {
  try {
    mcpServer.stdin.write(JSON.stringify(message) + '\n');
  } catch (error) {
    console.error('❌ Failed to send message:', error.message);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping test...');
  mcpServer.kill();
  process.exit(0);
});

setTimeout(() => {
  if (!serverReady) {
    console.log('⏰ Server startup timeout - please check if port 8080 is available');
    mcpServer.kill();
  }
}, 10000);