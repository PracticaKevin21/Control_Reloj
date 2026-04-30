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
      r.*,
      CONCAT(u.nombres, ' ', u.apellidos) AS usuario,
      CONCAT(g.nombres, ' ', g.apellidos) AS generado_por_nombre
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
  const rutaCompleta = path.join(__dirname, '../../', archivoPdf);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(rutaCompleta);

    doc.pipe(stream);

    // 🔵 TÍTULO
    doc
      .fontSize(20)
      .text('REPORTE DE ASISTENCIA', { align: 'center' });

    doc.moveDown(1);

    // Línea
    doc
      .moveTo(50, doc.y)
      .lineTo(550, doc.y)
      .stroke();

    doc.moveDown(1.5);

    // 🔵 DATOS GENERALES
    doc.fontSize(12);

    doc.text(`Usuario: ${data.usuario}`);
    doc.text(`Generado por: ${data.generado_por}`);
    doc.text(`Tipo: ${data.tipo}`);
    doc.text(`Periodo: ${data.fecha_desde} al ${data.fecha_hasta}`);

    doc.moveDown(1.5);

    // Línea
    doc
      .moveTo(50, doc.y)
      .lineTo(550, doc.y)
      .stroke();

    doc.moveDown(1.5);

    // 🔵 RESUMEN
    doc.fontSize(14).text('RESUMEN', { underline: true });
    doc.moveDown(0.5);

    doc.fontSize(12);

    doc.text(`Total marcaciones: ${data.total_marcaciones}`);
    doc.text(`Total atrasos: ${data.total_atrasos}`);
    doc.text(`Total horas extra (min): ${data.total_horas_extra_minutos}`);
    doc.text(`Total inasistencias: ${data.total_inasistencias}`);
    doc.text(`Total solicitudes: ${data.total_solicitudes}`);

    doc.moveDown(1.5);

    // Línea
    doc
      .moveTo(50, doc.y)
      .lineTo(550, doc.y)
      .stroke();

    doc.moveDown(1.5);

    // 🔵 OBSERVACIÓN
    doc.fontSize(14).text('OBSERVACIÓN', { underline: true });
    doc.moveDown(0.5);

    doc.fontSize(12).text(
      data.observacion || 'Sin observación',
      {
        align: 'justify'
      }
    );

    doc.moveDown(2);

    // 🔵 FECHA GENERACIÓN
    const fechaActual = new Date().toLocaleString();

    doc.fontSize(10).text(`Generado el: ${fechaActual}`, {
      align: 'right'
    });

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
    `SELECT nombres, apellidos FROM usuarios WHERE id_usuario = ?`,
    [id_usuario]
  );

  const [generadorRows] = await pool.query(
    `SELECT nombres, apellidos FROM usuarios WHERE id_usuario = ?`,
    [generado_por]
  );

  const usuarioNombre = `${usuarioRows[0].nombres} ${usuarioRows[0].apellidos}`;
  const generadoPorNombre = `${generadorRows[0].nombres} ${generadorRows[0].apellidos}`;

  const [[marcaciones]] = await pool.query(
    `SELECT COUNT(*) AS total FROM marcaciones 
     WHERE id_usuario = ? AND fecha BETWEEN ? AND ?`,
    [id_usuario, fecha_desde, fecha_hasta]
  );

  const [[atrasos]] = await pool.query(
    `SELECT COUNT(*) AS total FROM marcaciones 
     WHERE id_usuario = ? AND estado = 'TARDANZA'
     AND fecha BETWEEN ? AND ?`,
    [id_usuario, fecha_desde, fecha_hasta]
  );

  const [[inasistencias]] = await pool.query(
    `SELECT COUNT(*) AS total FROM marcaciones 
     WHERE id_usuario = ? AND estado = 'INASISTENCIA'
     AND fecha BETWEEN ? AND ?`,
    [id_usuario, fecha_desde, fecha_hasta]
  );

  const [[solicitudes]] = await pool.query(
    `SELECT COUNT(*) AS total FROM solicitudes 
     WHERE id_usuario = ? 
     AND DATE(fecha_solicitud) BETWEEN ? AND ?`,
    [id_usuario, fecha_desde, fecha_hasta]
  );

  const archivoPdf = `reportes/reporte_usuario_${id_usuario}_${fecha_desde}_${fecha_hasta}.pdf`;

  await crearPdfReporte(
    {
      usuario: usuarioNombre,
      generado_por: generadoPorNombre,
      tipo,
      fecha_desde,
      fecha_hasta,
      total_marcaciones: marcaciones.total,
      total_atrasos: atrasos.total,
      total_horas_extra_minutos: 0,
      total_inasistencias: inasistencias.total,
      total_solicitudes: solicitudes.total,
      observacion
    },
    archivoPdf
  );

  const [result] = await pool.query(
    `
    INSERT INTO reportes (
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
      marcaciones.total,
      atrasos.total,
      0,
      inasistencias.total,
      solicitudes.total,
      observacion,
      archivoPdf
    ]
  );

  return {
    id_reporte: result.insertId,
    archivo_pdf: archivoPdf
  };
}

async function updateReporte(id, data) {
  await getReporteById(id);

  await pool.query(
    `UPDATE reportes SET observacion = ? WHERE id_reporte = ?`,
    [data.observacion, id]
  );
}

async function getReportePdfPath(id) {
  const reporte = await getReporteById(id);
  return path.join(__dirname, '../../', reporte.archivo_pdf);
}

module.exports = {
  getReportes,
  getReporteById,
  createReporte,
  updateReporte,
  getReportePdfPath
};