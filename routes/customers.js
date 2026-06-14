const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  try {
    const customers = await prisma.customer.findMany({
      include: { orders: { select: { id: true, totalPrice: true, createdAt: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const result = customers.map(c => ({
      ...c,
      totalOrders: c.orders.length,
      totalSpent: c.orders.reduce((sum, o) => sum + o.totalPrice, 0),
      lastOrder: c.orders[0]?.createdAt || null,
    }));
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:phone', async (req, res) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { phone: req.params.phone },
      include: { orders: { include: { items: { include: { product: true } } }, orderBy: { createdAt: 'desc' } } },
    });
    if (!customer) return res.status(404).json({ error: 'Topilmadi' });
    res.json(customer);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
