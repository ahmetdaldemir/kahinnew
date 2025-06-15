require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const tf = require('@tensorflow/tfjs-node');

// Database connection
const dbPath = path.join(__dirname, '..', 'data', 'crypto_analyzer.db');
console.log('Database path:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to database:', err);
        process.exit(1);
    }
    console.log('Connected to database successfully');
});

// Technical indicators calculation
function calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) {
        return 50; // Default value if not enough data
    }

    const changes = prices.slice(1).map((price, i) => price - prices[i]);
    const gains = changes.map(change => change > 0 ? change : 0);
    const losses = changes.map(change => change < 0 ? -change : 0);
    
    const avgGain = gains.slice(-period).reduce((a, b) => a + b, 0) / period;
    const avgLoss = losses.slice(-period).reduce((a, b) => a + b, 0) / period;
    
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
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
    
    return { macd, signal, histogram };
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
    
    return {
        upper: sma + (standardDeviation * stdDev),
        middle: sma,
        lower: sma - (standardDeviation * stdDev)
    };
}

// Fetch data from database
function fetchData(symbol) {
    return new Promise((resolve, reject) => {
        const query = `SELECT * FROM historical_data WHERE symbol = ? ORDER BY timestamp`;
        console.log(`Fetching data for ${symbol}...`);
        
        db.all(query, [symbol], (err, rows) => {
            if (err) {
                console.error(`Error fetching data for ${symbol}:`, err);
                reject(err);
            } else {
                console.log(`Fetched ${rows.length} records for ${symbol}`);
                resolve(rows);
            }
        });
    });
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
            lower
        ];
    });

    // Normalize features
    const normalizedFeatures = features.map(feature => normalizeData(feature));

    // Create labels based on future price movement
    const labels = data.map((row, index) => {
        if (index >= data.length - 1) return 0;
        const currentPrice = parseFloat(row.price);
        const futurePrice = parseFloat(data[index + 1].price);
        return futurePrice > currentPrice ? 1 : 0;
    });

    console.log(`Prepared ${normalizedFeatures.length} samples for training`);
    return { features: normalizedFeatures, labels };
}

// Normalize data
function normalizeData(data) {
    const min = Math.min(...data);
    const max = Math.max(...data);
    return data.map(x => (x - min) / (max - min));
}

// Train ML model
async function trainModel(features, labels) {
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
    model.compile({
        optimizer: tf.train.adam(0.0001),
        loss: 'binaryCrossentropy',
        metrics: ['accuracy']
    });

    // Prepare data
    const xs = tf.tensor2d(features);
    const ys = tf.tensor2d(labels, [labels.length, 1]);

    // Early stopping callback
    const earlyStopping = tf.callbacks.earlyStopping({
        monitor: 'val_loss',
        patience: 5,
        restoreBestWeights: true
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
            priceChange24h: calculatePriceChange(data, 24).toFixed(2),
            volume24h: calculateVolume24h(data).toFixed(2)
        };

        console.log(`Prediction for ${symbol}:`, result);
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
        const symbols = await new Promise((resolve, reject) => {
            db.all('SELECT symbol FROM coin_pairs', (err, rows) => {
                if (err) reject(err);
                else resolve(rows.map(row => row.symbol));
            });
        });

        console.log(`Found ${symbols.length} symbols to analyze`);
        const results = [];

        // Process each symbol
        for (const symbol of symbols) {
            try {
                console.log(`\nAnalyzing ${symbol}...`);
                const result = await generatePredictions(symbol);
                if (result && result.confidence >= 10 && result.profit >= 5) {
                    results.push(result);
                }
            } catch (error) {
                console.error(`Error analyzing ${symbol}:`, error);
                continue;
            }
        }

        // Sort results by confidence and profit
        results.sort((a, b) => {
            const scoreA = (a.confidence * 0.7) + (a.profit * 0.3);
            const scoreB = (b.confidence * 0.7) + (b.profit * 0.3);
            return scoreB - scoreA;
        });

        // Take top 50 results
        const topResults = results.slice(0, 50);

        console.log('\nTop 50 Predictions:');
        console.table(topResults);

        // Save predictions to database
        const stmt = db.prepare(`
            INSERT INTO prediction_performance (
                symbol, prediction_date, predicted_signal, confidence, 
                actual_price, predicted_price, profit_loss
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        for (const result of topResults) {
            stmt.run(
                result.symbol,
                new Date().toISOString(),
                result.signal,
                result.confidence,
                result.currentPrice,
                result.predictedPrice,
                result.profit
            );
        }

        stmt.finalize();
        console.log('Predictions saved to database');
    } catch (error) {
        console.error('Error in main process:', error);
    } finally {
        db.close();
    }
}

// Run the script
main(); 