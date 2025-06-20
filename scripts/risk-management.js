// Risk Management for ML Prediction

// Value at Risk (VaR)
function calculateVaR(prices, confidenceLevel = 0.95, period = 252) {
    if (prices.length < 2) return 0;
    
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
        if (prices[i - 1] !== 0) {
            returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
        }
    }
    
    if (returns.length === 0) return 0;
    
    // Sort returns in ascending order
    returns.sort((a, b) => a - b);
    
    // Calculate VaR
    const index = Math.floor((1 - confidenceLevel) * returns.length);
    const varValue = Math.abs(returns[index] || returns[0]);
    
    return isNaN(varValue) ? 0 : varValue * 100; // Return as percentage
}

// Conditional Value at Risk (CVaR) / Expected Shortfall
function calculateCVaR(prices, confidenceLevel = 0.95, period = 252) {
    if (prices.length < 2) return 0;
    
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
        if (prices[i - 1] !== 0) {
            returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
        }
    }
    
    if (returns.length === 0) return 0;
    
    // Sort returns in ascending order
    returns.sort((a, b) => a - b);
    
    // Calculate CVaR
    const cutoffIndex = Math.floor((1 - confidenceLevel) * returns.length);
    const tailReturns = returns.slice(0, cutoffIndex);
    
    if (tailReturns.length === 0) return 0;
    
    const cvarValue = Math.abs(tailReturns.reduce((sum, ret) => sum + ret, 0) / tailReturns.length);
    
    return isNaN(cvarValue) ? 0 : cvarValue * 100; // Return as percentage
}

// Maximum Drawdown
function calculateMaxDrawdown(prices) {
    if (prices.length < 2) return 0;
    
    let maxDrawdown = 0;
    let peak = prices[0];
    
    for (let i = 1; i < prices.length; i++) {
        if (prices[i] > peak) {
            peak = prices[i];
        } else {
            const drawdown = (peak - prices[i]) / peak;
            if (drawdown > maxDrawdown) {
                maxDrawdown = drawdown;
            }
        }
    }
    
    return isNaN(maxDrawdown) ? 0 : maxDrawdown * 100; // Return as percentage
}

// Sharpe Ratio
function calculateSharpeRatio(prices, riskFreeRate = 0.02, period = 252) {
    if (prices.length < 2) return 0;
    
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
        if (prices[i - 1] !== 0) {
            returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
        }
    }
    
    if (returns.length === 0) return 0;
    
    const meanReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const excessReturn = meanReturn - (riskFreeRate / period);
    
    const squaredDiffs = returns.map(ret => Math.pow(ret - meanReturn, 2));
    const variance = squaredDiffs.reduce((sum, sq) => sum + sq, 0) / returns.length;
    const standardDeviation = Math.sqrt(variance);
    
    if (standardDeviation === 0) return 0;
    
    const sharpeRatio = excessReturn / standardDeviation;
    
    return isNaN(sharpeRatio) ? 0 : sharpeRatio;
}

// Sortino Ratio
function calculateSortinoRatio(prices, riskFreeRate = 0.02, period = 252) {
    if (prices.length < 2) return 0;
    
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
        if (prices[i - 1] !== 0) {
            returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
        }
    }
    
    if (returns.length === 0) return 0;
    
    const meanReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const excessReturn = meanReturn - (riskFreeRate / period);
    
    // Calculate downside deviation (only negative returns)
    const negativeReturns = returns.filter(ret => ret < meanReturn);
    if (negativeReturns.length === 0) return 0;
    
    const squaredDownside = negativeReturns.map(ret => Math.pow(ret - meanReturn, 2));
    const downsideVariance = squaredDownside.reduce((sum, sq) => sum + sq, 0) / returns.length;
    const downsideDeviation = Math.sqrt(downsideVariance);
    
    if (downsideDeviation === 0) return 0;
    
    const sortinoRatio = excessReturn / downsideDeviation;
    
    return isNaN(sortinoRatio) ? 0 : sortinoRatio;
}

// Calmar Ratio
function calculateCalmarRatio(prices, riskFreeRate = 0.02, period = 252) {
    if (prices.length < 2) return 0;
    
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
        if (prices[i - 1] !== 0) {
            returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
        }
    }
    
    if (returns.length === 0) return 0;
    
    const meanReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const excessReturn = meanReturn - (riskFreeRate / period);
    const maxDrawdown = calculateMaxDrawdown(prices) / 100; // Convert back to decimal
    
    if (maxDrawdown === 0) return 0;
    
    const calmarRatio = excessReturn / maxDrawdown;
    
    return isNaN(calmarRatio) ? 0 : calmarRatio;
}

// Information Ratio
function calculateInformationRatio(prices, benchmarkPrices, period = 252) {
    if (prices.length < 2 || benchmarkPrices.length < 2) return 0;
    
    const minLength = Math.min(prices.length, benchmarkPrices.length);
    const assetReturns = [];
    const benchmarkReturns = [];
    
    for (let i = 1; i < minLength; i++) {
        if (prices[i - 1] !== 0) {
            assetReturns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
        }
        if (benchmarkPrices[i - 1] !== 0) {
            benchmarkReturns.push((benchmarkPrices[i] - benchmarkPrices[i - 1]) / benchmarkPrices[i - 1]);
        }
    }
    
    if (assetReturns.length === 0 || benchmarkReturns.length === 0) return 0;
    
    const assetMean = assetReturns.reduce((sum, ret) => sum + ret, 0) / assetReturns.length;
    const benchmarkMean = benchmarkReturns.reduce((sum, ret) => sum + ret, 0) / benchmarkReturns.length;
    
    const activeReturns = assetReturns.map((ret, i) => ret - (benchmarkReturns[i] || 0));
    const activeMean = activeReturns.reduce((sum, ret) => sum + ret, 0) / activeReturns.length;
    
    const squaredDiffs = activeReturns.map(ret => Math.pow(ret - activeMean, 2));
    const trackingError = Math.sqrt(squaredDiffs.reduce((sum, sq) => sum + sq, 0) / activeReturns.length);
    
    if (trackingError === 0) return 0;
    
    const informationRatio = activeMean / trackingError;
    
    return isNaN(informationRatio) ? 0 : informationRatio;
}

// Risk-Adjusted Return
function calculateRiskAdjustedReturn(prices, riskFreeRate = 0.02, period = 252) {
    if (prices.length < 2) return 0;
    
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
        if (prices[i - 1] !== 0) {
            returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
        }
    }
    
    if (returns.length === 0) return 0;
    
    const meanReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const excessReturn = meanReturn - (riskFreeRate / period);
    
    const squaredDiffs = returns.map(ret => Math.pow(ret - meanReturn, 2));
    const variance = squaredDiffs.reduce((sum, sq) => sum + sq, 0) / returns.length;
    const standardDeviation = Math.sqrt(variance);
    
    if (standardDeviation === 0) return 0;
    
    const riskAdjustedReturn = excessReturn / standardDeviation;
    
    return isNaN(riskAdjustedReturn) ? 0 : riskAdjustedReturn;
}

// Position Sizing Calculator
function calculatePositionSize(accountBalance, riskPerTrade, stopLossPercent, currentPrice) {
    if (accountBalance <= 0 || riskPerTrade <= 0 || stopLossPercent <= 0 || currentPrice <= 0) {
        return 0;
    }
    
    const riskAmount = accountBalance * (riskPerTrade / 100);
    const stopLossAmount = currentPrice * (stopLossPercent / 100);
    
    if (stopLossAmount === 0) return 0;
    
    const positionSize = riskAmount / stopLossAmount;
    
    return isNaN(positionSize) ? 0 : positionSize;
}

// Kelly Criterion
function calculateKellyCriterion(winRate, avgWin, avgLoss) {
    if (winRate <= 0 || winRate >= 1 || avgWin <= 0 || avgLoss <= 0) return 0;
    
    const kellyPercent = (winRate * avgWin - (1 - winRate) * avgLoss) / avgWin;
    
    return isNaN(kellyPercent) ? 0 : Math.max(0, Math.min(1, kellyPercent)); // Clamp between 0 and 1
}

// Risk-Reward Ratio
function calculateRiskRewardRatio(entryPrice, targetPrice, stopLossPrice) {
    if (entryPrice <= 0 || targetPrice <= 0 || stopLossPrice <= 0) return 0;
    
    const potentialProfit = Math.abs(targetPrice - entryPrice);
    const potentialLoss = Math.abs(entryPrice - stopLossPrice);
    
    if (potentialLoss === 0) return 0;
    
    const riskRewardRatio = potentialProfit / potentialLoss;
    
    return isNaN(riskRewardRatio) ? 0 : riskRewardRatio;
}

// Volatility-Adjusted Position Sizing
function calculateVolatilityAdjustedPositionSize(accountBalance, riskPerTrade, volatility, currentPrice) {
    if (accountBalance <= 0 || riskPerTrade <= 0 || volatility <= 0 || currentPrice <= 0) {
        return 0;
    }
    
    const riskAmount = accountBalance * (riskPerTrade / 100);
    const volatilityAdjustedRisk = currentPrice * (volatility / 100);
    
    if (volatilityAdjustedRisk === 0) return 0;
    
    const positionSize = riskAmount / volatilityAdjustedRisk;
    
    return isNaN(positionSize) ? 0 : positionSize;
}

// Portfolio Risk Metrics
function calculatePortfolioRisk(positions, correlationMatrix = null) {
    if (!positions || positions.length === 0) return { totalRisk: 0, diversification: 0 };
    
    // Calculate individual position risks
    const positionRisks = positions.map(pos => {
        const weight = pos.weight || 1 / positions.length;
        const volatility = pos.volatility || 0.2;
        return { weight, volatility, risk: weight * volatility };
    });
    
    // Calculate total risk (simplified - assumes no correlation)
    const totalRisk = Math.sqrt(
        positionRisks.reduce((sum, pos) => sum + Math.pow(pos.risk, 2), 0)
    );
    
    // Calculate diversification benefit
    const weightedAvgRisk = positionRisks.reduce((sum, pos) => sum + pos.risk, 0);
    const diversification = weightedAvgRisk > 0 ? (weightedAvgRisk - totalRisk) / weightedAvgRisk : 0;
    
    return {
        totalRisk: isNaN(totalRisk) ? 0 : totalRisk,
        diversification: isNaN(diversification) ? 0 : Math.max(0, diversification),
        positionRisks
    };
}

// Combined risk analysis
function analyzeRisk(prices, benchmarkPrices = null, accountBalance = 10000, riskPerTrade = 2) {
    const var95 = calculateVaR(prices, 0.95);
    const var99 = calculateVaR(prices, 0.99);
    const cvar95 = calculateCVaR(prices, 0.95);
    const maxDrawdown = calculateMaxDrawdown(prices);
    const sharpeRatio = calculateSharpeRatio(prices);
    const sortinoRatio = calculateSortinoRatio(prices);
    const calmarRatio = calculateCalmarRatio(prices);
    const riskAdjustedReturn = calculateRiskAdjustedReturn(prices);
    
    let informationRatio = 0;
    if (benchmarkPrices) {
        informationRatio = calculateInformationRatio(prices, benchmarkPrices);
    }
    
    // Calculate volatility for position sizing
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
        if (prices[i - 1] !== 0) {
            returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
        }
    }
    
    const volatility = returns.length > 0 ? 
        Math.sqrt(returns.reduce((sum, ret) => sum + Math.pow(ret, 2), 0) / returns.length) * 100 : 0;
    
    const currentPrice = prices[prices.length - 1];
    const positionSize = calculatePositionSize(accountBalance, riskPerTrade, volatility, currentPrice);
    const volAdjustedPositionSize = calculateVolatilityAdjustedPositionSize(accountBalance, riskPerTrade, volatility, currentPrice);
    
    // Risk assessment
    const riskLevel = var95 > 5 ? 'high' : var95 > 2 ? 'medium' : 'low';
    const isHighRisk = riskLevel === 'high';
    const isLowRisk = riskLevel === 'low';
    
    return {
        var95,
        var99,
        cvar95,
        maxDrawdown,
        sharpeRatio,
        sortinoRatio,
        calmarRatio,
        informationRatio,
        riskAdjustedReturn,
        volatility,
        positionSize,
        volAdjustedPositionSize,
        riskLevel,
        isHighRisk,
        isLowRisk,
        riskScore: (var95 + maxDrawdown) / 2, // Simple risk score
        recommendedPositionSize: Math.min(positionSize, volAdjustedPositionSize)
    };
}

module.exports = {
    calculateVaR,
    calculateCVaR,
    calculateMaxDrawdown,
    calculateSharpeRatio,
    calculateSortinoRatio,
    calculateCalmarRatio,
    calculateInformationRatio,
    calculateRiskAdjustedReturn,
    calculatePositionSize,
    calculateKellyCriterion,
    calculateRiskRewardRatio,
    calculateVolatilityAdjustedPositionSize,
    calculatePortfolioRisk,
    analyzeRisk
}; 