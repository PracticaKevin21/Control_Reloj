const express = require('express');
const router = express.Router();

const verifyToken = require('../middlewares/auth.middleware');
const checkRole = require('../middlewares/role.middleware');
const usuariosController = require('../controllers/usuarios.controller');

// Solo administrador puede ver todos los usuarios
router.get('/', verifyToken, checkRole('Administrador'), usuariosController.getUsuarios);

// Cualquier usuario autenticado puede ver su perfil desde el token
router.get('/mi-perfil', verifyToken, (req, res) => {
  res.json({
    ok: true,
    usuario: req.usuario
  });
});

module.exports = router;