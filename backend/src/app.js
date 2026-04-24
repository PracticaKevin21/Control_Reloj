const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth.routes');
const usuariosRoutes = require('./routes/usuarios.routes');
const departamentosRoutes = require('./routes/departamentos.routes');
const subdepartamentosRoutes = require('./routes/subdepartamentos.routes');
const turnosRoutes = require('./routes/turnos.routes');
const marcacionesRoutes = require('./routes/marcaciones.routes');
const solicitudesRoutes = require('./routes/solicitudes.routes');
const reportesRoutes = require('./routes/reportes.routes');

const app = express();

// Middlewares globales
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ruta base
app.get('/', (req, res) => {
  res.json({
    ok: true,
    mensaje: 'Backend funcionando correctamente'
  });
});

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/departamentos', departamentosRoutes);
app.use('/api/subdepartamentos', subdepartamentosRoutes);
app.use('/api/turnos', turnosRoutes);
app.use('/api/marcaciones', marcacionesRoutes);
app.use('/api/solicitudes', solicitudesRoutes);
app.use('/api/reportes', reportesRoutes);

module.exports = app;