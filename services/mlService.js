const tf = require('@tensorflow/tfjs-node');
const technicalIndicators = require('./technicalIndicators');
const databaseService = require('./databaseService');

class MLService {
    constructor() {
        this.model = null;
        this.isModelLoaded = false;
        this.initializeModel();
    }

    async initializeModel() {
        try {
            // Model mimarisi
            this.model = tf.sequential();
            
            // LSTM katmanı
            this.model.add(tf.layers.lstm({
                units: 50,
                returnSequences: true,
                inputShape: [30, 7] // 30 zaman adımı, 7 özellik
            }));
            
            // Dropout katmanı
            this.model.add(tf.layers.dropout({ rate: 0.2 }));
            
            // LSTM katmanı
            this.model.add(tf.layers.lstm({
                units: 30,
                returnSequences: false
            }));
            
            // Dropout katmanı
            this.model.add(tf.layers.dropout({ rate: 0.2 }));
            
            // Dense katmanı
            this.model.add(tf.layers.dense({
                units: 3, // BUY, SELL, HOLD
                activation: 'softmax'
            }));

            // Model derleme
            this.model.compile({
                optimizer: tf.train.adam(0.001),
                loss: 'categoricalCrossentropy',
                metrics: ['accuracy']
            });

            this.isModelLoaded = true;
            console.log('ML model initialized successfully');
        } catch (error) {
            console.error('Error initializing ML model:', error);
            this.isModelLoaded = false;
        }
    }

    async prepareData(historicalData) {
        try {
            const features = historicalData.map(data => [
                data.price,
                data.rsi,
                data.macd,
                data.macd_signal,
                data.macd_histogram,
                data.upper_band,
                data.lower_band
            ]);

            // Veriyi normalize et
            const normalizedFeatures = this.normalizeData(features);
            
            // Veriyi 30 zaman adımlı sekanslara böl
            const sequences = [];
            for (let i = 0; i < normalizedFeatures.length - 30; i++) {
                sequences.push(normalizedFeatures.slice(i, i + 30));
            }

            return tf.tensor3d(sequences);
        } catch (error) {
            console.error('Error preparing data:', error);
            return null;
        }
    }

    normalizeData(data) {
        const normalized = [];
        const numFeatures = data[0].length;
        
        for (let i = 0; i < numFeatures; i++) {
            const featureValues = data.map(row => row[i]);
            const min = Math.min(...featureValues);
            const max = Math.max(...featureValues);
            
            normalized.push(featureValues.map(value => (value - min) / (max - min)));
        }
        
        return normalized[0].map((_, i) => normalized.map(row => row[i]));
    }

    async trainModel(symbol) {
        try {
            if (!this.isModelLoaded) {
                throw new Error('Model not initialized');
            }

            // Geçmiş verileri al
            const historicalData = await databaseService.getHistoricalData(symbol, 1000);
            if (historicalData.length < 100) {
                throw new Error('Insufficient historical data for training');
            }

            // Veriyi hazırla
            const inputData = await this.prepareData(historicalData);
            if (!inputData) {
                throw new Error('Failed to prepare input data');
            }

            // Etiketleri hazırla
            const labels = historicalData.slice(30).map(data => {
                const signal = data.actual_signal || 'HOLD';
                return signal === 'BUY' ? [1, 0, 0] :
                       signal === 'SELL' ? [0, 1, 0] : [0, 0, 1];
            });
            const labelTensor = tf.tensor2d(labels);

            // Modeli eğit
            await this.model.fit(inputData, labelTensor, {
                epochs: 50,
                batchSize: 32,
                validationSplit: 0.2,
                callbacks: {
                    onEpochEnd: (epoch, logs) => {
                        console.log(`Epoch ${epoch + 1}: loss = ${logs.loss.toFixed(4)}, accuracy = ${logs.acc.toFixed(4)}`);
                    }
                }
            });

            console.log(`Model trained successfully for ${symbol}`);
            return true;
        } catch (error) {
            console.error(`Error training model for ${symbol}:`, error);
            return false;
        }
    }

    async predict(symbol, currentData) {
        try {
            if (!this.isModelLoaded) {
                throw new Error('Model not initialized');
            }

            // Mevcut veriyi hazırla
            const features = [
                currentData.price,
                currentData.rsi,
                currentData.macd,
                currentData.macdSignal,
                currentData.macdHistogram,
                currentData.upperBand,
                currentData.lowerBand
            ];

            const normalizedFeatures = this.normalizeData([features]);
            const inputTensor = tf.tensor3d([normalizedFeatures]);

            // Tahmin yap
            const prediction = await this.model.predict(inputTensor).data();
            
            // En yüksek olasılıklı sinyali bul
            const maxIndex = prediction.indexOf(Math.max(...prediction));
            const signal = maxIndex === 0 ? 'BUY' : maxIndex === 1 ? 'SELL' : 'HOLD';
            
            // Tahmin performansını kaydet
            await databaseService.updatePredictionPerformance(symbol, {
                predictionDate: new Date(),
                prediction: signal,
                actualSignal: null, // Gerçek sinyal henüz bilinmiyor
                accuracy: null, // Doğruluk henüz hesaplanamıyor
                profitLoss: null // Kar/zarar henüz hesaplanamıyor
            });

            return {
                signal,
                probabilities: {
                    buy: prediction[0],
                    sell: prediction[1],
                    hold: prediction[2]
                }
            };
        } catch (error) {
            console.error(`Error making prediction for ${symbol}:`, error);
            return null;
        }
    }

    async evaluateModel(symbol) {
        try {
            const performance = await databaseService.getPredictionPerformance(symbol, 100);
            if (performance.length === 0) {
                return null;
            }

            let correctPredictions = 0;
            let totalPredictions = 0;
            let totalProfitLoss = 0;

            performance.forEach(pred => {
                if (pred.actual_signal) {
                    totalPredictions++;
                    if (pred.prediction === pred.actual_signal) {
                        correctPredictions++;
                    }
                    if (pred.profit_loss) {
                        totalProfitLoss += pred.profit_loss;
                    }
                }
            });

            return {
                accuracy: totalPredictions > 0 ? correctPredictions / totalPredictions : 0,
                totalProfitLoss,
                totalPredictions
            };
        } catch (error) {
            console.error(`Error evaluating model for ${symbol}:`, error);
            return null;
        }
    }
}

module.exports = new MLService(); 