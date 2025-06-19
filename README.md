# Kahin App - Otomatik Kripto Tahmin Sistemi

Bu proje, kripto para piyasalarında otomatik tahmin yapan bir sistemdir. Sistem tamamen otomatik çalışır ve manuel müdahale gerektirmez.

## 🚀 Otomatik Başlatma

### Hızlı Başlatma
```bash
# Otomatik başlatma scripti
./start-auto.sh
```

### Manuel Başlatma
```bash
# PM2 ile başlatma
npm run auto:start

# Normal başlatma
npm start
```

## 🤖 Otomatik Sistem Özellikleri

### Otomatik Çalışma
- **Sistem başlangıcında otomatik başlatma**: PM2 ile sistem yeniden başladığında otomatik çalışır
- **10 dakikada bir otomatik güncelleme**: Veri çekme ve ML tahminleri
- **Hata durumunda otomatik yeniden başlatma**: 3 hata sonrası sistem otomatik yeniden başlar
- **Bellek yönetimi**: 300MB üzerinde otomatik yeniden başlatma

### API Endpoints
- `GET /api/system-status` - Sistem durumu
- `POST /api/auto-system/start` - Otomatik sistemi başlat
- `POST /api/auto-system/stop` - Otomatik sistemi durdur
- `POST /api/auto-system/restart` - Sistemi yeniden başlat
- `POST /api/run-all-scripts` - Tüm scriptleri manuel çalıştır

## 📊 Sistem Durumu

Sistem durumunu kontrol etmek için:
```bash
# PM2 durumu
pm2 status

# Logları görüntüle
pm2 logs kahin-app

# Sistem durumu API
curl http://localhost:3200/api/system-status
```

## 🔧 Yönetim Komutları

```bash
# PM2 ile başlat
npm run pm2:start

# Durdur
npm run pm2:stop

# Yeniden başlat
npm run pm2:restart

# Logları görüntüle
npm run pm2:logs

# Durumu kontrol et
npm run pm2:status
```

## 📁 Proje Yapısı

```
kahinnew/
├── server.js              # Ana sunucu (otomatik sistem)
├── ecosystem.config.js    # PM2 konfigürasyonu
├── start-auto.sh         # Otomatik başlatma scripti
├── scripts/
│   ├── fetch-historical-data.js
│   ├── fetch-realtime-data.js
│   └── ml-prediction.js
├── db/
│   └── db.js
└── logs/                 # PM2 logları
```

## 🌐 Web Arayüzü

Sistem çalıştıktan sonra `http://localhost:3200` adresinden web arayüzüne erişebilirsiniz.

## ⚠️ Önemli Notlar

1. **Otomatik Sistem**: Sistem başlatıldıktan sonra tamamen otomatik çalışır
2. **Hata Yönetimi**: Sistem hataları otomatik olarak yönetilir ve gerekirse yeniden başlatılır
3. **Log Yönetimi**: Loglar otomatik olarak döndürülür ve 7 gün saklanır
4. **Bellek Yönetimi**: 300MB üzerinde otomatik yeniden başlatma

## 🔄 Güncelleme Süreci

1. **Historical Data**: İlk başlatmada çekilir
2. **Real-time Data**: Her 10 dakikada bir güncellenir
3. **ML Predictions**: Her 10 dakikada bir çalışır
4. **Watch List**: Otomatik olarak güncellenir

Sistem tamamen otomatik çalışır ve manuel müdahale gerektirmez! 