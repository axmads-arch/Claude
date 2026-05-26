const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'rahmatchef_secret_2026';

// Admin login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Admin topish
    let admin = await prisma.admin.findUnique({ where: { username } });

    // Agar admin yo'q bo'lsa, default admin yaratish
    if (!admin) {
      if (username === 'admin' && password === 'admin123') {
        const hashed = await bcrypt.hash('admin123', 10);
        admin = await prisma.admin.create({
          data: { username: 'admin', password: hashed }
        });
      } else {
        return res.status(401).json({ error: 'Login yoki parol noto\'g\'ri' });
      }
    }

    // Parol tekshirish
    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) {
      return res.status(401).json({ error: 'Login yoki parol noto\'g\'ri' });
    }

    // Token yaratish
    const token = jwt.sign(
      { id: admin.id, username: admin.username },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({ token, username: admin.username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Token tekshirish
router.get('/me', async (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: 'Token yo\'q' });

    const token = auth.replace('Bearer ', '');
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ id: decoded.id, username: decoded.username });
  } catch (err) {
    res.status(401).json({ error: 'Token noto\'g\'ri' });
  }
});

// Foydalanuvchi telefon orqali kirish (OTP simulatsiya)
router.post('/otp/send', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Telefon raqam kerak' });

    // Real OTP o'rniga hozircha 1234
    console.log(`OTP ${phone} ga yuborildi: 1234`);
    res.json({ success: true, message: 'OTP yuborildi' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/otp/verify', async (req, res) => {
  try {
    const { phone, code } = req.body;

    // Hozircha 1234 kod ishlaydi
    if (code !== '1234') {
      return res.status(400).json({ error: 'Kod noto\'g\'ri' });
    }

    const token = jwt.sign(
      { phone },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({ token, phone });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
