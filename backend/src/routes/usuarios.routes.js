const express = require('express');
const router = express.Router();

const verifyToken = require('../middlewares/auth.middleware');
const checkRole = require('../middlewares/role.middleware');
const applyScope = require('../middlewares/scope.middleware');
const usuariosController = require('../controllers/usuarios.controller');

// Perfil propio
router.get('/mi-perfil', verifyToken, (req, res) => {
  res.json({
    ok: true,
    usuario: req.usuario
  });
});

// Listar usuarios según alcance
router.get('/', verifyToken, applyScope, usuariosController.getUsuarios);

// Obtener usuario por ID según alcance
router.get('/:id', verifyToken, applyScope, usuariosController.getUsuarioById);

// Crear usuario según rol
router.post(
  '/',
  verifyToken,
  applyScope,
  checkRole('SuperAdmin', 'Administrador', 'Jefatura'),
  usuariosController.createUsuario
);

// Actualizar usuario según rol
router.put(
  '/:id',
  verifyToken,
  applyScope,
  checkRole('SuperAdmin', 'Administrador', 'Jefatura'),
  usuariosController.updateUsuario
);

// Desactivar usuario según rol
router.delete(
  '/:id',
  verifyToken,
  applyScope,
  checkRole('SuperAdmin', 'Administrador', 'Jefatura'),
  usuariosController.deleteUsuarioLogico
);

module.exports = router;