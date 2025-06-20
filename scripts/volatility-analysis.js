// Volatility Analysis for ML Prediction

// Historical Volatility
function calculateHistoricalVolatility(prices, period = 20) {
    if (prices.length < period + 1) return 0;
    
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
        if (prices[i - 1] !== 0) {
            returns.push(Math.log(prices[i] / prices[i - 1]));
        }
    }
    
    if (returns.length < period) return 0;
    
    const recentReturns = returns.slice(-period);
    const meanReturn = recentReturns.reduce((a, b) => a + b, 0) / period;
    
    const squaredDiffs = recentReturns.map(ret => Math.pow(ret - meanReturn, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period;
    const volatility = Math.sqrt(variance) * Math.sqrt(252); // Annualized
    
    return isNaN(volatility) ? 0 : volatility;
}

// Parkinson Volatility
function calculateParkinsonVolatility(high, low, period = 20) {
    if (high.length < period || low.length < period) return 0;
    
    const recentHigh = high.slice(-period);
    const recentLow = low.slice(-period);
    
    const logReturns = [];
    for (let i = 0; i < recentHigh.length; i++) {
        if (recentLow[i] > 0) {
            logReturns.push(Math.log(recentHigh[i] / recentLow[i]));
        }
    }
    
    if (logReturns.length === 0) return 0;
    
    const sumSquared = logReturns.reduce((sum, ret) => sum + ret * ret, 0);
    const parkinsonVol = Math.sqrt(sumSquared / (4 * Math.log(2) * logReturns.length)) * Math.sqrt(252);
    
    return isNaN(parkinsonVol) ? 0 : parkinsonVol;
}

// Garman-Klass Volatility
function calculateGarmanKlassVolatility(high, low, close, period = 20) {
    if (high.length < period || low.length < period || close.length < period) return 0;
    
    const recentHigh = high.slice(-period);
    const recentLow = low.slice(-period);
    const recentClose = close.slice(-period);
    
    const volatilityTerms = [];
    for (let i = 1; i < recentClose.length; i++) {
        const logHL = Math.log(recentHigh[i] / recentLow[i]);
        const logCO = Math.log(recentClose[i] / recentClose[i - 1]);
        
        const term = 0.5 * Math.pow(logHL, 2) - (2 * Math.log(2) - 1) * Math.pow(logCO, 2);
        volatilityTerms.push(term);
    }
    
    if (volatilityTerms.length === 0) return 0;
    
    const sumTerms = volatilityTerms.reduce((sum, term) => sum + term, 0);
    const gkVol = Math.sqrt(sumTerms / volatilityTerms.length) * Math.sqrt(252);
    
    return isNaN(gkVol) ? 0 : gkVol;
}

// Rogers-Satchell Volatility
function calculateRogersSatchellVolatility(high, low, close, period = 20) {
    if (high.length < period || low.length < period || close.length < period) return 0;
    
    const recentHigh = high.slice(-period);
    const recentLow = low.slice(-period);
    const recentClose = close.slice(-period);
    
    const volatilityTerms = [];
    for (let i = 1; i < recentClose.length; i++) {
        const logHC = Math.log(recentHigh[i] / recentClose[i - 1]);
        const logLC = Math.log(recentLow[i] / recentClose[i - 1]);
        const logCO = Math.log(recentClose[i] / recentClose[i - 1]);
        
        const term = logHC * (logHC - logCO) + logLC * (logLC - logCO);
        volatilityTerms.push(term);
    }
    
    if (volatilityTerms.length === 0) return 0;
    
    const sumTerms = volatilityTerms.reduce((sum, term) => sum + term, 0);
    const rsVol = Math.sqrt(sumTerms / volatilityTerms.length) * Math.sqrt(252);
    
    return isNaN(rsVol) ? 0 : rsVol;
}

// Average True Range (ATR) - Enhanced version
function calculateEnhancedATR(high, low, close, period = 14) {
    if (high.length < period || low.length < period || close.length < period) return 0;
    
    const trueRanges = [];
    for (let i = 1; i < high.length; i++) {
        const tr1 = high[i] - low[i];
        const tr2 = Math.abs(high[i] - close[i - 1]);
        const tr3 = Math.abs(low[i] - close[i - 1]);
        
        const trueRange = Math.max(tr1, tr2, tr3);
        trueRanges.push(trueRange);
    }
    
    if (trueRanges.length < period) return 0;
    
    const recentTR = trueRanges.slice(-period);
    const atr = recentTR.reduce((sum, tr) => sum + tr, 0) / period;
    
    return isNaN(atr) ? 0 : atr;
}

// Volatility Ratio
function calculateVolatilityRatio(prices, shortPeriod = 10, longPeriod = 20) {
    if (prices.length < longPeriod) return 1;
    
    const shortVol = calculateHistoricalVolatility(prices, shortPeriod);
    const longVol = calculateHistoricalVolatility(prices, longPeriod);
    
    if (longVol === 0) return 1;
    
    const volRatio = shortVol / longVol;
    return isNaN(volRatio) ? 1 : volRatio;
}

// Chaikin Volatility
function calculateChaikinVolatility(high, low, close, volume, period = 10) {
    if (high.length < period || low.length < period || close.length < period || volume.length < period) {
        return 0;
    }
    
    const typicalPrices = close.map((c, i) => (high[i] + low[i] + c) / 3);
    const moneyFlow = typicalPrices.map((tp, i) => tp * volume[i]);
    
    const highLowRange = high.map((h, i) => h - low[i]);
    const chaikinVol = [];
    
    for (let i = 1; i < highLowRange.length; i++) {
        if (highLowRange[i - 1] !== 0) {
            const vol = ((highLowRange[i] - highLowRange[i - 1]) / highLowRange[i - 1]) * 100;
            chaikinVol.push(vol);
        }
    }
    
    if (chaikinVol.length < period) return 0;
    
    const recentVol = chaikinVol.slice(-period);
    const avgVol = recentVol.reduce((sum, vol) => sum + vol, 0) / period;
    
    return isNaN(avgVol) ? 0 : avgVol;
}

// Volatility Index (VIX-like)
function calculateVolatilityIndex(high, low, close, period = 20) {
    if (high.length < period || low.length < period || close.length < period) return 0;
    
    const returns = [];
    for (let i = 1; i < close.length; i++) {
        if (close[i - 1] !== 0) {
            returns.push(Math.log(close[i] / close[i - 1]));
        }
    }
    
    if (returns.length < period) return 0;
    
    const recentReturns = returns.slice(-period);
    const meanReturn = recentReturns.reduce((sum, ret) => sum + ret, 0) / period;
    
    const squaredDiffs = recentReturns.map(ret => Math.pow(ret - meanReturn, 2));
    const variance = squaredDiffs.reduce((sum, sq) => sum + sq, 0) / period;
    const volatility = Math.sqrt(variance);
    
    // Convert to VIX-like scale (0-100)
    const vixScale = Math.min(100, volatility * 100);
    
    return isNaN(vixScale) ? 0 : vixScale;
}

// Bollinger Band Width
function calculateBollingerBandWidth(prices, period = 20, stdDev = 2) {
    if (prices.length < period) return 0;
    
    const recentPrices = prices.slice(-period);
    const sma = recentPrices.reduce((sum, price) => sum + price, 0) / period;
    
    const squaredDiffs = recentPrices.map(price => Math.pow(price - sma, 2));
    const variance = squaredDiffs.reduce((sum, sq) => sum + sq, 0) / period;
    const standardDeviation = Math.sqrt(variance);
    
    const upperBand = sma + (standardDeviation * stdDev);
    const lowerBand = sma - (standardDeviation * stdDev);
    
    const bandWidth = ((upperBand - lowerBand) / sma) * 100;
    
    return isNaN(bandWidth) ? 0 : bandWidth;
}

// Keltner Channel Width
function calculateKeltnerChannelWidth(high, low, close, period = 20, multiplier = 2) {
    if (high.length < period || low.length < period || close.length < period) return 0;
    
    const typicalPrices = close.map((c, i) => (high[i] + low[i] + c) / 3);
    const recentTP = typicalPrices.slice(-period);
    const sma = recentTP.reduce((sum, tp) => sum + tp, 0) / period;
    
    const trueRanges = [];
    for (let i = 1; i < high.length; i++) {
        const tr1 = high[i] - low[i];
        const tr2 = Math.abs(high[i] - close[i - 1]);
        const tr3 = Math.abs(low[i] - close[i - 1]);
        trueRanges.push(Math.max(tr1, tr2, tr3));
    }
    
    const recentTR = trueRanges.slice(-period);
    const atr = recentTR.reduce((sum, tr) => sum + tr, 0) / period;
    
    const upperChannel = sma + (atr * multiplier);
    const lowerChannel = sma - (atr * multiplier);
    
    const channelWidth = ((upperChannel - lowerChannel) / sma) * 100;
    
    return isNaN(channelWidth) ? 0 : channelWidth;
}

// Volatility Breakout Detection
function detectVolatilityBreakout(prices, period = 20, threshold = 2) {
    if (prices.length < period) return { isBreakout: false, direction: 'none', strength: 0 };
    
    const currentPrice = prices[prices.length - 1];
    const recentPrices = prices.slice(-period, -1);
    
    if (recentPrices.length === 0) return { isBreakout: false, direction: 'none', strength: 0 };
    
    const sma = recentPrices.reduce((sum, price) => sum + price, 0) / recentPrices.length;
    const standardDeviation = calculateStandardDeviation(recentPrices);
    
    const upperThreshold = sma + (standardDeviation * threshold);
    const lowerThreshold = sma - (standardDeviation * threshold);
    
    let isBreakout = false;
    let direction = 'none';
    let strength = 0;
    
    if (currentPrice > upperThreshold) {
        isBreakout = true;
        direction = 'up';
        strength = ((currentPrice - upperThreshold) / standardDeviation) * 100;
    } else if (currentPrice < lowerThreshold) {
        isBreakout = true;
        direction = 'down';
        strength = ((lowerThreshold - currentPrice) / standardDeviation) * 100;
    }
    
    return { isBreakout, direction, strength };
}

// Helper function for standard deviation
function calculateStandardDeviation(prices) {
    if (prices.length === 0) return 0;
    
    const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const squaredDiffs = prices.map(price => Math.pow(price - mean, 2));
    const variance = squaredDiffs.reduce((sum, sq) => sum + sq, 0) / prices.length;
    
    return Math.sqrt(variance);
}

// Combined volatility analysis
function analyzeVolatility(high, low, close, volume, period = 20) {
    const historicalVol = calculateHistoricalVolatility(close, period);
    const parkinsonVol = calculateParkinsonVolatility(high, low, period);
    const garmanKlassVol = calculateGarmanKlassVolatility(high, low, close, period);
    const rogersSatchellVol = calculateRogersSatchellVolatility(high, low, close, period);
    const atr = calculateEnhancedATR(high, low, close, period);
    const volRatio = calculateVolatilityRatio(close, 10, period);
    const chaikinVol = calculateChaikinVolatility(high, low, close, volume, period);
    const vix = calculateVolatilityIndex(high, low, close, period);
    const bbWidth = calculateBollingerBandWidth(close, period);
    const keltnerWidth = calculateKeltnerChannelWidth(high, low, close, period);
    const breakout = detectVolatilityBreakout(close, period);
    
    // Calculate volatility regime
    const avgVol = (historicalVol + parkinsonVol + garmanKlassVol + rogersSatchellVol) / 4;
    const volRegime = avgVol > 0.5 ? 'high' : avgVol > 0.2 ? 'medium' : 'low';
    
    // Calculate volatility trend
    const volTrend = volRatio > 1.2 ? 'increasing' : volRatio < 0.8 ? 'decreasing' : 'stable';
    
    return {
        historicalVol,
        parkinsonVol,
        garmanKlassVol,
        rogersSatchellVol,
        atr,
        volRatio,
        chaikinVol,
        vix,
        bbWidth,
        keltnerWidth,
        breakout,
        volRegime,
        volTrend,
        avgVolatility: avgVol,
        isHighVolatility: volRegime === 'high',
        isLowVolatility: volRegime === 'low',
        isVolatilityIncreasing: volTrend === 'increasing',
        isVolatilityDecreasing: volTrend === 'decreasing'
    };
}

module.exports = {
    calculateHistoricalVolatility,
    calculateParkinsonVolatility,
    calculateGarmanKlassVolatility,
    calculateRogersSatchellVolatility,
    calculateEnhancedATR,
    calculateVolatilityRatio,
    calculateChaikinVolatility,
    calculateVolatilityIndex,
    calculateBollingerBandWidth,
    calculateKeltnerChannelWidth,
    detectVolatilityBreakout,
    analyzeVolatility
}; 