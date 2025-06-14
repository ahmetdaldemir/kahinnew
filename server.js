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
            // Her coin için son 24 saatlik değişimi hesapla
            async function get24hChange(symbol) {
                const rows = await query(
                    `SELECT price FROM historical_data WHERE symbol = ? ORDER BY timestamp DESC LIMIT 24`,
                    [symbol]
                );
                if (rows.length < 2) return 0;
                const latest = parseFloat(rows[0].price);
                const oldest = parseFloat(rows[rows.length - 1].price);
                return ((latest - oldest) / oldest) * 100;
            }

            // prediction_performance tablosundan son tahminleri çek
            const predictions = await query(
                `SELECT symbol, confidence, predicted_signal, profit_loss, actual_price FROM prediction_performance
                 WHERE prediction_date = (SELECT MAX(prediction_date) FROM prediction_performance)
                 ORDER BY symbol`
            );

            // Her coin için 24s değişimi ekle
            for (const pred of predictions) {
                pred.change24h = await get24hChange(pred.symbol);
            }

            // Yükseliş trendindeki 10 coin (24s değişimi en yüksek olanlar)
            const uptrendCoins = predictions
                .filter(p => p.change24h > 0)
                .sort((a, b) => b.change24h - a.change24h)
                .slice(0, 10);

            // Düşüş trendindeki 10 coin (24s değişimi en düşük olanlar)
            const downtrendCoins = predictions
                .filter(p => p.change24h < 0)
                .sort((a, b) => a.change24h - b.change24h)
                .slice(0, 10);

            // En yüksek güven oranına sahip 10 coin
            const highConfidenceCoins = predictions
                .sort((a, b) => b.confidence - a.confidence)
                .slice(0, 10);

            res.render('index', {
                uptrendCoins,
                downtrendCoins,
                highConfidenceCoins
            });
        } catch (error) {
            res.status(500).send('Sunucu hatası: ' + error.message);
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