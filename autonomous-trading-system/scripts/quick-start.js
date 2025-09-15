#!/usr/bin/env node

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class QuickStart {
    constructor() {
        this.steps = [
            {
                name: 'Environment Setup',
                action: () => this.checkEnvironment(),
                required: true
            },
            {
                name: 'Dependencies Installation',
                action: () => this.checkDependencies(),
                required: true
            },
            {
                name: 'System Tests',
                action: () => this.runTests(),
                required: true
            },
            {
                name: 'Configuration Validation',
                action: () => this.validateConfig(),
                required: false
            },
            {
                name: 'Production Readiness',
                action: () => this.checkProduction(),
                required: false
            }
        ];
    }

    async checkEnvironment() {
        console.log('🔍 Checking environment setup...');

        const envExample = path.join(__dirname, '../.env.example');
        const envFile = path.join(__dirname, '../.env');

        if (!fs.existsSync(envFile)) {
            console.log('📝 Creating .env file from template...');
            fs.copyFileSync(envExample, envFile);
            console.log('⚠️  Please edit .env file with your API keys');
            return false;
        }

        console.log('✅ Environment file exists');
        return true;
    }

    async checkDependencies() {
        console.log('📦 Checking dependencies...');

        const packageJson = path.join(__dirname, '../package.json');
        const nodeModules = path.join(__dirname, '../node_modules');

        if (!fs.existsSync(nodeModules)) {
            console.log('📥 Installing dependencies...');
            return new Promise((resolve) => {
                const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
                const npm = spawn(npmCmd, ['install'], {
                    cwd: path.join(__dirname, '..'),
                    stdio: 'inherit',
                    shell: true
                });

                npm.on('close', (code) => {
                    if (code === 0) {
                        console.log('✅ Dependencies installed');
                        resolve(true);
                    } else {
                        console.log('❌ Failed to install dependencies');
                        resolve(false);
                    }
                });

                npm.on('error', (err) => {
                    console.log('⚠️ Could not install dependencies:', err.message);
                    resolve(false);
                });
            });
        }

        console.log('✅ Dependencies already installed');
        return true;
    }

    async runTests() {
        console.log('🧪 Running system tests...');

        return new Promise((resolve) => {
            const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
            const test = spawn(npmCmd, ['test'], {
                cwd: path.join(__dirname, '..'),
                stdio: 'inherit',
                shell: true
            });

            test.on('close', (code) => {
                if (code === 0) {
                    console.log('✅ All tests passed');
                    resolve(true);
                } else {
                    console.log('❌ Some tests failed');
                    resolve(false);
                }
            });

            test.on('error', (err) => {
                console.log('⚠️ Could not run tests:', err.message);
                resolve(false);
            });
        });
    }

    async validateConfig() {
        console.log('⚙️ Validating configuration...');

        const envFile = path.join(__dirname, '../.env');
        if (!fs.existsSync(envFile)) {
            console.log('⚠️ .env file not found');
            return false;
        }

        const content = fs.readFileSync(envFile, 'utf8');
        const requiredKeys = [
            'OPENAI_API_KEY',
            'TEST_MODE',
            'INITIAL_CAPITAL',
            'MAX_DRAWDOWN'
        ];

        const missing = requiredKeys.filter(key =>
            !content.includes(`${key}=`) || content.includes(`${key}=your-`)
        );

        if (missing.length > 0) {
            console.log('⚠️ Missing configuration:');
            missing.forEach(key => console.log(`   - ${key}`));
            return false;
        }

        console.log('✅ Configuration looks good');
        return true;
    }

    async checkProduction() {
        console.log('🚀 Checking production readiness...');

        return new Promise((resolve) => {
            const check = spawn('node', ['scripts/deploy-production.js', '--check'], {
                cwd: path.join(__dirname, '..'),
                stdio: 'inherit'
            });

            check.on('close', (code) => {
                if (code === 0) {
                    console.log('✅ Production ready');
                    resolve(true);
                } else {
                    console.log('⚠️ Some production checks failed');
                    resolve(false);
                }
            });
        });
    }

    async run() {
        console.log('🤖 AUTONOMOUS TRADING SYSTEM - QUICK START\n');
        console.log('This will prepare your system for trading...\n');

        let allRequired = true;

        for (const step of this.steps) {
            console.log(`\n📋 ${step.name}`);
            console.log('─'.repeat(50));

            const success = await step.action();

            if (!success && step.required) {
                allRequired = false;
                console.log(`❌ Required step failed: ${step.name}`);
            }
        }

        console.log('\n' + '═'.repeat(60));

        if (allRequired) {
            console.log('🎉 SYSTEM READY FOR TRADING!');
            console.log('\n🚀 Next Steps:');
            console.log('1. Review your .env configuration');
            console.log('2. Start with TEST_MODE=true');
            console.log('3. Deploy to Pipedream:');
            console.log('   node scripts/deploy-production.js');
            console.log('4. Monitor your first trades');
            console.log('\n💰 Ready to make money? Deploy now!');
        } else {
            console.log('❌ SYSTEM NOT READY');
            console.log('\n🔧 Please fix the issues above and run again:');
            console.log('   node scripts/quick-start.js');
        }

        console.log('\n📚 Documentation:');
        console.log('   - README.md - System overview');
        console.log('   - PRODUCTION_READY.md - Deployment guide');
        console.log('   - LIVE_DEPLOYMENT.md - Pipedream setup');
    }
}

const quickStart = new QuickStart();
quickStart.run().catch(console.error);