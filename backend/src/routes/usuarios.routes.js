const express = require('express');
const router = express.Router();

const verifyToken = require('../middlewares/auth.middleware');
const checkRole = require('../middlewares/role.middleware');

// 🔹 GET /api/usuarios
// Solo Administrador puede ver todos los usuarios
router.get('/', verifyToken, checkRole('Administrador'), (req, res) => {
  res.json({
    ok: true,
    mensaje: 'Lista de usuarios (solo admin por ahora)'
  });
});

// 🔹 GET /api/usuarios/mi-perfil
// Cualquier usuario autenticado puede ver su info del token
router.get('/mi-perfil', verifyToken, (req, res) => {
  res.json({
    ok: true,
    usuario: req.usuario
  });
});

module.exports = router;