const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    const where = { available: true };
    if (category && category !== 'Barchasi') where.category = category;
    const products = await prisma.product.findMany({ where, orderBy: { id: 'asc' } });
    res.json(products);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/admin/all', async (req, res) => {
  try {
    const products = await prisma.product.findMany({ orderBy: { id: 'asc' } });
    res.json(products);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/categories', async (req, res) => {
  try {
    const products = await prisma.product.findMany({ where: { available: true }, select: { category: true } });
    const cats = [...new Set(products.map(p => p.category))];
    res.json(cats);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: Number(req.params.id) } });
    if (!product) return res.status(404).json({ error: 'Topilmadi' });
    res.json(product);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { name, description, price, image, category, available } = req.body;
    if (!name || !price || !category) return res.status(400).json({ error: 'Nomi, narxi va kategoriya kerak' });
    const product = await prisma.product.create({
      data: { name, description, price: Number(price), image, category, available: available !== false }
    });
    res.json(product);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const existing = await prisma.product.findUnique({ where: { id: Number(req.params.id) } });
    if (!existing) return res.status(404).json({ error: 'Topilmadi' });
    const data = {
      name: req.body.name ?? existing.name,
      description: req.body.description ?? existing.description,
      price: req.body.price ? Number(req.body.price) : existing.price,
      image: req.body.image ?? existing.image,
      category: req.body.category ?? existing.category,
      available: req.body.available ?? existing.available,
    };
    const product = await prisma.product.update({
      where: { id: Number(req.params.id) },
      data
    });
    res.json(product);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.product.delete({ where: { id: Number(req.params.id) } });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
