const { query } = require('../db/db');
const moment = require('moment');
const axios = require('axios');

class SignalService {
    constructor() {
        this.telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
        this.telegramChatId = process.env.TELEGRAM_CHAT_ID;
        this.signalThreshold = 40; // Minimum güven oranı - test için düşürüldü
    }

    // Detaylı sinyal oluştur
    async generateDetailedSignal(symbol, currentPrice, prediction) {
        try {
            const now = moment();
            const buyTime = now.format('DD/MM/YYYY HH:mm');
            const sellTime = now.add(30, 'minutes').format('DD/MM/YYYY HH:mm');
            
            // Fiyat null veya undefined ise API'den al
            if (!currentPrice) {
                try {
                    const priceData = await query(
                        'SELECT price FROM historical_data WHERE symbol = ? ORDER BY timestamp DESC LIMIT 1',
                        [symbol]
                    );
                    if (priceData && priceData[0]) {
                        currentPrice = parseFloat(priceData[0].price);
                    }
                } catch (error) {
                    console.error(`Fiyat verisi alınamadı ${symbol}:`, error);
                }
            }

            // Fiyat hala yoksa sinyal oluşturma
            if (!currentPrice) {
                console.warn(`${symbol} için fiyat verisi bulunamadı`);
                return null;
            }
            
            // Alım-satım fiyatlarını hesapla
            const buyPrice = this.calculateBuyPrice(currentPrice, prediction.confidence);
            const sellPrice = this.calculateSellPrice(buyPrice, prediction.profit);
            const profitPotential = ((sellPrice - buyPrice) / buyPrice) * 100;
            
            // Destek ve direnç seviyeleri
            const levels = await this.calculateSupportResistance(symbol);
            
            const signal = {
                symbol: symbol,
                signal: prediction.signal,
                confidence: prediction.confidence,
                currentPrice: currentPrice.toFixed(4),
                buyPrice: buyPrice.toFixed(4),
                sellPrice: sellPrice.toFixed(4),
                buyTime: buyTime,
                sellTime: sellTime,
                profit: profitPotential.toFixed(2),
                supportLevels: levels.support,
                resistanceLevels: levels.resistance,
                riskLevel: this.calculateRiskLevel(prediction.confidence),
                stopLoss: this.calculateStopLoss(buyPrice, prediction.confidence),
                takeProfit: this.calculateTakeProfit(sellPrice, prediction.confidence)
            };

            return signal;
        } catch (error) {
            console.error(`Error generating detailed signal for ${symbol}:`, error);
            return null;
        }
    }

    // Alım fiyatı hesapla
    calculateBuyPrice(currentPrice, confidence) {
        // Güven oranına göre spread ayarla
        const spread = Math.max(0.001, (100 - confidence) / 1000); // Minimum 0.1% spread
        return currentPrice * (1 - spread);
    }

    // Satış fiyatı hesapla
    calculateSellPrice(buyPrice, expectedProfit) {
        // Beklenen kar en az %0.5, en fazla %5 olsun
        const profit = Math.min(Math.max(expectedProfit, 0.5), 5) / 100;
        return buyPrice * (1 + profit);
    }

    // Destek ve direnç seviyeleri hesapla
    async calculateSupportResistance(symbol) {
        try {
            const historicalData = await query(
                `SELECT price, high, low FROM historical_data 
                 WHERE symbol = ? 
                 ORDER BY timestamp DESC 
                 LIMIT 100`,
                [symbol]
            );

            if (historicalData.length === 0) {
                return { support: [], resistance: [] };
            }

            const prices = historicalData.map(d => parseFloat(d.price));
            const highs = historicalData.map(d => parseFloat(d.high));
            const lows = historicalData.map(d => parseFloat(d.low));

            const currentPrice = prices[0];
            
            // Destek seviyeleri (current price'ın altındaki)
            const supportLevels = lows
                .filter(low => low < currentPrice)
                .sort((a, b) => b - a)
                .slice(0, 3);

            // Direnç seviyeleri (current price'ın üstündeki)
            const resistanceLevels = highs
                .filter(high => high > currentPrice)
                .sort((a, b) => a - b)
                .slice(0, 3);

            return {
                support: supportLevels,
                resistance: resistanceLevels
            };
        } catch (error) {
            console.error(`Error calculating support/resistance for ${symbol}:`, error);
            return { support: [], resistance: [] };
        }
    }

    // Risk seviyesi hesapla
    calculateRiskLevel(confidence) {
        if (confidence >= 80) return 'DÜŞÜK';
        if (confidence >= 60) return 'ORTA';
        return 'YÜKSEK';
    }

    // Stop loss hesapla
    calculateStopLoss(buyPrice, confidence) {
        const riskPercentage = confidence >= 80 ? 0.02 : confidence >= 60 ? 0.03 : 0.05;
        return buyPrice * (1 - riskPercentage);
    }

    // Take profit hesapla
    calculateTakeProfit(sellPrice, confidence) {
        const profitMultiplier = confidence >= 80 ? 1.5 : confidence >= 60 ? 1.3 : 1.1;
        return sellPrice * profitMultiplier;
    }

    // Telegram'a sinyal gönder
    async sendTelegramSignal(signal) {
        if (!this.telegramBotToken || !this.telegramChatId) {
            console.warn('⚠️ Telegram bot token veya chat ID eksik');
            return false;
        }

        // Token ve Chat ID formatını kontrol et
        if (!/^[0-9]+:[A-Za-z0-9_-]{35,}$/.test(this.telegramBotToken)) {
            console.warn('⚠️ Geçersiz Telegram bot token formatı');
            return false;
        }

        if (!this.telegramChatId.startsWith('-') && !this.telegramChatId.match(/^\d+$/)) {
            console.warn('⚠️ Geçersiz Telegram chat ID formatı');
            return false;
        }

        try {
            const message = this.formatTelegramMessage(signal);
            
            // Mesaj uzunluğunu kontrol et (Telegram limiti: 4096 karakter)
            if (message.length > 4000) {
                console.warn(`⚠️ Mesaj çok uzun (${message.length} karakter), kısaltılıyor...`);
                const shortenedMessage = message.substring(0, 4000) + '\n\n⚠️ Mesaj kısaltıldı...';
                return await this.sendTelegramMessage(shortenedMessage);
            }
            
            return await this.sendTelegramMessage(message);
            
        } catch (error) {
            console.error('❌ Telegram sinyal gönderme hatası:', error.message);
            return false;
        }
    }

    // Telegram mesajını gönder
    async sendTelegramMessage(message) {
        try {
            const response = await axios.post(
                `https://api.telegram.org/bot${this.telegramBotToken}/sendMessage`,
                {
                    chat_id: this.telegramChatId,
                    text: message,
                    parse_mode: 'HTML',
                    disable_web_page_preview: true
                },
                {
                    timeout: 10000,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data.ok) {
                console.log(`✅ Telegram sinyali gönderildi`);
                return true;
            } else {
                console.error('❌ Telegram API hatası:', response.data);
                return false;
            }
        } catch (error) {
            if (error.response) {
                console.error(`❌ Telegram API Hatası (${error.response.status}):`, error.response.data);
            } else {
                console.error('❌ Telegram bağlantı hatası:', error.message);
            }
            return false;
        }
    }

    // Telegram mesajını formatla
    formatTelegramMessage(signal) {
        const emoji = signal.signal === 'BUY' ? '🟢' : '🔴';
        const signalText = signal.signal === 'BUY' ? 'ALIM SİNYALİ' : 'SATIM SİNYALİ';
        
        let message = `${emoji} <b>${signalText}</b>\n\n`;
        message += `📊 <b>${signal.symbol}</b>\n`;
        message += `🎯 <b>Güven Oranı:</b> ${signal.confidence.toFixed(1)}%\n`;
        message += `⚠️ <b>Risk Seviyesi:</b> ${signal.riskLevel}\n\n`;
        
        if (signal.signal === 'BUY') {
            message += `💰 <b>Alım Fiyatı:</b> $${signal.buyPrice}\n`;
            message += `📅 <b>Alım Zamanı:</b> ${signal.buyTime}\n`;
            message += `🎯 <b>Hedef Satış:</b> $${signal.sellPrice}\n`;
            message += `📅 <b>Satış Zamanı:</b> ${signal.sellTime}\n`;
            message += `📈 <b>Beklenen Kar:</b> ${signal.profit}%\n\n`;
        } else {
            message += `💰 <b>Satış Fiyatı:</b> $${signal.sellPrice}\n`;
            message += `📅 <b>Satış Zamanı:</b> ${signal.sellTime}\n`;
            message += `📉 <b>Beklenen Kar:</b> ${signal.profit}%\n\n`;
        }
        
        message += `🛑 <b>Stop Loss:</b> $${signal.stopLoss.toFixed(4)}\n`;
        message += `🎯 <b>Take Profit:</b> $${signal.takeProfit.toFixed(4)}\n\n`;
        
        if (signal.supportLevels.length > 0) {
            message += `📉 <b>Destek Seviyeleri:</b>\n`;
            signal.supportLevels.forEach((level, index) => {
                message += `   ${index + 1}. $${level.toFixed(4)}\n`;
            });
            message += '\n';
        }
        
        if (signal.resistanceLevels.length > 0) {
            message += `📈 <b>Direnç Seviyeleri:</b>\n`;
            signal.resistanceLevels.forEach((level, index) => {
                message += `   ${index + 1}. $${level.toFixed(4)}\n`;
            });
            message += '\n';
        }
        
        message += `⏰ <b>Güncel Fiyat:</b> $${signal.currentPrice}\n`;
        message += `🕐 <b>Sinyal Zamanı:</b> ${moment().format('DD/MM/YYYY HH:mm:ss')}\n\n`;
        message += `⚠️ <i>Bu sinyal yatırım tavsiyesi değildir. Kendi araştırmanızı yapın.</i>`;
        
        return message;
    }

    // Tüm coinler için sinyal oluştur
    async generateAllSignals() {
        try {
            console.log('🔍 Tüm coinler için detaylı sinyaller oluşturuluyor...');
            
            // Son tahminleri al - düzeltilmiş sorgu
            const predictions = await query(`
                SELECT p.*, h.price as current_price
                FROM prediction_performance p
                LEFT JOIN (
                    SELECT symbol, price
                    FROM historical_data
                    WHERE (symbol, timestamp) IN (
                        SELECT symbol, MAX(timestamp)
                        FROM historical_data
                        GROUP BY symbol
                    )
                ) h ON p.symbol = h.symbol
                WHERE p.confidence >= ?
                AND p.prediction_date >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
                ORDER BY p.confidence DESC, p.profit_loss DESC
            `, [this.signalThreshold]);

            console.log(`📊 ${predictions.length} coin için sinyal oluşturulacak`);

            const signals = [];
            let telegramSent = 0;

            for (const pred of predictions) {
                try {
                    const signal = await this.generateDetailedSignal(
                        pred.symbol,
                        parseFloat(pred.current_price || pred.actual_price),
                        {
                            signal: pred.predicted_signal,
                            confidence: parseFloat(pred.confidence),
                            profit: parseFloat(pred.profit_loss)
                        }
                    );

                    if (signal) {
                        signals.push(signal);
                        
                        // Telegram'a gönder
                        const sent = await this.sendTelegramSignal(signal);
                        if (sent) telegramSent++;
                        
                        // Sinyali veritabanına kaydet
                        await this.saveSignalToDatabase(signal);
                        
                        // Rate limiting
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                } catch (error) {
                    console.error(`Sinyal oluşturma hatası ${pred.symbol}:`, error.message);
                }
            }

            console.log(`✅ ${signals.length} sinyal oluşturuldu`);
            console.log(`📱 ${telegramSent} Telegram mesajı gönderildi`);
            
            return signals;
        } catch (error) {
            console.error('Sinyal oluşturma hatası:', error);
            return [];
        }
    }

    // Sinyali veritabanına kaydet
    async saveSignalToDatabase(signal) {
        try {
            await query(`
                INSERT INTO trading_signals 
                (symbol, signal_type, confidence, buy_price, sell_price, buy_time, sell_time, 
                 profit, stop_loss, take_profit, support_levels, resistance_levels, risk_level, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            `, [
                signal.symbol,
                signal.signal,
                signal.confidence,
                signal.buyPrice,
                signal.sellPrice,
                signal.buyTime,
                signal.sellTime,
                signal.profit,
                signal.stopLoss,
                signal.takeProfit,
                JSON.stringify(signal.supportLevels),
                JSON.stringify(signal.resistanceLevels),
                signal.riskLevel
            ]);
        } catch (error) {
            console.error(`Sinyal kaydetme hatası ${signal.symbol}:`, error.message);
        }
    }
}

module.exports = SignalService; 