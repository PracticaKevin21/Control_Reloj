const reportesService = require('../services/reportes.service');

async function getReportes(req, res) {
  try {
    const reportes = await reportesService.getReportes();

    return res.json({
      ok: true,
      reportes
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al obtener reportes'
    });
  }
}

async function getReporteById(req, res) {
  try {
    const { id } = req.params;
    const reporte = await reportesService.getReporteById(id);

    return res.json({
      ok: true,
      reporte
    });
  } catch (error) {
    return res.status(404).json({
      ok: false,
      mensaje: error.message
    });
  }
}

async function createReporte(req, res) {
  try {
    const result = await reportesService.createReporte(req.body);

    return res.status(201).json({
      ok: true,
      mensaje: 'Reporte generado correctamente',
      id_reporte: result.id_reporte,
      archivo_pdf: result.archivo_pdf
    });
  } catch (error) {
    return res.status(400).json({
      ok: false,
      mensaje: error.message
    });
  }
}

async function updateReporte(req, res) {
  try {
    const { id } = req.params;

    await reportesService.updateReporte(id, req.body);

    return res.json({
      ok: true,
      mensaje: 'Reporte actualizado correctamente'
    });
  } catch (error) {
    return res.status(400).json({
      ok: false,
      mensaje: error.message
    });
  }
}

async function descargarPdfReporte(req, res) {
  try {
    const { id } = req.params;
    const filePath = await reportesService.getReportePdfPath(id);

    return res.download(filePath);
  } catch (error) {
    return res.status(404).json({
      ok: false,
      mensaje: error.message
    });
  }
}

module.exports = {
  getReportes,
  getReporteById,
  createReporte,
  updateReporte,
  descargarPdfReporte
};