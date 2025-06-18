require('dotenv').config();
const { query } = require('./db'); 

async function initDatabase() {
    try {
        console.log('MySQL veritabanı tabloları oluşturuluyor...');

        // historical_data tablosu
        await query(`
            CREATE TABLE IF NOT EXISTS historical_data (
                id INT AUTO_INCREMENT PRIMARY KEY,
                symbol VARCHAR(20) NOT NULL,
                timestamp DATETIME NOT NULL,
                price DECIMAL(20,8) NOT NULL,
                high DECIMAL(20,8),
                low DECIMAL(20,8),
                volume DECIMAL(30,8),
                timeframe VARCHAR(5) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_data (symbol, timestamp, timeframe)
            )
        `);
        console.log('historical_data tablosu oluşturuldu');

        // prediction_performance tablosu
        await query(`
            CREATE TABLE IF NOT EXISTS prediction_performance (
                id INT AUTO_INCREMENT PRIMARY KEY,
                symbol VARCHAR(20) NOT NULL,
                prediction_date DATETIME NOT NULL,
                predicted_signal ENUM('BUY', 'SELL', 'HOLD') NOT NULL,
                confidence DECIMAL(5,2) NOT NULL,
                actual_price DECIMAL(20,8) NOT NULL,
                predicted_price DECIMAL(20,8) NOT NULL,
                profit_loss DECIMAL(10,2) NOT NULL,
                buy_price DECIMAL(20,8),
                buy_time DATETIME,
                sell_price DECIMAL(20,8),
                sell_time DATETIME,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_prediction (symbol, prediction_date),
                support_levels TEXT,
                resistance_levels TEXT,
                dynamic_levels TEXT
            )
        `);
        console.log('prediction_performance tablosu oluşturuldu');

        // coin_pairs tablosu
        await query(`
            CREATE TABLE IF NOT EXISTS coin_pairs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                symbol VARCHAR(20) NOT NULL UNIQUE,
                added_date DATETIME NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('coin_pairs tablosu oluşturuldu');

        // watch_list tablosu
        await query(`
            CREATE TABLE IF NOT EXISTS watch_list (
                id INT AUTO_INCREMENT PRIMARY KEY,
                symbol VARCHAR(20) NOT NULL UNIQUE,
                confidence DECIMAL(5,2) NOT NULL,
                last_update DATETIME NOT NULL
            )
        `);
        console.log('watch_list tablosu oluşturuldu');

        // Destek ve Direnç Seviyeleri Tablosu
        await query(`
            CREATE TABLE IF NOT EXISTS support_resistance_levels (
                id INT AUTO_INCREMENT PRIMARY KEY,
                symbol VARCHAR(20) NOT NULL,
                level_type ENUM('support', 'resistance') NOT NULL,
                price DECIMAL(20,8) NOT NULL,
                strength INT NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                is_dynamic BOOLEAN DEFAULT FALSE,
                FOREIGN KEY (symbol) REFERENCES watch_list(symbol)
            )
        `);
        console.log('support_resistance_levels tablosu oluşturuldu');

        console.log('Tüm tablolar başarıyla oluşturuldu!');
        process.exit(0);
    } catch (error) {
        console.error('Veritabanı tabloları oluşturulurken hata:', error.message);
        process.exit(1);
    }
}

initDatabase(); 