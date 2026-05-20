// Server v6 — Suppress bulleted lists in product AI greeting
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./Routes/authRoutes');
const categoryRoutes = require('./Routes/CategoryRoutes');
const productRoutes = require('./Routes/ProductRoutes');
const orderRoutes = require('./Routes/OrderRoutes');
const paymentRoutes = require('./Routes/PaymentRoutes');
const assistantRoutes = require('./Routes/AssistantRoutes');
const analyticsRoutes = require('./Routes/AnalyticsRoutes');
const contactRoutes = require('./Routes/ContactRoutes');

const app = express();
const uploadsDir = path.join(__dirname, 'uploads');
let allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// In development, also allow the dev server on port 3001 (CRA may prompt to use alternate port)
if (process.env.NODE_ENV !== 'production') {
  ['http://localhost:3000', 'http://localhost:3001'].forEach((o) => {
    if (!allowedOrigins.includes(o)) allowedOrigins.push(o);
  });
}

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/assistant', assistantRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/contact', contactRoutes);

app.get('/', (req, res) => res.send('WF Bedding Store API is running 🚀'));

// Robust MongoDB connection with retry and pooling options
const mongooseOptions = {
  // Connection pool size
  maxPoolSize: 10,
  // How long to try selecting a server (ms)
  serverSelectionTimeoutMS: 5000,
  // Socket timeout (ms)
  socketTimeoutMS: 45000
};

const connectWithRetry = () => {
  mongoose.connect(process.env.MONGO_URI, mongooseOptions)
    .then(() => console.log('✅ MongoDB Connected!'))
    .catch((err) => {
      console.error('❌ MongoDB connection error:', err && err.message ? err.message : err);
      console.log('Retrying MongoDB connection in 5 seconds...');
      setTimeout(connectWithRetry, 5000);
    });
};

connectWithRetry();

mongoose.connection.on('connected', () => console.log('Mongoose connected to DB'));
mongoose.connection.on('reconnected', () => console.log('Mongoose reconnected to DB'));
mongoose.connection.on('disconnected', () => console.warn('Mongoose disconnected from DB'));
mongoose.connection.on('error', (err) => console.error('Mongoose error:', err && err.message ? err.message : err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));