const express = require('express');
const router = express.Router();

const verifyToken = require('../middlewares/auth.middleware');
const checkRole = require('../middlewares/role.middleware');
const usuariosController = require('../controllers/usuarios.controller');

// Perfil propio
router.get('/mi-perfil', verifyToken, (req, res) => {
  res.json({
    ok: true,
    usuario: req.usuario
  });
});

// Todos los usuarios
router.get('/', verifyToken, checkRole('Administrador'), usuariosController.getUsuarios);

// Usuario por ID
router.get('/:id', verifyToken, checkRole('Administrador'), usuariosController.getUsuarioById);

// Actualizar usuario
router.put('/:id', verifyToken, checkRole('Administrador'), usuariosController.updateUsuario);

// Desactivar usuario (borrado lógico)
router.delete('/:id', verifyToken, checkRole('Administrador'), usuariosController.deleteUsuarioLogico);

module.exports = router;