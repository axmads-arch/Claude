const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'mysupersecretkey123456';
const ADMIN_PASSWORD_HASH = bcrypt.hashSync('admin123', 10);

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

router.post('/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Telefon kerak' });
    console.log(`OTP ${phone} ga: 1234`);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/verify-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (otp !== '1234') return res.status(400).json({ error: 'Noto\'g\'ri kod' });
    const token = jwt.sign({ phone, role: 'customer' }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, phone });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
