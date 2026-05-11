const reportesService = require('../services/reportes.service');

/* =========================
   GET TODOS
========================= */
async function getReportes(req, res) {

  try {

    const rows = await reportesService.getReportes(
      req.scope
    );

    return res.status(200).json({
      ok: true,
      total: rows.length,
      data: rows
    });

  } catch (error) {

    return res.status(500).json({
      ok: false,
      mensaje: error.message
    });
  }
}

/* =========================
   GET POR ID
========================= */
async function getReporteById(req, res) {

  try {

    const { id } = req.params;

    const row = await reportesService.getReporteById(
      id,
      req.scope
    );

    return res.status(200).json({
      ok: true,
      data: row
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
async function createReporte(req, res) {

  try {

    const result = await reportesService.createReporte(
      req.body,
      req.usuario,
      req.scope
    );

    return res.status(201).json({
      ok: true,
      mensaje: 'Reporte generado correctamente',
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
   UPDATE
========================= */
async function updateReporte(req, res) {

  try {

    const { id } = req.params;

    await reportesService.updateReporte(
      id,
      req.body,
      req.scope
    );

    return res.status(200).json({
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

/* =========================
   DESCARGAR PDF
========================= */
async function descargarPdfReporte(req, res) {

  try {

    const { id } = req.params;

    const filePath = await reportesService.getReportePdfPath(
      id,
      req.scope
    );

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