// Advanced Momentum Indicators for ML Prediction

// Rate of Change (ROC)
function calculateROC(prices, period = 14) {
    if (prices.length < period + 1) return 0;
    
    const currentPrice = prices[prices.length - 1];
    const pastPrice = prices[prices.length - 1 - period];
    
    if (pastPrice === 0) return 0;
    
    const roc = ((currentPrice - pastPrice) / pastPrice) * 100;
    return isNaN(roc) ? 0 : roc;
}

// Momentum Oscillator
function calculateMomentum(prices, period = 10) {
    if (prices.length < period + 1) return 0;
    
    const currentPrice = prices[prices.length - 1];
    const pastPrice = prices[prices.length - 1 - period];
    
    const momentum = currentPrice - pastPrice;
    return isNaN(momentum) ? 0 : momentum;
}

// Commodity Channel Index (CCI) - Enhanced version
function calculateEnhancedCCI(high, low, close, period = 20) {
    if (high.length < period || low.length < period || close.length < period) return 0;
    
    const typicalPrices = close.map((c, i) => (high[i] + low[i] + c) / 3);
    const sma = typicalPrices.slice(-period).reduce((a, b) => a + b, 0) / period;
    
    const meanDeviation = typicalPrices.slice(-period).reduce((sum, tp) => {
        return sum + Math.abs(tp - sma);
    }, 0) / period;
    
    if (meanDeviation === 0) return 0;
    
    const currentTP = typicalPrices[typicalPrices.length - 1];
    const cci = (currentTP - sma) / (0.015 * meanDeviation);
    
    return isNaN(cci) ? 0 : cci;
}

// Williams %R - Enhanced version
function calculateEnhancedWilliamsR(high, low, close, period = 14) {
    if (high.length < period || low.length < period || close.length < period) return -50;
    
    const highestHigh = Math.max(...high.slice(-period));
    const lowestLow = Math.min(...low.slice(-period));
    const currentClose = close[close.length - 1];
    
    if (highestHigh === lowestLow) return -50;
    
    const williamsR = ((highestHigh - currentClose) / (highestHigh - lowestLow)) * -100;
    return isNaN(williamsR) ? -50 : williamsR;
}

// Stochastic RSI
function calculateStochasticRSI(prices, period = 14, kPeriod = 3, dPeriod = 3) {
    if (prices.length < period + kPeriod + dPeriod) return { k: 50, d: 50 };
    
    // Calculate RSI values
    const rsiValues = [];
    for (let i = period; i < prices.length; i++) {
        const periodPrices = prices.slice(i - period, i);
        const rsi = calculateRSI(periodPrices);
        rsiValues.push(rsi);
    }
    
    if (rsiValues.length < kPeriod) return { k: 50, d: 50 };
    
    // Calculate Stochastic of RSI
    const highestRSI = Math.max(...rsiValues.slice(-kPeriod));
    const lowestRSI = Math.min(...rsiValues.slice(-kPeriod));
    const currentRSI = rsiValues[rsiValues.length - 1];
    
    if (highestRSI === lowestRSI) return { k: 50, d: 50 };
    
    const k = ((currentRSI - lowestRSI) / (highestRSI - lowestRSI)) * 100;
    
    // Calculate %D (SMA of %K)
    const kValues = [];
    for (let i = kPeriod; i <= rsiValues.length; i++) {
        const periodRSI = rsiValues.slice(i - kPeriod, i);
        const periodHighest = Math.max(...periodRSI);
        const periodLowest = Math.min(...periodRSI);
        const periodCurrent = periodRSI[periodRSI.length - 1];
        
        if (periodHighest === periodLowest) {
            kValues.push(50);
        } else {
            kValues.push(((periodCurrent - periodLowest) / (periodHighest - periodLowest)) * 100);
        }
    }
    
    const d = kValues.slice(-dPeriod).reduce((a, b) => a + b, 0) / dPeriod;
    
    return {
        k: isNaN(k) ? 50 : k,
        d: isNaN(d) ? 50 : d
    };
}

// Ultimate Oscillator
function calculateUltimateOscillator(high, low, close, period1 = 7, period2 = 14, period3 = 28) {
    if (high.length < period3 || low.length < period3 || close.length < period3) return 50;
    
    const typicalPrices = close.map((c, i) => (high[i] + low[i] + c) / 3);
    const trueRanges = [];
    const buyingPressures = [];
    
    for (let i = 1; i < typicalPrices.length; i++) {
        const tr = Math.max(
            high[i] - low[i],
            Math.abs(high[i] - typicalPrices[i - 1]),
            Math.abs(low[i] - typicalPrices[i - 1])
        );
        trueRanges.push(tr);
        
        const bp = typicalPrices[i] - Math.min(low[i], typicalPrices[i - 1]);
        buyingPressures.push(bp);
    }
    
    // Calculate averages for different periods
    const avg1 = calculateAverage(buyingPressures.slice(-period1), trueRanges.slice(-period1));
    const avg2 = calculateAverage(buyingPressures.slice(-period2), trueRanges.slice(-period2));
    const avg3 = calculateAverage(buyingPressures.slice(-period3), trueRanges.slice(-period3));
    
    if (avg1 + avg2 + avg3 === 0) return 50;
    
    const ultimateOscillator = ((4 * avg1) + (2 * avg2) + avg3) / (avg1 + avg2 + avg3) * 100;
    
    return isNaN(ultimateOscillator) ? 50 : ultimateOscillator;
}

// Helper function for Ultimate Oscillator
function calculateAverage(buyingPressures, trueRanges) {
    if (buyingPressures.length === 0 || trueRanges.length === 0) return 0;
    
    const bpSum = buyingPressures.reduce((a, b) => a + b, 0);
    const trSum = trueRanges.reduce((a, b) => a + b, 0);
    
    return trSum === 0 ? 0 : bpSum / trSum;
}

// Helper function for RSI calculation
function calculateRSI(prices) {
    if (prices.length < 2) return 50;
    
    const changes = prices.slice(1).map((price, i) => price - prices[i]);
    const gains = changes.map(change => change > 0 ? change : 0);
    const losses = changes.map(change => change < 0 ? -change : 0);
    
    const avgGain = gains.reduce((a, b) => a + b, 0) / gains.length;
    const avgLoss = losses.reduce((a, b) => a + b, 0) / losses.length;
    
    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    
    return isNaN(rsi) ? 50 : rsi;
}

// Money Flow Index (MFI) - Enhanced version
function calculateEnhancedMFI(high, low, close, volume, period = 14) {
    if (high.length < period || low.length < period || close.length < period || volume.length < period) {
        return 50;
    }
    
    const typicalPrices = close.map((c, i) => (high[i] + low[i] + c) / 3);
    const moneyFlow = typicalPrices.map((tp, i) => tp * volume[i]);
    
    let positiveFlow = 0;
    let negativeFlow = 0;
    
    for (let i = 1; i < period; i++) {
        const index = typicalPrices.length - i;
        if (typicalPrices[index] > typicalPrices[index - 1]) {
            positiveFlow += moneyFlow[index];
        } else {
            negativeFlow += moneyFlow[index];
        }
    }
    
    if (negativeFlow === 0) return 100;
    
    const mfi = 100 - (100 / (1 + positiveFlow / negativeFlow));
    return isNaN(mfi) ? 50 : mfi;
}

// True Strength Index (TSI)
function calculateTSI(close, period1 = 25, period2 = 13) {
    if (close.length < period1 + period2) return 0;
    
    // Calculate price change
    const priceChange = [];
    for (let i = 1; i < close.length; i++) {
        priceChange.push(close[i] - close[i - 1]);
    }
    
    // Calculate smoothed price change
    const smoothedPC = calculateEMA(priceChange, period1);
    
    // Calculate absolute price change
    const absPriceChange = priceChange.map(pc => Math.abs(pc));
    const smoothedAPC = calculateEMA(absPriceChange, period1);
    
    // Calculate double smoothed price change
    const doubleSmoothedPC = calculateEMA([smoothedPC], period2);
    
    // Calculate double smoothed absolute price change
    const doubleSmoothedAPC = calculateEMA([smoothedAPC], period2);
    
    if (doubleSmoothedAPC === 0) return 0;
    
    const tsi = (doubleSmoothedPC / doubleSmoothedAPC) * 100;
    return isNaN(tsi) ? 0 : tsi;
}

// Helper function for EMA calculation
function calculateEMA(values, period) {
    if (values.length === 0) return 0;
    if (values.length === 1) return values[0];
    
    const multiplier = 2 / (period + 1);
    let ema = values[0];
    
    for (let i = 1; i < values.length; i++) {
        ema = (values[i] * multiplier) + (ema * (1 - multiplier));
    }
    
    return ema;
}

// Chande Momentum Oscillator (CMO)
function calculateCMO(prices, period = 14) {
    if (prices.length < period + 1) return 0;
    
    const changes = prices.slice(1).map((price, i) => price - prices[i]);
    const gains = changes.map(change => change > 0 ? change : 0);
    const losses = changes.map(change => change < 0 ? -change : 0);
    
    const sumGains = gains.slice(-period).reduce((a, b) => a + b, 0);
    const sumLosses = losses.slice(-period).reduce((a, b) => a + b, 0);
    
    if (sumGains + sumLosses === 0) return 0;
    
    const cmo = ((sumGains - sumLosses) / (sumGains + sumLosses)) * 100;
    return isNaN(cmo) ? 0 : cmo;
}

// Detrended Price Oscillator (DPO)
function calculateDPO(prices, period = 20) {
    if (prices.length < period) return 0;
    
    const sma = prices.slice(-period).reduce((a, b) => a + b, 0) / period;
    const currentPrice = prices[prices.length - 1];
    const shiftedSMA = prices[prices.length - 1 - Math.floor(period / 2 + 1)];
    
    const dpo = currentPrice - shiftedSMA;
    return isNaN(dpo) ? 0 : dpo;
}

// Combined momentum analysis
function analyzeMomentum(high, low, close, volume, period = 14) {
    const roc = calculateROC(close, period);
    const momentum = calculateMomentum(close, period);
    const cci = calculateEnhancedCCI(high, low, close, period);
    const williamsR = calculateEnhancedWilliamsR(high, low, close, period);
    const stochRSI = calculateStochasticRSI(close, period);
    const ultimateOsc = calculateUltimateOscillator(high, low, close);
    const mfi = calculateEnhancedMFI(high, low, close, volume, period);
    const tsi = calculateTSI(close);
    const cmo = calculateCMO(close, period);
    const dpo = calculateDPO(close, period);
    
    // Calculate momentum strength
    const momentumIndicators = [roc, momentum, cci, williamsR, stochRSI.k, ultimateOsc, mfi, tsi, cmo, dpo];
    const positiveCount = momentumIndicators.filter(indicator => indicator > 0).length;
    const momentumStrength = (positiveCount / momentumIndicators.length) * 100;
    
    return {
        roc,
        momentum,
        cci,
        williamsR,
        stochRSI,
        ultimateOsc,
        mfi,
        tsi,
        cmo,
        dpo,
        momentumStrength,
        isBullish: momentumStrength > 60,
        isBearish: momentumStrength < 40,
        isNeutral: momentumStrength >= 40 && momentumStrength <= 60
    };
}

module.exports = {
    calculateROC,
    calculateMomentum,
    calculateEnhancedCCI,
    calculateEnhancedWilliamsR,
    calculateStochasticRSI,
    calculateUltimateOscillator,
    calculateEnhancedMFI,
    calculateTSI,
    calculateCMO,
    calculateDPO,
    analyzeMomentum
}; 