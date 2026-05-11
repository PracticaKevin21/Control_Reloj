const express = require('express');
const router = express.Router();

const verifyToken = require('../middlewares/auth.middleware');
const applyScope = require('../middlewares/scope.middleware');
const checkRole = require('../middlewares/role.middleware');
const usuarioTurnosController = require('../controllers/usuario_turnos.controller');

router.get('/', verifyToken, applyScope, checkRole('SuperAdmin', 'AdminRRHH', 'Administrador'), usuarioTurnosController.getUsuarioTurnos);
router.get('/:id', verifyToken, applyScope, checkRole('SuperAdmin', 'AdminRRHH', 'Administrador'), usuarioTurnosController.getUsuarioTurnoById);
router.post('/', verifyToken, applyScope, checkRole('SuperAdmin', 'AdminRRHH', 'Administrador'), usuarioTurnosController.createUsuarioTurno);
router.put('/:id', verifyToken, applyScope, checkRole('SuperAdmin', 'AdminRRHH', 'Administrador'), usuarioTurnosController.updateUsuarioTurno);
router.delete('/:id', verifyToken, applyScope, checkRole('SuperAdmin', 'AdminRRHH', 'Administrador'), usuarioTurnosController.deleteUsuarioTurno);

module.exports = router;