export class PerformanceAnalyzer {
    constructor(config) {
        this.config = config;
        this.performanceHistory = [];
        this.strategyPerformance = {};
        this.riskFreeRate = config.riskFreeRate || 0.02;
        this.targetSharpe = config.targetSharpe || 2.0;
        this.optimizationPeriod = 1000; // Trades before reoptimization
    }

    async analyze(portfolioData) {
        const metrics = await this.calculateMetrics(portfolioData);
        this.performanceHistory.push({
            timestamp: Date.now(),
            ...metrics
        });

        // Analyze strategy performance
        await this.analyzeStrategyPerformance(portfolioData);

        // Check if optimization is needed
        const shouldOptimize = this.shouldOptimize(metrics);

        return {
            ...metrics,
            shouldOptimize,
            strategyPerformance: this.strategyPerformance
        };
    }

    async calculateMetrics(portfolioData) {
        const returns = this.calculateReturns(portfolioData);

        return {
            totalReturn: this.calculateTotalReturn(portfolioData),
            sharpeRatio: this.calculateSharpeRatio(returns),
            sortinoRatio: this.calculateSortinoRatio(returns),
            calmarRatio: this.calculateCalmarRatio(returns, portfolioData),
            maxDrawdown: this.calculateMaxDrawdown(portfolioData),
            volatility: this.calculateVolatility(returns),
            winRate: this.calculateWinRate(portfolioData),
            profitFactor: this.calculateProfitFactor(portfolioData),
            avgWin: this.calculateAvgWin(portfolioData),
            avgLoss: this.calculateAvgLoss(portfolioData),
            exposureTime: this.calculateExposureTime(portfolioData),
            var95: this.calculateVaR(returns, 0.95),
            cvar95: this.calculateCVaR(returns, 0.95),
            informationRatio: this.calculateInformationRatio(returns),
            trades: portfolioData.trades || 0,
            pnl: portfolioData.pnl || 0
        };
    }

    calculateReturns(portfolioData) {
        if (this.performanceHistory.length < 2) {
            return [0];
        }

        const returns = [];
        for (let i = 1; i < this.performanceHistory.length; i++) {
            const prevEquity = this.performanceHistory[i - 1].equity || this.config.initialCapital;
            const currentEquity = portfolioData.equity || this.config.initialCapital;
            const returnRate = (currentEquity - prevEquity) / prevEquity;
            returns.push(returnRate);
        }

        return returns;
    }

    calculateTotalReturn(portfolioData) {
        const currentEquity = portfolioData.equity || this.config.initialCapital;
        const initialCapital = this.config.initialCapital || 10000;
        return (currentEquity - initialCapital) / initialCapital;
    }

    calculateSharpeRatio(returns) {
        if (returns.length < 30) return 0;

        const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
        const excessReturns = returns.map(r => r - this.riskFreeRate / 365);
        const stdDev = this.calculateStdDev(excessReturns);

        return stdDev > 0 ? (avgReturn - this.riskFreeRate / 365) / stdDev * Math.sqrt(365) : 0;
    }

    calculateSortinoRatio(returns) {
        if (returns.length < 30) return 0;

        const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
        const negativeReturns = returns.filter(r => r < 0);
        const downstdDev = negativeReturns.length > 0 ?
            this.calculateStdDev(negativeReturns) : 0;

        return downstdDev > 0 ? avgReturn / downstdDev * Math.sqrt(365) : 0;
    }

    calculateCalmarRatio(returns, portfolioData) {
        const annualReturn = this.calculateTotalReturn(portfolioData) * (365 / this.getDaysSinceStart());
        const maxDrawdown = this.calculateMaxDrawdown(portfolioData);

        return maxDrawdown > 0 ? annualReturn / maxDrawdown : 0;
    }

    calculateMaxDrawdown(portfolioData) {
        if (this.performanceHistory.length < 2) return 0;

        let peak = this.config.initialCapital;
        let maxDrawdown = 0;

        for (const point of this.performanceHistory) {
            const equity = point.equity || this.config.initialCapital;
            if (equity > peak) peak = equity;

            const drawdown = (peak - equity) / peak;
            if (drawdown > maxDrawdown) maxDrawdown = drawdown;
        }

        return maxDrawdown;
    }

    calculateVolatility(returns) {
        if (returns.length < 2) return 0;
        return this.calculateStdDev(returns) * Math.sqrt(365);
    }

    calculateWinRate(portfolioData) {
        const positions = portfolioData.positions || [];
        const closedPositions = positions.filter(p => p.status === 'closed');

        if (closedPositions.length === 0) return 0;

        const wins = closedPositions.filter(p => p.pnl > 0);
        return wins.length / closedPositions.length;
    }

    calculateProfitFactor(portfolioData) {
        const positions = portfolioData.positions || [];
        const closedPositions = positions.filter(p => p.status === 'closed');

        const totalWins = closedPositions.filter(p => p.pnl > 0)
            .reduce((sum, p) => sum + p.pnl, 0);
        const totalLosses = Math.abs(closedPositions.filter(p => p.pnl < 0)
            .reduce((sum, p) => sum + p.pnl, 0));

        return totalLosses > 0 ? totalWins / totalLosses : 0;
    }

    calculateAvgWin(portfolioData) {
        const positions = portfolioData.positions || [];
        const wins = positions.filter(p => p.status === 'closed' && p.pnl > 0);

        return wins.length > 0 ? wins.reduce((sum, p) => sum + p.pnl, 0) / wins.length : 0;
    }

    calculateAvgLoss(portfolioData) {
        const positions = portfolioData.positions || [];
        const losses = positions.filter(p => p.status === 'closed' && p.pnl < 0);

        return losses.length > 0 ? losses.reduce((sum, p) => sum + p.pnl, 0) / losses.length : 0;
    }

    calculateExposureTime(portfolioData) {
        // Simplified exposure calculation
        const totalTime = Date.now() - (this.performanceHistory[0]?.timestamp || Date.now());
        const positions = portfolioData.positions || [];

        if (positions.length === 0) return 0;

        const totalExposureTime = positions.reduce((sum, p) => {
            const duration = (p.closeTime || Date.now()) - p.entryTime;
            return sum + duration;
        }, 0);

        return totalTime > 0 ? totalExposureTime / totalTime : 0;
    }

    calculateVaR(returns, confidenceLevel) {
        if (returns.length < 20) return 0;

        const sortedReturns = returns.sort((a, b) => a - b);
        const varIndex = Math.floor((1 - confidenceLevel) * sortedReturns.length);
        return Math.abs(sortedReturns[varIndex] || 0);
    }

    calculateCVaR(returns, confidenceLevel) {
        const var95 = this.calculateVaR(returns, confidenceLevel);
        const tailReturns = returns.filter(r => r <= -var95);

        if (tailReturns.length === 0) return 0;

        return Math.abs(tailReturns.reduce((a, b) => a + b, 0) / tailReturns.length);
    }

    calculateInformationRatio(returns) {
        // Simplified information ratio against a zero benchmark
        if (returns.length < 30) return 0;

        const avgExcessReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
        const trackingError = this.calculateStdDev(returns);

        return trackingError > 0 ? avgExcessReturn / trackingError : 0;
    }

    calculateStdDev(values) {
        if (values.length < 2) return 0;

        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const squareDiffs = values.map(value => Math.pow(value - avg, 2));
        const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
        return Math.sqrt(avgSquareDiff);
    }

    getDaysSinceStart() {
        if (this.performanceHistory.length === 0) return 1;
        const startTime = this.performanceHistory[0].timestamp;
        return Math.max(1, (Date.now() - startTime) / (1000 * 60 * 60 * 24));
    }

    async analyzeStrategyPerformance(portfolioData) {
        // Mock strategy performance analysis
        const strategies = ['momentum', 'meanReversion', 'trendFollowing', 'arbitrage', 'marketMaking'];

        for (const strategy of strategies) {
            if (!this.strategyPerformance[strategy]) {
                this.strategyPerformance[strategy] = {
                    trades: 0,
                    wins: 0,
                    losses: 0,
                    totalPnL: 0,
                    sharpe: 0,
                    winRate: 0,
                    avgReturn: 0
                };
            }

            // Simulate strategy performance updates
            const performance = this.strategyPerformance[strategy];
            performance.winRate = performance.trades > 0 ? performance.wins / performance.trades : 0;
            performance.sharpe = Math.random() * 3; // Mock Sharpe ratio
            performance.avgReturn = performance.totalPnL / Math.max(performance.trades, 1);
        }
    }

    shouldOptimize(metrics) {
        // Optimization triggers
        if (metrics.trades > 0 && metrics.trades % this.optimizationPeriod === 0) {
            return true;
        }

        if (metrics.sharpeRatio < this.targetSharpe * 0.7) {
            return true;
        }

        if (metrics.maxDrawdown > 0.08) {
            return true;
        }

        if (metrics.winRate < 0.4) {
            return true;
        }

        return false;
    }

    async optimizeStrategies() {
        console.log('🔧 Optimizing strategy parameters...');

        // Genetic algorithm for parameter optimization
        const populationSize = 20;
        const generations = 10;

        for (let gen = 0; gen < generations; gen++) {
            const population = this.generatePopulation(populationSize);
            const fitnesses = await this.evaluatePopulation(population);
            const bestIndividuals = this.selectBest(population, fitnesses, populationSize / 2);

            // Apply crossover and mutation
            const newPopulation = this.evolvePopulation(bestIndividuals);

            console.log(`Generation ${gen + 1}: Best fitness = ${Math.max(...fitnesses).toFixed(4)}`);
        }

        console.log('✅ Strategy optimization complete');
    }

    generatePopulation(size) {
        const population = [];

        for (let i = 0; i < size; i++) {
            population.push({
                momentum: {
                    lookbackPeriod: Math.floor(Math.random() * 30) + 10,
                    momentumThreshold: Math.random() * 0.05 + 0.01,
                    volumeMultiplier: Math.random() * 2 + 1
                },
                meanReversion: {
                    bollingerMultiplier: Math.random() * 2 + 1.5,
                    rsiOversold: Math.random() * 20 + 20,
                    rsiOverbought: Math.random() * 20 + 70
                },
                risk: {
                    maxPositionSize: Math.random() * 0.2 + 0.1,
                    stopLossDistance: Math.random() * 0.03 + 0.01
                }
            });
        }

        return population;
    }

    async evaluatePopulation(population) {
        // Mock fitness evaluation based on simulated performance
        return population.map(() => {
            const sharpe = Math.random() * 3;
            const winRate = Math.random();
            const maxDrawdown = Math.random() * 0.15;

            // Fitness function balancing returns and risk
            return sharpe * winRate * (1 - maxDrawdown);
        });
    }

    selectBest(population, fitnesses, count) {
        const indexed = population.map((individual, index) => ({
            individual,
            fitness: fitnesses[index]
        }));

        return indexed
            .sort((a, b) => b.fitness - a.fitness)
            .slice(0, count)
            .map(item => item.individual);
    }

    evolvePopulation(parents) {
        const offspring = [];

        for (let i = 0; i < parents.length; i += 2) {
            const parent1 = parents[i];
            const parent2 = parents[i + 1] || parents[0];

            const child1 = this.crossover(parent1, parent2);
            const child2 = this.crossover(parent2, parent1);

            offspring.push(this.mutate(child1));
            offspring.push(this.mutate(child2));
        }

        return [...parents, ...offspring];
    }

    crossover(parent1, parent2) {
        // Simple crossover combining parameters from both parents
        return {
            momentum: {
                lookbackPeriod: Math.random() > 0.5 ? parent1.momentum.lookbackPeriod : parent2.momentum.lookbackPeriod,
                momentumThreshold: (parent1.momentum.momentumThreshold + parent2.momentum.momentumThreshold) / 2,
                volumeMultiplier: Math.random() > 0.5 ? parent1.momentum.volumeMultiplier : parent2.momentum.volumeMultiplier
            },
            meanReversion: {
                bollingerMultiplier: (parent1.meanReversion.bollingerMultiplier + parent2.meanReversion.bollingerMultiplier) / 2,
                rsiOversold: Math.random() > 0.5 ? parent1.meanReversion.rsiOversold : parent2.meanReversion.rsiOversold,
                rsiOverbought: Math.random() > 0.5 ? parent1.meanReversion.rsiOverbought : parent2.meanReversion.rsiOverbought
            },
            risk: {
                maxPositionSize: (parent1.risk.maxPositionSize + parent2.risk.maxPositionSize) / 2,
                stopLossDistance: Math.random() > 0.5 ? parent1.risk.stopLossDistance : parent2.risk.stopLossDistance
            }
        };
    }

    mutate(individual) {
        const mutationRate = 0.1;

        if (Math.random() < mutationRate) {
            individual.momentum.lookbackPeriod += Math.floor((Math.random() - 0.5) * 10);
            individual.momentum.lookbackPeriod = Math.max(5, Math.min(50, individual.momentum.lookbackPeriod));
        }

        if (Math.random() < mutationRate) {
            individual.momentum.momentumThreshold *= (1 + (Math.random() - 0.5) * 0.2);
            individual.momentum.momentumThreshold = Math.max(0.005, Math.min(0.1, individual.momentum.momentumThreshold));
        }

        return individual;
    }

    getDailyReturns() {
        const dailyReturns = [];
        const msPerDay = 24 * 60 * 60 * 1000;

        let currentDay = null;
        let dayStartEquity = this.config.initialCapital;

        for (const point of this.performanceHistory) {
            const pointDay = Math.floor(point.timestamp / msPerDay);

            if (currentDay === null) {
                currentDay = pointDay;
                dayStartEquity = point.equity || this.config.initialCapital;
                continue;
            }

            if (pointDay > currentDay) {
                // New day - calculate return for previous day
                const dayEndEquity = point.equity || this.config.initialCapital;
                const dailyReturn = (dayEndEquity - dayStartEquity) / dayStartEquity;
                dailyReturns.push(dailyReturn);

                currentDay = pointDay;
                dayStartEquity = dayEndEquity;
            }
        }

        return dailyReturns;
    }
}

export default PerformanceAnalyzer;