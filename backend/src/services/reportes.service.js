const { pool } = require('../config/db');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const tiposValidos = ['DIARIO', 'SEMANAL', 'MENSUAL', 'PERSONALIZADO'];

/* =========================
   FILTRO SCOPE
========================= */
function aplicarFiltroScope(scope, usarWhere = true) {
  const inicio = usarWhere ? 'WHERE' : 'AND';

  if (!scope || scope.tipo === 'global') {
    return {
      sql: '',
      params: []
    };
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

/* =========================
   USUARIO + DEPTO
========================= */
async function getUsuarioConDepartamento(id_usuario) {
  const [rows] = await pool.query(
    `
    SELECT 
      u.id_usuario,
      u.nombres,
      u.apellidos,
      u.estado,
      u.id_subdepartamento,
      sd.id_departamento
    FROM usuarios u
    LEFT JOIN subdepartamentos sd 
      ON u.id_subdepartamento = sd.id_subdepartamento
    WHERE u.id_usuario = ?
    `,
    [id_usuario]
  );

  if (rows.length === 0) {
    throw new Error('Usuario no encontrado');
  }

  return rows[0];
}

/* =========================
   VALIDAR PERMISO
========================= */
function validarPermisoSobreUsuario(usuario, scope) {
  if (!scope || scope.tipo === 'global') {
    return true;
  }

  if (scope.tipo === 'departamento') {
    return usuario.id_departamento === scope.id_departamento;
  }

  if (scope.tipo === 'subdepartamento') {
    return usuario.id_subdepartamento === scope.id_subdepartamento;
  }

  if (scope.tipo === 'propio') {
    return usuario.id_usuario === scope.id_usuario;
  }

  return false;
}

/* =========================
   LISTAR REPORTES
========================= */
async function getReportes(scope) {
  const filtro = aplicarFiltroScope(scope);

  const [rows] = await pool.query(
    `
    SELECT 
      r.id_reporte,
      r.id_usuario,
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
      d.nombre AS departamento,
      sd.nombre AS subdepartamento,
      sd.id_departamento,
      u.id_subdepartamento
    FROM reportes r
    JOIN usuarios u 
      ON r.id_usuario = u.id_usuario
    LEFT JOIN subdepartamentos sd 
      ON u.id_subdepartamento = sd.id_subdepartamento
    LEFT JOIN departamentos d 
      ON sd.id_departamento = d.id_departamento
    JOIN usuarios g 
      ON r.generado_por = g.id_usuario
    ${filtro.sql}
    ORDER BY r.fecha_generacion DESC
    `,
    filtro.params
  );

  return rows;
}

/* =========================
   OBTENER POR ID
========================= */
async function getReporteById(id, scope) {
  const filtro = aplicarFiltroScope(scope, false);

  const [rows] = await pool.query(
    `
    SELECT 
      r.*,
      CONCAT(u.nombres, ' ', u.apellidos) AS usuario,
      CONCAT(g.nombres, ' ', g.apellidos) AS generado_por_nombre,
      d.nombre AS departamento,
      sd.nombre AS subdepartamento,
      sd.id_departamento,
      u.id_subdepartamento
    FROM reportes r
    JOIN usuarios u 
      ON r.id_usuario = u.id_usuario
    LEFT JOIN subdepartamentos sd 
      ON u.id_subdepartamento = sd.id_subdepartamento
    LEFT JOIN departamentos d 
      ON sd.id_departamento = d.id_departamento
    JOIN usuarios g 
      ON r.generado_por = g.id_usuario
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

/* =========================
   CALCULAR TOTALES
========================= */
async function calcularTotales(id_usuario, fecha_desde, fecha_hasta) {
  const [marcacionesRows] = await pool.query(
    `
    SELECT
      COUNT(*) AS total_marcaciones,
      SUM(CASE WHEN estado = 'TARDANZA' THEN 1 ELSE 0 END) AS total_atrasos,
      SUM(CASE WHEN estado = 'HORA_EXTRA' THEN 1 ELSE 0 END) AS total_horas_extra,
      SUM(CASE WHEN estado = 'INASISTENCIA' THEN 1 ELSE 0 END) AS total_inasistencias
    FROM marcaciones
    WHERE id_usuario = ?
      AND fecha BETWEEN ? AND ?
    `,
    [id_usuario, fecha_desde, fecha_hasta]
  );

  const [solicitudesRows] = await pool.query(
    `
    SELECT COUNT(*) AS total_solicitudes
    FROM solicitudes
    WHERE id_usuario = ?
      AND DATE(fecha_solicitud) BETWEEN ? AND ?
    `,
    [id_usuario, fecha_desde, fecha_hasta]
  );

  const marcaciones = marcacionesRows[0];
  const solicitudes = solicitudesRows[0];

  return {
    total_marcaciones: marcaciones.total_marcaciones || 0,
    total_atrasos: marcaciones.total_atrasos || 0,
    total_horas_extra_minutos: marcaciones.total_horas_extra || 0,
    total_inasistencias: marcaciones.total_inasistencias || 0,
    total_solicitudes: solicitudes.total_solicitudes || 0
  };
}

/* =========================
   GENERAR PDF
========================= */
async function generarPdfReporte(dataPdf) {
  const {
    id_reporte,
    usuario,
    generado_por,
    tipo,
    fecha_desde,
    fecha_hasta,
    total_marcaciones,
    total_atrasos,
    total_horas_extra_minutos,
    total_inasistencias,
    total_solicitudes,
    observacion
  } = dataPdf;

  const carpetaReportes = path.join(__dirname, '../../reportes');

  if (!fs.existsSync(carpetaReportes)) {
    fs.mkdirSync(carpetaReportes, { recursive: true });
  }

  const nombreArchivo = `reporte_${id_reporte}_${Date.now()}.pdf`;
  const archivoRelativo = `reportes/${nombreArchivo}`;
  const rutaCompleta = path.join(__dirname, '../../', archivoRelativo);

  const doc = new PDFDocument({
    size: 'A4',
    margin: 50
  });

  doc.pipe(fs.createWriteStream(rutaCompleta));

  doc
    .fontSize(18)
    .text('REPORTE DE ASISTENCIA', { align: 'center' });

  doc.moveDown();
  doc.moveTo(50, 95).lineTo(545, 95).stroke();

  doc.moveDown(2);
  doc.fontSize(11);
  doc.text(`Usuario: ${usuario}`);
  doc.text(`Generado por: ${generado_por}`);
  doc.text(`Tipo: ${tipo}`);
  doc.text(`Periodo: ${fecha_desde} al ${fecha_hasta}`);

  doc.moveDown();
  doc.moveTo(50, 180).lineTo(545, 180).stroke();

  doc.moveDown();
  doc.fontSize(12).text('RESUMEN', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(11);
  doc.text(`Total marcaciones: ${total_marcaciones}`);
  doc.text(`Total atrasos: ${total_atrasos}`);
  doc.text(`Total horas extra (min): ${total_horas_extra_minutos}`);
  doc.text(`Total inasistencias: ${total_inasistencias}`);
  doc.text(`Total solicitudes: ${total_solicitudes}`);

  doc.moveDown();
  doc.moveTo(50, 300).lineTo(545, 300).stroke();

  doc.moveDown();
  doc.fontSize(12).text('OBSERVACIÓN', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(11).text(observacion || 'Sin observación');

  doc.moveDown(3);
  doc.fontSize(8).text(
    `Generado el: ${new Date().toLocaleString('es-CL')}`,
    { align: 'right' }
  );

  doc.end();

  return archivoRelativo;
}

/* =========================
   CREAR REPORTE
========================= */
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

  const usuarioReporte = await getUsuarioConDepartamento(id_usuario);

  if (usuarioReporte.estado !== 'ACTIVO') {
    throw new Error('El usuario no está activo');
  }

  if (!validarPermisoSobreUsuario(usuarioReporte, scope)) {
    throw new Error('No tienes permisos para generar reportes de este usuario');
  }

  const totales = await calcularTotales(id_usuario, fecha_desde, fecha_hasta);

  const [insertResult] = await pool.query(
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
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
    `,
    [
      id_usuario,
      usuarioActual.id_usuario,
      tipo,
      fecha_desde,
      fecha_hasta,
      totales.total_marcaciones,
      totales.total_atrasos,
      totales.total_horas_extra_minutos,
      totales.total_inasistencias,
      totales.total_solicitudes,
      observacion || null
    ]
  );

  const idReporte = insertResult.insertId;

  const generadoPor = `${usuarioActual.nombres || ''} ${usuarioActual.apellidos || ''}`.trim() || usuarioActual.correo;

  const archivoPdf = await generarPdfReporte({
    id_reporte: idReporte,
    usuario: `${usuarioReporte.nombres} ${usuarioReporte.apellidos}`,
    generado_por: generadoPor,
    tipo,
    fecha_desde,
    fecha_hasta,
    ...totales,
    observacion
  });

  await pool.query(
    `
    UPDATE reportes
    SET archivo_pdf = ?
    WHERE id_reporte = ?
    `,
    [archivoPdf, idReporte]
  );

  return {
    id_reporte: idReporte,
    archivo_pdf: archivoPdf
  };
}

/* =========================
   ACTUALIZAR REPORTE
========================= */
async function updateReporte(id, data, scope) {
  await getReporteById(id, scope);

  const { observacion } = data;

  await pool.query(
    `
    UPDATE reportes
    SET observacion = ?
    WHERE id_reporte = ?
    `,
    [observacion || null, id]
  );
}

/* =========================
   RUTA PDF
========================= */
async function getReportePdfPath(id, scope) {
  const reporte = await getReporteById(id, scope);

  if (!reporte.archivo_pdf) {
    throw new Error('El reporte no tiene archivo PDF asociado');
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