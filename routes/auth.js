const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'mysupersecretkey123456';
const ADMIN_PASSWORD_HASH = bcrypt.hashSync('admin123', 10);

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

// Mijoz kirish — kod yo'q, faqat telefon
router.post('/login', async (req, res) => {
  try {
    const { phone, name } = req.body;
    if (!phone) return res.status(400).json({ error: 'Telefon kerak' });

    // Mijozni topish yoki yaratish
    let customer = await prisma.customer.findUnique({ where: { phone } });
    if (!customer) {
      customer = await prisma.customer.create({
        data: { phone, name: name || '' }
      });
    } else if (name && !customer.name) {
      customer = await prisma.customer.update({
        where: { phone },
        data: { name }
      });
    }

    // Token yaratish — 1 yil amal qiladi
    const token = jwt.sign({ phone, role: 'customer' }, JWT_SECRET, { expiresIn: '365d' });
    res.json({ token, phone, name: customer.name || name || '' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Eski OTP yo'llar — moslik uchun saqlanadi
router.post('/send-otp', async (req, res) => {
  res.json({ ok: true, method: 'direct' });
});

router.post('/verify-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    const token = jwt.sign({ phone, role: 'customer' }, JWT_SECRET, { expiresIn: '365d' });
    res.json({ token, phone });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
