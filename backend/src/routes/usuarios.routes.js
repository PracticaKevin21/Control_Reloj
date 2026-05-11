const express = require('express');
const router = express.Router();

const verifyToken = require('../middlewares/auth.middleware');
const checkRole = require('../middlewares/role.middleware');
const applyScope = require('../middlewares/scope.middleware');
const usuariosController = require('../controllers/usuarios.controller');

router.get('/mi-perfil', verifyToken, (req, res) => {
  res.json({
    ok: true,
    usuario: req.usuario
  });
});

router.get('/', verifyToken, applyScope, usuariosController.getUsuarios);
router.get('/:id', verifyToken, applyScope, usuariosController.getUsuarioById);

// Crear usuarios: SuperAdmin/AdminRRHH global, Administrador solo funcionarios de su departamento.
router.post(
  '/',
  verifyToken,
  applyScope,
  checkRole('SuperAdmin', 'AdminRRHH', 'Administrador'),
  usuariosController.createUsuario
);

// Actualizar usuarios: SuperAdmin/AdminRRHH global, Administrador solo jefaturas/funcionarios de su departamento.
router.put(
  '/:id',
  verifyToken,
  applyScope,
  checkRole('SuperAdmin', 'AdminRRHH', 'Administrador'),
  usuariosController.updateUsuario
);

router.delete(
  '/:id',
  verifyToken,
  applyScope,
  checkRole('SuperAdmin', 'AdminRRHH', 'Administrador'),
  usuariosController.deleteUsuarioLogico
);

module.exports = router;