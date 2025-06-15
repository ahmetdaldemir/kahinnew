require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create database directory if it doesn't exist
const fs = require('fs');
const dbDir = path.join(__dirname, 'data');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir);
}

// Create database connection
const dbPath = path.join(dbDir, 'crypto_analyzer.db');
console.log('Database path:', dbPath);
const db = new sqlite3.Database(dbPath);

// Initialize database tables
db.serialize(() => {
    // Watch list table
    db.run(`CREATE TABLE IF NOT EXISTS watch_list (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT NOT NULL UNIQUE,
        added_date DATETIME NOT NULL
    )`);

    // Historical data table
    db.run(`CREATE TABLE IF NOT EXISTS historical_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT NOT NULL,
        timestamp DATETIME NOT NULL,
        price REAL NOT NULL,
        volume REAL NOT NULL,
        UNIQUE(symbol, timestamp)
    )`);

    // Prediction performance table
    db.run(`CREATE TABLE IF NOT EXISTS prediction_performance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT NOT NULL,
        prediction_date DATETIME NOT NULL,
        predicted_signal TEXT NOT NULL,
        confidence REAL NOT NULL,
        actual_price REAL NOT NULL,
        predicted_price REAL NOT NULL,
        profit_loss REAL NOT NULL,
        UNIQUE(symbol, prediction_date)
    )`);

    // Coin pairs table
    db.run(`CREATE TABLE IF NOT EXISTS coin_pairs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT NOT NULL UNIQUE,
        added_date DATETIME NOT NULL
    )`);

    // Create indexes
    db.run('CREATE INDEX IF NOT EXISTS idx_watch_list_symbol ON watch_list(symbol)');
    db.run('CREATE INDEX IF NOT EXISTS idx_historical_data_symbol_timestamp ON historical_data(symbol, timestamp)');
    db.run('CREATE INDEX IF NOT EXISTS idx_prediction_performance_symbol_date ON prediction_performance(symbol, prediction_date)');

    console.log('Database tables created successfully');
});

// Close database connection
db.close(() => {
    console.log('Database connection closed');
}); 