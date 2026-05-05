const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

router.post('/', async (req, res) => {
  try {
    const { customerName, phone, address, items } = req.body;
    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const order = await prisma.order.create({
      data: {
        customerName, phone, address, total,
        items: { create: items.map(item => ({ productId: item.productId, quantity: item.quantity, price: item.price })) }
      },
      include: { items: true }
    });
    res.json(order);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/', async (req, res) => {
  try {
    const orders = await prisma.order.findMany({ include: { items: { include: { product: true } } }, orderBy: { createdAt: 'desc' } });
    res.json(orders);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id/status', async (req, res) => {
  try {
    const order = await prisma.order.update({ where: { id: Number(req.params.id) }, data: { status: req.body.status } });
    res.json(order);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
