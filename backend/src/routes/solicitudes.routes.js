const express = require('express');
const router = express.Router();

const verifyToken = require('../middlewares/auth.middleware');
const applyScope = require('../middlewares/scope.middleware');
const checkRole = require('../middlewares/role.middleware');
const solicitudesController = require('../controllers/solicitudes.controller');

// Listar solicitudes según rol
router.get('/', verifyToken, applyScope, solicitudesController.getSolicitudes);

// Obtener por ID según rol
router.get('/:id', verifyToken, applyScope, solicitudesController.getSolicitudById);

// Crear solicitud
router.post('/', verifyToken, applyScope, solicitudesController.createSolicitud);

// Revisar solicitud
router.put(
  '/:id',
  verifyToken,
  applyScope,
  checkRole('SuperAdmin', 'Administrador', 'Jefatura'),
  solicitudesController.updateSolicitud
);

module.exports = router;