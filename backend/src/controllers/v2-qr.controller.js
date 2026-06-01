const v2QrService = require('../services/v2-qr.service');

// POST /api/v2/qr/salida
// Recibe el QR escaneado por la APK y registra la salida en v2_marcaciones
async function registrarSalidaQR(req, res) {
  try {
    const { id_usuario, tipo, metodo_validacion, qr_contenido } = req.body;

    const idUsuario = parseInt(id_usuario, 10);

    if (!idUsuario || idUsuario <= 0) {
      return res.status(400).json({ ok: false, error: 'id_usuario inválido o faltante.' });
    }
    if (tipo !== 'SALIDA') {
      return res.status(400).json({ ok: false, error: 'Este endpoint solo acepta tipo SALIDA.' });
    }
    if (metodo_validacion !== 'QR') {
      return res.status(400).json({ ok: false, error: 'El método de validación debe ser QR.' });
    }
    if (!qr_contenido || qr_contenido.trim() === '') {
      return res.status(400).json({ ok: false, error: 'El contenido del QR está vacío.' });
    }

    const resultado = await v2QrService.registrarSalidaQR(idUsuario, qr_contenido);

    return res.status(201).json({
      ok: true,
      mensaje: 'Salida registrada exitosamente.',
      data: resultado
    });

  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message });
  }
}

// GET /api/v2/qr/verificar-salida?id_usuario=31&fecha=2026-06-01
async function verificarSalidaHoy(req, res) {
  try {
    const idUsuario = parseInt(req.query.id_usuario, 10);
    const fecha     = req.query.fecha;

    if (!idUsuario || idUsuario <= 0) {
      return res.status(400).json({ ok: false, error: 'id_usuario inválido.' });
    }

    const registrada = await v2QrService.verificarSalidaHoy(idUsuario, fecha);

    return res.status(200).json({ ok: true, registrada });

  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
}

// GET /api/v2/qr/turno/:id_usuario
async function getTurnoUsuario(req, res) {
  try {
    const idUsuario = parseInt(req.params.id_usuario, 10);

    if (!idUsuario || idUsuario <= 0) {
      return res.status(400).json({ ok: false, error: 'id_usuario inválido.' });
    }

    const turno = await v2QrService.getTurnoUsuario(idUsuario);

    return res.status(200).json({ ok: true, data: turno });

  } catch (error) {
    return res.status(404).json({ ok: false, error: error.message });
  }
}

// GET /api/v2/qr/estado/:id_usuario
async function getEstadoMarcacionHoy(req, res) {
  try {
    const idUsuario = parseInt(req.params.id_usuario, 10);

    if (!idUsuario || idUsuario <= 0) {
      return res.status(400).json({ ok: false, error: 'id_usuario inválido.' });
    }

    const estado = await v2QrService.getEstadoMarcacionHoy(idUsuario);

    return res.status(200).json({ ok: true, data: estado });

  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
}

module.exports = {
  registrarSalidaQR,
  verificarSalidaHoy,
  getTurnoUsuario,
  getEstadoMarcacionHoy
};