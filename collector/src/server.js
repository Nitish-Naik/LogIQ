// src/server.js

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 4000;

// Enable CORS for frontend
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:8080', 'http://localhost:3000'],
  credentials: true
}));

app.use(express.json());

const logRoutes = require('./routes/logRoutes');
app.use('/logs', logRoutes);

// Health check
app.get('/', (req, res) => {
  res.send('Collector service is running ✅');
});

app.listen(PORT, () => {
  console.log(`🚀 Collector service running on port ${PORT}`);
});