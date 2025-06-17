const express = require('express');
const path = require('path');
const { spawn, execSync, exec } = require('child_process');

if (process.env.NODE_ENV === 'production') {
    const { query } = require('./db');
} else {
    const { query } = require('./dev-db');
}

const {  fetchHighConfidenceCoins, fetchHighProfitCoins, fetchTopProfitCoins, fetchTopConfidenceCoins } = require('./scripts/dashboard');
const http = require('http');
const socketIo = require('socket.io');
const axios = require('axios');

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

// Yardımcı fonksiyon: Scripti asenkron promise olarak çalıştır
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

// Express sunucusunu başlat
function startExpressServer() {
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, 'views'));
    app.use(express.static('public'));

    // HTTP ve Socket.io sunucusu başlat
    const server = http.createServer(app);
    const io = socketIo(server);

    io.on('connection', (socket) => {
        console.log('Bir istemci bağlandı (WebSocket)');
    });

    // Her 15 saniyede bir Binance'tan en çok yükselen 10 coini çekip yayınla
    setInterval(async () => {
        try {
            const response = await axios.get('https://api.binance.com/api/v3/ticker/24hr');
            const data = response.data;
            // USDT pariteleri, en çok yükselen 10 coin (24h priceChangePercent)
            const uptrend = data
                .filter(t => t.symbol.endsWith('USDT'))
                .sort((a, b) => parseFloat(b.priceChangePercent) - parseFloat(a.priceChangePercent))
                .slice(0, 20)
                .map(t => ({
                    symbol: t.symbol,
                    price: t.lastPrice,
                    change24h: parseFloat(t.priceChangePercent),
                    volume: t.quoteVolume
                }));
            io.emit('binanceUptrend', uptrend);
        } catch (e) {
            console.error('Binance uptrend yayınlanırken hata:', e.message);
        }
    }, 15000);

    app.get('/', async (req, res) => {
        try {
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
                 WHERE p.profit_loss >= 5
                   AND p.confidence >= 50
                   AND p.prediction_date = (
                       SELECT MAX(prediction_date) FROM prediction_performance
                   )
                 ORDER BY p.confidence DESC, p.profit_loss DESC`
            );

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
                 WHERE p.profit_loss >= 5
                   AND p.confidence >= 50
                   AND p.prediction_date = (
                       SELECT MAX(prediction_date) FROM prediction_performance
                   )
                 ORDER BY p.confidence DESC, p.profit_loss DESC`
            );

            const highConfidenceCoins = await fetchHighConfidenceCoins();
            const highProfitCoins = await fetchHighProfitCoins();
            const topProfitCoins = await fetchTopProfitCoins();
            const topConfidenceCoins = await fetchTopConfidenceCoins();
            const watchList = await query('SELECT * FROM watch_list ORDER BY confidence DESC');

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
                highConfidenceCoins,
                highProfitCoins,
                topProfitCoins,
                topConfidenceCoins,
                watchList,
                lastUpdate
            });
        } catch (error) {
            console.error('Ana sayfa yüklenirken hata:', error);
            res.render('index', {
                predictions1h: [],
                predictions4h: [],
                highConfidenceCoins: [],
                highProfitCoins: [],
                topProfitCoins: [],
                topConfidenceCoins: [],
                watchList: [],
                lastUpdate: new Date().toLocaleString('tr-TR')
            });
        }
    });

    app.post('/api/run-predictions', (req, res) => {
        const predictionProcess = spawn('node', ['scripts/ml-prediction.js']);

        predictionProcess.stdout.on('data', (data) => {
            console.log(`Prediction output: ${data}`);
        });

        predictionProcess.stderr.on('data', (data) => {
            console.error(`Prediction error: ${data}`);
        });

        predictionProcess.on('close', (code) => {
            res.json({ success: code === 0 });
        });
    });

    // API: İzleme listesi (watch_list)
    app.get('/api/watch-list', async (req, res) => {
        try {
            const watchList = await query('SELECT * FROM watch_list ORDER BY confidence DESC');
            res.json({ success: true, data: watchList });
        } catch (error) {
            res.json({ success: false, error: error.message });
        }
    });

    // API: %5+ Kar Potansiyelli İlk 10 Coin
    app.get('/api/top-profit-coins', async (req, res) => {
        try {
            const coins = await fetchTopProfitCoins();
            res.json({ success: true, data: coins });
        } catch (error) {
            res.json({ success: false, error: error.message });
        }
    });

    // API: %50+ Güven Oranlı İlk 10 Coin
    app.get('/api/top-confidence-coins', async (req, res) => {
        try {
            const coins = await fetchTopConfidenceCoins();
            res.json({ success: true, data: coins });
        } catch (error) {
            res.json({ success: false, error: error.message });
        }
    });

    server.listen(port, () => {
        console.log(`✅ Express server started at http://localhost:${port}`);
    });

    // Sunucu çalışırken her 10 dakikada bir verileri güncelle
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

// Sunucu + Arka plan işlemleri başlat
async function autoSetupAndStartServer() {
    try {
        startExpressServer(); // Express hemen başlasın

        runScriptSync('node init-db.js'); // veritabanı senkron başlat

        const result = await query('SELECT COUNT(*) as cnt FROM historical_data');
        const hasData = result[0].cnt > 0;

        const scriptPromises = [];
        if (!hasData) {
            scriptPromises.push(runScriptPromise('node scripts/fetch-historical-data.js'));
        }
        scriptPromises.push(runScriptPromise('node scripts/fetch-realtime-data.js'));
        scriptPromises.push(runScriptPromise('node scripts/ml-prediction.js'));

        await Promise.all(scriptPromises);
        console.log('🚀 Otomasyon tamamlandı.');
    } catch (error) {
        console.error('Otomasyon hatası:', error.message);
    }
}

// Başlat
if (require.main === module) {
    autoSetupAndStartServer();
}
