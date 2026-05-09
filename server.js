const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');
const { createServer } = require('http');
const { Server } = require('socket.io');

dotenv.config();

const prisma = new PrismaClient();
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

async function main() {
  try {
    await prisma.$connect();
    console.log('Database ulandi ✅');
  } catch(e) {
    console.error('Database xatolik:', e.message);
    process.exit(1);
  }
}

main();

io.on('connection', (socket) => {
  console.log('Foydalanuvchi ulandi:', socket.id);
  socket.on('disconnect', () => {
    console.log('Foydalanuvchi uzildi:', socket.id);
  });
});

app.set('io', io);

app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/banner', require('./routes/banner'));

app.get('/', (req, res) => {
  res.json({ message: 'Server ishlayapti! ✅' });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server ${PORT} portda ishlayapti`);
});
