const express = require('express');
const cors = require('cors');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json()); // To parse JSON bodies
app.use(express.urlencoded({ extended: true }));

// Basic health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

const generateRoutes  = require('./routes/generateRoutes');
const redesignRoutes  = require('./routes/redesignRoutes');
const instagramRoutes = require('./routes/instagramRoutes');

app.use('/api', generateRoutes);
app.use('/api', redesignRoutes);
app.use('/api', instagramRoutes);

module.exports = app;
