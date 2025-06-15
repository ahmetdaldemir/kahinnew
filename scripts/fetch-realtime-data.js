require('dotenv').config();
const ccxt = require('ccxt');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database connection
const db = new sqlite3.Database(path.join(__dirname, '..', process.env.DB_PATH));

// Initialize Binance client
const binance = new ccxt.binance({
    apiKey: process.env.BINANCE_API_KEY,
    secret: process.env.BINANCE_API_SECRET,
    enableRateLimit: true
});

// Fetch real-time data for a symbol
async function fetchRealtimeData(symbol, timeframe) {
    try {
        console.log(`Fetching real-time data for ${symbol} with timeframe ${timeframe}`);
        const ohlcv = await binance.fetchOHLCV(symbol, timeframe);
        
        // Prepare data for insertion
        const stmt = db.prepare(`
            INSERT OR IGNORE INTO historical_data (
                symbol, timestamp, open, high, low, close, volume,
                rsi, macd, macd_signal, macd_histogram,
                bb_upper, bb_middle, bb_lower
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const candle of ohlcv) {
            const [timestamp, open, high, low, close, volume] = candle;
            
            // Calculate technical indicators
            const rsi = calculateRSI(ohlcv, 14);
            const { macd, signal, histogram } = calculateMACD(ohlcv);
            const { upper, middle, lower } = calculateBollingerBands(ohlcv, 20, 2);

            stmt.run(
                symbol,
                new Date(timestamp).toISOString(),
                open,
                high,
                low,
                close,
                volume,
                rsi,
                macd,
                signal,
                histogram,
                upper,
                middle,
                lower
            );
        }

        stmt.finalize();
        console.log(`Successfully stored real-time data for ${symbol}`);
    } catch (error) {
        console.error(`Error fetching real-time data for ${symbol}:`, error.message);
    }
}

// Technical indicator calculations
function calculateRSI(data, period) {
    // RSI calculation implementation
    return 50; // Placeholder
}

function calculateMACD(data) {
    // MACD calculation implementation
    return {
        macd: 0,
        signal: 0,
        histogram: 0
    };
}

function calculateBollingerBands(data, period, stdDev) {
    // Bollinger Bands calculation implementation
    return {
        upper: 0,
        middle: 0,
        lower: 0
    };
}

// Main function
async function main() {
    try {
        // List of symbols to fetch
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

// Run the script
main(); 