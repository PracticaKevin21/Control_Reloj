const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// 🔹 Middlewares globales
app.use(cors());
app.use(express.json());

// 🔹 Rutas
const authRoutes = require('./routes/auth.routes');
const usuariosRoutes = require('./routes/usuarios.routes');

app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);

// 🔹 Ruta base
app.get('/', (req, res) => {
  res.send('API funcionando correctamente 🚀');
});

// 🔹 Puerto
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});