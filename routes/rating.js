const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Mahsulot reytinglarini olish
router.get('/:productId', async (req, res) => {
  try {
    const productId = Number(req.params.productId);
    const ratings = await prisma.rating.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
    });
    const avg = ratings.length ? ratings.reduce((s, r) => s + r.stars, 0) / ratings.length : 0;
    res.json({ ratings, avg: Math.round(avg * 10) / 10, count: ratings.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Reyting qo'shish
router.post('/', async (req, res) => {
  try {
    const { productId, customerPhone, stars, comment } = req.body;
    if (!productId || !customerPhone || !stars) {
      return res.status(400).json({ error: 'productId, customerPhone va stars kerak' });
    }
    if (stars < 1 || stars > 5) {
      return res.status(400).json({ error: 'Stars 1-5 orasida bo\'lishi kerak' });
    }

    // Faqat buyurtma bergan mijoz baho bera oladi
    const order = await prisma.order.findFirst({
      where: {
        customerPhone,
        status: 'delivered',
        items: { some: { productId: Number(productId) } }
      }
    });
    if (!order) {
      return res.status(403).json({ error: 'Faqat buyurtma bergan va yetkazilgan mijoz baho bera oladi' });
    }

    const rating = await prisma.rating.upsert({
      where: { productId_customerPhone: { productId: Number(productId), customerPhone } },
      update: { stars: Number(stars), comment },
      create: { productId: Number(productId), customerPhone, stars: Number(stars), comment },
    });
    res.json(rating);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Reytingni o'chirish (admin)
router.delete('/:id', async (req, res) => {
  try {
    await prisma.rating.delete({ where: { id: Number(req.params.id) } });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
