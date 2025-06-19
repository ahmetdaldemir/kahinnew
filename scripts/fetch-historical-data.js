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

async function getLastHistoricalData(symbol, timeframe) {
    try {
        const result = await query(
            `SELECT timestamp FROM historical_data 
             WHERE symbol = ? AND timeframe = ?
             ORDER BY timestamp DESC 
             LIMIT 1`,
            [symbol, timeframe]
        );
        return result[0]?.timestamp || null;
    } catch (error) {
        console.error(`Error getting last historical data for ${symbol}:`, error.message);
        return null;
    }
}

async function fetchHistoricalData(symbol) {
    try {
        console.log(`Checking historical data for ${symbol}`);
        
        // Different timeframes for data
        const timeframes = ['1h', '4h', '1d'];
        const limits = {
            '1h': 1000,  // Reduced from 2000 to avoid rate limits
            '4h': 500,   // Reduced from 1000
            '1d': 200    // Reduced from 500
        };

        for (const timeframe of timeframes) {
            try {
                // Check last data
                const lastData = await getLastHistoricalData(symbol, timeframe);
                const now = new Date();
                const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

                // Fetch new data if last data is older than 24 hours or doesn't exist
                if (!lastData || new Date(lastData) < oneDayAgo) {
                    console.log(`Fetching new ${timeframe} historical data for ${symbol}`);
                    
                    // Add timeout for API calls
                    const ohlcv = await Promise.race([
                        binance.fetchOHLCV(symbol, timeframe, undefined, limits[timeframe]),
                        new Promise((_, reject) => 
                            setTimeout(() => reject(new Error('API Timeout')), 30000)
                        )
                    ]);
                    
                    if (!ohlcv || ohlcv.length === 0) {
                        console.log(`No ${timeframe} data available for ${symbol}`);
                        continue;
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
                                `INSERT IGNORE INTO historical_data 
                                 (symbol, timestamp, price, high, low, volume, timeframe) 
                                 VALUES (?, FROM_UNIXTIME(?/1000), ?, ?, ?, ?, ?)`,
                                [symbol, timestamp, close, high, low, volume, timeframe]
                            );
                            if (result.affectedRows > 0) newRecords++;
                        } catch (candleError) {
                            console.error(`Error inserting candle for ${symbol}:`, candleError.message);
                            continue;
                        }
                    }
                    console.log(`Stored ${newRecords} new ${timeframe} records for ${symbol}`);
                } else {
                    console.log(`Recent ${timeframe} data already exists for ${symbol}, skipping...`);
                }
                
                // Add delay between timeframes to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 500));
                
            } catch (timeframeError) {
                console.error(`Error processing ${timeframe} for ${symbol}:`, timeframeError.message);
                continue;
            }
        }
    } catch (error) {
        console.error(`Error fetching historical data for ${symbol}:`, error.message);
    }
}

// Main function to process all symbols
async function main() {
    try {
        console.log('Starting historical data fetch process...');
        
        // Get all symbols from coin_pairs table
        const pairs = await query('SELECT symbol FROM coin_pairs ORDER BY id ASC');
        console.log(`Found ${pairs.length} symbols to process`);
        
        let processedCount = 0;
        const failedSymbols = [];
        
        for (const row of pairs) {
            try {
                processedCount++;
                console.log(`\n[${processedCount}/${pairs.length}] Processing ${row.symbol}...`);
                
                // Add timeout for each symbol
                await Promise.race([
                    fetchHistoricalData(row.symbol),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Symbol Timeout')), 60000)
                    )
                ]);
                
                console.log(`✓ Completed ${row.symbol}`);
                
                // Add delay between symbols to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));
                
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
        console.log('Historical data fetch process completed!');
        
    } catch (error) {
        console.error('Error in main process:', error);
    } finally {
        process.exit(0);
    }
}

// Export for use in other scripts
module.exports = {
    fetchHistoricalData
};

// Run if called directly
if (require.main === module) {
    main();
}