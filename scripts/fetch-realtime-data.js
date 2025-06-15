require('dotenv').config();
const ccxt = require('ccxt');
const { query } = require('../db');

// Binance API
const binance = new ccxt.binance({
    apiKey: process.env.BINANCE_API_KEY,
    secret: process.env.BINANCE_API_SECRET,
    enableRateLimit: true
});

async function fetchRealtimeData(symbol, timeframe) {
    try {
        console.log(`Fetching real-time data for ${symbol} (${timeframe})`);
        const ohlcv = await binance.fetchOHLCV(symbol, timeframe, undefined, 2); // last 2 candles
        if (!ohlcv || ohlcv.length === 0) return;

        for (const candle of ohlcv) {
            const [timestamp, open, high, low, close, volume] = candle;
            await query(
                `INSERT IGNORE INTO historical_data (symbol, timestamp, price, volume) VALUES (?, FROM_UNIXTIME(?/1000), ?, ?)`,
                [symbol, timestamp, close, volume]
            );
        }
        console.log(`Stored real-time data for ${symbol} (${timeframe})`);
    } catch (error) {
        console.error(`Error fetching real-time data for ${symbol} (${timeframe}):`, error.message);
    }
}

async function main() {
    try {
        // Tüm coin çiftlerini coin_pairs tablosundan al
        const pairs = await query('SELECT symbol FROM coin_pairs');
        const timeframes = ['1h', '4h'];

        for (const row of pairs) {
            for (const timeframe of timeframes) {
                await fetchRealtimeData(row.symbol, timeframe);
            }
        }
        console.log('Real-time data fetch completed');
        process.exit(0);
    } catch (error) {
        console.error('Error in main process:', error);
        process.exit(1);
    }
}

main(); 