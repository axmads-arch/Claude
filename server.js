const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { PrismaClient } = require('@prisma/client');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ── DB INIT ──
async function main() {
  try {
    await prisma.$connect();
    console.log('✅ Database ulandi');

    // Jadvallarni yaratish (migrate deploy)
    const { execSync } = require('child_process');
    try {
      execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    } catch (e) {
      try {
        execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
      } catch (e2) {
        console.log('DB push xatolik (normal bo\'lishi mumkin):', e2.message);
      }
    }

    // Default sozlamalar yaratish
    await prisma.settings.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1 },
    });

    console.log('✅ DB tayyor');
  } catch (e) {
    console.error('Database xatolik:', e.message);
    process.exit(1);
  }
}

main();

// ── SOCKET.IO ──
io.on('connection', (socket) => {
  console.log('Ulandi:', socket.id);
  socket.on('disconnect', () => console.log('Uzildi:', socket.id));
});
app.set('io', io);

// ── ROUTES ──
app.use('/api/products',  require('./routes/products'));
app.use('/api/orders',    require('./routes/orders'));
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/banner',    require('./routes/banner'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/settings',  require('./routes/settings'));
app.use('/api/reports',   require('./routes/reports'));
app.use('/api/bot',       require('./routes/bot'));

app.get('/', (req, res) => {
  res.json({ message: 'Rahmat Chef Server ✅', version: '2.0' });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server ${PORT} portda ishlayapti`);
});
