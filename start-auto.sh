#!/bin/bash

echo "🚀 Kahin App Otomatik Başlatma Scripti"
echo "======================================"

# NPM global path'ini ayarla
export PATH=$PATH:/Users/emila/.npm-global/bin

# PM2 yüklü mü kontrol et
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 bulunamadı. Yükleniyor..."
    npm install -g pm2
    export PATH=$PATH:/Users/emila/.npm-global/bin
fi

# Logs klasörünü oluştur
mkdir -p logs

# PM2 logrotate eklentisini yükle
echo "📦 PM2 logrotate eklentisi yükleniyor..."
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7

# Mevcut PM2 processlerini temizle
echo "🧹 Mevcut PM2 processleri temizleniyor..."
pm2 delete all 2>/dev/null || true

# Uygulamayı başlat
echo "🎯 Kahin App başlatılıyor..."
pm2 start ecosystem.config.js

# PM2 startup scriptini oluştur (sistem başlangıcında otomatik başlat)
echo "🔧 Sistem başlangıcında otomatik başlatma ayarlanıyor..."
pm2 startup
pm2 save

echo "✅ Kahin App başarıyla başlatıldı!"
echo ""
echo "📊 Durum kontrolü:"
pm2 status
echo ""
echo "📝 Logları görüntülemek için: pm2 logs kahin-app"
echo "🛑 Durdurmak için: pm2 stop kahin-app"
echo "🔄 Yeniden başlatmak için: pm2 restart kahin-app"
echo ""
echo "🌐 Web arayüzü: http://localhost:3200" 