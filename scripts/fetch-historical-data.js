require('dotenv').config();
const ccxt = require('ccxt');
const { query } = require('../db');

// Binance API
const binance = new ccxt.binance({
    apiKey: process.env.BINANCE_API_KEY,
    secret: process.env.BINANCE_API_SECRET,
    enableRateLimit: true
});

async function getLastHistoricalData(symbol) {
    const result = await query(
        `SELECT timestamp FROM historical_data 
         WHERE symbol = ? 
         ORDER BY timestamp DESC 
         LIMIT 1`,
        [symbol]
    );
    return result[0]?.timestamp || null;
}

async function fetchHistoricalData(symbol) {
    try {
        console.log(`Checking historical data for ${symbol}`);
        
        // Son veriyi kontrol et
        const lastData = await getLastHistoricalData(symbol);
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        // Eğer son veri 24 saatten eskiyse veya hiç veri yoksa yeni veri çek
        if (!lastData || new Date(lastData) < oneDayAgo) {
            console.log(`Fetching new historical data for ${symbol}`);
            const ohlcv = await binance.fetchOHLCV(symbol, '1h', undefined, 500);
            
            if (!ohlcv || ohlcv.length === 0) {
                console.log(`No data available for ${symbol}`);
                return;
            }

            let newRecords = 0;
            for (const candle of ohlcv) {
                const [timestamp, open, high, low, close, volume] = candle;
                const result = await query(
                    `INSERT IGNORE INTO historical_data (symbol, timestamp, price, volume) 
                     VALUES (?, FROM_UNIXTIME(?/1000), ?, ?)`,
                    [symbol, timestamp, close, volume]
                );
                if (result.affectedRows > 0) newRecords++;
            }
            console.log(`Stored ${newRecords} new historical records for ${symbol}`);
        } else {
            console.log(`Recent data already exists for ${symbol}, skipping...`);
        }
    } catch (error) {
        console.error(`Error processing historical data for ${symbol}:`, error.message);
    }
}

async function main() {
    try {
        console.log('Starting historical data check...');
        const pairs = await query('SELECT symbol FROM coin_pairs');
        console.log(`Found ${pairs.length} pairs to check`);

        for (const row of pairs) {
            await fetchHistoricalData(row.symbol);
        }
        console.log('Historical data check completed');
        process.exit(0);
    } catch (error) {
        console.error('Error in main process:', error);
        process.exit(1);
    }
}

main(); 