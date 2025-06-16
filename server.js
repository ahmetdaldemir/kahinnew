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
        // 1. Veritabanı ve tablo kontrolü/oluşturulması (senkron)
        runScriptSync('node init-db.js');

        // 2. Veri var mı kontrol et
        const result = await query('SELECT COUNT(*) as cnt FROM historical_data');
        const hasData = result[0].cnt > 0;

        // 3. Scriptleri asenkron başlat
        const scriptPromises = [];
        if (!hasData) {
            scriptPromises.push(runScriptPromise('node scripts/fetch-historical-data.js'));
        }
        scriptPromises.push(runScriptPromise('node scripts/fetch-realtime-data.js'));
        scriptPromises.push(runScriptPromise('node scripts/ml-prediction.js'));

        await Promise.all(scriptPromises);

        // 4. Express sunucusunu başlat
        startExpressServer();
    } catch (error) {
        console.error('Otomasyon hatası:', error);
        // Hata durumunda da sunucuyu başlat
        startExpressServer();
    }
}

// Yardımcı: Scripti asenkron promise ile çalıştır
function runScriptPromise(command) {
    return new Promise((resolve, reject) => {
        const [cmd, ...args] = command.split(' ');
        const proc = spawn(cmd, args, { stdio: 'inherit' });
        proc.on('close', code => {
            if (code === 0) resolve();
            else reject(new Error(`${command} exited with code ${code}`));
        });
    });
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
            // 1h için uygun coinler
            const predictions1h = await query(
                `SELECT p.*, h.price as current_price, h.volume as current_volume
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
                 WHERE p.timeframe = '1h'
                   AND p.profit_loss >= 5
                   AND p.confidence >= 50
                   AND p.prediction_date = (
                       SELECT MAX(prediction_date) FROM prediction_performance WHERE timeframe = '1h'
                   )
                 ORDER BY p.confidence DESC, p.profit_loss DESC`
            );

            // 4h için uygun coinler
            const predictions4h = await query(
                `SELECT p.*, h.price as current_price, h.volume as current_volume
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
                 WHERE p.timeframe = '4h'
                   AND p.profit_loss >= 5
                   AND p.confidence >= 50
                   AND p.prediction_date = (
                       SELECT MAX(prediction_date) FROM prediction_performance WHERE timeframe = '4h'
                   )
                 ORDER BY p.confidence DESC, p.profit_loss DESC`
            );

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
                predictions1h,
                predictions4h,
                lastUpdate
            });
        } catch (error) {
            console.error('Ana sayfa yüklenirken hata:', error);
            res.render('index', {
                predictions1h: [],
                predictions4h: [],
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