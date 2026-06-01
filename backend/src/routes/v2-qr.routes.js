const express = require('express');
const router  = express.Router();
const v2QrController = require('../controllers/v2-qr.controller');

// POST /api/v2/qr/salida
// La APK Android llama aquí después de escanear el QR
router.post('/salida', v2QrController.registrarSalidaQR);

// GET /api/v2/qr/verificar-salida?id_usuario=31&fecha=2026-06-01
// El frontend hace polling para saber si la APK ya registró la salida
router.get('/verificar-salida', v2QrController.verificarSalidaHoy);

// GET /api/v2/qr/turno/:id_usuario
// Turno asignado al usuario (v2_usuario_turnos + v2_turnos)
router.get('/turno/:id_usuario', v2QrController.getTurnoUsuario);

// GET /api/v2/qr/estado/:id_usuario
// Estado completo del día: entrada, salida, turno, excepción
router.get('/estado/:id_usuario', v2QrController.getEstadoMarcacionHoy);

module.exports = router;