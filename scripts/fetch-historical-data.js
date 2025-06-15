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
        let since = startDate.getTime();
        const endTimestamp = endDate.getTime();
        
        // Prepare data for insertion
        const stmt = db.prepare(`
            INSERT OR IGNORE INTO historical_data (
                symbol, timestamp, price, volume
            ) VALUES (?, ?, ?, ?)
        `);

        while (since < endTimestamp) {
            console.log(`Fetching data for ${symbol} from ${new Date(since).toISOString()}`);
            const ohlcv = await binance.fetchOHLCV(symbol, timeframe, since);
            
            if (ohlcv.length === 0) {
                break;
            }

            for (const candle of ohlcv) {
                const [timestamp, open, high, low, close, volume] = candle;
                stmt.run(
                    symbol,
                    new Date(timestamp).toISOString(),
                    close,
                    volume
                );
            }

            // Update since timestamp for next iteration
            since = ohlcv[ohlcv.length - 1][0] + 1;
            
            // Add a small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
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
        // Fetch all available symbols from Binance
        const markets = await binance.loadMarkets();
        const symbols = Object.keys(markets).filter(symbol => symbol.endsWith('/USDT'));
        console.log(`Found ${symbols.length} USDT pairs`);

        // Store coin pairs in the database
        const stmt = db.prepare(`
            INSERT OR IGNORE INTO coin_pairs (symbol, added_date)
            VALUES (?, ?)
        `);
        for (const symbol of symbols) {
            stmt.run(symbol, new Date().toISOString());
        }
        stmt.finalize();
        console.log('Coin pairs stored in database');

        // Fetch historical data for each symbol
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