require('dotenv').config();
const ccxt = require('ccxt');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Create data directory if it doesn't exist
const dbDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Database connection
const dbPath = path.join(dbDir, 'crypto_analyzer.db');
console.log('Database path:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to database:', err);
        process.exit(1);
    }
    console.log('Connected to database successfully');
});

// Initialize Binance client
const binance = new ccxt.binance({
    apiKey: process.env.BINANCE_API_KEY,
    secret: process.env.BINANCE_API_SECRET,
    enableRateLimit: true
});

// Fetch real-time data for a symbol and timeframe
async function fetchRealtimeData(symbol, timeframe) {
    try {
        console.log(`Fetching real-time data for ${symbol} (${timeframe})`);
        const ohlcv = await binance.fetchOHLCV(symbol, timeframe, undefined, 2); // last 2 candles
        if (!ohlcv || ohlcv.length === 0) return;

        const stmt = db.prepare(`
            INSERT OR IGNORE INTO historical_data (
                symbol, timestamp, price, volume
            ) VALUES (?, ?, ?, ?)
        `);

        for (const candle of ohlcv) {
            const [timestamp, open, high, low, close, volume] = candle;
            stmt.run(
                symbol,
                new Date(timestamp).toISOString(),
                close,
                volume
            );
        }
        stmt.finalize();
        console.log(`Stored real-time data for ${symbol} (${timeframe})`);
    } catch (error) {
        console.error(`Error fetching real-time data for ${symbol} (${timeframe}):`, error.message);
    }
}

// Main function
async function main() {
    try {
        // List of symbols to fetch (you can expand this list)
        const symbols = ['BTC/USDT', 'ETH/USDT', 'BNB/USDT'];
        const timeframes = ['1h', '4h'];

        for (const symbol of symbols) {
            for (const timeframe of timeframes) {
                await fetchRealtimeData(symbol, timeframe);
            }
        }
        console.log('Real-time data fetch completed');
    } catch (error) {
        console.error('Error in main process:', error);
    } finally {
        db.close();
    }
}

main(); 