require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: '185.209.228.189',
    user: 'root',
    password: 'StrongPassword123!',
    database: 'kahin',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function query(sql, params) {
    const [rows] = await pool.execute(sql, params);
    return rows;
}

module.exports = { pool, query }; 