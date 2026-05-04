const express = require('express');
const router = express.Router();

const verifyToken = require('../middlewares/auth.middleware');
const applyScope = require('../middlewares/scope.middleware');
const checkRole = require('../middlewares/role.middleware');
const reportesController = require('../controllers/reportes.controller');

router.get(
  '/',
  verifyToken,
  applyScope,
  reportesController.getReportes
);

router.get(
  '/:id',
  verifyToken,
  applyScope,
  reportesController.getReporteById
);

router.get(
  '/:id/pdf',
  verifyToken,
  applyScope,
  reportesController.descargarPdfReporte
);

router.post(
  '/',
  verifyToken,
  applyScope,
  checkRole('SuperAdmin', 'Administrador', 'Jefatura'),
  reportesController.createReporte
);

router.put(
  '/:id',
  verifyToken,
  applyScope,
  checkRole('SuperAdmin', 'Administrador'),
  reportesController.updateReporte
);

module.exports = router;