const express = require('express');
const router = express.Router();

const TELEGRAM_TOKEN = '8743223478:AAHuWX3CfWwfE8Vz7C8eHppkU2bcphZ2NEE';
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

// Admin guruh (izoh/shikoyatlar shu yerga boradi)
const ADMIN_CHAT_ID = '-5192922233';

// ── KAFE MA'LUMOTLARI ──
const PHONE      = '+998 93 272 2222';
const WEBSITE    = 'rahmatchef.uz';
const INSTAGRAM  = 'https://www.instagram.com/rahmatchef.uz';
const ADDRESS    = "Ko'kcha darvoza 340a, Ko'kcha masjidiga yetmasdan";
const LATITUDE   = 41.3224858;
const LONGITUDE  = 69.2091613;
const SITE_URL   = 'https://frontend-topaz-kappa-84.vercel.app';

// Foydalanuvchi holatini xotirada saqlash (izoh kutish uchun)
const waitingFeedback = new Set();

// ── TELEGRAM API HELPERS ──
async function sendMessage(chatId, text, extra = {}) {
  try {
    await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        ...extra,
      }),
    });
  } catch (e) {
    console.log('Telegram sendMessage xatolik:', e.message);
  }
}

async function sendLocation(chatId, latitude, longitude) {
  try {
    await fetch(`${TELEGRAM_API}/sendLocation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, latitude, longitude }),
    });
  } catch (e) {
    console.log('Telegram sendLocation xatolik:', e.message);
  }
}

async function setMyCommands() {
  try {
    await fetch(`${TELEGRAM_API}/setMyCommands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commands: [
          { command: 'start', description: 'Botni ishga tushirish' },
          { command: 'menu',  description: 'Bosh menyu' },
        ],
      }),
    });
  } catch (e) {}
}

// ── ASOSIY MENYU (reply keyboard) ──
const MAIN_MENU = {
  keyboard: [
    [{ text: '🛒 Buyurtma berish' }],
    [{ text: '📍 Bizning manzil' }, { text: 'ℹ️ Biz haqimizda' }],
    [{ text: '💬 Izoh qoldirish' }, { text: '📞 Raqamni yuborish' }],
  ],
  resize_keyboard: true,
};

const CONTACT_BUTTON = {
  keyboard: [
    [{ text: '📞 Raqamimni yuborish', request_contact: true }],
    [{ text: '⬅️ Orqaga' }],
  ],
  resize_keyboard: true,
};

const BACK_MENU = {
  keyboard: [[{ text: '⬅️ Orqaga' }]],
  resize_keyboard: true,
};

// ── WEBHOOK HANDLER ──
router.post('/webhook', async (req, res) => {
  res.sendStatus(200); // Telegramga darhol javob

  try {
    const update = req.body;

    // Contact yuborilganda
    if (update.message?.contact) {
      const chatId = update.message.chat.id;
      const contact = update.message.contact;
      await sendMessage(
        chatId,
        `✅ Rahmat! Raqamingiz qabul qilindi:\n📞 ${contact.phone_number}\n\nTez orada operatorlarimiz siz bilan bog'lanishi mumkin.`,
        { reply_markup: MAIN_MENU }
      );

      // Adminga xabar
      await sendMessage(
        ADMIN_CHAT_ID,
        `📞 *Yangi raqam yuborildi*\n\n👤 ${update.message.from.first_name || ''} ${update.message.from.last_name || ''}\n📱 ${contact.phone_number}\n🆔 @${update.message.from.username || 'username yo\'q'}`
      );
      return;
    }

    const message = update.message;
    if (!message?.text) return;

    const chatId = message.chat.id;
    const text   = message.text.trim();
    const userId = message.from.id;

    // ── /start ──
    if (text === '/start' || text === '/menu') {
      waitingFeedback.delete(userId);
      await sendMessage(
        chatId,
        `👋 *Rahmat Chef*ga xush kelibsiz!\n\n🍰 Premium shirinliklar va ☕️ ichimliklar\n\nKerakli bo'limni tanlang:`,
        { reply_markup: MAIN_MENU }
      );
      return;
    }

    // ── ORQAGA ──
    if (text === '⬅️ Orqaga') {
      waitingFeedback.delete(userId);
      await sendMessage(chatId, '🏠 Bosh menyu', { reply_markup: MAIN_MENU });
      return;
    }

    // ── AGAR IZOH KUTILAYOTGAN BO'LSA ──
    if (waitingFeedback.has(userId)) {
      waitingFeedback.delete(userId);

      // Foydalanuvchiga rahmat
      await sendMessage(
        chatId,
        `✅ Rahmat! Izohingiz qabul qilindi.\n\nFikr-mulohazalaringiz biz uchun juda muhim. Tez orada ko'rib chiqamiz! 🙏`,
        { reply_markup: MAIN_MENU }
      );

      // Adminga yuborish
      const from = message.from;
      await sendMessage(
        ADMIN_CHAT_ID,
        `💬 *Yangi izoh / fikr*\n\n👤 ${from.first_name || ''} ${from.last_name || ''}\n🆔 @${from.username || "username yo'q"}\n🆔 ID: ${userId}\n\n📝 *Matn:*\n${text}`
      );
      return;
    }

    // ── 🛒 BUYURTMA BERISH ──
    if (text === '🛒 Buyurtma berish') {
      await sendMessage(
        chatId,
        `🛒 *Buyurtma berish*\n\nQuyidagi havola orqali saytimizga o'ting, kerakli mahsulotlarni savatchaga qo'shing va buyurtma bering:\n\n🔗 ${SITE_URL}\n\nBuyurtmangiz qabul qilingach, bu yerga avtomatik xabar keladi! ✅`,
        { reply_markup: MAIN_MENU }
      );
      return;
    }

    // ── 📍 BIZNING MANZIL ──
    if (text === '📍 Bizning manzil') {
      await sendMessage(
        chatId,
        `📍 *Bizning manzilimiz:*\n\n${ADDRESS}\n\n🚗 Mo'ljal: Ko'kcha masjidi yonida`,
        { reply_markup: MAIN_MENU }
      );
      await sendLocation(chatId, LATITUDE, LONGITUDE);
      return;
    }

    // ── ℹ️ BIZ HAQIMIZDA ──
    if (text === 'ℹ️ Biz haqimizda') {
      await sendMessage(
        chatId,
        `ℹ️ *Rahmat Chef haqida*\n\n🍰 Premium shirinliklar va ☕️ ichimliklar kafesi. San Sebastian, sara tortlar, medoviklar va boshqa mazali taomlar.\n\n📞 *Telefon:* ${PHONE}\n🌐 *Veb-sayt:* ${WEBSITE}\n📌 *Instagram:* [@rahmatchef.uz](${INSTAGRAM})\n\nSizni kutamiz! 🙏`,
        { reply_markup: MAIN_MENU }
      );
      return;
    }

    // ── 💬 IZOH QOLDIRISH ──
    if (text === '💬 Izoh qoldirish') {
      waitingFeedback.add(userId);
      await sendMessage(
        chatId,
        `💬 *Izoh qoldirish*\n\nFikr, taklif yoki shikoyatingizni yozing. Xabaringiz to'g'ridan-to'g'ri administratorga yuboriladi.\n\n✍️ Endi xabaringizni yozing:`,
        { reply_markup: BACK_MENU }
      );
      return;
    }

    // ── 📞 RAQAMNI YUBORISH ──
    if (text === '📞 Raqamni yuborish') {
      await sendMessage(
        chatId,
        `📞 *Raqamingizni yuborish*\n\nQuyidagi tugma orqali telefon raqamingizni ulashing — operatorlarimiz siz bilan bog'lanadi.`,
        { reply_markup: CONTACT_BUTTON }
      );
      return;
    }

    // ── BOSHQA XABARLAR ──
    await sendMessage(
      chatId,
      `Quyidagi tugmalardan birini tanlang 👇`,
      { reply_markup: MAIN_MENU }
    );

  } catch (e) {
    console.log('Bot webhook xatolik:', e.message);
  }
});

// ── WEBHOOK O'RNATISH (bir martalik) ──
router.get('/set-webhook', async (req, res) => {
  try {
    const railwayUrl = process.env.RAILWAY_STATIC_URL || req.get('host');
    const protocol = railwayUrl.includes('localhost') ? 'http' : 'https';
    const webhookUrl = `${protocol}://${railwayUrl}/api/bot/webhook`;

    const r = await fetch(`${TELEGRAM_API}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: webhookUrl }),
    });
    const data = await r.json();

    await setMyCommands();

    res.json({ webhookUrl, result: data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── WEBHOOK HOLATINI TEKSHIRISH ──
router.get('/webhook-info', async (req, res) => {
  try {
    const r = await fetch(`${TELEGRAM_API}/getWebhookInfo`);
    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
