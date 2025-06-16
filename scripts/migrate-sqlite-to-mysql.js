const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { query } = require('../db');

const sqliteDbPath = path.join(__dirname, '..', 'data', 'crypto_analyzer.db');
console.log('SQLite veritabanı yolu:', sqliteDbPath);

const sqliteDb = new sqlite3.Database(sqliteDbPath, (err) => {
    if (err) {
        console.error('SQLite veritabanına bağlanırken hata:', err.message);
        process.exit(1);
    }
    console.log('SQLite veritabanına başarıyla bağlandı');
});

async function migrateTable(table, columns, insertSql) {
    return new Promise((resolve, reject) => {
        console.log(`\n${table} tablosu için taşıma işlemi başlatılıyor...`);
        
        sqliteDb.all(`SELECT * FROM ${table}`, async (err, rows) => {
            if (err) {
                console.error(`${table} tablosundan veri okunurken hata:`, err.message);
                return reject(err);
            }
            
            console.log(`${table} tablosunda ${rows.length} adet kayıt bulundu`);
            
            let successCount = 0;
            let errorCount = 0;
            
            for (const row of rows) {
                try {
                    await query(insertSql, columns.map(col => row[col]));
                    successCount++;
                    if (successCount % 100 === 0) {
                        console.log(`${table}: ${successCount} kayıt başarıyla taşındı`);
                    }
                } catch (e) {
                    errorCount++;
                    console.error(`${table} tablosunda kayıt taşınırken hata:`, e.message);
                    console.error('Hatalı kayıt:', row);
                }
            }
            
            console.log(`\n${table} tablosu taşıma sonuçları:`);
            console.log(`- Başarılı: ${successCount}`);
            console.log(`- Hatalı: ${errorCount}`);
            console.log(`- Toplam: ${rows.length}`);
            
            resolve();
        });
    });
}

async function migrate() {
    try {
        console.log('\n=== Veri Taşıma İşlemi Başlatılıyor ===\n');
        
             // coin_pairs
             await migrateTable(
                'coin_pairs',
                ['symbol', 'added_date'],
                `INSERT IGNORE INTO coin_pairs (symbol, added_date) VALUES (?, ?)`
            );
    

        // historical_data
        await migrateTable(
            'historical_data',
            ['symbol', 'timestamp', 'price', 'volume'],
            `INSERT IGNORE INTO historical_data (symbol, timestamp, price, volume) VALUES (?, ?, ?, ?)`
        );

        // prediction_performance
        await migrateTable(
            'prediction_performance',
            ['symbol', 'prediction_date', 'predicted_signal', 'confidence', 'actual_price', 'predicted_price', 'profit_loss'],
            `INSERT IGNORE INTO prediction_performance (symbol, prediction_date, predicted_signal, confidence, actual_price, predicted_price, profit_loss) VALUES (?, ?, ?, ?, ?, ?, ?)`
        );

        // coin_pairs
        await migrateTable(
            'coin_pairs',
            ['symbol', 'added_date'],
            `INSERT IGNORE INTO coin_pairs (symbol, added_date) VALUES (?, ?)`
        );

        // watch_list
        await migrateTable(
            'watch_list',
            ['symbol', 'added_date'],
            `INSERT IGNORE INTO watch_list (symbol, added_date) VALUES (?, ?)`
        );

        sqliteDb.close();
        console.log('\n=== Veri Taşıma İşlemi Tamamlandı ===\n');
        
        // MySQL'deki son durumu kontrol et
        const tables = ['historical_data', 'prediction_performance', 'coin_pairs', 'watch_list'];
        for (const table of tables) {
            const result = await query(`SELECT COUNT(*) as count FROM ${table}`);
            console.log(`${table} tablosunda toplam kayıt sayısı:`, result[0].count);
        }
        
        process.exit(0);
    } catch (err) {
        console.error('\nTaşıma işlemi sırasında kritik hata:', err.message);
        process.exit(1);
    }
}

migrate(); 