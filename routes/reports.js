const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

router.get('/summary', async (req, res) => {
  try {
    const today = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [totalOrders, todayOrders, monthOrders, totalProducts, totalCustomers, todayRev, monthRev, totalRev] = await Promise.all([
      prisma.order.count({ where: { status: { not: 'cancelled' } } }),
      prisma.order.count({ where: { createdAt: { gte: today, lt: tomorrow }, status: { not: 'cancelled' } } }),
      prisma.order.count({ where: { createdAt: { gte: monthStart }, status: { not: 'cancelled' } } }),
      prisma.product.count({ where: { available: true } }),
      prisma.customer.count(),
      prisma.order.aggregate({ where: { createdAt: { gte: today, lt: tomorrow }, status: { not: 'cancelled' } }, _sum: { totalPrice: true } }),
      prisma.order.aggregate({ where: { createdAt: { gte: monthStart }, status: { not: 'cancelled' } }, _sum: { totalPrice: true } }),
      prisma.order.aggregate({ where: { status: { not: 'cancelled' } }, _sum: { totalPrice: true } }),
    ]);

    res.json({
      totalOrders, todayOrders, monthOrders, totalProducts, totalCustomers,
      todayRevenue: todayRev._sum.totalPrice || 0,
      monthRevenue: monthRev._sum.totalPrice || 0,
      totalRevenue: totalRev._sum.totalPrice || 0,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/daily', async (req, res) => {
  try {
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()-i);
      const next = new Date(d); next.setDate(next.getDate()+1);
      const [count, rev] = await Promise.all([
        prisma.order.count({ where: { createdAt: { gte: d, lt: next }, status: { not: 'cancelled' } } }),
        prisma.order.aggregate({ where: { createdAt: { gte: d, lt: next }, status: { not: 'cancelled' } }, _sum: { totalPrice: true } }),
      ]);
      days.push({ date: d.toISOString().split('T')[0], orders: count, revenue: rev._sum.totalPrice || 0 });
    }
    res.json(days);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/top-products', async (req, res) => {
  try {
    const items = await prisma.orderItem.groupBy({
      by: ['productId'], _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } }, take: 10,
    });
    const products = await prisma.product.findMany({ where: { id: { in: items.map(i=>i.productId) } } });
    const map = Object.fromEntries(products.map(p=>[p.id,p]));
    res.json(items.map(i => ({ product: map[i.productId], totalSold: i._sum.quantity || 0 })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
