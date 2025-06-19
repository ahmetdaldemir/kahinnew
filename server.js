const express = require('express');
const path = require('path');
const { spawn, execSync, exec } = require('child_process');

const { query } = require('./db/db'); 

const {  fetchHighConfidenceCoins, fetchHighProfitCoins, fetchTopProfitCoins, fetchTopConfidenceCoins } = require('./scripts/dashboard');
const SignalService = require('./services/signalService');
const http = require('http');
const socketIo = require('socket.io');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3200;

// Yardımcı fonksiyon: Scripti senkron çalıştır
function runScriptSync(command) {
    try {
        console.log(`🔄 Çalıştırılıyor: ${command}`);
        execSync(command, { stdio: 'inherit' });
        console.log(`✅ Tamamlandı: ${command}`);
    } catch (err) {
        console.error(`❌ Hata: ${command}`, err.message);
    }
}

// Yardımcı fonksiyon: Scripti asenkron promise olarak çalıştır
function runScriptPromise(command) {
    return new Promise((resolve, reject) => {
        console.log(`🔄 Başlatılıyor: ${command}`);
        const [cmd, ...args] = command.split(' ');
        const proc = spawn(cmd, args, { stdio: 'inherit' });
        
        proc.on('close', code => {
            if (code === 0) {
                console.log(`✅ Tamamlandı: ${command}`);
                resolve();
            } else {
                console.error(`❌ Hata: ${command} exited with code ${code}`);
                reject(new Error(`${command} exited with code ${code}`));
            }
        });
        
        proc.on('error', (err) => {
            console.error(`❌ Process error: ${command}`, err.message);
            reject(err);
        });
    });
}

// Sıralı script çalıştırma fonksiyonu
async function runScriptsSequentially(scripts) {
    console.log('🚀 Script sırası başlatılıyor...');
    for (let i = 0; i < scripts.length; i++) {
        const script = scripts[i];
        try {
            console.log(`\n📋 [${i + 1}/${scripts.length}] ${script}`);
            await runScriptPromise(script);
        } catch (error) {
            console.error(`❌ Script hatası: ${script}`, error.message);
            // Hata durumunda devam et
        }
    }
    console.log('🎉 Tüm scriptler tamamlandı!');
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
        console.log('🌐 Bir istemci bağlandı (WebSocket)');
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
            console.error('❌ Binance uptrend yayınlanırken hata:', e.message);
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
            console.error('❌ Ana sayfa yüklenirken hata:', error);
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
        console.log('🔮 Manuel ML prediction başlatılıyor...');
        const predictionProcess = spawn('node', ['scripts/ml-prediction.js']);

        predictionProcess.stdout.on('data', (data) => {
            console.log(`📊 Prediction output: ${data}`);
        });

        predictionProcess.stderr.on('data', (data) => {
            console.error(`❌ Prediction error: ${data}`);
        });

        predictionProcess.on('close', (code) => {
            if (code === 0) {
                console.log('✅ Manuel ML prediction tamamlandı');
            } else {
                console.error(`❌ Manuel ML prediction hatası: ${code}`);
            }
            res.json({ success: code === 0 });
        });
    });

    // API: Tüm scriptleri sırayla çalıştır
    app.post('/api/run-all-scripts', async (req, res) => {
        try {
            console.log('🚀 Tüm scriptler manuel olarak başlatılıyor...');
            
            const scripts = [
                'node scripts/fetch-historical-data.js',
                'node scripts/fetch-realtime-data.js',
                'node scripts/ml-prediction.js'
            ];
            
            await runScriptsSequentially(scripts);
            res.json({ success: true, message: 'Tüm scriptler tamamlandı' });
        } catch (error) {
            console.error('❌ Script çalıştırma hatası:', error);
            res.json({ success: false, error: error.message });
        }
    });

    // API: İzleme listesi (watch_list)
    app.get('/api/watch-list', async (req, res) => {
        try {
            const watchList = await query('SELECT * FROM watch_list where confidence >= 30 and confidence <= 100 ORDER BY confidence DESC LIMIT 20');
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

    // API: Sistem durumu
    app.get('/api/system-status', (req, res) => {
        try {
            const status = autoSystem.getStatus();
            res.json({ success: true, data: status });
        } catch (error) {
            res.json({ success: false, error: error.message });
        }
    });

    // API: Otomatik sistemi başlat/durdur
    app.post('/api/auto-system/:action', async (req, res) => {
        try {
            const { action } = req.params;
            
            if (action === 'start') {
                await autoSystem.startAutoUpdate();
                res.json({ success: true, message: 'Otomatik sistem başlatıldı' });
            } else if (action === 'stop') {
                autoSystem.stop();
                res.json({ success: true, message: 'Otomatik sistem durduruldu' });
            } else if (action === 'restart') {
                await autoSystem.restartSystem();
                res.json({ success: true, message: 'Sistem yeniden başlatıldı' });
            } else {
                res.json({ success: false, error: 'Geçersiz işlem' });
            }
        } catch (error) {
            res.json({ success: false, error: error.message });
        }
    });

    // API: Sinyal oluştur
    app.post('/api/generate-signals', async (req, res) => {
        try {
            console.log('🔍 Detaylı sinyaller oluşturuluyor...');
            const signalService = new SignalService();
            const signals = await signalService.generateAllSignals();
            
            res.json({ 
                success: true, 
                message: `${signals.length} sinyal oluşturuldu`,
                signals: signals
            });
        } catch (error) {
            console.error('❌ Sinyal oluşturma hatası:', error);
            res.json({ success: false, error: error.message });
        }
    });

    // API: Son sinyalleri getir
    app.get('/api/latest-signals', async (req, res) => {
        try {
            const signals = await query(`
                SELECT * FROM trading_signals 
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                ORDER BY created_at DESC
                LIMIT 50
            `);
            
            res.json({ success: true, data: signals });
        } catch (error) {
            res.json({ success: false, error: error.message });
        }
    });

    // API: Belirli coin için sinyalleri getir
    app.get('/api/signals/:symbol', async (req, res) => {
        try {
            const { symbol } = req.params;
            const signals = await query(`
                SELECT * FROM trading_signals 
                WHERE symbol = ? 
                ORDER BY created_at DESC 
                LIMIT 20
            `, [symbol]);
            
            res.json({ success: true, data: signals });
        } catch (error) {
            res.json({ success: false, error: error.message });
        }
    });

    // API: Yüksek güvenli sinyalleri getir
    app.get('/api/high-confidence-signals', async (req, res) => {
        try {
            const signals = await query(`
                SELECT * FROM trading_signals 
                WHERE confidence >= 70 
                AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                ORDER BY confidence DESC, created_at DESC
                LIMIT 20
            `);
            
            res.json({ success: true, data: signals });
        } catch (error) {
            res.json({ success: false, error: error.message });
        }
    });

    server.listen(port, () => {
        console.log(`✅ Express server started at http://localhost:${port}`);
    });
}

// Gelişmiş otomatik sistem yönetimi
class AutoSystemManager {
    constructor() {
        this.isRunning = false;
        this.updateInterval = null;
        this.lastUpdateTime = null;
        this.errorCount = 0;
        this.maxErrors = 3;
        this.updateIntervalMs = 10 * 60 * 1000; // 10 dakika
    }

    // Otomatik güncelleme döngüsü
    async startAutoUpdate() {
        if (this.isRunning) {
            console.log('⚠️ Otomatik güncelleme zaten çalışıyor');
            return;
        }

        this.isRunning = true;
        console.log('🤖 Otomatik güncelleme sistemi başlatıldı');

        // İlk güncellemeyi hemen yap
        await this.performUpdate();

        // Periyodik güncelleme döngüsü
        this.updateInterval = setInterval(async () => {
            await this.performUpdate();
        }, this.updateIntervalMs);
    }

    // Güncelleme işlemi
    async performUpdate() {
        try {
            console.log('\n⏰ Otomatik güncelleme başlatılıyor...');
            this.lastUpdateTime = new Date();
            
            await runScriptsSequentially([
                'node scripts/fetch-realtime-data.js',
                'node scripts/ml-prediction.js'
            ]);
            
            // Sinyal oluştur
            console.log('🔍 Sinyaller oluşturuluyor...');
            const signalService = new SignalService();
            await signalService.generateAllSignals();
            
            console.log('✅ Otomatik güncelleme tamamlandı');
            this.errorCount = 0; // Başarılı güncelleme sonrası hata sayacını sıfırla
            
        } catch (error) {
            this.errorCount++;
            console.error(`❌ Otomatik güncelleme hatası (${this.errorCount}/${this.maxErrors}):`, error.message);
            
            // Çok fazla hata varsa sistemi yeniden başlat
            if (this.errorCount >= this.maxErrors) {
                console.log('🔄 Çok fazla hata, sistem yeniden başlatılıyor...');
                await this.restartSystem();
            }
        }
    }

    // Sistem yeniden başlatma
    async restartSystem() {
        try {
            console.log('🔄 Sistem yeniden başlatılıyor...');
            
            // Mevcut interval'i temizle
            if (this.updateInterval) {
                clearInterval(this.updateInterval);
                this.updateInterval = null;
            }
            
            this.isRunning = false;
            this.errorCount = 0;
            
            // 30 saniye bekle
            await new Promise(resolve => setTimeout(resolve, 30000));
            
            // Sistemi yeniden başlat
            await this.startAutoUpdate();
            
        } catch (error) {
            console.error('❌ Sistem yeniden başlatma hatası:', error.message);
        }
    }

    // Sistem durumu
    getStatus() {
        return {
            isRunning: this.isRunning,
            lastUpdateTime: this.lastUpdateTime,
            errorCount: this.errorCount,
            nextUpdateIn: this.isRunning ? this.updateIntervalMs : null
        };
    }

    // Sistemi durdur
    stop() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        this.isRunning = false;
        console.log('🛑 Otomatik güncelleme sistemi durduruldu');
    }
}

// Global otomatik sistem yöneticisi
const autoSystem = new AutoSystemManager();

// Sunucu + Arka plan işlemleri başlat
async function autoSetupAndStartServer() {
    try {
        console.log('🚀 Kahin App başlatılıyor...\n');
        
        startExpressServer(); // Express hemen başlasın

        console.log('📊 Veritabanı kontrol ediliyor...');
        runScriptSync('node db/init-db.js'); // veritabanı senkron başlat

        const result = await query('SELECT COUNT(*) as cnt FROM historical_data');
        const hasData = result[0].cnt > 0;

        console.log(`📈 Mevcut veri: ${hasData ? 'Var' : 'Yok'}`);

        if (!hasData) {
            console.log('📥 İlk kez historical data çekiliyor...');
            await runScriptPromise('node scripts/fetch-historical-data.js');
        }

        console.log('🔄 İlk script seti başlatılıyor...');
        await runScriptsSequentially([
            'node scripts/fetch-realtime-data.js',
            'node scripts/ml-prediction.js'
        ]);
        
        console.log('🎉 Kahin App başlatma tamamlandı!');
        
        // Otomatik sistem başlat
        console.log('🤖 Otomatik güncelleme sistemi başlatılıyor...');
        await autoSystem.startAutoUpdate();
        
    } catch (error) {
        console.error('❌ Başlatma hatası:', error.message);
    }
}

// Başlat
if (require.main === module) {
    autoSetupAndStartServer();
}
