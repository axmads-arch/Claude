const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    const products = await prisma.product.findMany({
      where: category ? { category } : {},
      orderBy: { createdAt: 'desc' }
    });
    res.json(products);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: Number(req.params.id) } });
    if (!product) return res.status(404).json({ error: 'Topilmadi' });
    res.json(product);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { name, description, price, image, category } = req.body;
    const product = await prisma.product.create({
      data: { name, description, price: Number(price), image, category }
    });
    res.json(product);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, description, price, image, category, available } = req.body;
    const product = await prisma.product.update({
      where: { id: Number(req.params.id) },
      data: { name, description, price: Number(price), image, category, available }
    });
    res.json(product);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.product.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: "O'chirildi" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
