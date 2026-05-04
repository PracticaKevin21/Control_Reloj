const express = require('express');
const router = express.Router();

const verifyToken = require('../middlewares/auth.middleware');
const applyScope = require('../middlewares/scope.middleware');
const checkRole = require('../middlewares/role.middleware');
const reportesController = require('../controllers/reportes.controller');

// Listar reportes según alcance
router.get('/', verifyToken, applyScope, reportesController.getReportes);

// Obtener por ID según alcance
router.get('/:id', verifyToken, applyScope, reportesController.getReporteById);

// Descargar PDF
router.get('/:id/pdf', verifyToken, applyScope, reportesController.descargarPdfReporte);

// Crear reporte
router.post(
  '/',
  verifyToken,
  applyScope,
  checkRole('SuperAdmin', 'Administrador', 'Jefatura'),
  reportesController.createReporte
);

// Actualizar reporte
router.put(
  '/:id',
  verifyToken,
  applyScope,
  checkRole('SuperAdmin', 'Administrador'),
  reportesController.updateReporte
);

module.exports = router;