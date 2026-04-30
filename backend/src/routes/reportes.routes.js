const express = require('express');
const router = express.Router();

const verifyToken = require('../middlewares/auth.middleware');
const checkRole = require('../middlewares/role.middleware');
const reportesController = require('../controllers/reportes.controller');

router.get('/', verifyToken, reportesController.getReportes);
router.get('/:id', verifyToken, reportesController.getReporteById);
router.post('/', verifyToken, checkRole('Administrador'), reportesController.createReporte);
router.put('/:id', verifyToken, checkRole('Administrador'), reportesController.updateReporte);

module.exports = router;