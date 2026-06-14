const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  try {
    const banners = await prisma.banner.findMany({ where: { active: true }, orderBy: { id: 'desc' } });
    res.json(banners);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { image, title, link } = req.body;
    const banner = await prisma.banner.create({ data: { image, title, link } });
    res.json(banner);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const banner = await prisma.banner.update({ where: { id: Number(req.params.id) }, data: req.body });
    res.json(banner);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.banner.delete({ where: { id: Number(req.params.id) } });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
