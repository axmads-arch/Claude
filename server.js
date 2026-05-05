const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');

dotenv.config();

const prisma = new PrismaClient();
const app = express();
app.use(cors());
app.use(express.json());

// Database migrate
async function main() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Product" (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        price DOUBLE PRECISION NOT NULL,
        image TEXT,
        category TEXT NOT NULL,
        available BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "Order" (
        id SERIAL PRIMARY KEY,
        "customerName" TEXT NOT NULL,
        phone TEXT NOT NULL,
        address TEXT,
        total DOUBLE PRECISION NOT NULL,
        status TEXT NOT NULL DEFAULT 'yangi',
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "OrderItem" (
        id SERIAL PRIMARY KEY,
        "orderId" INTEGER NOT NULL REFERENCES "Order"(id),
        "productId" INTEGER NOT NULL REFERENCES "Product"(id),
        quantity INTEGER NOT NULL,
        price DOUBLE PRECISION NOT NULL
      );
      CREATE TABLE IF NOT EXISTS "Admin" (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
      );
    `);
    console.log('Jadvallar tayyor! ✅');
  } catch (err) {
    console.log('Jadvallar allaqachon bor yoki xato:', err.message);
  }
}

app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/auth', require('./routes/auth'));

app.get('/', (req, res) => {
  res.json({ message: 'Server ishlayapti! ✅' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`Server ${PORT} portda ishlayapti`);
  await main();
});
