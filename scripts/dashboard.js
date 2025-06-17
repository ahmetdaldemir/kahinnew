require('dotenv').config();

if (process.env.NODE_ENV === 'production') {
    const { query } = require('../db');
} else {
    const { query } = require('../dev-db');
}



// Fetch top 10 coins in downtrend
async function fetchDowntrendCoins() {
    try {
        console.log('Fetching downtrend coins...');
        const rows = await query(`
            SELECT symbol, profit_loss, confidence, predicted_signal
            FROM prediction_performance
            WHERE profit_loss < 0
            ORDER BY profit_loss ASC
            LIMIT 10
        `);
        console.log('Downtrend coins found:', rows.length);
        return rows;
    } catch (error) {
        console.error('Error fetching downtrend coins:', error);
        return [];
    }
}

// Fetch top 10 coins with highest confidence
async function fetchHighConfidenceCoins() {
    try {
        console.log('Fetching high confidence coins...');
        const rows = await query(`
            SELECT symbol, confidence, predicted_signal, profit_loss
            FROM prediction_performance
            WHERE confidence > 0
            ORDER BY confidence DESC
            LIMIT 10
        `);
        console.log('High confidence coins found:', rows.length);
        return rows;
    } catch (error) {
        console.error('Error fetching high confidence coins:', error);
        return [];
    }
}

// Fetch top 10 coins with highest profit
async function fetchHighProfitCoins() {
    try {
        console.log('Fetching high profit coins...');
        const rows = await query(`
            SELECT symbol, profit_loss, confidence, predicted_signal
            FROM prediction_performance
            WHERE profit_loss > 0
            ORDER BY profit_loss DESC
            LIMIT 10
        `);
        console.log('High profit coins found:', rows.length);
        return rows;
    } catch (error) {
        console.error('Error fetching high profit coins:', error);
        return [];
    }
}

// %5+ kar potansiyelli ilk 10 coin
async function fetchTopProfitCoins() {
    const sql = `SELECT * FROM prediction_performance
                 WHERE profit_loss >= 5
                   AND prediction_date = (SELECT MAX(prediction_date) FROM prediction_performance)
                 ORDER BY profit_loss DESC
                 LIMIT 10`;
    return await query(sql);
}

// %50+ güven oranlı ilk 10 coin
async function fetchTopConfidenceCoins() {
    const sql = `SELECT * FROM prediction_performance
                 WHERE confidence >= 50
                   AND prediction_date = (SELECT MAX(prediction_date) FROM prediction_performance)
                 ORDER BY confidence DESC
                 LIMIT 10`;
    return await query(sql);
}

// Main function
async function main() {
    try {
        console.log('Generating dashboard...');

        // Fetch data
        const downtrendCoins = await fetchDowntrendCoins();
        const highConfidenceCoins = await fetchHighConfidenceCoins();
        const highProfitCoins = await fetchHighProfitCoins();

     

        // Display downtrend coins
        console.log('\nTop 10 Coins in Downtrend:');
        console.table(downtrendCoins);

        // Display high confidence coins
        console.log('\nTop 10 Coins with Highest Confidence:');
        console.table(highConfidenceCoins);

        // Display high profit coins
        console.log('\nTop 10 Coins with Highest Profit:');
        console.table(highProfitCoins);

    } catch (error) {
        console.error('Error generating dashboard:', error);
    }
}

// Run the script
main();

module.exports = {
    fetchDowntrendCoins,
    fetchHighConfidenceCoins,
    fetchHighProfitCoins,
    fetchTopProfitCoins,
    fetchTopConfidenceCoins
}; 