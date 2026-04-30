const { pool } = require('../config/db');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const tiposValidos = ['DIARIO', 'SEMANAL', 'MENSUAL', 'PERSONALIZADO'];

async function getReportes() {
  const [rows] = await pool.query(`
    SELECT 
      r.id_reporte,
      CONCAT(u.nombres, ' ', u.apellidos) AS usuario,
      CONCAT(g.nombres, ' ', g.apellidos) AS generado_por,
      r.tipo,
      r.fecha_desde,
      r.fecha_hasta,
      r.total_marcaciones,
      r.total_atrasos,
      r.total_horas_extra_minutos,
      r.total_inasistencias,
      r.total_solicitudes,
      r.observacion,
      r.archivo_pdf,
      r.fecha_generacion
    FROM reportes r
    JOIN usuarios u ON r.id_usuario = u.id_usuario
    JOIN usuarios g ON r.generado_por = g.id_usuario
    ORDER BY r.fecha_generacion DESC
  `);

  return rows;
}

async function getReporteById(id) {
  const [rows] = await pool.query(
    `
    SELECT 
      r.id_reporte,
      r.id_usuario,
      CONCAT(u.nombres, ' ', u.apellidos) AS usuario,
      r.generado_por,
      CONCAT(g.nombres, ' ', g.apellidos) AS generado_por_nombre,
      r.tipo,
      r.fecha_desde,
      r.fecha_hasta,
      r.total_marcaciones,
      r.total_atrasos,
      r.total_horas_extra_minutos,
      r.total_inasistencias,
      r.total_solicitudes,
      r.observacion,
      r.archivo_pdf,
      r.fecha_generacion
    FROM reportes r
    JOIN usuarios u ON r.id_usuario = u.id_usuario
    JOIN usuarios g ON r.generado_por = g.id_usuario
    WHERE r.id_reporte = ?
    `,
    [id]
  );

  if (rows.length === 0) {
    throw new Error('Reporte no encontrado');
  }

  return rows[0];
}

async function crearPdfReporte(data, archivoPdf) {
  const carpetaReportes = path.join(__dirname, '../../reportes');

  if (!fs.existsSync(carpetaReportes)) {
    fs.mkdirSync(carpetaReportes);
  }

  const rutaCompleta = path.join(__dirname, '../../', archivoPdf);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const stream = fs.createWriteStream(rutaCompleta);

    doc.pipe(stream);

    doc.fontSize(18).text('Reporte de Asistencia', { align: 'center' });
    doc.moveDown();

    doc.fontSize(12).text(`Usuario: ${data.usuario}`);
    doc.text(`Generado por: ${data.generado_por}`);
    doc.text(`Tipo: ${data.tipo}`);
    doc.text(`Periodo: ${data.fecha_desde} al ${data.fecha_hasta}`);
    doc.moveDown();

    doc.text(`Total marcaciones: ${data.total_marcaciones}`);
    doc.text(`Total atrasos: ${data.total_atrasos}`);
    doc.text(`Total horas extra (minutos): ${data.total_horas_extra_minutos}`);
    doc.text(`Total inasistencias: ${data.total_inasistencias}`);
    doc.text(`Total solicitudes: ${data.total_solicitudes}`);
    doc.moveDown();

    doc.text(`Observación: ${data.observacion || 'Sin observación'}`);

    doc.end();

    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

async function createReporte(data) {
  const {
    id_usuario,
    generado_por,
    tipo,
    fecha_desde,
    fecha_hasta,
    observacion
  } = data;

  if (!id_usuario || !generado_por || !tipo || !fecha_desde || !fecha_hasta) {
    throw new Error('Faltan campos obligatorios');
  }

  if (!tiposValidos.includes(tipo)) {
    throw new Error('Tipo de reporte inválido');
  }

  const [usuarioRows] = await pool.query(
    `SELECT id_usuario, nombres, apellidos FROM usuarios WHERE id_usuario = ?`,
    [id_usuario]
  );

  if (usuarioRows.length === 0) {
    throw new Error('El usuario indicado no existe');
  }

  const [generadorRows] = await pool.query(
    `SELECT id_usuario, nombres, apellidos FROM usuarios WHERE id_usuario = ?`,
    [generado_por]
  );

  if (generadorRows.length === 0) {
    throw new Error('El usuario generador no existe');
  }

  const usuarioNombre = `${usuarioRows[0].nombres} ${usuarioRows[0].apellidos}`;
  const generadoPorNombre = `${generadorRows[0].nombres} ${generadorRows[0].apellidos}`;

  const [[marcaciones]] = await pool.query(
    `
    SELECT COUNT(*) AS total
    FROM marcaciones
    WHERE id_usuario = ?
      AND fecha BETWEEN ? AND ?
    `,
    [id_usuario, fecha_desde, fecha_hasta]
  );

  const [[atrasos]] = await pool.query(
    `
    SELECT COUNT(*) AS total
    FROM marcaciones
    WHERE id_usuario = ?
      AND estado = 'TARDANZA'
      AND fecha BETWEEN ? AND ?
    `,
    [id_usuario, fecha_desde, fecha_hasta]
  );

  const [[inasistencias]] = await pool.query(
    `
    SELECT COUNT(*) AS total
    FROM marcaciones
    WHERE id_usuario = ?
      AND estado = 'INASISTENCIA'
      AND fecha BETWEEN ? AND ?
    `,
    [id_usuario, fecha_desde, fecha_hasta]
  );

  const [[solicitudes]] = await pool.query(
    `
    SELECT COUNT(*) AS total
    FROM solicitudes
    WHERE id_usuario = ?
      AND DATE(fecha_solicitud) BETWEEN ? AND ?
    `,
    [id_usuario, fecha_desde, fecha_hasta]
  );

  const totalMarcaciones = marcaciones.total || 0;
  const totalAtrasos = atrasos.total || 0;
  const totalInasistencias = inasistencias.total || 0;
  const totalSolicitudes = solicitudes.total || 0;
  const totalHorasExtraMinutos = 0;

  const archivoPdf = `reportes/reporte_usuario_${id_usuario}_${fecha_desde}_${fecha_hasta}.pdf`;

  await crearPdfReporte(
    {
      usuario: usuarioNombre,
      generado_por: generadoPorNombre,
      tipo,
      fecha_desde,
      fecha_hasta,
      total_marcaciones: totalMarcaciones,
      total_atrasos: totalAtrasos,
      total_horas_extra_minutos: totalHorasExtraMinutos,
      total_inasistencias: totalInasistencias,
      total_solicitudes: totalSolicitudes,
      observacion
    },
    archivoPdf
  );

  const [result] = await pool.query(
    `
    INSERT INTO reportes
    (
      id_usuario,
      generado_por,
      tipo,
      fecha_desde,
      fecha_hasta,
      total_marcaciones,
      total_atrasos,
      total_horas_extra_minutos,
      total_inasistencias,
      total_solicitudes,
      observacion,
      archivo_pdf
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      id_usuario,
      generado_por,
      tipo,
      fecha_desde,
      fecha_hasta,
      totalMarcaciones,
      totalAtrasos,
      totalHorasExtraMinutos,
      totalInasistencias,
      totalSolicitudes,
      observacion || null,
      archivoPdf
    ]
  );

  return {
    id_reporte: result.insertId,
    archivo_pdf: archivoPdf
  };
}

async function updateReporte(id, data) {
  const { observacion, archivo_pdf } = data;

  await getReporteById(id);

  await pool.query(
    `
    UPDATE reportes
    SET 
      observacion = COALESCE(?, observacion),
      archivo_pdf = COALESCE(?, archivo_pdf)
    WHERE id_reporte = ?
    `,
    [observacion || null, archivo_pdf || null, id]
  );
}

async function getReportePdfPath(id) {
  const reporte = await getReporteById(id);

  if (!reporte.archivo_pdf) {
    throw new Error('Este reporte no tiene PDF asociado');
  }

  const filePath = path.join(__dirname, '../../', reporte.archivo_pdf);

  if (!fs.existsSync(filePath)) {
    throw new Error('El archivo PDF no existe en el servidor');
  }

  return filePath;
}

module.exports = {
  getReportes,
  getReporteById,
  createReporte,
  updateReporte,
  getReportePdfPath
};