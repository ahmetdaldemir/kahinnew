require('dotenv').config();
const mysql = require('mysql2/promise');

if (process.env.NODE_ENV === 'production') {
    database = 'kahin';
} else {
    database = 'kahin_dev';
}

const pool = mysql.createPool({
    host: '185.209.228.189',
    user: 'root',
    password: 'StrongPassword123!',
    database: database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 60000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

async function query(sql, params) {
    try {
        const [rows] = await pool.execute(sql, params);
        return rows;
    } catch (error) {
        if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
            console.error('Veritabanı bağlantı hatası:', error.code);
            // Bağlantıyı yeniden dene
            await new Promise(resolve => setTimeout(resolve, 1000));
            return query(sql, params);
        }
        throw error;
    }
}

// Bağlantı durumunu kontrol et
pool.on('connection', function (connection) {
    console.log('DB Bağlantısı başarılı');
});

pool.on('error', function (err) {
    console.error('DB Havuzu hatası:', err);
});

module.exports = { pool, query }; 