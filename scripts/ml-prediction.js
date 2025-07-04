require('dotenv').config();
const tf = require('@tensorflow/tfjs-node');
const { query } = require('../db/db'); 
const fibonacciIndicators = require('./fibonacci-indicators');
const harmonicPatterns = require('./harmonic-patterns');
const advancedMomentum = require('./advanced-momentum');
const volatilityAnalysis = require('./volatility-analysis');
const riskManagement = require('./risk-management');

const moment = require('moment');
const ti = require('technicalindicators');

// Technical indicators calculation
function calculateEMA(prices, period = 20) {
    if (prices.length < period) return prices[prices.length - 1];
    const val = ti.EMA.calculate({ period, values: prices }).slice(-1)[0] || prices[prices.length - 1];
    return isNaN(val) ? prices[prices.length - 1] : val;
}

function calculateSMA(prices, period = 20) {
    if (prices.length < period) return prices[prices.length - 1];
    const val = ti.SMA.calculate({ period, values: prices }).slice(-1)[0] || prices[prices.length - 1];
    return isNaN(val) ? prices[prices.length - 1] : val;
}

function calculateStochastic(high, low, close, period = 14, signalPeriod = 3) {
    if (high.length < period || low.length < period || close.length < period) return { k: 50, d: 50 };
    const result = ti.Stochastic.calculate({ high, low, close, period, signalPeriod });
    const last = result.length > 0 ? result[result.length - 1] : { k: 50, d: 50 };
    return {
        k: isNaN(last.k) ? 50 : last.k,
        d: isNaN(last.d) ? 50 : last.d
    };
}

function calculateADX(high, low, close, period = 14) {
    if (high.length < period || low.length < period || close.length < period) return 20;
    const result = ti.ADX.calculate({ high, low, close, period });
    const adx = result.length > 0 ? result[result.length - 1].adx : 20;
    return isNaN(adx) ? 20 : adx;
}

function calculateCCI(high, low, close, period = 20) {
    if (high.length < period || low.length < period || close.length < period) return 0;
    const result = ti.CCI.calculate({ high, low, close, period });
    const val = result.length > 0 ? result[result.length - 1] : 0;
    return isNaN(val) ? 0 : val;
}

function calculateWilliamsR(high, low, close, period = 14) {
    if (high.length < period || low.length < period || close.length < period) return -50;
    const result = ti.WilliamsR.calculate({ high, low, close, period });
    const val = result.length > 0 ? result[result.length - 1] : -50;
    return isNaN(val) ? -50 : val;
}

function calculateParabolicSAR(high, low, step = 0.02, max = 0.2) {
    if (high.length < 2 || low.length < 2) return high[high.length - 1];
    const result = ti.PSAR.calculate({ high, low, step, max });
    const val = result.length > 0 ? result[result.length - 1] : high[high.length - 1];
    return isNaN(val) ? high[high.length - 1] : val;
}

function calculateATR(high, low, close, period = 14) {
    if (high.length < period || low.length < period || close.length < period) return 0;
    const result = ti.ATR.calculate({ high, low, close, period });
    const val = result.length > 0 ? result[result.length - 1] : 0;
    return isNaN(val) ? 0 : val;
}

function calculateOBV(close, volume) {
    if (close.length < 2 || volume.length < 2) return 0;
    const result = ti.OBV.calculate({ close, volume });
    const val = result.length > 0 ? result[result.length - 1] : 0;
    return isNaN(val) ? 0 : val;
}

function calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) return 50;
    const changes = prices.slice(1).map((price, i) => price - prices[i]);
    const gains = changes.map(change => change > 0 ? change : 0);
    const losses = changes.map(change => change < 0 ? -change : 0);
    const avgGain = gains.slice(-period).reduce((a, b) => a + b, 0) / period;
    const avgLoss = losses.slice(-period).reduce((a, b) => a + b, 0) / period;
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    return isNaN(rsi) ? 50 : rsi;
}

function calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    if (prices.length < slowPeriod) {
        return { macd: 0, signal: 0, histogram: 0 };
    }
    const fastEMA = prices.slice(-fastPeriod).reduce((a, b) => a + b, 0) / fastPeriod;
    const slowEMA = prices.slice(-slowPeriod).reduce((a, b) => a + b, 0) / slowPeriod;
    const macd = fastEMA - slowEMA;
    const signal = prices.slice(-signalPeriod).reduce((a, b) => a + b, 0) / signalPeriod;
    const histogram = macd - signal;
    return {
        macd: isNaN(macd) ? 0 : macd,
        signal: isNaN(signal) ? 0 : signal,
        histogram: isNaN(histogram) ? 0 : histogram
    };
}

function calculateBollingerBands(prices, period = 20, stdDev = 2) {
    if (prices.length < period) {
        return {
            upper: prices[prices.length - 1],
            middle: prices[prices.length - 1],
            lower: prices[prices.length - 1]
        };
    }
    const sma = prices.slice(-period).reduce((a, b) => a + b, 0) / period;
    const squaredDiffs = prices.slice(-period).map(price => Math.pow(price - sma, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period;
    const standardDeviation = Math.sqrt(variance);
    const upper = sma + (standardDeviation * stdDev);
    const lower = sma - (standardDeviation * stdDev);
    return {
        upper: isNaN(upper) ? sma : upper,
        middle: isNaN(sma) ? prices[prices.length - 1] : sma,
        lower: isNaN(lower) ? sma : lower
    };
}

// Simplified technical indicators to avoid NaN issues
function calculateIchimokuCloud(high, low, close, conversionPeriod = 9, basePeriod = 26, spanPeriod = 52) {
    if (high.length < spanPeriod || low.length < spanPeriod) {
        return {
            conversion: close[close.length - 1],
            base: close[close.length - 1],
            spanA: close[close.length - 1],
            spanB: close[close.length - 1]
        };
    }

    const conversion = (Math.max(...high.slice(-conversionPeriod)) + Math.min(...low.slice(-conversionPeriod))) / 2;
    const base = (Math.max(...high.slice(-basePeriod)) + Math.min(...low.slice(-basePeriod))) / 2;
    const spanA = (conversion + base) / 2;
    const spanB = (Math.max(...high.slice(-spanPeriod)) + Math.min(...low.slice(-spanPeriod))) / 2;

    return {
        conversion: isNaN(conversion) ? close[close.length - 1] : conversion,
        base: isNaN(base) ? close[close.length - 1] : base,
        spanA: isNaN(spanA) ? close[close.length - 1] : spanA,
        spanB: isNaN(spanB) ? close[close.length - 1] : spanB
    };
}

function calculateMFI(high, low, close, volume, period = 14) {
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
    
    const mfi = 100 - (100 / (1 + positiveFlow / negativeFlow));
    return isNaN(mfi) ? 50 : mfi;
}

function calculateVWAP(high, low, close, volume, period = 14) {
    if (high.length < period || low.length < period || close.length < period || volume.length < period) {
        return close[close.length - 1];
    }

    const typicalPrices = close.map((c, i) => (high[i] + low[i] + c) / 3);
    const volumePrice = typicalPrices.map((tp, i) => tp * volume[i]);
    
    const sumVolumePrice = volumePrice.slice(-period).reduce((a, b) => a + b, 0);
    const sumVolume = volume.slice(-period).reduce((a, b) => a + b, 0);
    
    const vwap = sumVolumePrice / sumVolume;
    return isNaN(vwap) ? close[close.length - 1] : vwap;
}

function calculateVolumeProfile(high, low, close, volume, numBins = 10) {
    if (high.length < 2 || low.length < 2 || close.length < 2 || volume.length < 2) {
        return {
            poc: close[close.length - 1],
            valueAreaHigh: high[high.length - 1],
            valueAreaLow: low[low.length - 1]
        };
    }

    const priceRange = Math.max(...high) - Math.min(...low);
    const binSize = priceRange / numBins;
    
    if (binSize === 0) {
        return {
            poc: close[close.length - 1],
            valueAreaHigh: high[high.length - 1],
            valueAreaLow: low[low.length - 1]
        };
    }

    const typicalPrices = close.map((c, i) => (high[i] + low[i] + c) / 3);
    const poc = typicalPrices[typicalPrices.length - 1];
    const valueAreaHigh = Math.max(...high.slice(-10));
    const valueAreaLow = Math.min(...low.slice(-10));

    return {
        poc: isNaN(poc) ? close[close.length - 1] : poc,
        valueAreaHigh: isNaN(valueAreaHigh) ? high[high.length - 1] : valueAreaHigh,
        valueAreaLow: isNaN(valueAreaLow) ? low[low.length - 1] : valueAreaLow
    };
}

// Simplified support/resistance calculation
function findSupportResistanceLevels(high, low, close, volume, lookbackPeriod = 20) {
    if (high.length < lookbackPeriod || low.length < lookbackPeriod) {
        return { support: [], resistance: [] };
    }

    const recentHighs = high.slice(-lookbackPeriod);
    const recentLows = low.slice(-lookbackPeriod);
    const currentPrice = close[close.length - 1];

    // Simple support and resistance levels
    const resistance = Math.max(...recentHighs);
    const support = Math.min(...recentLows);

    return {
        support: [support],
        resistance: [resistance]
    };
}

function calculateDynamicLevels(close, period = 20) {
    if (close.length < period) {
        return { upper: close[close.length - 1], lower: close[close.length - 1] };
    }

    const recentPrices = close.slice(-period);
    const upper = Math.max(...recentPrices);
    const lower = Math.min(...recentPrices);

    return {
        upper: isNaN(upper) ? close[close.length - 1] : upper,
        lower: isNaN(lower) ? close[close.length - 1] : lower
    };
}

function calculateStandardDeviation(prices, period) {
    if (prices.length < period) return 0;
    const recentPrices = prices.slice(-period);
    const mean = recentPrices.reduce((a, b) => a + b, 0) / period;
    const squaredDiffs = recentPrices.map(price => Math.pow(price - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period;
    return Math.sqrt(variance);
}

function normalizeFeaturesMatrix(matrix) {
    if (matrix.length === 0) return matrix;
    
    const numFeatures = matrix[0].length;
    const normalizedMatrix = [];
    
    for (let i = 0; i < matrix.length; i++) {
        const normalizedRow = [];
        for (let j = 0; j < numFeatures; j++) {
            const value = matrix[i][j];
            // Handle NaN and infinite values
            if (isNaN(value) || !isFinite(value)) {
                normalizedRow.push(0);
            } else {
                normalizedRow.push(value);
            }
        }
        normalizedMatrix.push(normalizedRow);
    }
    
    return normalizedMatrix;
}

async function fetchData(symbol) {
    try {
        const rows = await query(
            `SELECT * FROM historical_data 
             WHERE symbol = ? 
             AND timeframe IN ('1h', '4h', '1d')
             ORDER BY timestamp DESC
             LIMIT 200`,
            [symbol]
        );
        
        if (!rows || rows.length === 0) {
            console.log(`No data found for ${symbol}`);
            return null;
        }
        
        console.log(`Fetched ${rows.length} records for ${symbol}`);
        return rows.reverse(); // Reverse to get chronological order
    } catch (error) {
        console.error(`Error fetching data for ${symbol}:`, error);
        return null;
    }
}

// Prepare data for ML model
function prepareData(data) {
    if (!data || data.length === 0) {
        throw new Error('No data available for training');
    }

    console.log('Preparing data for ML model...');
    
    // Use last 100 candles for better performance
    const optimizedData = data.slice(-100);
    
    // Extract price data with proper error handling
    const prices = optimizedData.map(row => {
        const price = parseFloat(row.price);
        return isNaN(price) ? 0 : price;
    });
    
    const volumes = optimizedData.map(row => {
        const volume = parseFloat(row.volume);
        return isNaN(volume) ? 0 : volume;
    });
    
    const highs = optimizedData.map(row => {
        const high = parseFloat(row.high || row.price);
        return isNaN(high) ? parseFloat(row.price) : high;
    });
    
    const lows = optimizedData.map(row => {
        const low = parseFloat(row.low || row.price);
        return isNaN(low) ? parseFloat(row.price) : low;
    });

    // Calculate technical indicators with error handling
    const rsi = calculateRSI(prices);
    const macd = calculateMACD(prices);
    const bb = calculateBollingerBands(prices);
    const ema = calculateEMA(prices);
    const sma = calculateSMA(prices);
    const stoch = calculateStochastic(highs, lows, prices);
    const adx = calculateADX(highs, lows, prices);
    const cci = calculateCCI(highs, lows, prices);
    const willr = calculateWilliamsR(highs, lows, prices);
    const psar = calculateParabolicSAR(highs, lows);
    const atr = calculateATR(highs, lows, prices);
    const obv = calculateOBV(prices, volumes);
    const ichimoku = calculateIchimokuCloud(highs, lows, prices);
    const mfi = calculateMFI(highs, lows, prices, volumes);
    const vwap = calculateVWAP(highs, lows, prices, volumes);
    const volumeProfile = calculateVolumeProfile(highs, lows, prices, volumes);
    
    // Calculate Fibonacci indicators
    const fibRetracement = fibonacciIndicators.calculateFibonacciRetracement(highs, lows);
    const fibExtension = fibonacciIndicators.calculateFibonacciExtension(highs, lows, prices);
    const fibTimeZones = fibonacciIndicators.calculateFibonacciTimeZones(prices);
    const fibFan = fibonacciIndicators.calculateFibonacciFan(highs, lows, prices);
    const fibArc = fibonacciIndicators.calculateFibonacciArc(highs, lows, prices);
    const fibStrength = fibonacciIndicators.calculateFibonacciStrength(highs, lows, prices);
    const goldenRatio = fibonacciIndicators.calculateGoldenRatioAnalysis(highs, lows, prices);
    
    // Calculate Harmonic Patterns
    const harmonicAnalysis = harmonicPatterns.analyzeHarmonicPatterns(highs, lows, prices);
    
    // Calculate Advanced Momentum Indicators
    const momentumAnalysis = advancedMomentum.analyzeMomentum(highs, lows, prices, volumes);
    
    // Calculate Volatility Analysis
    const volatilityAnalysis = volatilityAnalysis.analyzeVolatility(highs, lows, prices, volumes);
    
    // Calculate Risk Management Metrics
    const riskAnalysis = riskManagement.analyzeRisk(prices);
    
    const features = optimizedData.map((row, index) => {
        const price = prices[index];
        const volume = volumes[index];
        
        // Price momentum
        const priceChange = index > 0 ? price - prices[index - 1] : 0;
        const priceChangePercent = index > 0 && prices[index - 1] !== 0 ? (priceChange / prices[index - 1]) * 100 : 0;
        
        // Volume momentum
        const volumeChange = index > 0 ? volume - volumes[index - 1] : 0;
        const volumeChangePercent = index > 0 && volumes[index - 1] !== 0 ? (volumeChange / volumes[index - 1]) * 100 : 0;
        
        return [
            price || 0,
            volume || 0,
            priceChange || 0,
            priceChangePercent || 0,
            volumeChange || 0,
            volumeChangePercent || 0,
            rsi || 50,
            macd.macd || 0,
            macd.signal || 0,
            macd.histogram || 0,
            bb.upper || price,
            bb.middle || price,
            bb.lower || price,
            ema || price,
            sma || price,
            stoch.k || 50,
            stoch.d || 50,
            adx || 20,
            cci || 0,
            willr || -50,
            psar || price,
            atr || 0,
            obv || 0,
            ichimoku.conversion || price,
            ichimoku.base || price,
            ichimoku.spanA || price,
            ichimoku.spanB || price,
            mfi || 50,
            vwap || price,
            volumeProfile.poc || price,
            volumeProfile.valueAreaHigh || price,
            volumeProfile.valueAreaLow || price,
            // Fibonacci Retracement Levels
            fibRetracement.level0 || price,
            fibRetracement.level236 || price,
            fibRetracement.level382 || price,
            fibRetracement.level500 || price,
            fibRetracement.level618 || price,
            fibRetracement.level786 || price,
            fibRetracement.level100 || price,
            // Fibonacci Extension Levels
            fibExtension.ext1272 || price,
            fibExtension.ext1618 || price,
            fibExtension.ext2618 || price,
            fibExtension.ext4236 || price,
            // Fibonacci Time Zones
            fibTimeZones.timeZone1 || price,
            fibTimeZones.timeZone2 || price,
            fibTimeZones.timeZone3 || price,
            fibTimeZones.timeZone5 || price,
            fibTimeZones.timeZone8 || price,
            fibTimeZones.timeZone13 || price,
            // Fibonacci Fan Lines
            fibFan.fan236 || price,
            fibFan.fan382 || price,
            fibFan.fan500 || price,
            fibFan.fan618 || price,
            fibFan.fan786 || price,
            // Fibonacci Arc Levels
            fibArc.arc236 || price,
            fibArc.arc382 || price,
            fibArc.arc500 || price,
            fibArc.arc618 || price,
            // Fibonacci Strength Analysis
            fibStrength.supportStrength || 0,
            fibStrength.resistanceStrength || 0,
            fibStrength.nearestLevel || price,
            fibStrength.levelDistance || 0,
            // Golden Ratio Analysis
            goldenRatio.goldenRatio || 1.618,
            goldenRatio.goldenRatioInverse || 0.618,
            goldenRatio.priceToGoldenRatio || 1,
            goldenRatio.goldenRatioStrength || 0,
            // Harmonic Patterns
            harmonicAnalysis.strongestConfidence || 0,
            harmonicAnalysis.hasPattern ? 1 : 0,
            harmonicAnalysis.patternCount || 0,
            // Advanced Momentum Indicators
            momentumAnalysis.roc || 0,
            momentumAnalysis.momentum || 0,
            momentumAnalysis.cci || 0,
            momentumAnalysis.williamsR || -50,
            momentumAnalysis.stochRSI.k || 50,
            momentumAnalysis.stochRSI.d || 50,
            momentumAnalysis.ultimateOsc || 50,
            momentumAnalysis.mfi || 50,
            momentumAnalysis.tsi || 0,
            momentumAnalysis.cmo || 0,
            momentumAnalysis.dpo || 0,
            momentumAnalysis.momentumStrength || 0,
            momentumAnalysis.isBullish ? 1 : 0,
            momentumAnalysis.isBearish ? 1 : 0,
            // Volatility Analysis
            volatilityAnalysis.historicalVol || 0,
            volatilityAnalysis.parkinsonVol || 0,
            volatilityAnalysis.garmanKlassVol || 0,
            volatilityAnalysis.rogersSatchellVol || 0,
            volatilityAnalysis.atr || 0,
            volatilityAnalysis.volRatio || 1,
            volatilityAnalysis.chaikinVol || 0,
            volatilityAnalysis.vix || 0,
            volatilityAnalysis.bbWidth || 0,
            volatilityAnalysis.keltnerWidth || 0,
            volatilityAnalysis.breakout.isBreakout ? 1 : 0,
            volatilityAnalysis.breakout.strength || 0,
            volatilityAnalysis.isHighVolatility ? 1 : 0,
            volatilityAnalysis.isLowVolatility ? 1 : 0,
            volatilityAnalysis.isVolatilityIncreasing ? 1 : 0,
            volatilityAnalysis.isVolatilityDecreasing ? 1 : 0,
            // Risk Management
            riskAnalysis.var95 || 0,
            riskAnalysis.var99 || 0,
            riskAnalysis.cvar95 || 0,
            riskAnalysis.maxDrawdown || 0,
            riskAnalysis.sharpeRatio || 0,
            riskAnalysis.sortinoRatio || 0,
            riskAnalysis.calmarRatio || 0,
            riskAnalysis.riskAdjustedReturn || 0,
            riskAnalysis.volatility || 0,
            riskAnalysis.riskLevel === 'high' ? 1 : riskAnalysis.riskLevel === 'medium' ? 0.5 : 0,
            riskAnalysis.isHighRisk ? 1 : 0,
            riskAnalysis.isLowRisk ? 1 : 0,
            riskAnalysis.riskScore || 0
        ];
    });

    // Normalize features
    const normalizedFeatures = normalizeFeaturesMatrix(features);
    
    // Create labels based on future price movement
    const labelLookahead = 5;
    const labelThreshold = 0.01;
    const labels = optimizedData.map((row, index) => {
        if (index >= optimizedData.length - labelLookahead) return 0.5;
        const currentPrice = prices[index];
        const futurePrice = prices[index + labelLookahead];
        if (!currentPrice || !futurePrice || currentPrice === 0) return 0.5;
        const pctChange = (futurePrice - currentPrice) / currentPrice;
        if (pctChange > labelThreshold) return 1;
        if (pctChange < -labelThreshold) return 0;
        return 0.5;
    });

    console.log(`Prepared ${normalizedFeatures.length} samples for training`);
    return { features: normalizedFeatures, labels };
}

// Create and compile model
function createModel(inputShape) {
    const model = tf.sequential();
    
    model.add(tf.layers.dense({
        units: 64,
        activation: 'relu',
        inputShape: [inputShape]
    }));
    model.add(tf.layers.dropout(0.2));
    
    model.add(tf.layers.dense({
        units: 32,
        activation: 'relu'
    }));
    model.add(tf.layers.dropout(0.1));
    
    model.add(tf.layers.dense({
        units: 1,
        activation: 'sigmoid'
    }));
    
    model.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'binaryCrossentropy',
        metrics: ['accuracy']
    });
    
    return model;
}

// Train ML model
async function trainModel(features, labels) {    
    const model = createModel(features[0].length);
    
    const earlyStopping = tf.callbacks.earlyStopping({
        monitor: 'val_loss',
        patience: 5,
        verbose: 1
    });
    
    await model.fit(tf.tensor2d(features), tf.tensor1d(labels), {
        epochs: 50,
        batchSize: 16,
        validationSplit: 0.2,
        shuffle: true,
        callbacks: {
            onEpochEnd: (epoch, logs) => {
                if ((epoch + 1) % 10 === 0 || epoch === 49) {
                    console.log(`Epoch ${epoch + 1} / 50`);
                }
            },
            earlyStopping
        }
    });
    
    return model;
}

// Find best trade points
function findBestTrade(data) {
    if (!data || data.length === 0) {
        return {
            buyPrice: 0,
            buyTime: new Date(),
            sellPrice: 0,
            sellTime: new Date(),
            profit: 0
        };
    }

    let minPrice = parseFloat(data[0].price) || 0;
    let minIndex = 0;
    let maxProfit = 0;
    let buyIndex = 0;
    let sellIndex = 0;
    
    for (let i = 1; i < data.length; i++) {
        const price = parseFloat(data[i].price) || 0;
        if (price < minPrice && price > 0) {
            minPrice = price;
            minIndex = i;
        }
        const profit = price - minPrice;
        if (profit > maxProfit) {
            maxProfit = profit;
            buyIndex = minIndex;
            sellIndex = i;
        }
    }
    
    return {
        buyPrice: parseFloat(data[buyIndex]?.price) || 0,
        buyTime: data[buyIndex]?.timestamp || new Date(),
        sellPrice: parseFloat(data[sellIndex]?.price) || 0,
        sellTime: data[sellIndex]?.timestamp || new Date(),
        profit: maxProfit
    };
}

// Generate predictions
async function generatePredictions(symbol) {
    try {
        console.log(`\nGenerating predictions for ${symbol}...`);
        
        const data = await fetchData(symbol);
        if (!data || data.length === 0) {
            console.log(`No data available for ${symbol}`);
            return null;
        }

        const preparedData = prepareData(data);
        const features = preparedData.features;
        const labels = preparedData.labels;

        if (features.length === 0 || labels.length === 0) {
            console.log(`Insufficient data for ${symbol}`);
            return null;
        }

        // Minimum data requirement
        if (features.length < 10) {
            console.log(`Insufficient data for ${symbol}: ${features.length} samples`);
            return null;
        }

        const model = createModel(features[0].length);
        
        // Train model with validation
        const validationSplit = 0.3;
        const trainSize = Math.floor(features.length * (1 - validationSplit));
        
        const trainFeatures = features.slice(0, trainSize);
        const trainLabels = labels.slice(0, trainSize);
        const valFeatures = features.slice(trainSize);
        const valLabels = labels.slice(trainSize);

        if (trainFeatures.length < 5 || valFeatures.length < 2) {
            console.log(`Insufficient training data for ${symbol}`);
            return null;
        }

        // Train model
        const history = await model.fit(tf.tensor2d(trainFeatures), tf.tensor1d(trainLabels), {
            epochs: 30,
            batchSize: Math.min(8, trainFeatures.length),
            validationData: [tf.tensor2d(valFeatures), tf.tensor1d(valLabels)],
            shuffle: true,
            verbose: 0
        });

        // Get validation accuracy for confidence calculation
        const valAccuracy = history.history.val_acc ? history.history.val_acc[history.history.val_acc.length - 1] : 0.5;
        const trainAccuracy = history.history.acc ? history.history.acc[history.history.acc.length - 1] : 0.5;
        
        // Calculate realistic confidence based on model performance
        const baseConfidence = Math.min(valAccuracy * 0.8, trainAccuracy * 0.8); // Reduce base confidence
        const overfittingPenalty = Math.max(0, trainAccuracy - valAccuracy) * 0.8; // Increase penalty
        let realisticConfidence = Math.max(0.1, Math.min(0.9, baseConfidence - overfittingPenalty));

        // Make prediction
        const lastFeatures = features[features.length - 1];
        const prediction = model.predict(tf.tensor2d([lastFeatures]));
        const rawConfidence = prediction.dataSync()[0];

        // Validate confidence value
        if (isNaN(rawConfidence) || !isFinite(rawConfidence)) {
            console.log(`Invalid confidence value for ${symbol}: ${rawConfidence}`);
            return null;
        }

        // Calculate final confidence with more conservative bounds
        const signalStrength = Math.abs(rawConfidence - 0.5) * 2; // 0 to 1
        realisticConfidence = realisticConfidence * (0.7 + signalStrength * 0.3); // Adjust based on signal strength
        const finalConfidence = Math.max(10, Math.min(75, realisticConfidence * 100)); // Cap at 75%
        
        // Determine signal based on confidence and trend
        let signal = 'HOLD';
        const strongSignalThreshold = 0.65;
        const weakSignalThreshold = 0.55;
        
        if (finalConfidence > 60) {
            if (rawConfidence > strongSignalThreshold) signal = 'BUY';
            else if (rawConfidence < (1 - strongSignalThreshold)) signal = 'SELL';
        } else if (finalConfidence > 40) {
            if (rawConfidence > weakSignalThreshold) signal = 'BUY';
            else if (rawConfidence < (1 - weakSignalThreshold)) signal = 'SELL';
        }

        // Calculate support and resistance levels
        const highs = data.map(d => parseFloat(d.high || d.price) || 0);
        const lows = data.map(d => parseFloat(d.low || d.price) || 0);
        const closes = data.map(d => parseFloat(d.price) || 0);
        const volumes = data.map(d => parseFloat(d.volume) || 0);

        const supportResistance = findSupportResistanceLevels(highs, lows, closes, volumes);
        const dynamicLevels = calculateDynamicLevels(closes);
        const bestTrade = findBestTrade(data);

        // Calculate Fibonacci levels for enhanced analysis
        const fibRetracement = fibonacciIndicators.calculateFibonacciRetracement(highs, lows);
        const fibExtension = fibonacciIndicators.calculateFibonacciExtension(highs, lows, closes);
        const fibStrength = fibonacciIndicators.calculateFibonacciStrength(highs, lows, closes);
        const goldenRatio = fibonacciIndicators.calculateGoldenRatioAnalysis(highs, lows, closes);

        // Calculate advanced analyses
        const harmonicAnalysis = harmonicPatterns.analyzeHarmonicPatterns(highs, lows, closes);
        const momentumAnalysis = advancedMomentum.analyzeMomentum(highs, lows, closes, volumes);
        const volatilityAnalysis = volatilityAnalysis.analyzeVolatility(highs, lows, closes, volumes);
        const riskAnalysis = riskManagement.analyzeRisk(closes);

        const currentPrice = parseFloat(data[data.length - 1].price) || 0;
        
        // Calculate more realistic price prediction
        const volatility = calculateStandardDeviation(closes, 20) / currentPrice;
        const maxChange = Math.min(volatility * 2, 0.03); // Cap at 3%
        const priceChange = (rawConfidence - 0.5) * maxChange;
        const predictedPrice = currentPrice * (1 + priceChange);

        // Calculate profit potential based on volatility
        const profitPotential = Math.abs(priceChange) * 100;

        // Enhanced Fibonacci-based analysis
        const fibLevels = [
            fibRetracement.level0, fibRetracement.level236, fibRetracement.level382,
            fibRetracement.level500, fibRetracement.level618, fibRetracement.level786, fibRetracement.level100
        ];
        
        // Find nearest Fibonacci support and resistance
        const nearestFibSupport = Math.max(...fibLevels.filter(level => level <= currentPrice));
        const nearestFibResistance = Math.min(...fibLevels.filter(level => level >= currentPrice));
        
        // Calculate enhanced confidence with multiple factors
        const fibConfidenceBoost = fibStrength.goldenRatioStrength * 10; // Up to 10% boost
        const harmonicConfidenceBoost = harmonicAnalysis.strongestConfidence * 0.1; // Up to 10% boost
        const momentumConfidenceBoost = momentumAnalysis.momentumStrength * 0.05; // Up to 5% boost
        const volatilityConfidenceBoost = volatilityAnalysis.isLowVolatility ? 5 : volatilityAnalysis.isHighVolatility ? -5 : 0; // Volatility adjustment
        const riskConfidenceBoost = riskAnalysis.isLowRisk ? 3 : riskAnalysis.isHighRisk ? -3 : 0; // Risk adjustment
        
        const totalConfidenceBoost = fibConfidenceBoost + harmonicConfidenceBoost + momentumConfidenceBoost + 
                                   volatilityConfidenceBoost + riskConfidenceBoost;
        const enhancedConfidence = Math.min(90, Math.max(10, finalConfidence + totalConfidenceBoost));

        console.log(`✓ ${symbol}: ${enhancedConfidence.toFixed(1)}% confidence, ${signal} signal, ${profitPotential.toFixed(2)}% potential`);
        console.log(`  Fibonacci: Support ${nearestFibSupport.toFixed(4)}, Resistance ${nearestFibResistance.toFixed(4)}, Strength ${(fibStrength.goldenRatioStrength * 100).toFixed(1)}%`);
        console.log(`  Harmonic: ${harmonicAnalysis.strongestPattern} (${harmonicAnalysis.strongestConfidence.toFixed(1)}%), Momentum: ${momentumAnalysis.isBullish ? 'Bullish' : momentumAnalysis.isBearish ? 'Bearish' : 'Neutral'}`);
        console.log(`  Volatility: ${volatilityAnalysis.volRegime}, Risk: ${riskAnalysis.riskLevel}, VIX: ${volatilityAnalysis.vix.toFixed(1)}`);

        return {
            symbol,
            confidence: enhancedConfidence,
            prediction: signal,
            timestamp: new Date(),
            currentPrice,
            predictedPrice,
            profit: profitPotential,
            supportLevels: [...supportResistance.support, nearestFibSupport],
            resistanceLevels: [...supportResistance.resistance, nearestFibResistance],
            dynamicLevels,
            fibonacciLevels: {
                retracement: fibRetracement,
                extension: fibExtension,
                strength: fibStrength,
                goldenRatio: goldenRatio,
                nearestSupport: nearestFibSupport,
                nearestResistance: nearestFibResistance
            },
            harmonicPatterns: harmonicAnalysis,
            momentumAnalysis: momentumAnalysis,
            volatilityAnalysis: volatilityAnalysis,
            riskAnalysis: riskAnalysis,
            buyPrice: bestTrade.buyPrice,
            buyTime: bestTrade.buyTime,
            sellPrice: bestTrade.sellPrice,
            sellTime: bestTrade.sellTime
        };
    } catch (error) {
        console.error(`Prediction error for ${symbol}:`, error.message);
        return null;
    }
}

// Main function
async function main() {
    try {
        console.log('Starting ML prediction process...');
        
        // Get all available symbols from coin_pairs table
        const pairs = await query('SELECT symbol FROM coin_pairs ORDER BY id ASC');
        console.log(`Found ${pairs.length} symbols to analyze`);
        
        const skippedCoins = [];
        const watchedCoins = [];
        let processedCount = 0;

        // Process each symbol with timeout and error handling
        for (const row of pairs) {
            try {
                processedCount++;
                console.log(`\n[${processedCount}/${pairs.length}] Analyzing ${row.symbol}...`);
                
                // Add timeout for each symbol
                const result = await Promise.race([
                    generatePredictions(row.symbol),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Timeout')), 30000)
                    )
                ]);
                
                if (result) {
                    // Validate all numeric values
                    const confidence = Number(result.confidence);
                    const profit = Number(result.profit);
                    const currentPrice = Number(result.currentPrice);
                    const predictedPrice = Number(result.predictedPrice);
                    
                    if (isNaN(confidence) || isNaN(profit) || isNaN(currentPrice) || isNaN(predictedPrice)) {
                        console.warn(`SKIP: Invalid numeric values for ${result.symbol}`);
                        skippedCoins.push(result.symbol);
                        continue;
                    }
                    
                    // Add to watch list if confidence >= 50%
                    if (confidence >= 50) {
                        watchedCoins.push(result.symbol);
                    }
                    
                    try {
                        const predictionDate = moment(result.timestamp).format('YYYY-MM-DD HH:mm:ss');
                        const sql = `INSERT INTO prediction_performance 
                             (symbol, prediction_date, predicted_signal, confidence, actual_price, predicted_price, profit_loss, 
                              buy_price, buy_time, sell_price, sell_time,
                              fib_level_0, fib_level_236, fib_level_382, fib_level_500, fib_level_618, fib_level_786, fib_level_100,
                              fib_ext_1272, fib_ext_1618, fib_ext_2618, fib_ext_4236,
                              fib_support_strength, fib_resistance_strength, fib_nearest_level, fib_level_distance,
                              fib_golden_ratio_strength, fib_nearest_support, fib_nearest_resistance,
                              fib_confidence_boost, enhanced_confidence)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                             ON DUPLICATE KEY UPDATE 
                             predicted_signal=VALUES(predicted_signal), 
                             confidence=VALUES(confidence), 
                             actual_price=VALUES(actual_price), 
                             predicted_price=VALUES(predicted_price), 
                             profit_loss=VALUES(profit_loss), 
                             buy_price=VALUES(buy_price), 
                             buy_time=VALUES(buy_time), 
                             sell_price=VALUES(sell_price), 
                             sell_time=VALUES(sell_time),
                             fib_level_0=VALUES(fib_level_0),
                             fib_level_236=VALUES(fib_level_236),
                             fib_level_382=VALUES(fib_level_382),
                             fib_level_500=VALUES(fib_level_500),
                             fib_level_618=VALUES(fib_level_618),
                             fib_level_786=VALUES(fib_level_786),
                             fib_level_100=VALUES(fib_level_100),
                             fib_ext_1272=VALUES(fib_ext_1272),
                             fib_ext_1618=VALUES(fib_ext_1618),
                             fib_ext_2618=VALUES(fib_ext_2618),
                             fib_ext_4236=VALUES(fib_ext_4236),
                             fib_support_strength=VALUES(fib_support_strength),
                             fib_resistance_strength=VALUES(fib_resistance_strength),
                             fib_nearest_level=VALUES(fib_nearest_level),
                             fib_level_distance=VALUES(fib_level_distance),
                             fib_golden_ratio_strength=VALUES(fib_golden_ratio_strength),
                             fib_nearest_support=VALUES(fib_nearest_support),
                             fib_nearest_resistance=VALUES(fib_nearest_resistance),
                             fib_confidence_boost=VALUES(fib_confidence_boost),
                             enhanced_confidence=VALUES(enhanced_confidence)`;
                        
                        const params = [
                            result.symbol,
                            predictionDate,
                            result.prediction,
                            confidence,
                            currentPrice,
                            predictedPrice,
                            profit,
                            result.buyPrice,
                            result.buyTime,
                            result.sellPrice,
                            result.sellTime,
                            // Fibonacci Retracement Levels
                            result.fibonacciLevels.retracement.level0,
                            result.fibonacciLevels.retracement.level236,
                            result.fibonacciLevels.retracement.level382,
                            result.fibonacciLevels.retracement.level500,
                            result.fibonacciLevels.retracement.level618,
                            result.fibonacciLevels.retracement.level786,
                            result.fibonacciLevels.retracement.level100,
                            // Fibonacci Extension Levels
                            result.fibonacciLevels.extension.ext1272,
                            result.fibonacciLevels.extension.ext1618,
                            result.fibonacciLevels.extension.ext2618,
                            result.fibonacciLevels.extension.ext4236,
                            // Fibonacci Analysis
                            result.fibonacciLevels.strength.supportStrength,
                            result.fibonacciLevels.strength.resistanceStrength,
                            result.fibonacciLevels.strength.nearestLevel,
                            result.fibonacciLevels.strength.levelDistance,
                            result.fibonacciLevels.goldenRatio.goldenRatioStrength,
                            result.fibonacciLevels.nearestSupport,
                            result.fibonacciLevels.nearestResistance,
                            // Fibonacci Confidence Boost
                            fibConfidenceBoost,
                            enhancedConfidence
                        ];
               
                        await query(sql, params);
                        console.log(`✓ Saved prediction for ${result.symbol} (${enhancedConfidence.toFixed(2)}% confidence)`);
                    } catch (e) {
                        console.error(`DB save error for ${result.symbol}:`, e.message);
                    }
                } else {
                    console.log(`No prediction generated for ${row.symbol}`);
                }
                
                // Add delay between symbols to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                console.error(`Error analyzing ${row.symbol}:`, error.message);
                skippedCoins.push(row.symbol);
                continue;
            }
        }
        
        console.log('\n=== SUMMARY ===');
        console.log(`Processed: ${processedCount}/${pairs.length} symbols`);
        console.log(`Skipped coins:`, skippedCoins);
        console.log(`Watch list coins (50%+ confidence):`, watchedCoins);

        // Update watch list
        for (const symbol of watchedCoins) {
            try {
                const confRow = await query(
                    'SELECT confidence FROM prediction_performance WHERE symbol = ? ORDER BY prediction_date DESC LIMIT 1', 
                    [symbol]
                );
                const confidence = confRow.length > 0 ? confRow[0].confidence : 0;
                
                await query(
                    `INSERT INTO watch_list (symbol, confidence, last_update)
                     VALUES (?, ?, NOW())
                     ON DUPLICATE KEY UPDATE confidence=VALUES(confidence), last_update=NOW()`,
                    [symbol, confidence]
                );
                console.log(`✓ Updated watch list: ${symbol} (${confidence}% confidence)`);
            } catch (e) {
                console.error(`Watch list update error for ${symbol}:`, e.message);
            }
        }
        
        console.log('\nML prediction process completed successfully!');
        
    } catch (error) {
        console.error('Error in main process:', error);
    } finally {
        process.exit(0);
    }
}

// Run the script
main(); 