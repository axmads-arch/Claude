const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  try {
    const banner = await prisma.banner.findFirst();
    if (!banner) {
      return res.json({ title: 'Yangi mahsulotlar! 🎉', subtitle: 'Har kuni yangi va mazali taomlar', emoji: '🍩' });
    }
    res.json(banner);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

router.put('/', async (req, res) => {
  try {
    const { title, subtitle, emoji } = req.body;
    const existing = await prisma.banner.findFirst();
    let banner;
    if (existing) {
      banner = await prisma.banner.update({ where: { id: existing.id }, data: { title, subtitle, emoji } });
    } else {
      banner = await prisma.banner.create({ data: { title, subtitle, emoji } });
    }
    res.json(banner);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
