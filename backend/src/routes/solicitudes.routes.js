const express = require('express');
const router = express.Router();

const verifyToken = require('../middlewares/auth.middleware');
const solicitudesController = require('../controllers/solicitudes.controller');

// Listar
router.get('/', verifyToken, solicitudesController.getSolicitudes);

// Obtener por ID
router.get('/:id', verifyToken, solicitudesController.getSolicitudById);

// Crear solicitud
router.post('/', verifyToken, solicitudesController.createSolicitud);

// Revisar (aprobar/rechazar)
router.put('/:id', verifyToken, solicitudesController.updateSolicitud);

module.exports = router;