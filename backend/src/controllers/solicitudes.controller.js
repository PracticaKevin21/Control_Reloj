const solicitudesService = require('../services/solicitudes.service');

async function getSolicitudes(req, res) {
  try {
    const data = await solicitudesService.getSolicitudes();

    return res.json({
      ok: true,
      solicitudes: data
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al obtener solicitudes'
    });
  }
}

async function getSolicitudById(req, res) {
  try {
    const { id } = req.params;

    const data = await solicitudesService.getSolicitudById(id);

    return res.json({
      ok: true,
      solicitud: data
    });
  } catch (error) {
    return res.status(404).json({
      ok: false,
      mensaje: error.message
    });
  }
}

async function createSolicitud(req, res) {
  try {
    const result = await solicitudesService.createSolicitud(req.body);

    return res.status(201).json({
      ok: true,
      mensaje: 'Solicitud creada correctamente',
      id_solicitud: result.id
    });
  } catch (error) {
    return res.status(400).json({
      ok: false,
      mensaje: error.message
    });
  }
}

async function updateSolicitud(req, res) {
  try {
    const { id } = req.params;

    await solicitudesService.updateSolicitud(id, req.body);

    return res.json({
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