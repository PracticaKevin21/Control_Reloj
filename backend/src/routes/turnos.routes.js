const express = require('express');
const router = express.Router();

const verifyToken = require('../middlewares/auth.middleware');
const checkRole = require('../middlewares/role.middleware');
const turnosController = require('../controllers/turnos.controller');

router.get('/', verifyToken, checkRole('SuperAdmin', 'AdminRRHH', 'Administrador'), turnosController.getTurnos);
router.get('/:id', verifyToken, checkRole('SuperAdmin', 'AdminRRHH', 'Administrador'), turnosController.getTurnoById);
router.post('/', verifyToken, checkRole('SuperAdmin', 'AdminRRHH', 'Administrador'), turnosController.createTurno);
router.put('/:id', verifyToken, checkRole('SuperAdmin', 'AdminRRHH', 'Administrador'), turnosController.updateTurno);
router.delete('/:id', verifyToken, checkRole('SuperAdmin', 'AdminRRHH', 'Administrador'), turnosController.deleteTurno);

module.exports = router;