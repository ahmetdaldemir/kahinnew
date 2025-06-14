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
                volume DECIMAL(20,8) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_data (symbol, timestamp)
            )
        `);
        console.log('historical_data tablosu oluşturuldu');

        // prediction_performance tablosu
        await query(`
            CREATE TABLE IF NOT EXISTS prediction_performance (
                id INT AUTO_INCREMENT PRIMARY KEY,
                symbol VARCHAR(20) NOT NULL,
                prediction_date DATETIME NOT NULL,
                predicted_signal ENUM('BUY', 'SELL') NOT NULL,
                confidence DECIMAL(5,2) NOT NULL,
                actual_price DECIMAL(20,8) NOT NULL,
                predicted_price DECIMAL(20,8) NOT NULL,
                profit_loss DECIMAL(10,2) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_prediction (symbol, prediction_date)
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
                added_date DATETIME NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('watch_list tablosu oluşturuldu');

        console.log('Tüm tablolar başarıyla oluşturuldu!');
        process.exit(0);
    } catch (error) {
        console.error('Veritabanı tabloları oluşturulurken hata:', error.message);
        process.exit(1);
    }
}

initDatabase(); 