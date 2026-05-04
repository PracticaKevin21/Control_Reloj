const { pool } = require('../config/db');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const tiposValidos = ['DIARIO', 'SEMANAL', 'MENSUAL', 'PERSONALIZADO'];

// 🔹 FILTRO SCOPE
function aplicarFiltroScope(scope, usarWhere = true) {
  const inicio = usarWhere ? 'WHERE' : 'AND';

  if (!scope || scope.tipo === 'global') {
    return { sql: '', params: [] };
  }

  if (scope.tipo === 'departamento') {
    return {
      sql: `${inicio} sd.id_departamento = ?`,
      params: [scope.id_departamento]
    };
  }

  if (scope.tipo === 'subdepartamento') {
    return {
      sql: `${inicio} u.id_subdepartamento = ?`,
      params: [scope.id_subdepartamento]
    };
  }

  if (scope.tipo === 'propio') {
    return {
      sql: `${inicio} r.id_usuario = ?`,
      params: [scope.id_usuario]
    };
  }

  throw new Error('Scope inválido');
}

// 🔹 LISTAR
async function getReportes(scope) {
  const filtro = aplicarFiltroScope(scope);

  const [rows] = await pool.query(
    `
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
      r.fecha_generacion,
      sd.id_departamento,
      u.id_subdepartamento,
      r.id_usuario
    FROM reportes r
    JOIN usuarios u ON r.id_usuario = u.id_usuario
    LEFT JOIN subdepartamentos sd ON u.id_subdepartamento = sd.id_subdepartamento
    JOIN usuarios g ON r.generado_por = g.id_usuario
    ${filtro.sql}
    ORDER BY r.fecha_generacion DESC
    `,
    filtro.params
  );

  return rows;
}

// 🔹 OBTENER POR ID
async function getReporteById(id, scope) {
  const filtro = aplicarFiltroScope(scope, false);

  const [rows] = await pool.query(
    `
    SELECT 
      r.*,
      sd.id_departamento,
      u.id_subdepartamento,
      r.id_usuario
    FROM reportes r
    JOIN usuarios u ON r.id_usuario = u.id_usuario
    LEFT JOIN subdepartamentos sd ON u.id_subdepartamento = sd.id_subdepartamento
    WHERE r.id_reporte = ?
    ${filtro.sql}
    `,
    [id, ...filtro.params]
  );

  if (rows.length === 0) {
    throw new Error('Reporte no encontrado o sin permisos');
  }

  return rows[0];
}

// 🔹 CREAR
async function createReporte(data, usuarioActual, scope) {
  const {
    id_usuario,
    tipo,
    fecha_desde,
    fecha_hasta,
    observacion
  } = data;

  if (!id_usuario || !tipo || !fecha_desde || !fecha_hasta) {
    throw new Error('Faltan campos obligatorios');
  }

  if (!tiposValidos.includes(tipo)) {
    throw new Error('Tipo inválido');
  }

  // 🔹 VALIDAR SCOPE
  const [userRows] = await pool.query(
    `SELECT id_subdepartamento FROM usuarios WHERE id_usuario = ?`,
    [id_usuario]
  );

  if (userRows.length === 0) {
    throw new Error('Usuario no existe');
  }

  // (simple validación)
  if (scope.tipo === 'propio' && usuarioActual.id_usuario !== id_usuario) {
    throw new Error('No puedes generar reportes de otros usuarios');
  }

  const archivoPdf = `reportes/reporte_${Date.now()}.pdf`;

  // PDF simple
  const rutaCompleta = path.join(__dirname, '../../', archivoPdf);
  const doc = new PDFDocument();
  doc.pipe(fs.createWriteStream(rutaCompleta));

  doc.text('REPORTE DE ASISTENCIA');
  doc.text(`Usuario ID: ${id_usuario}`);
  doc.text(`Periodo: ${fecha_desde} - ${fecha_hasta}`);
  doc.text(`Observación: ${observacion || 'Sin observación'}`);

  doc.end();

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
    VALUES (?, ?, ?, ?, ?, 0, 0, 0, 0, 0, ?, ?)
    `,
    [
      id_usuario,
      usuarioActual.id_usuario,
      tipo,
      fecha_desde,
      fecha_hasta,
      observacion,
      archivoPdf
    ]
  );

  return {
    id_reporte: result.insertId,
    archivo_pdf: archivoPdf
  };
}

// 🔹 UPDATE
async function updateReporte(id, data, scope) {
  await getReporteById(id, scope);

  await pool.query(
    `UPDATE reportes SET observacion = ? WHERE id_reporte = ?`,
    [data.observacion, id]
  );
}

// 🔹 PDF
async function getReportePdfPath(id, scope) {
  const reporte = await getReporteById(id, scope);
  return path.join(__dirname, '../../', reporte.archivo_pdf);
}

module.exports = {
  getReportes,
  getReporteById,
  createReporte,
  updateReporte,
  getReportePdfPath
};