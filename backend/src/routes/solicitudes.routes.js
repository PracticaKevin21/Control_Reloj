const express = require('express');
const router = express.Router();

const verifyToken = require('../middlewares/auth.middleware');
const applyScope = require('../middlewares/scope.middleware');
const checkRole = require('../middlewares/role.middleware');
const solicitudesController = require('../controllers/solicitudes.controller');

router.get('/', verifyToken, applyScope, solicitudesController.getSolicitudes);
router.get('/:id', verifyToken, applyScope, solicitudesController.getSolicitudById);
router.post('/', verifyToken, applyScope, solicitudesController.createSolicitud);

// RRHH/SuperAdmin revisan solicitudes globales.
router.put(
  '/:id',
  verifyToken,
  applyScope,
  checkRole('SuperAdmin', 'AdminRRHH'),
  solicitudesController.updateSolicitud
);

module.exports = router;