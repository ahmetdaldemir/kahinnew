require('dotenv').config();
const ccxt = require('ccxt');
const { query } = require('../db');

// Binance API
const binance = new ccxt.binance({
    apiKey: process.env.BINANCE_API_KEY,
    secret: process.env.BINANCE_API_SECRET,
    enableRateLimit: true
});

async function fetchHistoricalData(symbol) {
    try {
        console.log(`Fetching historical data for ${symbol}`);
        const ohlcv = await binance.fetchOHLCV(symbol, '1h', undefined, 500);
        if (!ohlcv || ohlcv.length === 0) return;

        for (const candle of ohlcv) {
            const [timestamp, open, high, low, close, volume] = candle;
            await query(
                `INSERT IGNORE INTO historical_data (symbol, timestamp, price, volume) VALUES (?, FROM_UNIXTIME(?/1000), ?, ?)`,
                [symbol, timestamp, close, volume]
            );
        }
        console.log(`Stored historical data for ${symbol}`);
    } catch (error) {
        console.error(`Error fetching historical data for ${symbol}:`, error.message);
    }
}

async function main() {
    try {
        // Tüm coin çiftlerini coin_pairs tablosundan al
        const pairs = await query('SELECT symbol FROM coin_pairs');
        for (const row of pairs) {
            await fetchHistoricalData(row.symbol);
        }
        console.log('Historical data fetch completed');
        process.exit(0);
    } catch (error) {
        console.error('Error in main process:', error);
        process.exit(1);
    }
}

main(); 