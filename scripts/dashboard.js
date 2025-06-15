require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database connection
const dbPath = path.join(__dirname, '..', 'data', 'crypto_analyzer.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to database:', err);
        process.exit(1);
    }
    console.log('Connected to database successfully');
});

// Fetch top 10 coins in uptrend
function fetchUptrendCoins() {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT symbol, profit_loss
            FROM prediction_performance
            WHERE profit_loss > 0
            ORDER BY profit_loss DESC
            LIMIT 10
        `;
        db.all(query, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

// Fetch top 10 coins in downtrend
function fetchDowntrendCoins() {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT symbol, profit_loss
            FROM prediction_performance
            WHERE profit_loss < 0
            ORDER BY profit_loss ASC
            LIMIT 10
        `;
        db.all(query, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

// Fetch top 10 coins with highest confidence
function fetchHighConfidenceCoins() {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT symbol, confidence, predicted_signal
            FROM prediction_performance
            ORDER BY confidence DESC
            LIMIT 10
        `;
        db.all(query, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

// Main function
async function main() {
    try {
        console.log('Generating dashboard...');

        // Fetch data
        const uptrendCoins = await fetchUptrendCoins();
        const downtrendCoins = await fetchDowntrendCoins();
        const highConfidenceCoins = await fetchHighConfidenceCoins();

        // Display uptrend coins
        console.log('\nTop 10 Coins in Uptrend:');
        console.table(uptrendCoins);

        // Display downtrend coins
        console.log('\nTop 10 Coins in Downtrend:');
        console.table(downtrendCoins);

        // Display high confidence coins
        console.log('\nTop 10 Coins with Highest Confidence:');
        console.table(highConfidenceCoins);

    } catch (error) {
        console.error('Error generating dashboard:', error);
    } finally {
        db.close();
    }
}

// Run the script
main(); 