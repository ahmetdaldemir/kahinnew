require('dotenv').config();
const tf = require('@tensorflow/tfjs-node');
const { query } = require('../db');
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
    if (prices.length < period + 1) return 50; // Default value if not enough data
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

// Fetch data from database
async function fetchData(symbol) {
    const rows = await query(
        `SELECT * FROM historical_data WHERE symbol = ? ORDER BY timestamp`,
        [symbol]
    );
    return rows;
}

// Prepare data for ML model
function prepareData(data) {
    if (data.length === 0) {
        throw new Error('No data available for training');
    }

    console.log('Preparing data for ML model...');
    
    // Calculate additional features
    const prices = data.map(row => parseFloat(row.price));
    const volumes = data.map(row => parseFloat(row.volume));
    const highs = data.map(row => parseFloat(row.high || row.price));
    const lows = data.map(row => parseFloat(row.low || row.price));
    
    const features = data.map((row, index) => {
        const price = parseFloat(row.price);
        const volume = parseFloat(row.volume);
        
        // Price momentum
        const priceChange = index > 0 ? price - parseFloat(data[index - 1].price) : 0;
        const priceChangePercent = index > 0 ? (priceChange / parseFloat(data[index - 1].price)) * 100 : 0;
        
        // Volume momentum
        const volumeChange = index > 0 ? volume - parseFloat(data[index - 1].volume) : 0;
        const volumeChangePercent = index > 0 ? (volumeChange / parseFloat(data[index - 1].volume)) * 100 : 0;
        
        // Technical indicators
        const rsi = calculateRSI(prices.slice(0, index + 1));
        const { macd, signal, histogram } = calculateMACD(prices.slice(0, index + 1));
        const { upper, middle, lower } = calculateBollingerBands(prices.slice(0, index + 1));
        
        // Additional technical indicators
        const ema = calculateEMA(prices.slice(0, index + 1));
        const sma = calculateSMA(prices.slice(0, index + 1));
        const stoch = calculateStochastic(highs.slice(0, index + 1), lows.slice(0, index + 1), prices.slice(0, index + 1));
        const adx = calculateADX(highs.slice(0, index + 1), lows.slice(0, index + 1), prices.slice(0, index + 1));
        const cci = calculateCCI(highs.slice(0, index + 1), lows.slice(0, index + 1), prices.slice(0, index + 1));
        const willr = calculateWilliamsR(highs.slice(0, index + 1), lows.slice(0, index + 1), prices.slice(0, index + 1));
        const psar = calculateParabolicSAR(highs.slice(0, index + 1), lows.slice(0, index + 1));
        const atr = calculateATR(highs.slice(0, index + 1), lows.slice(0, index + 1), prices.slice(0, index + 1));
        const obv = calculateOBV(prices.slice(0, index + 1), volumes.slice(0, index + 1));
        
        return [
            price,
            volume,
            priceChange,
            priceChangePercent,
            volumeChange,
            volumeChangePercent,
            rsi,
            macd,
            signal,
            histogram,
            upper,
            middle,
            lower,
            ema,
            sma,
            stoch.k,
            stoch.d,
            adx,
            cci,
            willr,
            psar,
            atr,
            obv
        ];
    });

    // Normalize features
    const normalizedFeatures = features.map(feature => normalizeData(feature));

    // NaN'ları 0 ile değiştir
    const safeFeatures = normalizedFeatures.map(f => f.map(x => isNaN(x) ? 0 : x));

    // Create labels based on future price movement
    const labels = data.map((row, index) => {
        if (index >= data.length - 1) return 0;
        const currentPrice = parseFloat(row.price);
        const futurePrice = parseFloat(data[index + 1].price);
        return futurePrice > currentPrice ? 1 : 0;
    });

    // Feature ve label NaN kontrolü
    safeFeatures.forEach((f, i) => {
        if (f.some(Number.isNaN)) {
            console.error('NaN feature:', f, 'index:', i, 'row:', data[i]);
        }
    });
    labels.forEach((l, i) => {
        if (Number.isNaN(l)) {
            console.error('NaN label:', l, 'index:', i, 'row:', data[i]);
        }
    });

    console.log(`Prepared ${safeFeatures.length} samples for training`);
    return { features: safeFeatures, labels };
}

// Normalize data
function normalizeData(data) {
    const min = Math.min(...data);
    const max = Math.max(...data);
    if (min === max) {
        // Tüm değerler aynıysa, hepsini 0.5 yap
        return data.map(() => 0.5);
    }
    return data.map(x => (x - min) / (max - min));
}

// Train ML model
async function trainModel(features, labels) {
    // NaN kontrolü
    if (features.some(f => f.some(Number.isNaN)) || labels.some(Number.isNaN)) {
        console.error('Feature veya label içinde NaN tespit edildi!');
    }
    console.log('Training ML model...');
    
    // Create a simplified model
    const model = tf.sequential();
    
    // Input layer
    model.add(tf.layers.dense({
        units: 16,
        activation: 'relu',
        inputShape: [features[0].length],
        kernelRegularizer: tf.regularizers.l2({ l2: 0.01 }) // L2 regularization
    }));
    
    // Hidden layer
    model.add(tf.layers.dropout(0.2));
    model.add(tf.layers.dense({
        units: 8,
        activation: 'relu',
        kernelRegularizer: tf.regularizers.l2({ l2: 0.01 }) // L2 regularization
    }));
    
    // Output layer
    model.add(tf.layers.dense({
        units: 1,
        activation: 'sigmoid'
    }));
    
    // Compile model with a lower learning rate
    const learningRate = 0.001; // Düşük öğrenme oranı
    const clipValue = 1.0; // Gradyan kırpma değeri
    model.compile({
        optimizer: tf.train.adam(learningRate),
        loss: 'binaryCrossentropy',
        metrics: ['accuracy'],
        clipValue: clipValue
    });

    // Prepare data
    const xs = tf.tensor2d(features);
    const ys = tf.tensor2d(labels, [labels.length, 1]);

    // Early stopping callback
    const earlyStopping = tf.callbacks.earlyStopping({
        monitor: 'val_loss',
        patience: 5,
       // restoreBestWeights: true
    });

    // Train model
    await model.fit(xs, ys, {
        epochs: 50,
        batchSize: 32,
        validationSplit: 0.2,
        verbose: 1,
        callbacks: [earlyStopping]
    });
    
    console.log('Model training completed');

    // Save model weights to data folder
    await model.save('file://./data/model-weights');
    console.log('Model weights saved to data folder');

    // Log weights and biases during training
    const weights = model.getWeights();
 

    return model;
}

// Generate predictions
async function generatePredictions(symbol) {
    try {
        console.log(`\nGenerating predictions for ${symbol}...`);
        const data = await fetchData(symbol);
        
        if (data.length === 0) {
            console.log(`No data available for ${symbol}`);
            return null;
        }

        const { features, labels } = prepareData(data);
        const model = await trainModel(features, labels);

        const lastFeature = features[features.length - 1];
        const prediction = model.predict(tf.tensor2d([lastFeature]));
        const confidence = prediction.dataSync()[0];

        const result = {
            symbol,
            signal: confidence > 0.5 ? 'BUY' : 'SELL',
            confidence: (confidence * 100).toFixed(2),
            profit: calculateProfit(data).toFixed(2),
            currentPrice: parseFloat(data[data.length - 1].price).toFixed(2),
            predictedPrice: parseFloat(data[data.length - 1].price).toFixed(2),
            priceChange24h: calculatePriceChange(data, 24).toFixed(2),
            volume24h: calculateVolume24h(data).toFixed(2),
            lastTimestamp: data[data.length - 1].timestamp
        };

        return result;
    } catch (error) {
        console.error(`Error generating predictions for ${symbol}:`, error);
        return null;
    }
}

// Calculate profit
function calculateProfit(data) {
    const lastPrice = parseFloat(data[data.length - 1].price);
    const firstPrice = parseFloat(data[0].price);
    return ((lastPrice - firstPrice) / firstPrice) * 100;
}

// Calculate 24h price change
function calculatePriceChange(data, hours) {
    const currentPrice = parseFloat(data[data.length - 1].price);
    const pastPrice = parseFloat(data[Math.max(0, data.length - hours)].price);
    return ((currentPrice - pastPrice) / pastPrice) * 100;
}

// Calculate 24h volume
function calculateVolume24h(data) {
    return data.slice(-24).reduce((sum, row) => sum + parseFloat(row.volume), 0);
}

// Main function
async function main() {
    try {
        console.log('Starting ML prediction process...');
        
        // Get all available symbols from coin_pairs table
        const pairs = await query('SELECT symbol FROM coin_pairs');
        console.log(`Found ${pairs.length} symbols to analyze`);
        const skippedCoins = [];
        const watchedCoins = [];

        // Process each symbol
        for (const row of pairs) {
            try {
                console.log(`\nAnalyzing ${row.symbol}...`);
                const result = await generatePredictions(row.symbol);
                if (result) {
                    // NaN kontrolü
                    if (
                        isNaN(Number(result.confidence)) ||
                        isNaN(Number(result.profit)) ||
                        isNaN(Number(result.currentPrice)) ||
                        isNaN(Number(result.predictedPrice))
                    ) {
                        console.warn('SKIP: NaN prediction for', result.symbol);
                        skippedCoins.push(result.symbol);
                        continue;
                    }
                    // 50% üzeri güvene sahip coinleri takip listesine ekle
                    if (Number(result.confidence) >= 50) {
                        watchedCoins.push(result.symbol);
                    }
                    try {
                        const predictionDate = moment(result.lastTimestamp).format('YYYY-MM-DD HH:mm:ss');
                        const sql = `INSERT INTO prediction_performance (symbol, prediction_date, predicted_signal, confidence, actual_price, predicted_price, profit_loss)
                             VALUES (?, ?, ?, ?, ?, ?, ?)
                             ON DUPLICATE KEY UPDATE predicted_signal=VALUES(predicted_signal), confidence=VALUES(confidence), actual_price=VALUES(actual_price), predicted_price=VALUES(predicted_price), profit_loss=VALUES(profit_loss)`;
                        const params = [
                            result.symbol,
                            predictionDate,
                            result.signal,
                            result.confidence,
                            result.currentPrice,
                            result.predictedPrice,
                            result.profit
                        ];
               
                        await query(sql, params);
                     } catch (e) {
                        console.error(`DB kayıt hatası (${result.symbol}):`, e.message, 'Params:', params);
                    }
                }
            } catch (error) {
                console.error(`Error analyzing ${row.symbol}:`, error);
                continue;
            }
        }
        console.log('NaN nedeniyle atlanan coinler:', skippedCoins);
        console.log('Takip listesine eklenen (50%+ güven) coinler:', watchedCoins);

        // Takip listesine eklenen (50%+ güven) coinler veritabanına kaydedilsin
        for (const symbol of watchedCoins) {
            try {
                // Son confidence değerini prediction_performance tablosundan al
                const confRow = await query('SELECT confidence FROM prediction_performance WHERE symbol = ? ORDER BY prediction_date DESC LIMIT 1', [symbol]);
                const confidence = confRow.length > 0 ? confRow[0].confidence : 0;
                await query(
                    `INSERT INTO watch_list (symbol, confidence, last_update)
                     VALUES (?, ?, NOW())
                     ON DUPLICATE KEY UPDATE confidence=VALUES(confidence), last_update=NOW()`,
                    [symbol, confidence]
                );
            } catch (e) {
                console.error('Takip listesi güncellenirken hata:', symbol, e.message);
            }
        }
        console.log('Takip listesi (watch_list) güncellendi.');
    } catch (error) {
        console.error('Error in main process:', error);
    }
}

// Run the script
main(); 