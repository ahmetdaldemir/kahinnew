require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create database directory if it doesn't exist
const dbDir = path.join(__dirname, 'data');
if (!require('fs').existsSync(dbDir)) {
    require('fs').mkdirSync(dbDir, { recursive: true });
}

// Create database connection
const db = new sqlite3.Database(path.join(dbDir, 'crypto_analyzer.db'));

// Initialize database tables
db.serialize(() => {
    // Watch list table
    db.run(`CREATE TABLE IF NOT EXISTS watch_list (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT NOT NULL,
        current_price REAL,
        signal TEXT,
        confidence REAL,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Historical data table
    db.run(`CREATE TABLE IF NOT EXISTS historical_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT NOT NULL,
        timestamp DATETIME NOT NULL,
        open REAL NOT NULL,
        high REAL NOT NULL,
        low REAL NOT NULL,
        close REAL NOT NULL,
        volume REAL NOT NULL,
        rsi REAL,
        macd REAL,
        macd_signal REAL,
        macd_histogram REAL,
        bb_upper REAL,
        bb_middle REAL,
        bb_lower REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Prediction performance table
    db.run(`CREATE TABLE IF NOT EXISTS prediction_performance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT NOT NULL,
        prediction_date DATETIME NOT NULL,
        predicted_signal TEXT NOT NULL,
        actual_signal TEXT,
        confidence REAL,
        is_correct BOOLEAN,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Create indexes
    db.run('CREATE INDEX IF NOT EXISTS idx_watch_list_symbol ON watch_list(symbol)');
    db.run('CREATE INDEX IF NOT EXISTS idx_historical_data_symbol_timestamp ON historical_data(symbol, timestamp)');
    db.run('CREATE INDEX IF NOT EXISTS idx_prediction_performance_symbol_date ON prediction_performance(symbol, prediction_date)');

    console.log('Database tables created successfully');
});

// Close database connection
db.close((err) => {
    if (err) {
        console.error('Error closing database:', err);
    } else {
        console.log('Database connection closed');
    }
}); 