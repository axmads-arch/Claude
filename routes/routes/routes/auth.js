const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Admin login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const admin = await prisma.admin.findUnique({
      where: { username }
    });

    if (!admin) {
      return res.status(401).json({ error: 'Username yoki parol xato' });
    }

    const isValid = await bcrypt.compare(password, admin.password);

    if (!isValid) {
      return res.status(401).json({ error: 'Username yoki parol xato' });
    }

    const token = jwt.sign(
      { id: admin.id, username: admin.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, username: admin.username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin yaratish (faqat bir marta)
router.post('/setup', async (req, res) => {
  try {
    const { username, password, secretKey } = req.body;

    if (secretKey !== process.env.SETUP_SECRET) {
      return res.status(403).json({ error: 'Ruxsat yoq' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await prisma.admin.create({
      data: { username, password: hashedPassword }
    });

    res.json({ message: 'Admin yaratildi', username: admin.username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
