#!/bin/bash

# Node.js kurulumu
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2 kurulumu
sudo npm install -g pm2

# Uygulama dizini oluşturma
sudo mkdir -p /var/www/crypto-analyzer
sudo chown -R $USER:$USER /var/www/crypto-analyzer

# Git kurulumu
sudo apt-get install -y git

# Uygulama dizinine git
cd /var/www/crypto-analyzer

# Git repo'yu klonla
git clone https://github.com/YOUR_USERNAME/crypto-analyzer.git .

# Bağımlılıkları yükle
npm ci

# Veritabanını başlat
npm run init-db

# PM2 ile uygulamayı başlat
pm2 start index.js --name crypto-analyzer

# PM2'yi sistem başlangıcında otomatik başlat
pm2 startup
pm2 save 