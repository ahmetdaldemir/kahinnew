const axios = require('axios');
require('dotenv').config();

async function testTelegramConfig() {
    console.log('🔍 Telegram Bot Konfigürasyonu Test Ediliyor...\n');
    
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    
    console.log('📋 Konfigürasyon Bilgileri:');
    console.log(`Bot Token: ${botToken ? botToken.substring(0, 10) + '...' : 'EKSİK'}`);
    console.log(`Chat ID: ${chatId || 'EKSİK'}\n`);
    
    if (!botToken || !chatId) {
        console.log('❌ Bot token veya chat ID eksik!');
        console.log('📝 .env dosyasına şunları ekleyin:');
        console.log('TELEGRAM_BOT_TOKEN=your_bot_token_here');
        console.log('TELEGRAM_CHAT_ID=your_chat_id_here');
        return;
    }
    
    // Bot bilgilerini kontrol et
    try {
        console.log('🤖 Bot bilgileri kontrol ediliyor...');
        const botInfo = await axios.get(`https://api.telegram.org/bot${botToken}/getMe`);
        
        if (botInfo.data.ok) {
            console.log('✅ Bot aktif:', botInfo.data.result.username);
        } else {
            console.log('❌ Bot bilgileri alınamadı');
            return;
        }
    } catch (error) {
        console.log('❌ Bot token geçersiz veya bot bulunamadı');
        return;
    }
    
    // Test mesajı gönder
    try {
        console.log('\n📤 Test mesajı gönderiliyor...');
        const testMessage = `🧪 <b>Test Mesajı</b>\n\nBu bir test mesajıdır.\nZaman: ${new Date().toLocaleString('tr-TR')}`;
        
        const response = await axios.post(
            `https://api.telegram.org/bot${botToken}/sendMessage`,
            {
                chat_id: chatId,
                text: testMessage,
                parse_mode: 'HTML'
            },
            {
                timeout: 10000
            }
        );
        
        if (response.data.ok) {
            console.log('✅ Test mesajı başarıyla gönderildi!');
            console.log('📱 Telegram uygulamanızı kontrol edin.');
        } else {
            console.log('❌ Mesaj gönderilemedi:', response.data);
        }
        
    } catch (error) {
        if (error.response) {
            console.log(`❌ Telegram API Hatası (${error.response.status}):`);
            console.log('Hata detayı:', error.response.data);
            
            if (error.response.status === 400) {
                console.log('\n🔧 400 Hatası Çözümleri:');
                console.log('1. Chat ID\'nin doğru olduğundan emin olun');
                console.log('2. Bot\'un gruba eklendiğinden emin olun');
                console.log('3. Bot\'un mesaj gönderme izninin olduğundan emin olun');
            }
        } else {
            console.log('❌ Bağlantı hatası:', error.message);
        }
    }
}

// Test'i çalıştır
testTelegramConfig(); 