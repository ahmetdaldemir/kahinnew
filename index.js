require('dotenv').config();
const express = require('express');
const binanceService = require('./services/binanceService');
const technicalIndicators = require('./services/technicalIndicators');
const databaseService = require('./services/databaseService');
const mlService = require('./services/mlService');

const app = express();
const port = process.env.PORT || 3200;

// Hata yakalama middleware'i
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    res.status(500).send('Internal Server Error');
});

// Bağlantı durumu kontrolü
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.set('view engine', 'ejs');
app.use(express.static('public'));

// Ana sayfa
app.get('/', async (req, res) => {
    try {
        console.log('Fetching watch list...');
        const watchList = await databaseService.getWatchList();
        console.log('Watch list fetched:', watchList.length, 'items');
        
        const buySignals = watchList.filter(item => item.signal === 'BUY');
        const sellSignals = watchList.filter(item => item.signal === 'SELL');
        
        console.log('Rendering index with signals:', {
            buySignals: buySignals.length,
            sellSignals: sellSignals.length
        });

        res.render('index', {
            buySignals,
            sellSignals,
            loadingMessage: false,
            progress: 100,
            processedCoins: watchList.length,
            totalCoins: watchList.length,
            lastUpdate: new Date().toLocaleString('tr-TR'),
            isCollecting: false
        });
    } catch (error) {
        console.error('Error in root route:', error);
        res.status(500).send('Internal Server Error');
    }
});

// API endpoint for signals
app.get('/api/signals', async (req, res) => {
    try {
        console.log('API: Fetching signals...');
        const watchList = await databaseService.getWatchList();
        console.log('API: Signals fetched:', watchList.length, 'items');
        res.json(watchList);
    } catch (error) {
        console.error('API: Error fetching signals:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Historical data endpoint for charts
app.get('/api/historical-data/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        console.log(`Fetching historical data for ${symbol}...`);
        
        const historicalData = await binanceService.getHistoricalData(symbol, '1h', 100);
        console.log(`Got ${historicalData.length} data points for ${symbol}`);
        
        res.json(historicalData);
    } catch (error) {
        console.error('Error fetching historical data:', error);
        res.status(500).json({ error: 'Failed to fetch historical data' });
    }
});

// Veri toplama ve analiz fonksiyonu
async function collectAndAnalyzeData() {
    try {
        console.log('Starting data collection and analysis...');
        const currentPrices = await binanceService.getCurrentPrices();
        const watchList = [];

        for (const [symbol, price] of Object.entries(currentPrices)) {
            try {
                const historicalData = await binanceService.getHistoricalData(symbol, '1h');
                if (!historicalData || historicalData.length === 0) continue;

                const prices = historicalData.map(candle => candle.close);
                const indicators = {
                    rsi: technicalIndicators.calculateRSI(prices),
                    macd: technicalIndicators.calculateMACD(prices),
                    bollingerBands: technicalIndicators.calculateBollingerBands(prices)
                };

                if (!indicators.rsi || !indicators.macd || !indicators.bollingerBands) continue;

                const signal = technicalIndicators.generateSignal(price, indicators);
                
                // Only add to watchlist if signal strength is at least 5%
                if (signal.strength >= 5) {
                    watchList.push({
                        symbol,
                        price,
                        signal: signal.signal,
                        confidence: signal.confidence,
                        strength: signal.strength,
                        timestamp: new Date().toISOString()
                    });
                }
            } catch (error) {
                console.error(`Error processing ${symbol}:`, error);
            }
        }

        await databaseService.updateWatchList(watchList);
        console.log('Data collection and analysis completed');
    } catch (error) {
        console.error('Error in collectAndAnalyzeData:', error);
    }
}

// Her 5 dakikada bir veri topla ve analiz et
setInterval(collectAndAnalyzeData, 5 * 60 * 1000);

// Uygulama başladığında ilk veri toplama işlemini başlat
console.log('Starting initial data collection...');
collectAndAnalyzeData();

// Sunucuyu başlat
app.listen(3200, '0.0.0.0', () => {
    console.log(`Server is running on port ${port}`);
    console.log(`Health check available at http://localhost:${port}/health`);
});
