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

async function main() {
  try {
    await prisma.$connect();
    console.log('✅ Database ulandi');

    const { execSync } = require('child_process');
    try {
      execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
      console.log('✅ DB jadvallar yaratildi');
    } catch (e) {
      console.log('DB push xatolik:', e.message);
    }

    try {
      await prisma.settings.upsert({
        where: { id: 1 },
        update: {},
        create: { id: 1 },
      });
      console.log('✅ Settings tayyor');
    } catch (e) {
      console.log('Settings xatolik:', e.message);
    }

    console.log('✅ DB tayyor');
  } catch (e) {
    console.error('Database xatolik:', e.message);
    process.exit(1);
  }
}

main();

io.on('connection', (socket) => {
  console.log('Ulandi:', socket.id);
  socket.on('disconnect', () => console.log('Uzildi:', socket.id));
});
app.set('io', io);

app.use('/api/products',  require('./routes/products'));
app.use('/api/orders',    require('./routes/orders'));
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/banner',    require('./routes/banner'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/settings',  require('./routes/settings'));
app.use('/api/reports',   require('./routes/reports'));
app.use('/api/bot',       require('./routes/bot'));
app.use('/api/upload',    require('./routes/upload'));
app.use('/api/promo',     require('./routes/promo'));
app.use('/api/rating',    require('./routes/rating'));

app.get('/', (req, res) => {
  res.json({ message: 'Rahmat Chef Server ✅', version: '2.0' });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server ${PORT} portda ishlayapti`);
});
