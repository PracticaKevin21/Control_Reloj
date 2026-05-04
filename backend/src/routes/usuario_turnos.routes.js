const express = require('express');
const router = express.Router();

const verifyToken = require('../middlewares/auth.middleware');
const checkRole = require('../middlewares/role.middleware');
const usuarioTurnosController = require('../controllers/usuario_turnos.controller');

router.get(
  '/',
  verifyToken,
  checkRole('SuperAdmin', 'Administrador'),
  usuarioTurnosController.getUsuarioTurnos
);

router.get(
  '/:id',
  verifyToken,
  checkRole('SuperAdmin', 'Administrador'),
  usuarioTurnosController.getUsuarioTurnoById
);

router.post(
  '/',
  verifyToken,
  checkRole('SuperAdmin', 'Administrador'),
  usuarioTurnosController.createUsuarioTurno
);

router.put(
  '/:id',
  verifyToken,
  checkRole('SuperAdmin', 'Administrador'),
  usuarioTurnosController.updateUsuarioTurno
);

router.delete(
  '/:id',
  verifyToken,
  checkRole('SuperAdmin', 'Administrador'),
  usuarioTurnosController.deleteUsuarioTurno
);

module.exports = router;