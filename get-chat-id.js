const axios = require('axios');
require('dotenv').config();

async function getChatId() {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!botToken) {
        console.log('❌ Bot token eksik!');
        return;
    }
    
    console.log('🔍 Chat ID alınıyor...');
    console.log('📱 Bot\'unuzla Telegram\'da konuşmaya başlayın (/start)');
    console.log('⏳ 30 saniye bekleniyor...\n');
    
    try {
        // Bot'un son mesajlarını al
        const response = await axios.get(`https://api.telegram.org/bot${botToken}/getUpdates`);
        
        if (response.data.ok && response.data.result.length > 0) {
            console.log('📋 Son mesajlar:');
            response.data.result.forEach((update, index) => {
                if (update.message) {
                    const chat = update.message.chat;
                    const user = update.message.from;
                    console.log(`${index + 1}. Chat ID: ${chat.id}`);
                    console.log(`   Chat Type: ${chat.type}`);
                    console.log(`   User: ${user.first_name} ${user.last_name || ''} (@${user.username || 'no username'})`);
                    console.log(`   Message: ${update.message.text || 'no text'}`);
                    console.log('');
                }
            });
            
            console.log('💡 Kullanım:');
            console.log('- Kişisel mesaj için: Chat ID\'yi olduğu gibi kullanın');
            console.log('- Grup için: Chat ID\'nin başına - işareti ekleyin');
            console.log('- .env dosyasına TELEGRAM_CHAT_ID=chat_id_here ekleyin');
            
        } else {
            console.log('❌ Hiç mesaj bulunamadı');
            console.log('📱 Bot\'unuzla konuşmaya başlayın ve tekrar deneyin');
        }
        
    } catch (error) {
        console.error('❌ Hata:', error.message);
    }
}

getChatId(); 