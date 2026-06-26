const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ── BARCHA PROMOLAR (admin) ──
router.get('/', async (req, res) => {
  try {
    const promos = await prisma.promo.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(promos);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── PROMO YARATISH (admin) ──
router.post('/', async (req, res) => {
  try {
    const { code, type, value, minOrder, maxUses, expiresAt } = req.body;
    if (!code || !value) return res.status(400).json({ error: 'Kod va qiymat kerak' });
    const promo = await prisma.promo.create({
      data: {
        code: code.toUpperCase().trim(),
        type: type || 'percent',
        value: Number(value),
        minOrder: Number(minOrder) || 0,
        maxUses: maxUses ? Number(maxUses) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      }
    });
    res.json(promo);
  } catch (e) {
    if (e.code === 'P2002') return res.status(400).json({ error: 'Bu kod allaqachon mavjud' });
    res.status(500).json({ error: e.message });
  }
});

// ── PROMO O'CHIRISH (admin) ──
router.delete('/:id', async (req, res) => {
  try {
    await prisma.promo.delete({ where: { id: Number(req.params.id) } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── PROMO YOQISH/O'CHIRISH (admin) ──
router.put('/:id', async (req, res) => {
  try {
    const promo = await prisma.promo.update({
      where: { id: Number(req.params.id) },
      data: { active: req.body.active }
    });
    res.json(promo);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── PROMO TEKSHIRISH (mijoz savatchada) ──
router.post('/check', async (req, res) => {
  try {
    const { code, orderTotal } = req.body;
    if (!code) return res.status(400).json({ valid: false, error: 'Kod kiritilmagan' });

    const promo = await prisma.promo.findUnique({ where: { code: code.toUpperCase().trim() } });

    if (!promo) return res.json({ valid: false, error: 'Promo kod topilmadi' });
    if (!promo.active) return res.json({ valid: false, error: 'Bu promo kod faol emas' });
    if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) {
      return res.json({ valid: false, error: 'Promo kod muddati tugagan' });
    }
    if (promo.maxUses && promo.usedCount >= promo.maxUses) {
      return res.json({ valid: false, error: 'Promo kod limiti tugagan' });
    }
    if (orderTotal && orderTotal < promo.minOrder) {
      return res.json({ valid: false, error: `Minimal buyurtma: ${promo.minOrder.toLocaleString()} so'm` });
    }

    let discount = 0;
    if (promo.type === 'percent') {
      discount = Math.round((orderTotal || 0) * (promo.value / 100));
    } else {
      discount = promo.value;
    }
    if (discount > (orderTotal || 0)) discount = orderTotal || 0;

    res.json({ valid: true, discount, promo: { code: promo.code, type: promo.type, value: promo.value } });
  } catch (e) { res.status(500).json({ valid: false, error: e.message }); }
});

// ── PROMO ISHLATILDI DEB BELGILASH (buyurtma yaratilganda) ──
router.post('/use', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.json({ success: false });
    await prisma.promo.update({
      where: { code: code.toUpperCase().trim() },
      data: { usedCount: { increment: 1 } }
    });
    res.json({ success: true });
  } catch (e) { res.json({ success: false }); }
});

module.exports = router;
