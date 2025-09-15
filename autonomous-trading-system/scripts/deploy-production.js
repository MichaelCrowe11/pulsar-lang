#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class ProductionDeployer {
    constructor() {
        this.workflows = [
            {
                name: 'Market Scanner',
                file: 'market-scanner.js',
                trigger: 'timer',
                interval: 60,
                description: 'Scans markets every 60 seconds for opportunities'
            },
            {
                name: 'Signal Generator',
                file: 'signal-generator.js',
                trigger: 'http',
                description: 'Generates AI-powered trading signals'
            },
            {
                name: 'Risk Validator',
                file: 'risk-validator.js',
                trigger: 'http',
                description: 'Validates signals against risk parameters'
            },
            {
                name: 'Order Executor',
                file: 'order-executor.js',
                trigger: 'http',
                description: 'Executes validated orders across exchanges'
            },
            {
                name: 'Position Manager',
                file: 'position-manager.js',
                trigger: 'timer',
                interval: 300,
                description: 'Manages positions with trailing stops every 5 minutes'
            }
        ];

        this.requiredEnvVars = [
            'OPENAI_API_KEY',
            'COINBASE_API_KEY',
            'COINBASE_SECRET',
            'TEST_MODE',
            'INITIAL_CAPITAL',
            'MAX_DRAWDOWN',
            'MAX_POSITION_SIZE'
        ];
    }

    checkPrerequisites() {
        console.log('🔍 Checking prerequisites...\n');

        // Check if .env exists
        const envPath = path.join(__dirname, '../.env');
        if (!fs.existsSync(envPath)) {
            console.log('❌ .env file not found');
            console.log('📝 Copy .env.production to .env and configure your API keys\n');
            return false;
        }

        // Load environment variables
        const envContent = fs.readFileSync(envPath, 'utf8');
        const envVars = {};
        envContent.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && value) {
                envVars[key.trim()] = value.trim();
            }
        });

        // Check required variables
        const missing = this.requiredEnvVars.filter(varName => !envVars[varName] || envVars[varName] === 'your-key-here');

        if (missing.length > 0) {
            console.log('❌ Missing required environment variables:');
            missing.forEach(varName => console.log(`   - ${varName}`));
            console.log('\n📝 Please configure these in your .env file\n');
            return false;
        }

        console.log('✅ All prerequisites met\n');
        return true;
    }

    generateDeploymentInstructions() {
        console.log('🚀 PIPEDREAM DEPLOYMENT INSTRUCTIONS\n');
        console.log('Follow these steps to deploy your autonomous trading system:\n');

        console.log('📋 STEP 1: Pipedream Setup');
        console.log('1. Go to https://pipedream.com and create an account');
        console.log('2. Verify your email and choose a plan');
        console.log('3. Go to Settings → Environment Variables\n');

        console.log('🔑 STEP 2: Environment Variables');
        console.log('Add these environment variables in Pipedream:\n');

        // Read and display environment variables
        const envPath = path.join(__dirname, '../.env');
        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf8');
            envContent.split('\n').forEach(line => {
                if (line.trim() && !line.startsWith('#')) {
                    const [key, value] = line.split('=');
                    if (key && value) {
                        console.log(`${key.trim()}=${value.includes('your-') ? 'YOUR_VALUE_HERE' : value.trim()}`);
                    }
                }
            });
        }

        console.log('\n⚙️ STEP 3: Deploy Workflows');
        console.log('Deploy these workflows in order:\n');

        this.workflows.forEach((workflow, index) => {
            console.log(`${index + 1}. ${workflow.name}`);
            console.log(`   File: pipedream/${workflow.file}`);
            console.log(`   Trigger: ${workflow.trigger}${workflow.interval ? ` (${workflow.interval}s)` : ''}`);
            console.log(`   Description: ${workflow.description}`);
            console.log('');
        });

        console.log('🔗 STEP 4: Connect Workflows');
        console.log('Connect the HTTP-triggered workflows:');
        console.log('Market Scanner → Signal Generator → Risk Validator → Order Executor\n');

        console.log('📊 STEP 5: Monitor');
        console.log('1. Open monitoring/dashboard.html for real-time monitoring');
        console.log('2. Check Pipedream logs for workflow execution');
        console.log('3. Monitor your exchange accounts for actual trades\n');

        console.log('🛡️ SAFETY REMINDERS:');
        console.log('- Start with TEST_MODE=true for 24 hours');
        console.log('- Use small initial capital ($100-1000)');
        console.log('- Monitor closely for the first week');
        console.log('- Have emergency stop procedures ready\n');
    }

    generateWorkflowCode(workflowName) {
        const workflow = this.workflows.find(w => w.name === workflowName);
        if (!workflow) {
            console.log(`❌ Workflow '${workflowName}' not found`);
            return;
        }

        const filePath = path.join(__dirname, '../pipedream', workflow.file);
        if (!fs.existsSync(filePath)) {
            console.log(`❌ Workflow file not found: ${workflow.file}`);
            return;
        }

        console.log(`\n📝 ${workflow.name} Workflow Code:\n`);
        console.log('Copy this code into Pipedream:');
        console.log('=' .repeat(50));

        const code = fs.readFileSync(filePath, 'utf8');
        console.log(code);

        console.log('=' .repeat(50));
        console.log(`\n⚙️ Configuration:`);
        console.log(`Trigger: ${workflow.trigger}`);
        if (workflow.interval) {
            console.log(`Interval: ${workflow.interval} seconds`);
        }
        console.log(`Description: ${workflow.description}\n`);
    }

    runPreFlightChecks() {
        console.log('🔍 PRE-FLIGHT SAFETY CHECKS\n');

        const checks = [
            {
                name: 'Environment Configuration',
                check: () => this.checkPrerequisites(),
                critical: true
            },
            {
                name: 'Test Mode Configuration',
                check: () => {
                    const envPath = path.join(__dirname, '../.env');
                    if (fs.existsSync(envPath)) {
                        const content = fs.readFileSync(envPath, 'utf8');
                        return content.includes('TEST_MODE=true');
                    }
                    return false;
                },
                critical: false,
                message: 'Recommended for first deployment'
            },
            {
                name: 'Conservative Risk Settings',
                check: () => {
                    const envPath = path.join(__dirname, '../.env');
                    if (fs.existsSync(envPath)) {
                        const content = fs.readFileSync(envPath, 'utf8');
                        return content.includes('MAX_POSITION_SIZE=0.1') || content.includes('MAX_POSITION_SIZE=0.05');
                    }
                    return false;
                },
                critical: false,
                message: 'Start with 5-10% max position size'
            },
            {
                name: 'Small Initial Capital',
                check: () => {
                    const envPath = path.join(__dirname, '../.env');
                    if (fs.existsSync(envPath)) {
                        const content = fs.readFileSync(envPath, 'utf8');
                        const match = content.match(/INITIAL_CAPITAL=(\d+)/);
                        if (match) {
                            return parseInt(match[1]) <= 1000;
                        }
                    }
                    return false;
                },
                critical: false,
                message: 'Start with $100-1000 for safety'
            }
        ];

        let allPassed = true;
        checks.forEach(check => {
            const result = check.check();
            const status = result ? '✅' : (check.critical ? '❌' : '⚠️');
            console.log(`${status} ${check.name}`);

            if (!result && check.message) {
                console.log(`   ${check.message}`);
            }

            if (!result && check.critical) {
                allPassed = false;
            }
        });

        console.log(`\n${allPassed ? '🟢' : '🔴'} Pre-flight checks ${allPassed ? 'PASSED' : 'FAILED'}\n`);
        return allPassed;
    }

    deploy() {
        console.log('🤖 AUTONOMOUS TRADING SYSTEM DEPLOYMENT\n');
        console.log('Version: 1.0.0');
        console.log('Target: Pipedream Production');
        console.log('Mode: Live Trading\n');

        if (!this.runPreFlightChecks()) {
            console.log('❌ Deployment aborted due to failed checks');
            console.log('📝 Please fix the issues above and try again\n');
            return;
        }

        this.generateDeploymentInstructions();

        console.log('🎯 QUICK START:');
        console.log('1. Run: node scripts/deploy-production.js --workflow "Market Scanner"');
        console.log('2. Copy code to Pipedream and deploy');
        console.log('3. Repeat for all 5 workflows');
        console.log('4. Connect workflows with webhooks');
        console.log('5. Start monitoring!\n');

        console.log('💰 Ready to start making money! 🚀');
    }
}

// CLI interface
const args = process.argv.slice(2);
const deployer = new ProductionDeployer();

if (args.includes('--help') || args.includes('-h')) {
    console.log('🤖 Autonomous Trading System Deployment Tool\n');
    console.log('Usage:');
    console.log('  node deploy-production.js                    # Full deployment guide');
    console.log('  node deploy-production.js --workflow "name"  # Get specific workflow code');
    console.log('  node deploy-production.js --check            # Run pre-flight checks only');
    console.log('  node deploy-production.js --help             # Show this help\n');
    console.log('Available workflows:');
    deployer.workflows.forEach(w => console.log(`  - "${w.name}"`));
    console.log('');
} else if (args.includes('--check')) {
    deployer.runPreFlightChecks();
} else if (args.includes('--workflow')) {
    const workflowIndex = args.indexOf('--workflow');
    const workflowName = args[workflowIndex + 1];
    if (workflowName) {
        deployer.generateWorkflowCode(workflowName);
    } else {
        console.log('❌ Please specify a workflow name');
        console.log('Available workflows:');
        deployer.workflows.forEach(w => console.log(`  - "${w.name}"`));
    }
} else {
    deployer.deploy();
}