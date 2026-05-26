const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TELEGRAM_TOKEN = '8743223478:AAHuWX3CfWwfE8Vz7C8eHppkU2bcphZ2NEE';
const CHAT_ID = '-5192922233';

const STATUS_LABELS = {
  yangi: '🆕 Yangi',
  tayyorlanmoqda: '👨‍ Tayyorlanmoqda',
  tayyor: '✅ Tayyor',
  yetkazilmoqda: '🚗 Yetkazilmoqda',
  yetkazildi: '🎉 Yetkazildi',
  bekor: '❌ Bekor qilindi',
};

async function sendTelegram(text) {
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text,
        parse_mode: 'Markdown',
      }),
    });
  } catch (e) {
    console.log('Telegram xatolik:', e.message);
  }
}

// Yangi zakaz
router.post('/', async (req, res) => {
  try {
    const {
      customerName, phone, address,
      items, deliveryType, paymentMethod,
      comment, latitude, longitude,
    } = req.body;

    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const order = await prisma.order.create({
      data: {
        customerName,
        phone,
        address,
        total,
        status: 'yangi',
        deliveryType: deliveryType || 'delivery',
        paymentMethod: paymentMethod || 'cash',
        comment: comment || '',
        latitude: latitude ? String(latitude) : null,
        longitude: longitude ? String(longitude) : null,
        items: {
          create: items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          })),
        },
      },
      include: { items: { include: { product: true } } },
    });

    // Telegram xabar
    const itemsList = order.items
      .map(i => `• ${i.product?.name || 'Mahsulot'} x${i.quantity} — ${Number(i.price).toLocaleString()} so'm`)
      .join('\n');

    const locationLink = latitude && longitude
      ? `📍 [Lokatsiya](https://maps.google.com/?q=${latitude},${longitude})`
      : '📍 Lokatsiya: kiritilmagan';

    const deliveryLabel = deliveryType === 'pickup' ? '🏃 Olib ketish' : '🚗 Yetkazib berish';
    const paymentLabel = {
      cash: '💵 Naqd',
      click: '📱 Click',
      payme: '💳 Payme',
      uzum: '🏦 Uzum Bank',
      card: '💳 Karta',
    }[paymentMethod] || '💵 Naqd';

    const text = `🛒 *YANGI ZAKAZ #${order.id}*

👤 *Mijoz:* ${customerName}
📞 *Telefon:* ${phone}
${deliveryLabel}
${paymentLabel}
📍 *Manzil:* ${address || 'kiritilmagan'}
${locationLink}
💬 *Izoh:* ${comment || 'yo\'q'}

*Mahsulotlar:*
${itemsList}

💰 *JAMI: ${Number(total).toLocaleString()} so'm*
🕐 *Vaqt:* ${new Date().toLocaleString('uz')}`;

    await sendTelegram(text);

    const io = req.app.get('io');
    if (io) io.emit('newOrder', order);

    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Status yangilash
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const order = await prisma.order.update({
      where: { id: Number(req.params.id) },
      data: { status },
    });

    // Telegram status xabari
    const label = STATUS_LABELS[status] || status;
    await sendTelegram(`📦 *Zakaz #${order.id}* holati o'zgardi:\n${label}`);

    const io = req.app.get('io');
    if (io) io.emit('orderStatus', { id: order.id, status: order.status });

    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Foydalanuvchi zakazlari
router.get('/my/:phone', async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { phone: req.params.phone },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Barcha zakazlar (admin)
router.get('/', async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
