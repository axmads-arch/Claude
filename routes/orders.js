const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TELEGRAM_TOKEN = '8743223478:AAHuWX3CfWwfE8Vz7C8eHppkU2bcphZ2NEE';
const CHAT_ID = '-5192922233';

async function sendTelegram(order) {
  const items = order.items.map(i => `• ${i.quantity}x — ${Number(i.price).toLocaleString()} so'm`).join('\n');
  const text = `🛒 *YANGI BUYURTMA #${order.id}*\n\n👤 *Ism:* ${order.customerName}\n📞 *Telefon:* ${order.phone}\n📍 *Manzil:* ${order.address}\n\n*Mahsulotlar:*\n${items}\n\n💰 *Jami: ${Number(order.total).toLocaleString()} so'm*`;
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'Markdown' })
    });
  } catch(e) { console.log('Telegram xatolik:', e.message); }
}

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
    await sendTelegram(order);
    const io = req.app.get('io');
    if (io) io.emit('newOrder', order);
    res.json(order);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id/status', async (req, res) => {
  try {
    const order = await prisma.order.update({
      where: { id: Number(req.params.id) },
      data: { status: req.body.status }
    });
    const io = req.app.get('io');
    if (io) io.emit('orderStatus', { id: order.id, status: order.status, phone: order.phone });
    res.json(order);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/my/:phone', async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { phone: req.params.phone },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

router.get('/', async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
