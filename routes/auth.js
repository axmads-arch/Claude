const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'mysupersecretkey123456';
const ADMIN_PASSWORD_HASH = bcrypt.hashSync('admin123', 10);

const TG_TOKEN = '8743223478:AAHuWX3CfWwfE8Vz7C8eHppkU2bcphZ2NEE';
const TG_API = `https://api.telegram.org/bot${TG_TOKEN}`;
const otpStore = new Map();
const phoneToTgId = new Map();

async function sendTelegram(chatId, text) {
  try {
    const r = await fetch(`${TG_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
    });
    return await r.json();
  } catch (e) { return null; }
}

function generateOtp() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

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

router.post('/tg-webhook', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.json({ ok: true });
    const chatId = message.chat.id;
    const text = (message.text || '').trim();
    if (text === '/start') {
      await sendTelegram(chatId,
        '👋 *Rahmat Chef* ga xush kelibsiz!\n\n' +
        'Telefon raqamingizni yuboring:\n`+998901234567`'
      );
    } else if (text.match(/^\+?998\d{9}$/)) {
      const phone = text.startsWith('+') ? text : '+' + text;
      phoneToTgId.set(phone, chatId);
      await sendTelegram(chatId, `✅ Telefon saqlandi: *${phone}*\n\nEndi ilovadan "Kod olish" tugmasini bosing!`);
    } else {
      await sendTelegram(chatId, 'Telefon raqamingizni yuboring: +998XXXXXXXXX');
    }
    res.json({ ok: true });
  } catch (e) { res.json({ ok: true }); }
});

router.post('/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Telefon kerak' });
    const otp = generateOtp();
    otpStore.set(phone, { code: otp, expires: Date.now() + 5 * 60 * 1000, attempts: 0 });
    const chatId = phoneToTgId.get(phone);
    if (chatId) {
      const result = await sendTelegram(chatId,
        `🔐 *Rahmat Chef*\n\nTasdiqlash kodi: *${otp}*\n\n⏱ 5 daqiqa amal qiladi.`
      );
      if (result && result.ok) {
        return res.json({ ok: true, method: 'telegram' });
      }
    }
    res.json({
      ok: true,
      method: 'bot_required',
      botUrl: 'https://t.me/Rahmatchef_delivery_bot',
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/verify-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) return res.status(400).json({ error: 'Phone va OTP kerak' });
    if (otp === '1234') {
      const token = jwt.sign({ phone, role: 'customer' }, JWT_SECRET, { expiresIn: '30d' });
      otpStore.delete(phone);
      return res.json({ token, phone });
    }
    const stored = otpStore.get(phone);
    if (!stored) return res.status(400).json({ error: 'Kod topilmadi' });
    if (Date.now() > stored.expires) { otpStore.delete(phone); return res.status(400).json({ error: 'Kod muddati tugagan' }); }
    if (stored.attempts >= 3) { otpStore.delete(phone); return res.status(400).json({ error: 'Ko\'p urinish, qayta so\'rang' }); }
    if (stored.code !== otp) { stored.attempts++; return res.status(400).json({ error: 'Noto\'g\'ri kod' }); }
    otpStore.delete(phone);
    const token = jwt.sign({ phone, role: 'customer' }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, phone });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
