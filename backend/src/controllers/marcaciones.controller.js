const marcacionesService = require('../services/marcaciones.service');

async function getMarcaciones(req, res) {
  try {
    const marcaciones = await marcacionesService.getMarcaciones(req.scope);

    return res.status(200).json({
      ok: true,
      marcaciones
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al obtener marcaciones',
      error: error.message
    });
  }
}

async function getMarcacionById(req, res) {
  try {
    const { id } = req.params;

    const marcacion = await marcacionesService.getMarcacionById(id, req.scope);

    return res.status(200).json({
      ok: true,
      marcacion
    });
  } catch (error) {
    return res.status(404).json({
      ok: false,
      mensaje: error.message
    });
  }
}

async function createMarcacion(req, res) {
  try {
    const result = await marcacionesService.createMarcacion(
      req.body,
      req.usuario,
      req.scope
    );

    return res.status(201).json({
      ok: true,
      mensaje: 'Marcación registrada correctamente',
      id_marcacion: result.id_marcacion
    });
  } catch (error) {
    return res.status(400).json({
      ok: false,
      mensaje: error.message
    });
  }
}

async function updateMarcacion(req, res) {
  try {
    const { id } = req.params;

    await marcacionesService.updateMarcacion(id, req.body, req.scope);

    return res.status(200).json({
      ok: true,
      mensaje: 'Marcación actualizada correctamente'
    });
  } catch (error) {
    return res.status(400).json({
      ok: false,
      mensaje: error.message
    });
  }
}

module.exports = {
  getMarcaciones,
  getMarcacionById,
  createMarcacion,
  updateMarcacion
};