const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth.routes');

const app = express();

// Middlewares globales
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({
    ok: true,
    mensaje: 'Backend funcionando correctamente'
  });
});

// Rutas
app.use('/api/auth', authRoutes);

module.exports = app;