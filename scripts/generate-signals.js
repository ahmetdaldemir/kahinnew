const SignalService = require('../services/signalService');
require('dotenv').config();

async function main() {
    try {
        console.log('🚀 Detaylı Trading Sinyalleri Oluşturuluyor...');
        console.log('==========================================');
        
        const signalService = new SignalService();
        
        // Tüm sinyalleri oluştur
        const signals = await signalService.generateAllSignals();
        
        if (signals.length === 0) {
            console.log('❌ Hiç sinyal oluşturulamadı');
            return;
        }
        
        console.log('\n📊 Sinyal Özeti:');
        console.log('================');
        
        // Sinyalleri kategorilere ayır
        const buySignals = signals.filter(s => s.signal === 'BUY');
        const sellSignals = signals.filter(s => s.signal === 'SELL');
        
        console.log(`🟢 Alım Sinyalleri: ${buySignals.length}`);
        console.log(`🔴 Satım Sinyalleri: ${sellSignals.length}`);
        console.log(`📈 Toplam Sinyal: ${signals.length}`);
        
        // En iyi sinyalleri göster
        console.log('\n🏆 En İyi Sinyaller:');
        console.log('===================');
        
        const topSignals = signals
            .filter(s => s.confidence >= 60)
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 5);
        
        topSignals.forEach((signal, index) => {
            console.log(`${index + 1}. ${signal.symbol} - ${signal.signal}`);
            console.log(`   Güven: ${signal.confidence.toFixed(1)}% | Kar: ${signal.profit.toFixed(2)}%`);
            console.log(`   Alım: $${signal.buyPrice.toFixed(4)} | Satış: $${signal.sellPrice.toFixed(4)}`);
            console.log(`   Zaman: ${signal.buyTime} - ${signal.sellTime}`);
            console.log(`   Risk: ${signal.riskLevel} | Stop Loss: $${signal.stopLoss.toFixed(4)}`);
            console.log('');
        });
        
        // Risk analizi
        console.log('⚠️ Risk Analizi:');
        console.log('===============');
        
        const lowRisk = signals.filter(s => s.riskLevel === 'DÜŞÜK').length;
        const mediumRisk = signals.filter(s => s.riskLevel === 'ORTA').length;
        const highRisk = signals.filter(s => s.riskLevel === 'YÜKSEK').length;
        
        console.log(`🟢 Düşük Risk: ${lowRisk} sinyal`);
        console.log(`🟡 Orta Risk: ${mediumRisk} sinyal`);
        console.log(`🔴 Yüksek Risk: ${highRisk} sinyal`);
        
        // Kar potansiyeli analizi
        console.log('\n💰 Kar Potansiyeli Analizi:');
        console.log('===========================');
        
        const highProfit = signals.filter(s => s.profit >= 10).length;
        const mediumProfit = signals.filter(s => s.profit >= 5 && s.profit < 10).length;
        const lowProfit = signals.filter(s => s.profit < 5).length;
        
        console.log(`📈 Yüksek Kar (10%+): ${highProfit} sinyal`);
        console.log(`📊 Orta Kar (5-10%): ${mediumProfit} sinyal`);
        console.log(`📉 Düşük Kar (<5%): ${lowProfit} sinyal`);
        
        // Telegram durumu
        if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
            console.log('\n📱 Telegram Bildirimleri:');
            console.log('=========================');
            console.log('✅ Telegram bot token mevcut');
            console.log('✅ Chat ID mevcut');
            console.log(`📤 ${signals.length} sinyal Telegram'a gönderildi`);
        } else {
            console.log('\n❌ Telegram Konfigürasyonu:');
            console.log('==========================');
            console.log('⚠️ TELEGRAM_BOT_TOKEN eksik');
            console.log('⚠️ TELEGRAM_CHAT_ID eksik');
            console.log('📝 .env dosyasına ekleyin:');
            console.log('   TELEGRAM_BOT_TOKEN=your_bot_token');
            console.log('   TELEGRAM_CHAT_ID=your_chat_id');
        }
        
        console.log('\n✅ Sinyal oluşturma işlemi tamamlandı!');
        
    } catch (error) {
        console.error('❌ Sinyal oluşturma hatası:', error);
    } finally {
        process.exit(0);
    }
}

// Script çalıştır
if (require.main === module) {
    main();
}

module.exports = { main }; 