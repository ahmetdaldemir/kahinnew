require('dotenv').config();
const { Binance } = require('ccxt');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database connection
const db = new sqlite3.Database(path.join(__dirname, '..', process.env.DB_PATH));

// Initialize Binance client
const binance = new Binance({
    apiKey: process.env.BINANCE_API_KEY,
    secret: process.env.BINANCE_API_SECRET,
    enableRateLimit: true
});

// Get date range based on environment
function getDateRange() {
    const isProduction = process.env.NODE_ENV === 'production';
    const startDate = isProduction ? process.env.PRODUCTION_START_DATE : process.env.DEVELOPMENT_START_DATE;
    const endDate = isProduction ? process.env.PRODUCTION_END_DATE : process.env.DEVELOPMENT_END_DATE;
    
    return {
        startDate: new Date(startDate),
        endDate: new Date(endDate)
    };
}

// Fetch historical data for a symbol
async function fetchHistoricalData(symbol) {
    try {
        const { startDate, endDate } = getDateRange();
        console.log(`Fetching data for ${symbol} from ${startDate.toISOString()} to ${endDate.toISOString()}`);
        
        const timeframe = process.env.DEFAULT_TIMEFRAME;
        const limit = parseInt(process.env.DEFAULT_LIMIT);
        
        const ohlcv = await binance.fetchOHLCV(symbol, timeframe, undefined, limit);
        
        // Prepare data for insertion
        const stmt = db.prepare(`
            INSERT INTO historical_data (
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
        console.log(`Successfully stored historical data for ${symbol}`);
    } catch (error) {
        console.error(`Error fetching data for ${symbol}:`, error.message);
    }
}

// Technical indicator calculations
function calculateRSI(data, period) {
    // RSI calculation implementation
    // This is a simplified version - you might want to use a proper technical analysis library
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
        
        for (const symbol of symbols) {
            await fetchHistoricalData(symbol);
        }
        
        console.log('Historical data fetch completed');
    } catch (error) {
        console.error('Error in main process:', error);
    } finally {
        db.close();
    }
}

// Run the script
main(); 