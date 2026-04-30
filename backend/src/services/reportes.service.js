const { pool } = require('../config/db');

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

  const [usuarioExiste] = await pool.query(
    `SELECT id_usuario FROM usuarios WHERE id_usuario = ?`,
    [id_usuario]
  );

  if (usuarioExiste.length === 0) {
    throw new Error('El usuario indicado no existe');
  }

  const [generadorExiste] = await pool.query(
    `SELECT id_usuario FROM usuarios WHERE id_usuario = ?`,
    [generado_por]
  );

  if (generadorExiste.length === 0) {
    throw new Error('El usuario generador no existe');
  }

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

  // Por ahora queda en 0 porque no existe una columna real de minutos de hora extra.
  const totalHorasExtraMinutos = 0;

  const archivoPdf = `reportes/reporte_usuario_${id_usuario}_${fecha_desde}_${fecha_hasta}.pdf`;

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

module.exports = {
  getReportes,
  getReporteById,
  createReporte,
  updateReporte
};