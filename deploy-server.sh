#!/bin/bash

echo "🚀 Kahin App Sunucu Deploy Scripti"
echo "=================================="

# Sistem güncellemesi
echo "📦 Sistem güncelleniyor..."
sudo apt update && sudo apt upgrade -y

# Node.js yükleme
echo "📦 Node.js yükleniyor..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2 yükleme
echo "📦 PM2 yükleniyor..."
sudo npm install -g pm2

# Proje klasörüne git
cd /var/www/kahinnew || cd /home/$USER/kahinnew

# Bağımlılıkları yükle
echo "📦 Bağımlılıklar yükleniyor..."
npm install

# Logs klasörü oluştur
mkdir -p logs

# PM2 logrotate kurulumu
echo "📦 PM2 logrotate kuruluyor..."
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7

# Mevcut processleri temizle
echo "🧹 Mevcut processler temizleniyor..."
pm2 delete all 2>/dev/null || true

# Uygulamaları başlat
echo "🎯 Uygulamalar başlatılıyor..."
pm2 start ecosystem.config.js

# PM2 startup ayarları
echo "🔧 PM2 startup ayarlanıyor..."
pm2 startup
pm2 save

# Firewall ayarları
echo "🔥 Firewall ayarlanıyor..."
sudo ufw allow 22
sudo ufw allow 3200
sudo ufw --force enable

# Sistem durumu
echo "📊 Sistem durumu:"
pm2 status

echo ""
echo "✅ Deploy tamamlandı!"
echo "🌐 Web arayüzü: http://$(curl -s ifconfig.me):3200"
echo ""
echo "📝 Yönetim komutları:"
echo "  Durum: pm2 status"
echo "  Loglar: pm2 logs"
echo "  Yeniden başlat: pm2 restart all"
echo "  Durdur: pm2 stop all" 