const { pool } = require('../db');

async function init() {
    try {
        // historical_data tablosu
        await pool.query(`
            CREATE TABLE IF NOT EXISTS historical_data (
                id INT AUTO_INCREMENT PRIMARY KEY,
                symbol VARCHAR(32) NOT NULL,
                timestamp DATETIME NOT NULL,
                price DECIMAL(18,8) NOT NULL,
                volume DECIMAL(18,8) NOT NULL,
                UNIQUE(symbol, timestamp)
            ) ENGINE=InnoDB;
        `);

        // prediction_performance tablosu
        await pool.query(`
            CREATE TABLE IF NOT EXISTS prediction_performance (
                id INT AUTO_INCREMENT PRIMARY KEY,
                symbol VARCHAR(32) NOT NULL,
                prediction_date DATETIME NOT NULL,
                predicted_signal VARCHAR(8) NOT NULL,
                confidence DECIMAL(8,4) NOT NULL,
                actual_price DECIMAL(18,8) NOT NULL,
                predicted_price DECIMAL(18,8) NOT NULL,
                profit_loss DECIMAL(8,4) NOT NULL,
                UNIQUE(symbol, prediction_date)
            ) ENGINE=InnoDB;
        `);

        // coin_pairs tablosu
        await pool.query(`
            CREATE TABLE IF NOT EXISTS coin_pairs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                symbol VARCHAR(32) NOT NULL UNIQUE,
                added_date DATETIME NOT NULL
            ) ENGINE=InnoDB;
        `);
         // watch_list tablosu
        await pool.query(`
            CREATE TABLE IF NOT EXISTS watch_list (
                id INT AUTO_INCREMENT PRIMARY KEY,
                symbol VARCHAR(32) NOT NULL UNIQUE,
                confidence DECIMAL(5,2) NOT NULL,
                last_update DATETIME NOT NULL,
                added_date DATETIME NOT NULL
            ) ENGINE=InnoDB;
        `);

        console.log('MySQL tabloları başarıyla oluşturuldu!');
        process.exit(0);
    } catch (err) {
        console.error('MySQL tablo oluşturma hatası:', err.message);
        process.exit(1);
    }
}

init(); 