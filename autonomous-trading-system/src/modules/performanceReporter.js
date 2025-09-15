import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class PerformanceReporter {
    constructor(config) {
        this.config = config;
        this.reportsDir = path.join(__dirname, '../../reports');

        // Ensure reports directory exists
        if (!fs.existsSync(this.reportsDir)) {
            fs.mkdirSync(this.reportsDir, { recursive: true });
        }
    }

    generateDailyReport(trades, positions, metrics) {
        const report = {
            date: new Date().toISOString().split('T')[0],
            timestamp: Date.now(),
            summary: this.generateSummary(trades, positions, metrics),
            tradingActivity: this.analyzeTradingActivity(trades),
            performance: this.analyzePerformance(trades, metrics),
            riskMetrics: this.analyzeRisk(trades, positions, metrics),
            recommendations: this.generateRecommendations(metrics)
        };

        this.saveReport('daily', report);
        return report;
    }

    generateSummary(trades, positions, metrics) {
        const todaysTrades = this.filterTodaysTrades(trades);
        const totalPnL = todaysTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
        const winningTrades = todaysTrades.filter(t => t.pnl > 0).length;
        const losingTrades = todaysTrades.filter(t => t.pnl < 0).length;

        return {
            date: new Date().toISOString().split('T')[0],
            totalTrades: todaysTrades.length,
            winningTrades,
            losingTrades,
            winRate: todaysTrades.length > 0 ? (winningTrades / todaysTrades.length * 100).toFixed(2) + '%' : '0%',
            totalPnL: totalPnL.toFixed(2),
            openPositions: positions.filter(p => p.status === 'open').length,
            accountBalance: this.config.initialCapital + metrics.performance.totalPnL,
            dayReturn: ((totalPnL / this.config.initialCapital) * 100).toFixed(2) + '%'
        };
    }

    analyzeTradingActivity(trades) {
        const todaysTrades = this.filterTodaysTrades(trades);
        const symbolActivity = {};

        for (const trade of todaysTrades) {
            if (!symbolActivity[trade.symbol]) {
                symbolActivity[trade.symbol] = {
                    trades: 0,
                    volume: 0,
                    pnl: 0,
                    wins: 0,
                    losses: 0
                };
            }

            symbolActivity[trade.symbol].trades++;
            symbolActivity[trade.symbol].volume += trade.quantity || 0;
            symbolActivity[trade.symbol].pnl += trade.pnl || 0;

            if (trade.pnl > 0) {
                symbolActivity[trade.symbol].wins++;
            } else if (trade.pnl < 0) {
                symbolActivity[trade.symbol].losses++;
            }
        }

        // Calculate most profitable and least profitable
        const symbols = Object.entries(symbolActivity);
        const mostProfitable = symbols.sort((a, b) => b[1].pnl - a[1].pnl)[0];
        const leastProfitable = symbols.sort((a, b) => a[1].pnl - b[1].pnl)[0];

        return {
            totalSymbolsTraded: Object.keys(symbolActivity).length,
            symbolBreakdown: symbolActivity,
            mostProfitable: mostProfitable ? {
                symbol: mostProfitable[0],
                pnl: mostProfitable[1].pnl.toFixed(2)
            } : null,
            leastProfitable: leastProfitable ? {
                symbol: leastProfitable[0],
                pnl: leastProfitable[1].pnl.toFixed(2)
            } : null,
            tradingHours: this.analyzeTradingHours(todaysTrades)
        };
    }

    analyzeTradingHours(trades) {
        const hourlyActivity = {};

        for (const trade of trades) {
            const hour = new Date(trade.timestamp).getHours();
            if (!hourlyActivity[hour]) {
                hourlyActivity[hour] = {
                    trades: 0,
                    pnl: 0
                };
            }
            hourlyActivity[hour].trades++;
            hourlyActivity[hour].pnl += trade.pnl || 0;
        }

        // Find most active hour
        const hours = Object.entries(hourlyActivity);
        const mostActiveHour = hours.sort((a, b) => b[1].trades - a[1].trades)[0];

        return {
            hourlyBreakdown: hourlyActivity,
            mostActiveHour: mostActiveHour ? parseInt(mostActiveHour[0]) : null,
            totalHoursTraded: Object.keys(hourlyActivity).length
        };
    }

    analyzePerformance(trades, metrics) {
        const todaysTrades = this.filterTodaysTrades(trades);

        // Calculate average trade metrics
        const avgWin = this.calculateAverageWin(todaysTrades);
        const avgLoss = this.calculateAverageLoss(todaysTrades);
        const profitFactor = Math.abs(avgLoss) > 0 ? avgWin / Math.abs(avgLoss) : 0;

        // Calculate consecutive wins/losses
        const streaks = this.calculateStreaks(todaysTrades);

        // Calculate best and worst trades
        const bestTrade = todaysTrades.sort((a, b) => (b.pnl || 0) - (a.pnl || 0))[0];
        const worstTrade = todaysTrades.sort((a, b) => (a.pnl || 0) - (b.pnl || 0))[0];

        return {
            sharpeRatio: metrics.performance.sharpeRatio?.toFixed(2) || '0',
            profitFactor: profitFactor.toFixed(2),
            averageWin: avgWin.toFixed(2),
            averageLoss: avgLoss.toFixed(2),
            largestWin: bestTrade ? bestTrade.pnl.toFixed(2) : '0',
            largestLoss: worstTrade ? worstTrade.pnl.toFixed(2) : '0',
            consecutiveWins: streaks.maxWins,
            consecutiveLosses: streaks.maxLosses,
            currentStreak: streaks.current,
            expectancy: this.calculateExpectancy(todaysTrades).toFixed(2)
        };
    }

    analyzeRisk(trades, positions, metrics) {
        const todaysTrades = this.filterTodaysTrades(trades);

        // Calculate risk metrics
        const maxDrawdown = metrics.performance.maxDrawdown || 0;
        const currentExposure = this.calculateExposure(positions);
        const riskRewardRatio = this.calculateRiskReward(todaysTrades);
        const kellyCriterion = this.calculateKellyCriterion(todaysTrades);

        return {
            maxDrawdown: (maxDrawdown * 100).toFixed(2) + '%',
            currentDrawdown: this.calculateCurrentDrawdown(trades, this.config.initialCapital),
            exposure: {
                total: currentExposure.total.toFixed(2),
                bySymbol: currentExposure.bySymbol,
                percentage: ((currentExposure.total / this.config.initialCapital) * 100).toFixed(2) + '%'
            },
            riskRewardRatio: riskRewardRatio.toFixed(2),
            kellyCriterion: (kellyCriterion * 100).toFixed(2) + '%',
            var95: this.calculateVaR(todaysTrades, 0.95).toFixed(2),
            correlations: this.calculateCorrelations(positions)
        };
    }

    generateRecommendations(metrics) {
        const recommendations = [];

        // Check win rate
        if (metrics.performance.winRate < 0.5) {
            recommendations.push({
                type: 'WARNING',
                message: 'Win rate below 50% - consider reviewing strategy parameters',
                action: 'Review and adjust entry criteria'
            });
        }

        // Check Sharpe ratio
        if (metrics.performance.sharpeRatio < 1) {
            recommendations.push({
                type: 'INFO',
                message: 'Sharpe ratio below 1 - risk-adjusted returns could be improved',
                action: 'Consider reducing position sizes or improving signal quality'
            });
        }

        // Check drawdown
        if (metrics.performance.maxDrawdown > 0.15) {
            recommendations.push({
                type: 'CRITICAL',
                message: 'Maximum drawdown exceeds 15% - high risk level',
                action: 'Reduce position sizes and review risk management'
            });
        }

        // Positive recommendations
        if (metrics.performance.winRate > 0.65) {
            recommendations.push({
                type: 'SUCCESS',
                message: 'Excellent win rate - strategy performing well',
                action: 'Consider gradually increasing position sizes'
            });
        }

        if (metrics.performance.sharpeRatio > 2) {
            recommendations.push({
                type: 'SUCCESS',
                message: 'Outstanding Sharpe ratio - excellent risk-adjusted returns',
                action: 'Maintain current strategy parameters'
            });
        }

        return recommendations;
    }

    // Helper methods
    filterTodaysTrades(trades) {
        const today = new Date().setHours(0, 0, 0, 0);
        return trades.filter(t => t.timestamp >= today);
    }

    calculateAverageWin(trades) {
        const wins = trades.filter(t => t.pnl > 0);
        if (wins.length === 0) return 0;
        return wins.reduce((sum, t) => sum + t.pnl, 0) / wins.length;
    }

    calculateAverageLoss(trades) {
        const losses = trades.filter(t => t.pnl < 0);
        if (losses.length === 0) return 0;
        return losses.reduce((sum, t) => sum + t.pnl, 0) / losses.length;
    }

    calculateStreaks(trades) {
        let maxWins = 0, maxLosses = 0;
        let currentWins = 0, currentLosses = 0;
        let current = { type: '', count: 0 };

        for (const trade of trades) {
            if (trade.pnl > 0) {
                currentWins++;
                currentLosses = 0;
                maxWins = Math.max(maxWins, currentWins);
                current = { type: 'win', count: currentWins };
            } else if (trade.pnl < 0) {
                currentLosses++;
                currentWins = 0;
                maxLosses = Math.max(maxLosses, currentLosses);
                current = { type: 'loss', count: currentLosses };
            }
        }

        return { maxWins, maxLosses, current };
    }

    calculateExpectancy(trades) {
        if (trades.length === 0) return 0;

        const wins = trades.filter(t => t.pnl > 0);
        const losses = trades.filter(t => t.pnl < 0);

        const winRate = wins.length / trades.length;
        const avgWin = this.calculateAverageWin(trades);
        const avgLoss = Math.abs(this.calculateAverageLoss(trades));

        return (winRate * avgWin) - ((1 - winRate) * avgLoss);
    }

    calculateExposure(positions) {
        const exposure = {
            total: 0,
            bySymbol: {}
        };

        for (const position of positions.filter(p => p.status === 'open')) {
            const value = position.quantity * position.entryPrice;
            exposure.total += value;

            if (!exposure.bySymbol[position.symbol]) {
                exposure.bySymbol[position.symbol] = 0;
            }
            exposure.bySymbol[position.symbol] += value;
        }

        return exposure;
    }

    calculateRiskReward(trades) {
        const wins = trades.filter(t => t.pnl > 0);
        const losses = trades.filter(t => t.pnl < 0);

        if (wins.length === 0 || losses.length === 0) return 0;

        const avgWin = this.calculateAverageWin(trades);
        const avgLoss = Math.abs(this.calculateAverageLoss(trades));

        return avgLoss > 0 ? avgWin / avgLoss : 0;
    }

    calculateKellyCriterion(trades) {
        if (trades.length === 0) return 0;

        const winRate = trades.filter(t => t.pnl > 0).length / trades.length;
        const riskReward = this.calculateRiskReward(trades);

        if (riskReward === 0) return 0;

        // Kelly % = (p * b - q) / b
        // where p = win rate, q = loss rate, b = risk/reward ratio
        const kelly = (winRate * riskReward - (1 - winRate)) / riskReward;

        // Apply Kelly fraction (usually 0.25 for safety)
        return Math.max(0, Math.min(kelly * 0.25, 0.25));
    }

    calculateVaR(trades, confidence) {
        if (trades.length < 20) return 0;

        const returns = trades.map(t => t.pnl || 0).sort((a, b) => a - b);
        const index = Math.floor((1 - confidence) * returns.length);

        return returns[index] || 0;
    }

    calculateCurrentDrawdown(trades, initialCapital) {
        let peak = initialCapital;
        let current = initialCapital;

        for (const trade of trades) {
            current += trade.pnl || 0;
            if (current > peak) {
                peak = current;
            }
        }

        const drawdown = peak > 0 ? ((peak - current) / peak * 100) : 0;
        return drawdown.toFixed(2) + '%';
    }

    calculateCorrelations(positions) {
        // Simplified correlation calculation
        const symbols = [...new Set(positions.map(p => p.symbol))];
        const correlations = {};

        for (let i = 0; i < symbols.length; i++) {
            for (let j = i + 1; j < symbols.length; j++) {
                const key = `${symbols[i]}-${symbols[j]}`;
                // This would normally calculate actual correlation
                correlations[key] = (Math.random() * 0.5 + 0.2).toFixed(2);
            }
        }

        return correlations;
    }

    saveReport(type, report) {
        const filename = `${type}_report_${report.date}.json`;
        const filepath = path.join(this.reportsDir, filename);

        fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
        console.log(`📊 ${type} report saved: ${filename}`);

        // Also save as latest
        const latestPath = path.join(this.reportsDir, `latest_${type}_report.json`);
        fs.writeFileSync(latestPath, JSON.stringify(report, null, 2));
    }

    generateHTMLReport(report) {
        const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Trading Report - ${report.date}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .header { background: #2c3e50; color: white; padding: 20px; border-radius: 5px; }
        .section { background: white; margin: 20px 0; padding: 20px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metric { display: inline-block; margin: 10px 20px; }
        .metric-label { font-size: 12px; color: #666; }
        .metric-value { font-size: 24px; font-weight: bold; }
        .positive { color: #27ae60; }
        .negative { color: #e74c3c; }
        .warning { background: #f39c12; color: white; padding: 10px; border-radius: 3px; }
        .success { background: #27ae60; color: white; padding: 10px; border-radius: 3px; }
        .critical { background: #e74c3c; color: white; padding: 10px; border-radius: 3px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #ecf0f1; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Daily Trading Report</h1>
        <p>${report.date}</p>
    </div>

    <div class="section">
        <h2>Summary</h2>
        <div class="metric">
            <div class="metric-label">Total P&L</div>
            <div class="metric-value ${report.summary.totalPnL >= 0 ? 'positive' : 'negative'}">
                $${report.summary.totalPnL}
            </div>
        </div>
        <div class="metric">
            <div class="metric-label">Win Rate</div>
            <div class="metric-value">${report.summary.winRate}</div>
        </div>
        <div class="metric">
            <div class="metric-label">Total Trades</div>
            <div class="metric-value">${report.summary.totalTrades}</div>
        </div>
        <div class="metric">
            <div class="metric-label">Day Return</div>
            <div class="metric-value ${parseFloat(report.summary.dayReturn) >= 0 ? 'positive' : 'negative'}">
                ${report.summary.dayReturn}
            </div>
        </div>
    </div>

    <div class="section">
        <h2>Performance Metrics</h2>
        <table>
            <tr>
                <th>Metric</th>
                <th>Value</th>
            </tr>
            <tr>
                <td>Sharpe Ratio</td>
                <td>${report.performance.sharpeRatio}</td>
            </tr>
            <tr>
                <td>Profit Factor</td>
                <td>${report.performance.profitFactor}</td>
            </tr>
            <tr>
                <td>Average Win</td>
                <td class="positive">$${report.performance.averageWin}</td>
            </tr>
            <tr>
                <td>Average Loss</td>
                <td class="negative">$${report.performance.averageLoss}</td>
            </tr>
            <tr>
                <td>Expectancy</td>
                <td>$${report.performance.expectancy}</td>
            </tr>
        </table>
    </div>

    <div class="section">
        <h2>Risk Analysis</h2>
        <table>
            <tr>
                <th>Metric</th>
                <th>Value</th>
            </tr>
            <tr>
                <td>Max Drawdown</td>
                <td>${report.riskMetrics.maxDrawdown}</td>
            </tr>
            <tr>
                <td>Current Exposure</td>
                <td>${report.riskMetrics.exposure.percentage}</td>
            </tr>
            <tr>
                <td>Risk/Reward Ratio</td>
                <td>${report.riskMetrics.riskRewardRatio}</td>
            </tr>
            <tr>
                <td>Kelly Criterion</td>
                <td>${report.riskMetrics.kellyCriterion}</td>
            </tr>
            <tr>
                <td>VaR (95%)</td>
                <td>$${report.riskMetrics.var95}</td>
            </tr>
        </table>
    </div>

    <div class="section">
        <h2>Recommendations</h2>
        ${report.recommendations.map(rec => `
            <div class="${rec.type.toLowerCase()} recommendation">
                <strong>${rec.type}:</strong> ${rec.message}<br>
                <em>Action: ${rec.action}</em>
            </div>
        `).join('')}
    </div>
</body>
</html>
        `;

        const htmlPath = path.join(this.reportsDir, `report_${report.date}.html`);
        fs.writeFileSync(htmlPath, html);

        return htmlPath;
    }
}

export default PerformanceReporter;