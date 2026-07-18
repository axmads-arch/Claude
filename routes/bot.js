const express = require('express');
const router = express.Router();

const TELEGRAM_TOKEN = '8743223478:AAHuWX3CfWwfE8Vz7C8eHppkU2bcphZ2NEE';
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
const ADMIN_CHAT_ID = '-5192922233';
const SITE_URL = 'https://frontend-topaz-kappa-84.vercel.app';
const PHONE = '+998 93 272 2222';
const ADDRESS = "Ko'kcha darvoza 340a";
const LATITUDE = 41.3224858;
const LONGITUDE = 69.2091613;
const INSTAGRAM = 'https://www.instagram.com/rahmatchef.uz';

// Telefon → Telegram chat_id xaritasi
const phoneToChat = new Map();
const waitingFeedback = new Set();
const waitingPhone = new Set(); // OTP uchun telefon kutish

async function sendMessage(chatId, text, extra = {}) {
  try {
    await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown', ...extra }),
    });
  } catch (e) { console.log('sendMessage xatolik:', e.message); }
}

async function sendLocation(chatId, lat, lon) {
  try {
    await fetch(`${TELEGRAM_API}/sendLocation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, latitude: lat, longitude: lon }),
    });
  } catch (e) {}
}

// Mijozga buyurtma holati xabari
async function notifyCustomer(customerPhone, orderId, status, total, paymentMethod) {
  const chatId = phoneToChat.get(customerPhone);
  if (!chatId) return;
  const STATUS = {
    new: '🆕 Buyurtmangiz qabul qilindi',
    preparing: '👨‍🍳 Buyurtmangiz tayyorlanmoqda',
    ready: '✅ Buyurtmangiz tayyor!',
    delivering: '🚗 Buyurtmangiz yetkazilmoqda',
    delivered: '🎉 Buyurtmangiz yetkazildi!\n\nRahmat, yana keling! 🍰',
    cancelled: '❌ Buyurtmangiz bekor qilindi',
  };
  const PAY = {
    cash: 'Naqd',
    click: 'Click',
    payme: 'Payme',
    card: 'Karta',
  };
  const msg = STATUS[status];
  if (!msg) return;
  const payLabel = PAY[paymentMethod] || paymentMethod || 'Naqd';
  await sendMessage(chatId,
    `${msg}\n\n📦 Buyurtma #${orderId}\n💳 ${payLabel}: ${total ? total.toLocaleString() + " so'm ✅" : ''}`
  );
}

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

router.post('/webhook', async (req, res) => {
  res.sendStatus(200);
  try {
    const update = req.body;

    // Contact yuborilganda
    if (update.message?.contact) {
      const chatId = update.message.chat.id;
      const contact = update.message.contact;
      const from = update.message.from;
      // Telefon → chat_id ni saqlash
      let phone = contact.phone_number;
      if (!phone.startsWith('+')) phone = '+' + phone;
      phoneToChat.set(phone, chatId);
      waitingPhone.delete(from.id);

      await sendMessage(chatId,
        `✅ Rahmat! Raqamingiz bog'landi:\n📞 ${phone}\n\nEndi buyurtma berib, holati haqida xabar olasiz! 🎉`,
        { reply_markup: MAIN_MENU }
      );
      await sendMessage(ADMIN_CHAT_ID,
        `📞 *Yangi raqam yuborildi*\n\n👤 ${from.first_name || ''} ${from.last_name || ''}\n📱 ${phone}\n🆔 @${from.username || "yo'q"}`
      );
      return;
    }

    const message = update.message;
    if (!message?.text) return;

    const chatId = message.chat.id;
    const text = message.text.trim();
    const userId = message.from.id;

    // /start
    if (text === '/start' || text === '/menu') {
      waitingFeedback.delete(userId);
      // Telefon raqam so'rash
      if (!waitingPhone.has(userId)) {
        waitingPhone.add(userId);
        await sendMessage(chatId,
          `👋 *Rahmat Chef*ga xush kelibsiz!\n\n🍰 Premium shirinliklar va ☕️ ichimliklar\n\n📱 Buyurtma holatini bilish uchun telefon raqamingizni ulashing:`,
          { reply_markup: CONTACT_BUTTON }
        );
        return;
      }
      await sendMessage(chatId,
        `👋 *Rahmat Chef*ga xush kelibsiz!\n\nKerakli bo'limni tanlang:`,
        { reply_markup: MAIN_MENU }
      );
      return;
    }

    // Orqaga
    if (text === '⬅️ Orqaga') {
      waitingFeedback.delete(userId);
      await sendMessage(chatId, '🏠 Bosh menyu', { reply_markup: MAIN_MENU });
      return;
    }

    // Izoh kutilayotgan
    if (waitingFeedback.has(userId)) {
      waitingFeedback.delete(userId);
      await sendMessage(chatId,
        `✅ Rahmat! Izohingiz qabul qilindi. 🙏`,
        { reply_markup: MAIN_MENU }
      );
      const from = message.from;
      await sendMessage(ADMIN_CHAT_ID,
        `💬 *Yangi izoh*\n\n👤 ${from.first_name || ''} ${from.last_name || ''}\n🆔 @${from.username || "yo'q"}\n\n📝 *Matn:*\n${text}`
      );
      return;
    }

    if (text === '🛒 Buyurtma berish') {
      await sendMessage(chatId,
        `🛒 *Buyurtma berish*\n\nSaytimizga o'ting:\n\n🔗 ${SITE_URL}\n\nBuyurtmangiz qabul qilingach xabar keladi! ✅`,
        { reply_markup: MAIN_MENU }
      );
      return;
    }

    if (text === '📍 Bizning manzil') {
      await sendMessage(chatId,
        `📍 *Bizning manzilimiz:*\n\n${ADDRESS}\n\n🚗 Ko'kcha masjidi yonida\n🕒 24/7 ochiq`,
        { reply_markup: MAIN_MENU }
      );
      await sendLocation(chatId, LATITUDE, LONGITUDE);
      return;
    }

    if (text === 'ℹ️ Biz haqimizda') {
      await sendMessage(chatId,
        `ℹ️ *Rahmat Chef*\n\n🍰 Premium shirinliklar va ☕️ ichimliklar\n\n🕒 24/7 xizmatingizda\n📞 ${PHONE}\n📌 [Instagram](${INSTAGRAM})\n🌐 ${SITE_URL}`,
        { reply_markup: MAIN_MENU }
      );
      return;
    }

    if (text === '💬 Izoh qoldirish') {
      waitingFeedback.add(userId);
      await sendMessage(chatId,
        `💬 Fikr, taklif yoki shikoyatingizni yozing:`,
        { reply_markup: BACK_MENU }
      );
      return;
    }

    if (text === '📞 Raqamni yuborish') {
      await sendMessage(chatId,
        `📞 Raqamingizni ulashing:`,
        { reply_markup: CONTACT_BUTTON }
      );
      return;
    }

    await sendMessage(chatId, `Quyidagi tugmalardan birini tanlang 👇`, { reply_markup: MAIN_MENU });

  } catch (e) { console.log('Bot xatolik:', e.message); }
});

// Webhook o'rnatish
router.get('/set-webhook', async (req, res) => {
  try {
    const webhookUrl = 'https://claude-production-0b03.up.railway.app/api/bot/webhook';
    const r = await fetch(`${TELEGRAM_API}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: webhookUrl, drop_pending_updates: true }),
    });
    await fetch(`${TELEGRAM_API}/setMyCommands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commands: [
          { command: 'start', description: 'Botni ishga tushirish' },
          { command: 'menu', description: 'Bosh menyu' },
        ],
      }),
    });
    res.json({ webhookUrl, result: await r.json() });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/webhook-info', async (req, res) => {
  try {
    res.json(await (await fetch(`${TELEGRAM_API}/getWebhookInfo`)).json());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Orders.js dan chaqirish uchun export
module.exports = router;
module.exports.notifyCustomer = notifyCustomer;
module.exports.phoneToChat = phoneToChat;
