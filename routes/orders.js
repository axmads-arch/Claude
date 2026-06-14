const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TELEGRAM_TOKEN = '8743223478:AAHuWX3CfWwfE8Vz7C8eHppkU2bcphZ2NEE';
const ADMIN_CHAT_ID = '-5192922233';

async function sendTelegram(text) {
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: ADMIN_CHAT_ID, text, parse_mode: 'Markdown' }),
    });
  } catch (e) { console.log('Telegram xatolik:', e.message); }
}

const STATUS_LABELS = {
  new: '🆕 Yangi', preparing: '👨‍🍳 Tayyorlanmoqda', ready: '✅ Tayyor',
  delivering: '🚗 Yetkazilmoqda', delivered: '🎉 Yetkazildi', cancelled: '❌ Bekor qilindi',
};
const PAYMENT_LABELS = { cash: '💵 Naqd', click: '📱 Click', payme: '💳 Payme', uzum: '🟣 Uzum', card: '💳 Karta' };
const DELIVERY_LABELS = { delivery: '🚗 Yetkazib berish', pickup: '🏃 Olib ketish' };

router.get('/', async (req, res) => {
  try {
    const { status, phone } = req.query;
    const where = {};
    if (status) where.status = status;
    if (phone) where.customerPhone = { contains: phone };
    const orders = await prisma.order.findMany({
      where,
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(orders);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/my/:phone', async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { customerPhone: req.params.phone },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(orders);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { customerPhone, customerName, deliveryType, paymentMethod, address, comment, latitude, longitude, items } = req.body;
    if (!customerPhone || !items?.length) return res.status(400).json({ error: 'Telefon va mahsulotlar kerak' });

    await prisma.customer.upsert({
      where: { phone: customerPhone },
      update: { name: customerName, address },
      create: { phone: customerPhone, name: customerName, address },
    });

    const productIds = items.map(i => i.productId);
    const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
    const productMap = Object.fromEntries(products.map(p => [p.id, p]));

    const settings = await prisma.settings.findUnique({ where: { id: 1 } });
    const deliveryPrice = deliveryType === 'delivery' ? (settings?.deliveryPrice || 0) : 0;

    let totalPrice = deliveryPrice;
    const orderItems = items.map(item => {
      const product = productMap[item.productId];
      const price = product ? product.price : item.price;
      totalPrice += price * item.quantity;
      return { productId: item.productId, quantity: item.quantity, price };
    });

    const order = await prisma.order.create({
      data: {
        customerPhone, customerName,
        deliveryType: deliveryType || 'delivery',
        paymentMethod: paymentMethod || 'cash',
        address, comment, latitude, longitude,
        totalPrice, deliveryPrice,
        items: { create: orderItems },
      },
      include: { items: { include: { product: true } } },
    });

    const itemsText = order.items.map(i =>
      `  • ${i.product?.name || 'Mahsulot'} x${i.quantity} — ${(i.price * i.quantity).toLocaleString()} so'm`
    ).join('\n');
    const locationText = latitude && longitude ? `\n📍 [Xaritada](https://maps.google.com/?q=${latitude},${longitude})` : '';

    await sendTelegram(
      `🛒 *Yangi buyurtma #${order.id}*\n\n` +
      `👤 ${customerName || 'Noma\'lum'}\n📞 ${customerPhone}\n` +
      `${DELIVERY_LABELS[deliveryType] || deliveryType}\n${PAYMENT_LABELS[paymentMethod] || paymentMethod}\n` +
      (address ? `🏠 ${address}` : '') + locationText +
      (comment ? `\n💬 ${comment}` : '') +
      `\n\n📦 Mahsulotlar:\n${itemsText}\n\n💰 *Jami: ${totalPrice.toLocaleString()} so'm*`
    );

    const io = req.app.get('io');
    if (io) io.emit('new_order', order);
    res.json(order);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const order = await prisma.order.update({
      where: { id: Number(req.params.id) },
      data: { status },
      include: { items: { include: { product: true } } },
    });
    const io = req.app.get('io');
    if (io) io.emit('order_updated', { orderId: order.id, status });
    await sendTelegram(`📦 *Buyurtma #${order.id}* — ${STATUS_LABELS[status] || status}\n📞 ${order.customerPhone}`);
    res.json(order);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.orderItem.deleteMany({ where: { orderId: Number(req.params.id) } });
    await prisma.order.delete({ where: { id: Number(req.params.id) } });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
