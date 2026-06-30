const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Barcha suhbatlar (admin) - har bir mijoz uchun oxirgi xabar
router.get('/conversations', async (req, res) => {
  try {
    const chats = await prisma.chat.findMany({ orderBy: { createdAt: 'desc' } });
    const map = {};
    for (const c of chats) {
      if (!map[c.customerPhone]) map[c.customerPhone] = { ...c, unread: 0 };
      if (!c.fromAdmin && !c.read) map[c.customerPhone].unread++;
    }
    res.json(Object.values(map));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Mijoz bilan suhbat tarixi
router.get('/:phone', async (req, res) => {
  try {
    const chats = await prisma.chat.findMany({
      where: { customerPhone: req.params.phone },
      orderBy: { createdAt: 'asc' },
    });
    // O'qilmagan xabarlarni o'qilgan qilamiz
    await prisma.chat.updateMany({
      where: { customerPhone: req.params.phone, fromAdmin: false, read: false },
      data: { read: true },
    });
    res.json(chats);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Xabar yuborish (mijoz yoki admin)
router.post('/', async (req, res) => {
  try {
    const { customerPhone, customerName, message, fromAdmin } = req.body;
    if (!customerPhone || !message) return res.status(400).json({ error: 'Phone va message kerak' });
    const chat = await prisma.chat.create({
      data: { customerPhone, customerName, message, fromAdmin: !!fromAdmin }
    });
    const io = req.app.get('io');
    if (io) io.emit('new_chat', chat);
    res.json(chat);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// O'qilmagan xabarlar soni (admin badge uchun)
router.get('/unread/count', async (req, res) => {
  try {
    const count = await prisma.chat.count({ where: { fromAdmin: false, read: false } });
    res.json({ count });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
