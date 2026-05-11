const express = require('express');
const router = express.Router();

const verifyToken = require('../middlewares/auth.middleware');
const applyScope = require('../middlewares/scope.middleware');
const checkRole = require('../middlewares/role.middleware');
const marcacionesController = require('../controllers/marcaciones.controller');

router.get('/', verifyToken, applyScope, marcacionesController.getMarcaciones);
router.get('/:id', verifyToken, applyScope, marcacionesController.getMarcacionById);
router.post('/', verifyToken, applyScope, marcacionesController.createMarcacion);

// Aprobaciones/correcciones globales RRHH/SuperAdmin.
router.put(
  '/:id',
  verifyToken,
  applyScope,
  checkRole('SuperAdmin', 'AdminRRHH'),
  marcacionesController.updateMarcacion
);

module.exports = router;