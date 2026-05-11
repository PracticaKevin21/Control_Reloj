const solicitudesService = require('../services/solicitudes.service');

/* =========================
   GET TODOS
========================= */
async function getSolicitudes(req, res) {
  try {
    const solicitudes = await solicitudesService.getSolicitudes(req.scope);

    return res.status(200).json({
      ok: true,
      total: solicitudes.length,
      data: solicitudes
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al obtener solicitudes',
      error: error.message
    });
  }
}

/* =========================
   GET POR ID
========================= */
async function getSolicitudById(req, res) {
  try {
    const { id } = req.params;

    const solicitud = await solicitudesService.getSolicitudById(
      id,
      req.scope
    );

    return res.status(200).json({
      ok: true,
      data: solicitud
    });
  } catch (error) {
    return res.status(404).json({
      ok: false,
      mensaje: error.message
    });
  }
}

/* =========================
   CREATE
========================= */
async function createSolicitud(req, res) {
  try {
    const result = await solicitudesService.createSolicitud(
      req.body,
      req.usuario,
      req.scope
    );

    return res.status(201).json({
      ok: true,
      mensaje: 'Solicitud creada correctamente',
      data: result
    });
  } catch (error) {
    return res.status(400).json({
      ok: false,
      mensaje: error.message
    });
  }
}

/* =========================
   UPDATE / REVISAR
========================= */
async function updateSolicitud(req, res) {
  try {
    const { id } = req.params;

    await solicitudesService.updateSolicitud(
      id,
      req.body,
      req.usuario,
      req.scope
    );

    return res.status(200).json({
      ok: true,
      mensaje: 'Solicitud revisada correctamente'
    });
  } catch (error) {
    return res.status(400).json({
      ok: false,
      mensaje: error.message
    });
  }
}

module.exports = {
  getSolicitudes,
  getSolicitudById,
  createSolicitud,
  updateSolicitud
};