require('dotenv').config();
const ccxt = require('ccxt');

if (process.env.NODE_ENV === 'production') {
    const { query } = require('../db');
} else {
    const { query } = require('../dev-db');
}

// Binance API
const binance = new ccxt.binance({
    apiKey: process.env.BINANCE_API_KEY,
    secret: process.env.BINANCE_API_SECRET,
    enableRateLimit: true
});

async function getLastHistoricalData(symbol, timeframe) {
    const result = await query(
        `SELECT timestamp FROM historical_data 
         WHERE symbol = ? AND timeframe = ?
         ORDER BY timestamp DESC 
         LIMIT 1`,
        [symbol, timeframe]
    );
    return result[0]?.timestamp || null;
}

async function fetchHistoricalData(symbol) {
    try {
        console.log(`Checking historical data for ${symbol}`);
        
        // Farklı timeframe'ler için veri çek
        const timeframes = ['1h', '4h', '1d'];
        const limits = {
            '1h': 2000,  // 3 ay
            '4h': 1000,  // 5 ay
            '1d': 500    // 1.5 yıl
        };

        for (const timeframe of timeframes) {
            // Son veriyi kontrol et
            const lastData = await getLastHistoricalData(symbol, timeframe);
            const now = new Date();
            const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

            // Eğer son veri 24 saatten eskiyse veya hiç veri yoksa yeni veri çek
            if (!lastData || new Date(lastData) < oneDayAgo) {
                console.log(`Fetching new ${timeframe} historical data for ${symbol}`);
                const ohlcv = await binance.fetchOHLCV(symbol, timeframe, undefined, limits[timeframe]);
                
                if (!ohlcv || ohlcv.length === 0) {
                    console.log(`No ${timeframe} data available for ${symbol}`);
                    continue;
                }

                let newRecords = 0;
                for (const candle of ohlcv) {
                    const [timestamp, open, high, low, close, volume] = candle;
                    const result = await query(
                        `INSERT IGNORE INTO historical_data 
                         (symbol, timestamp, price, high, low, volume, timeframe, open) 
                         VALUES (?, FROM_UNIXTIME(?/1000), ?, ?, ?, ?, ?, ?)`,
                        [symbol, timestamp, close, high, low, volume, timeframe, open]
                    );
                    if (result.affectedRows > 0) newRecords++;
                }
                console.log(`Stored ${newRecords} new ${timeframe} records for ${symbol}`);
            }
        }
    } catch (error) {
        console.error(`Error fetching historical data for ${symbol}:`, error);
    }
}

module.exports = {
    fetchHistoricalData
};