const express = require('express');
const path = require('path');
const { spawn, execSync, exec } = require('child_process');
const { query } = require('./db');

const app = express();
const port = process.env.PORT || 3200;

// Yardımcı fonksiyon: Scripti senkron çalıştır
function runScriptSync(command) {
    try {
        console.log(`Çalıştırılıyor: ${command}`);
        execSync(command, { stdio: 'inherit' });
    } catch (err) {
        console.error(`Hata: ${command}`, err.message);
    }
}

// Yardımcı fonksiyon: Scripti async başlat (arka planda)
function runScriptAsync(command) {
    try {
        console.log(`Arka planda başlatılıyor: ${command}`);
        spawn(command.split(' ')[0], command.split(' ').slice(1), { stdio: 'inherit', detached: true });
    } catch (err) {
        console.error(`Arka plan script hatası: ${command}`, err.message);
    }
}

// Otomasyon: Veritabanı, veri ve ML tahminleri kontrolü
async function autoSetupAndStartServer() {
    try {
        // 1. Veritabanı ve tablo kontrolü/oluşturulması
        runScriptSync('node init-db.js');

        // 2. Veri var mı kontrol et, yoksa çek
        const result = await query('SELECT COUNT(*) as cnt FROM historical_data');
        const hasData = result[0].cnt > 0;

        if (!hasData) {
            runScriptSync('node scripts/fetch-historical-data.js');
        }

        // 3. Anlık verileri çek
        runScriptSync('node scripts/fetch-realtime-data.js');
        
        // 4. ML tahminleri oluştur
        runScriptSync('node scripts/ml-prediction.js');
        
        // 5. Express sunucusunu başlat
        startExpressServer();
    } catch (error) {
        console.error('Otomasyon hatası:', error);
        // Hata durumunda da sunucuyu başlat
        startExpressServer();
    }
}

function startExpressServer() {
    // Set up EJS as the view engine
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, 'views'));

    // Serve static files
    app.use(express.static('public'));

    // Main dashboard route
    app.get('/', async (req, res) => {
        try {
            // Son 24 saatteki değişimleri hesapla
            async function get24hChange(symbol) {
                const rows = await query(
                    `SELECT price FROM historical_data 
                     WHERE symbol = ? 
                     AND timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                     ORDER BY timestamp DESC`,
                    [symbol]
                );
                if (rows.length < 2) return 0;
                const latest = parseFloat(rows[0].price);
                const oldest = parseFloat(rows[rows.length - 1].price);
                return ((latest - oldest) / oldest) * 100;
            }

            // En son tahminleri al
            const predictions = await query(
                `SELECT p.*, 
                        h.price as current_price,
                        h.volume as current_volume
                 FROM prediction_performance p
                 LEFT JOIN (
                     SELECT symbol, price, volume
                     FROM historical_data
                     WHERE (symbol, timestamp) IN (
                         SELECT symbol, MAX(timestamp)
                         FROM historical_data
                         GROUP BY symbol
                     )
                 ) h ON p.symbol = h.symbol
                 WHERE p.prediction_date = (
                     SELECT MAX(prediction_date) 
                     FROM prediction_performance
                 )
                 ORDER BY p.confidence DESC`
            );

            // Her coin için 24s değişimi ve trend skoru hesapla
            for (const pred of predictions) {
                pred.change24h = await get24hChange(pred.symbol);
                // Trend skoru: %70 güven oranı + %30 fiyat değişimi
                pred.trendScore = (pred.confidence * 0.7) + (pred.change24h * 0.3);
            }

            // Yükseliş trendindeki coinleri filtrele ve sırala
            const uptrendCoins = predictions
                .filter(p => p.change24h > 0 && p.confidence >= 10) // En az %10 güven oranı
                .sort((a, b) => b.trendScore - a.trendScore)
                .slice(0, 10);

            // En yüksek güven oranına sahip coinler
            const highConfidenceCoins = predictions
                .sort((a, b) => b.confidence - a.confidence)
                .slice(0, 10);

            // En yüksek kar potansiyeli olan coinler
            const highProfitCoins = predictions
                .filter(p => p.profit_loss >= 5) // En az %5 kar potansiyeli
                .sort((a, b) => b.profit_loss - a.profit_loss)
                .slice(0, 10);

            // Son güncelleme zamanını al
            const lastUpdate = new Date().toLocaleString('tr-TR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });

            res.render('index', {
                uptrendCoins,
                highConfidenceCoins,
                highProfitCoins,
                lastUpdate
            });
        } catch (error) {
            console.error('Ana sayfa yüklenirken hata:', error);
            // Hata durumunda da lastUpdate gönder
            res.render('index', {
                uptrendCoins: [],
                highConfidenceCoins: [],
                highProfitCoins: [],
                lastUpdate: new Date().toLocaleString('tr-TR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                })
            });
        }
    });

    // API endpoint to run predictions
    app.post('/api/run-predictions', (req, res) => {
        const predictionProcess = spawn('node', ['scripts/ml-prediction.js']);

        predictionProcess.stdout.on('data', (data) => {
            console.log(`Prediction process output: ${data}`);
        });

        predictionProcess.stderr.on('data', (data) => {
            console.error(`Prediction process error: ${data}`);
        });

        predictionProcess.on('close', (code) => {
            if (code === 0) {
                res.json({ success: true });
            } else {
                res.json({ success: false, error: `Process exited with code ${code}` });
            }
        });
    });

    app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`);
    });

    // Sunucu çalışırken her 10 dakikada bir anlık veri ve ML tahmini güncelle
    setInterval(() => {
        exec('node scripts/fetch-realtime-data.js', (err) => {
            if (err) {
                console.error('fetch-realtime-data.js hata:', err.message);
            } else {
                exec('node scripts/ml-prediction.js', (err2) => {
                    if (err2) {
                        console.error('ml-prediction.js hata:', err2.message);
                    }
                });
            }
        });
    }, 10 * 60 * 1000); // 10 dakika
}

// Otomasyon başlat
if (require.main === module) {
    autoSetupAndStartServer();
} 