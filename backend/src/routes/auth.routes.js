const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const verifyToken = require('../middlewares/auth.middleware');
const checkRole = require('../middlewares/role.middleware');

router.post('/login', authController.login);

router.post('/register', authController.register);

router.get('/perfil', verifyToken, (req, res) => {
  res.json({
    ok: true,
    mensaje: 'Acceso autorizado',
    usuario: req.usuario
  });
});

router.get(
  '/admin',
  verifyToken,
  checkRole('SuperAdmin', 'Administrador'),
  (req, res) => {
    res.json({
      ok: true,
      mensaje: 'Bienvenido, usuario con permisos administrativos'
    });
  }
);

module.exports = router;