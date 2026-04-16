const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const verifyToken = require('../middlewares/auth.middleware');
const checkRole = require('../middlewares/role.middleware');

router.post('/login', authController.login);
router.post('/register', authController.register);

// Ruta protegida: cualquier usuario con token válido
router.get('/perfil', verifyToken, (req, res) => {
  res.json({
    ok: true,
    mensaje: 'Acceso autorizado',
    usuario: req.usuario
  });
});

// Ruta protegida: solo administrador
router.get('/admin', verifyToken, checkRole('Administrador'), (req, res) => {
  res.json({
    ok: true,
    mensaje: 'Bienvenido, Administrador'
  });
});

module.exports = router;