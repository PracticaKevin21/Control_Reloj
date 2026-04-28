const express = require('express');
const router = express.Router();

const verifyToken = require('../middlewares/auth.middleware');
const checkRole = require('../middlewares/role.middleware');
const usuarioTurnosController = require('../controllers/usuario_turnos.controller');

// Listar asignaciones
router.get('/', verifyToken, checkRole('Administrador'), usuarioTurnosController.getUsuarioTurnos);

// Obtener por ID
router.get('/:id', verifyToken, checkRole('Administrador'), usuarioTurnosController.getUsuarioTurnoById);

// Asignar turno a usuario
router.post('/', verifyToken, checkRole('Administrador'), usuarioTurnosController.createUsuarioTurno);

// Actualizar asignación
router.put('/:id', verifyToken, checkRole('Administrador'), usuarioTurnosController.updateUsuarioTurno);

// Desactivar asignación
router.delete('/:id', verifyToken, checkRole('Administrador'), usuarioTurnosController.deleteUsuarioTurno);

module.exports = router;