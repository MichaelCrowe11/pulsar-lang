#!/usr/bin/env node

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = process.env.DASHBOARD_PORT || 8080;
const DASHBOARD_FILE = path.join(__dirname, '../monitoring/dashboard.html');

const server = http.createServer((req, res) => {
    console.log(`Request: ${req.method} ${req.url}`);

    if (req.url === '/' || req.url === '/dashboard') {
        // Serve the dashboard HTML
        fs.readFile(DASHBOARD_FILE, (err, data) => {
            if (err) {
                res.writeHead(500);
                res.end('Error loading dashboard');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
        });
    } else if (req.url === '/api/status') {
        // Mock API endpoint for system status
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'operational',
            testMode: true,
            timestamp: new Date().toISOString(),
            stats: {
                tradesExecuted: 0,
                profitLoss: 0,
                winRate: 0,
                activePositions: 0
            }
        }));
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

server.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║           📊 TRADING DASHBOARD STARTED                     ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║   Dashboard URL: http://localhost:${PORT}                    ║
║                                                           ║
║   Features:                                               ║
║   • Real-time trading metrics                            ║
║   • Position monitoring                                  ║
║   • P&L tracking                                        ║
║   • Risk analytics                                      ║
║   • Circuit breaker status                              ║
║                                                           ║
║   Press Ctrl+C to stop the dashboard                    ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
    `);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n📊 Shutting down dashboard...');
    server.close(() => {
        console.log('Dashboard stopped');
        process.exit(0);
    });
});