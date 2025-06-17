require('dotenv').config();
const ccxt = require('ccxt');

const { query } = require('../db'); 


// Binance API
const binance = new ccxt.binance({
    apiKey: process.env.BINANCE_API_KEY,
    secret: process.env.BINANCE_API_SECRET,
    enableRateLimit: true
});

async function getLastRealtimeData(symbol, timeframe) {
    const result = await query(
        `SELECT timestamp FROM historical_data 
         WHERE symbol = ? 
         AND timeframe = ?
         ORDER BY timestamp DESC 
         LIMIT 1`,
        [symbol, timeframe]
    );
    return result[0]?.timestamp || null;
}

async function fetchRealtimeData(symbol, timeframe) {
    try {
        console.log(`Checking real-time data for ${symbol} (${timeframe})`);
        
        // Son veriyi kontrol et
        const lastData = await getLastRealtimeData(symbol, timeframe);
        const now = new Date();
        const timeframeMinutes = timeframe === '1h' ? 60 : 240; // 1h veya 4h
        const timeframeAgo = new Date(now.getTime() - timeframeMinutes * 60 * 1000);

        // Eğer son veri timeframe'den eskiyse veya hiç veri yoksa yeni veri çek
        if (!lastData || new Date(lastData) < timeframeAgo) {
            console.log(`Fetching new real-time data for ${symbol} (${timeframe})`);
            const ohlcv = await binance.fetchOHLCV(symbol, timeframe, undefined, 2);
            
            if (!ohlcv || ohlcv.length === 0) {
                console.log(`No data available for ${symbol} (${timeframe})`);
                return;
            }

            let newRecords = 0;
            for (const candle of ohlcv) {
                const [timestamp, open, high, low, close, volume] = candle;
                const result = await query(
                    `INSERT IGNORE INTO historical_data (symbol, timestamp, price, high, low, volume, timeframe) 
                     VALUES (?, FROM_UNIXTIME(?/1000), ?, ?, ?, ?, ?)`,
                    [symbol, timestamp, close, high, low, volume, timeframe]
                );
                if (result.affectedRows > 0) newRecords++;
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
        const pairs = await query('SELECT symbol FROM coin_pairs');
        console.log(`Found ${pairs.length} pairs to check`);
        
        const timeframes = ['1h', '4h'];

        for (const row of pairs) {
            for (const timeframe of timeframes) {
                await fetchRealtimeData(row.symbol, timeframe);
                await sleep(1000);
            }
        }
        console.log('Real-time data check completed');
        process.exit(0);
    } catch (error) {
        console.error('Error in main process:', error);
        process.exit(1);
    }
}

main(); 