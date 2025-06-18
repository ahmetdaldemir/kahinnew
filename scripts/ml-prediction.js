require('dotenv').config();
const tf = require('@tensorflow/tfjs-node');
const { query } = require('../db/db'); 

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

// Yeni teknik göstergeler ekleyelim
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

// VWAP hesaplama fonksiyonu
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

// Hacim Profili hesaplama fonksiyonu
function calculateVolumeProfile(high, low, close, volume, numBins = 10) {
    if (high.length < 2 || low.length < 2 || close.length < 2 || volume.length < 2) {
        return {
            poc: close[close.length - 1],
            valueAreaHigh: high[high.length - 1],
            valueAreaLow: low[low.length - 1]
        };
    }

    // Fiyat aralığını belirle
    const priceRange = Math.max(...high) - Math.min(...low);
    const binSize = priceRange / numBins;
    
    // Her bir fiyat seviyesi için hacim toplamı
    const volumeProfile = new Array(numBins).fill(0);
    const priceLevels = new Array(numBins).fill(0);
    
    for (let i = 0; i < numBins; i++) {
        priceLevels[i] = Math.min(...low) + (i * binSize);
    }
    
    // Her mum için hacim dağılımı
    for (let i = 0; i < close.length; i++) {
        const price = close[i];
        const vol = volume[i];
        const binIndex = Math.min(Math.floor((price - Math.min(...low)) / binSize), numBins - 1);
        volumeProfile[binIndex] += vol;
    }
    
    // Point of Control (POC) - En yüksek hacimli seviye
    const maxVolumeIndex = volumeProfile.indexOf(Math.max(...volumeProfile));
    const poc = priceLevels[maxVolumeIndex];
    
    // Value Area (VA) - Toplam hacmin %70'ini içeren alan
    const totalVolume = volumeProfile.reduce((a, b) => a + b, 0);
    const targetVolume = totalVolume * 0.7;
    
    let currentVolume = 0;
    let vaHigh = poc;
    let vaLow = poc;
    
    // POC'den yukarı ve aşağı doğru genişleme
    let upIndex = maxVolumeIndex;
    let downIndex = maxVolumeIndex;
    
    while (currentVolume < targetVolume && (upIndex < numBins - 1 || downIndex > 0)) {
        const upVolume = upIndex < numBins - 1 ? volumeProfile[upIndex + 1] : 0;
        const downVolume = downIndex > 0 ? volumeProfile[downIndex - 1] : 0;
        
        if (upVolume > downVolume && upIndex < numBins - 1) {
            currentVolume += upVolume;
            vaHigh = priceLevels[++upIndex];
        } else if (downIndex > 0) {
            currentVolume += downVolume;
            vaLow = priceLevels[--downIndex];
        } else {
            break;
        }
    }
    
    return {
        poc: isNaN(poc) ? close[close.length - 1] : poc,
        valueAreaHigh: isNaN(vaHigh) ? high[high.length - 1] : vaHigh,
        valueAreaLow: isNaN(vaLow) ? low[low.length - 1] : vaLow
    };
}

// Destek ve Direnç Seviyeleri Tespiti
function findSupportResistanceLevels(high, low, close, volume, lookbackPeriod = 20) {
    const levels = {
        support: [],
        resistance: []
    };

    // Pivot Noktaları Hesaplama
    for (let i = 2; i < close.length - 2; i++) {
        // Direnç Seviyesi
        if (high[i] > high[i-1] && high[i] > high[i-2] && 
            high[i] > high[i+1] && high[i] > high[i+2]) {
            levels.resistance.push({
                price: high[i],
                strength: calculateLevelStrength(high[i], close, volume, i),
                time: i
            });
        }
        
        // Destek Seviyesi
        if (low[i] < low[i-1] && low[i] < low[i-2] && 
            low[i] < low[i+1] && low[i] < low[i+2]) {
            levels.support.push({
                price: low[i],
                strength: calculateLevelStrength(low[i], close, volume, i),
                time: i
            });
        }
    }

    // Seviyeleri güçlerine göre sırala ve en güçlü olanları seç
    levels.support.sort((a, b) => b.strength - a.strength);
    levels.resistance.sort((a, b) => b.strength - a.strength);

    // Son 20 mum için en güçlü 3 destek ve direnç seviyesini döndür
    return {
        support: levels.support.slice(0, 3),
        resistance: levels.resistance.slice(0, 3)
    };
}

// Seviye Gücü Hesaplama
function calculateLevelStrength(price, close, volume, index) {
    let strength = 0;
    const lookback = 10;
    
    // Fiyatın bu seviyeye yakınlığı
    for (let i = Math.max(0, index - lookback); i < Math.min(close.length, index + lookback); i++) {
        const priceDiff = Math.abs(close[i] - price) / price;
        if (priceDiff < 0.01) { // %1'den az fark
            strength += 1;
        }
    }

    // Hacim analizi
    const avgVolume = volume.slice(index - lookback, index + lookback).reduce((a, b) => a + b, 0) / (lookback * 2);
    if (volume[index] > avgVolume * 1.5) {
        strength += 2;
    }

    return strength;
}

// Dinamik Destek/Direnç Seviyeleri
function calculateDynamicLevels(close, period = 20) {
    const levels = {
        support: [],
        resistance: []
    };

    // Hareketli Ortalama Tabanlı Seviyeler
    const sma = calculateSMA(close, period);
    const stdDev = calculateStandardDeviation(close, period);

    levels.support.push({
        price: sma - (2 * stdDev),
        type: 'dynamic',
        strength: 1
    });

    levels.resistance.push({
        price: sma + (2 * stdDev),
        type: 'dynamic',
        strength: 1
    });

    return levels;
}

// Standart Sapma Hesaplama
function calculateStandardDeviation(prices, period) {
    const sma = calculateSMA(prices, period);
    const squaredDiffs = prices.slice(-period).map(price => Math.pow(price - sma, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period;
    return Math.sqrt(variance);
}

// Normalize features matrix
function normalizeFeaturesMatrix(matrix) {
    const featureCount = matrix[0].length;
    const mins = Array(featureCount).fill(Infinity);
    const maxs = Array(featureCount).fill(-Infinity);
    
    // Min/max bul
    matrix.forEach(row => {
        row.forEach((val, i) => {
            if (val < mins[i]) mins[i] = val;
            if (val > maxs[i]) maxs[i] = val;
        });
    });
    
    // Normalize et
    return matrix.map(row => row.map((val, i) => {
        if (mins[i] === maxs[i]) return 0.5;
        return (val - mins[i]) / (maxs[i] - mins[i]);
    }));
}

// Fetch data from database
async function fetchData(symbol) {
    const rows = await query(
        `SELECT * FROM historical_data 
         WHERE symbol = ? 
         AND timeframe IN ('1h', '4h', '1d')
         ORDER BY timestamp`,
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
    
    // Veri setini optimize et - son 100 mum yeterli
    const optimizedData = data.slice(-100);
    
    // Calculate additional features
    const prices = optimizedData.map(row => parseFloat(row.price));
    const volumes = optimizedData.map(row => parseFloat(row.volume));
    const highs = optimizedData.map(row => parseFloat(row.high || row.price));
    const lows = optimizedData.map(row => parseFloat(row.low || row.price));
    
    // Önceden hesaplanmış göstergeleri sakla
    const preCalculatedIndicators = {
        rsi: calculateRSI(prices),
        macd: calculateMACD(prices),
        bb: calculateBollingerBands(prices),
        ema: calculateEMA(prices),
        sma: calculateSMA(prices),
        stoch: calculateStochastic(highs, lows, prices),
        adx: calculateADX(highs, lows, prices),
        cci: calculateCCI(highs, lows, prices),
        willr: calculateWilliamsR(highs, lows, prices),
        psar: calculateParabolicSAR(highs, lows),
        atr: calculateATR(highs, lows, prices),
        obv: calculateOBV(prices, volumes),
        ichimoku: calculateIchimokuCloud(highs, lows, prices),
        mfi: calculateMFI(highs, lows, prices, volumes),
        vwap: calculateVWAP(highs, lows, prices, volumes),
        volumeProfile: calculateVolumeProfile(highs, lows, prices, volumes)
    };
    
    const features = optimizedData.map((row, index) => {
        const price = parseFloat(row.price);
        const volume = parseFloat(row.volume);
        
        // Price momentum
        const priceChange = index > 0 ? price - parseFloat(optimizedData[index - 1].price) : 0;
        const priceChangePercent = index > 0 ? (priceChange / parseFloat(optimizedData[index - 1].price)) * 100 : 0;
        
        // Volume momentum
        const volumeChange = index > 0 ? volume - parseFloat(optimizedData[index - 1].volume) : 0;
        const volumeChangePercent = index > 0 ? (volumeChange / parseFloat(optimizedData[index - 1].volume)) * 100 : 0;
        
        return [
            price,
            volume,
            priceChange,
            priceChangePercent,
            volumeChange,
            volumeChangePercent,
            preCalculatedIndicators.rsi[index] || 50,
            preCalculatedIndicators.macd.macd[index] || 0,
            preCalculatedIndicators.macd.signal[index] || 0,
            preCalculatedIndicators.macd.histogram[index] || 0,
            preCalculatedIndicators.bb.upper[index] || price,
            preCalculatedIndicators.bb.middle[index] || price,
            preCalculatedIndicators.bb.lower[index] || price,
            preCalculatedIndicators.ema[index] || price,
            preCalculatedIndicators.sma[index] || price,
            preCalculatedIndicators.stoch.k[index] || 50,
            preCalculatedIndicators.stoch.d[index] || 50,
            preCalculatedIndicators.adx[index] || 20,
            preCalculatedIndicators.cci[index] || 0,
            preCalculatedIndicators.willr[index] || -50,
            preCalculatedIndicators.psar[index] || price,
            preCalculatedIndicators.atr[index] || 0,
            preCalculatedIndicators.obv[index] || 0,
            preCalculatedIndicators.ichimoku.conversion[index] || price,
            preCalculatedIndicators.ichimoku.base[index] || price,
            preCalculatedIndicators.ichimoku.spanA[index] || price,
            preCalculatedIndicators.ichimoku.spanB[index] || price,
            preCalculatedIndicators.mfi[index] || 50,
            preCalculatedIndicators.vwap[index] || price,
            preCalculatedIndicators.volumeProfile.poc[index] || price,
            preCalculatedIndicators.volumeProfile.valueAreaHigh[index] || price,
            preCalculatedIndicators.volumeProfile.valueAreaLow[index] || price
        ];
    });

    // Normalize features
    const normalizedFeatures = normalizeFeaturesMatrix(features);
    
    // Create labels based on future price movement
    const labelLookahead = 5;
    const labelThreshold = 0.01;
    const labels = optimizedData.map((row, index) => {
        if (index >= optimizedData.length - labelLookahead) return 0.5;
        const currentPrice = parseFloat(row.price);
        const futurePrice = parseFloat(optimizedData[index + labelLookahead].price);
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
    
    // Input layer - inputShape'i düzelt
    model.add(tf.layers.dense({
        units: 128,
        activation: 'relu',
        inputShape: inputShape // inputShape artık bir sayı değil, bir dizi
    }));
    model.add(tf.layers.dropout(0.3));
    
    // Hidden layers
    model.add(tf.layers.dense({
        units: 64,
        activation: 'relu'
    }));
    model.add(tf.layers.dropout(0.2));
    
    model.add(tf.layers.dense({
        units: 32,
        activation: 'relu'
    }));
    model.add(tf.layers.dropout(0.1));
    
    // Output layer
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
    const model = createModel([features[0].length]);
    
    // Daha uzun eğitim
    const earlyStopping = tf.callbacks.earlyStopping({
        monitor: 'val_loss',
        patience: 10,
        verbose: 1
    });
    await model.fit(tf.tensor2d(features), tf.tensor1d(labels), {
        epochs: 100,
        batchSize: 32,
        validationSplit: 0.2,
        shuffle: true,
        callbacks: {
            onEpochEnd: (epoch, logs) => {
                if ((epoch + 1) % 10 === 0 || epoch === 99) {
                    console.log(`Epoch ${epoch + 1} / 100`);
                }
            },
            earlyStopping
        }
    });
    
    return model;
}

// En iyi al/sat noktalarını bul
function findBestTrade(data) {
    let minPrice = parseFloat(data[0].price);
    let minIndex = 0;
    let maxProfit = 0;
    let buyIndex = 0;
    let sellIndex = 0;
    for (let i = 1; i < data.length; i++) {
        const price = parseFloat(data[i].price);
        if (price < minPrice) {
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
        buyPrice: parseFloat(data[buyIndex].price),
        buyTime: data[buyIndex].timestamp,
        sellPrice: parseFloat(data[sellIndex].price),
        sellTime: data[sellIndex].timestamp,
        profit: maxProfit
    };
}

// Generate predictions
async function generatePredictions(symbol) {
    try {
        const data = await fetchData(symbol);
        if (!data || data.length === 0) return null;

        const preparedData = prepareData(data);
        const features = preparedData.features;
        const labels = preparedData.labels;

        const model = createModel([features[0].length]); // inputShape'i düzgün formatta ver
        await trainModel(features, labels);

        const lastFeatures = features[features.length - 1];
        const prediction = model.predict(tf.tensor2d([lastFeatures]));
        const confidence = prediction.dataSync()[0];

        // Destek ve Direnç Seviyelerini Hesapla
        const supportResistance = findSupportResistanceLevels(
            data.map(d => d.high),
            data.map(d => d.low),
            data.map(d => d.close),
            data.map(d => d.volume)
        );

        const dynamicLevels = calculateDynamicLevels(data.map(d => d.close));

        // En iyi alım-satım noktalarını bul
        const bestTrade = findBestTrade(data);

        return {
            symbol,
            confidence,
            prediction: confidence > 0.5 ? 'YÜKSELIŞ' : 'DÜŞÜŞ',
            timestamp: new Date(),
            supportLevels: supportResistance.support,
            resistanceLevels: supportResistance.resistance,
            dynamicLevels,
            buyPrice: bestTrade.buyPrice,
            buyTime: bestTrade.buyTime,
            sellPrice: bestTrade.sellPrice,
            sellTime: bestTrade.sellTime
        };
    } catch (error) {
        console.error(`Tahmin hatası (${symbol}):`, error);
        return null;
    }
}

// Main function
async function main() {
    try {
        console.log('Starting ML prediction process...');
        
        // Get all available symbols from coin_pairs table
        const pairs = await query('SELECT symbol FROM coin_pairs order by id asc');
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
                        const sql = `INSERT INTO prediction_performance (symbol, prediction_date, predicted_signal, confidence, actual_price, predicted_price, profit_loss, buy_price, buy_time, sell_price, sell_time)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                             ON DUPLICATE KEY UPDATE predicted_signal=VALUES(predicted_signal), confidence=VALUES(confidence), actual_price=VALUES(actual_price), predicted_price=VALUES(predicted_price), profit_loss=VALUES(profit_loss), buy_price=VALUES(buy_price), buy_time=VALUES(buy_time), sell_price=VALUES(sell_price), sell_time=VALUES(sell_time)`;
                        const params = [
                            result.symbol,
                            predictionDate,
                            result.prediction,
                            result.confidence,
                            result.currentPrice,
                            result.predictedPrice,
                            result.profit,
                            result.buyPrice,
                            result.buyTime,
                            result.sellPrice,
                            result.sellTime
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
                console.log('Takip listesi güncellendi:', symbol, confidence);
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