const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'mysupersecretkey123456';
const ADMIN_PASSWORD_HASH = bcrypt.hashSync('admin123', 10);

// Telegram bot — OTP yuborish uchun
const TG_TOKEN = '8743223478:AAHuWX3CfWwfE8Vz7C8eHppkU2bcphZ2NEE';
const TG_API = `https://api.telegram.org/bot${TG_TOKEN}`;

// OTP saqlash (xotirada, 5 daqiqa)
const otpStore = new Map();

// Telefon raqamidan Telegram user_id topish uchun
// Mijoz avval /start bosgan bo'lishi kerak botda
const phoneToTgId = new Map(); // phone -> tg_chat_id

// Telegram webhook orqali /start dan telefon olish
// Yoki botdan /start bosib telefon yuboradi
async function sendTelegram(chatId, text) {
  try {
    const r = await fetch(`${TG_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
    });
    return await r.json();
  } catch (e) {
    console.log('Telegram xatolik:', e.message);
    return null;
  }
}

function generateOtp() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// Admin login
router.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (username !== 'admin') return res.status(401).json({ error: 'Noto\'g\'ri username' });
    const ok = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
    if (!ok) return res.status(401).json({ error: 'Noto\'g\'ri parol' });
    const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Telegram webhook — botda /start yoki telefon yuborilganda
router.post('/tg-webhook', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.json({ ok: true });

    const chatId = message.chat.id;
    const text = (message.text || '').trim();

    if (text === '/start') {
      await sendTelegram(chatId, 
        '👋 Rahmat Chef ilovasiga xush kelibsiz!\n\n' +
        'Telefon raqamingizni yuboring (masalan: +998901234567)\n' +
        'Keyin ilova orqali SMS kod olasiz.'
      );
    } else if (text.match(/^\+?998\d{9}$/)) {
      // Telefon raqam yuborildi
      const phone = text.startsWith('+') ? text : '+' + text;
      phoneToTgId.set(phone, chatId);
      await sendTelegram(chatId, `✅ Telefon raqamingiz saqlandi: ${phone}\n\nEndi ilovadan kirish tugmasini bosing!`);
    } else if (text.startsWith('/')) {
      await sendTelegram(chatId, 'Telefon raqamingizni yuboring: +998XXXXXXXXX');
    }

    res.json({ ok: true });
  } catch (e) { res.json({ ok: true }); }
});

// OTP yuborish
router.post('/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Telefon kerak' });

    const otp = generateOtp();
    
    // OTP ni 5 daqiqaga saqlash
    otpStore.set(phone, {
      code: otp,
      expires: Date.now() + 5 * 60 * 1000,
      attempts: 0,
    });

    // Telegram chat_id ni topish
    const chatId = phoneToTgId.get(phone);

    if (chatId) {
      // Telegram orqali yuborish
      const result = await sendTelegram(chatId,
        `🔐 *Rahmat Chef*\n\n` +
        `Tasdiqlash kodi: *${otp}*\n\n` +
        `⏱ Kod 5 daqiqa amal qiladi.\n` +
        `Agar siz so'ramagan bo'lsangiz, e'tibor bermang.`
      );
      
      if (result && result.ok) {
        console.log(`✅ OTP Telegram orqali yuborildi: ${phone} → ${otp}`);
        return res.json({ ok: true, method: 'telegram' });
      }
    }

    // Telegram topilmasa — foydalanuvchi botni boshmagan
    // Bot linkini qaytaramiz
    console.log(`OTP ${phone} → ${otp} (Telegram bot topilmadi)`);
    res.json({ 
      ok: true, 
      method: 'bot_required',
      botUrl: 'https://t.me/rahmatchef_bot',
      message: 'Avval Telegram botni bosing va telefon raqamingizni yuboring'
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// OTP tekshirish
router.post('/verify-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) return res.status(400).json({ error: 'Phone va OTP kerak' });

    const stored = otpStore.get(phone);

    // Test rejimi — 1234 har doim ishlaydi
    if (otp === '1234') {
      const token = jwt.sign({ phone, role: 'customer' }, JWT_SECRET, { expiresIn: '30d' });
      otpStore.delete(phone);
      return res.json({ token, phone });
    }

    if (!stored) return res.status(400).json({ error: 'Kod topilmadi yoki muddati o\'tgan' });
    if (Date.now() > stored.expires) {
      otpStore.delete(phone);
      return res.status(400).json({ error: 'Kod muddati tugagan, qayta so\'rang' });
    }
    if (stored.attempts >= 3) {
      otpStore.delete(phone);
      return res.status(400).json({ error: 'Ko\'p urinish, qayta so\'rang' });
    }
    if (stored.code !== otp) {
      stored.attempts++;
      return res.status(400).json({ error: `Noto\'g\'ri kod (${3 - stored.attempts} urinish qoldi)` });
    }

    otpStore.delete(phone);
    const token = jwt.sign({ phone, role: 'customer' }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, phone });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
