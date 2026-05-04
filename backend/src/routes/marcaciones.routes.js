const express = require('express');
const router = express.Router();

const verifyToken = require('../middlewares/auth.middleware');
const applyScope = require('../middlewares/scope.middleware');
const checkRole = require('../middlewares/role.middleware');
const marcacionesController = require('../controllers/marcaciones.controller');

// Listar marcaciones según rol
router.get('/', verifyToken, applyScope, marcacionesController.getMarcaciones);

// Obtener marcación por ID según rol
router.get('/:id', verifyToken, applyScope, marcacionesController.getMarcacionById);

// Registrar marcación
router.post('/', verifyToken, applyScope, marcacionesController.createMarcacion);

// Actualizar marcación
router.put(
  '/:id',
  verifyToken,
  applyScope,
  checkRole('SuperAdmin', 'Administrador', 'Jefatura'),
  marcacionesController.updateMarcacion
);

module.exports = router;