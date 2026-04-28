const express = require('express');
const router = express.Router();

const verifyToken = require('../middlewares/auth.middleware');
const checkRole = require('../middlewares/role.middleware');
const turnosController = require('../controllers/turnos.controller');

// Listar turnos
router.get('/', verifyToken, checkRole('Administrador'), turnosController.getTurnos);

// Obtener turno por ID
router.get('/:id', verifyToken, checkRole('Administrador'), turnosController.getTurnoById);

// Crear turno
router.post('/', verifyToken, checkRole('Administrador'), turnosController.createTurno);

// Actualizar turno
router.put('/:id', verifyToken, checkRole('Administrador'), turnosController.updateTurno);

// Eliminar turno
router.delete('/:id', verifyToken, checkRole('Administrador'), turnosController.deleteTurno);

module.exports = router;