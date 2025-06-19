require('dotenv').config();
const ccxt = require('ccxt');
const { query } = require('../db/db'); 

// Binance API with better error handling
const binance = new ccxt.binance({
    apiKey: process.env.BINANCE_API_KEY,
    secret: process.env.BINANCE_API_SECRET,
    enableRateLimit: true,
    timeout: 30000, // 30 second timeout
    rateLimit: 1200 // 1200 requests per minute
});

async function getLastRealtimeData(symbol, timeframe) {
    try {
        const result = await query(
            `SELECT timestamp FROM historical_data 
             WHERE symbol = ? 
             AND timeframe = ?
             ORDER BY timestamp DESC 
             LIMIT 1`,
            [symbol, timeframe]
        );
        return result[0]?.timestamp || null;
    } catch (error) {
        console.error(`Error getting last realtime data for ${symbol}:`, error.message);
        return null;
    }
}

async function fetchRealtimeData(symbol, timeframe) {
    try {
        console.log(`Checking real-time data for ${symbol} (${timeframe})`);
        
        // Check last data
        const lastData = await getLastRealtimeData(symbol, timeframe);
        const now = new Date();
        const timeframeMinutes = timeframe === '1h' ? 60 : 240; // 1h or 4h
        const timeframeAgo = new Date(now.getTime() - timeframeMinutes * 60 * 1000);

        // Fetch new data if last data is older than timeframe or doesn't exist
        if (!lastData || new Date(lastData) < timeframeAgo) {
            console.log(`Fetching new real-time data for ${symbol} (${timeframe})`);
            
            // Add timeout for API calls
            const ohlcv = await Promise.race([
                binance.fetchOHLCV(symbol, timeframe, undefined, 2),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('API Timeout')), 30000)
                )
            ]);
            
            if (!ohlcv || ohlcv.length === 0) {
                console.log(`No data available for ${symbol} (${timeframe})`);
                return;
            }

            let newRecords = 0;
            for (const candle of ohlcv) {
                try {
                    const [timestamp, open, high, low, close, volume] = candle;
                    
                    // Validate data
                    if (!timestamp || isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close) || isNaN(volume)) {
                        console.warn(`Invalid candle data for ${symbol}:`, candle);
                        continue;
                    }
                    
                    const result = await query(
                        `INSERT IGNORE INTO historical_data (symbol, timestamp, price, high, low, volume, timeframe) 
                         VALUES (?, FROM_UNIXTIME(?/1000), ?, ?, ?, ?, ?)`,
                        [symbol, timestamp, close, high, low, volume, timeframe]
                    );
                    if (result.affectedRows > 0) newRecords++;
                } catch (candleError) {
                    console.error(`Error inserting candle for ${symbol}:`, candleError.message);
                    continue;
                }
            }
            console.log(`Stored ${newRecords} new real-time records for ${symbol} (${timeframe})`);
        } else {
            console.log(`Recent data already exists for ${symbol} (${timeframe}), skipping...`);
        }
    } catch (error) {
        console.error(`Error processing real-time data for ${symbol} (${timeframe}):`, error.message);
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    try {
        console.log('Starting real-time data check...');
        const pairs = await query('SELECT symbol FROM coin_pairs ORDER BY id ASC');
        console.log(`Found ${pairs.length} pairs to check`);
        
        const timeframes = ['1h', '4h'];
        let processedCount = 0;
        const failedSymbols = [];

        for (const row of pairs) {
            try {
                processedCount++;
                console.log(`\n[${processedCount}/${pairs.length}] Processing ${row.symbol}...`);
                
                for (const timeframe of timeframes) {
                    try {
                        // Add timeout for each timeframe
                        await Promise.race([
                            fetchRealtimeData(row.symbol, timeframe),
                            new Promise((_, reject) => 
                                setTimeout(() => reject(new Error('Timeframe Timeout')), 30000)
                            )
                        ]);
                        
                        // Add delay between timeframes
                        await sleep(500);
                    } catch (timeframeError) {
                        console.error(`Error processing ${timeframe} for ${row.symbol}:`, timeframeError.message);
                        continue;
                    }
                }
                
                console.log(`✓ Completed ${row.symbol}`);
                
                // Add delay between symbols to avoid rate limiting
                await sleep(1000);
                
            } catch (error) {
                console.error(`Failed to process ${row.symbol}:`, error.message);
                failedSymbols.push(row.symbol);
                continue;
            }
        }
        
        console.log('\n=== SUMMARY ===');
        console.log(`Processed: ${processedCount}/${pairs.length} symbols`);
        if (failedSymbols.length > 0) {
            console.log(`Failed symbols:`, failedSymbols);
        }
        console.log('Real-time data check completed');
        
    } catch (error) {
        console.error('Error in main process:', error);
    } finally {
        process.exit(0);
    }
}

main(); 