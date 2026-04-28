const express = require('express');
const router = express.Router();

const verifyToken = require('../middlewares/auth.middleware');
const marcacionesController = require('../controllers/marcaciones.controller');

// Listar marcaciones
router.get('/', verifyToken, marcacionesController.getMarcaciones);

// Obtener por ID
router.get('/:id', verifyToken, marcacionesController.getMarcacionById);

// Registrar marcación
router.post('/', verifyToken, marcacionesController.createMarcacion);

// Actualizar marcación
router.put('/:id', verifyToken, marcacionesController.updateMarcacion);

module.exports = router;