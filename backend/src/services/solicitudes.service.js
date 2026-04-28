const { pool } = require('../config/db');

// Obtener todas
async function getSolicitudes() {
  const [rows] = await pool.query(`
    SELECT 
      s.id_solicitud,
      CONCAT(u.nombres, ' ', u.apellidos) AS usuario,
      s.motivo,
      s.estado,
      s.fecha_solicitud,
      CONCAT(r.nombres, ' ', r.apellidos) AS revisado_por,
      s.fecha_revision,
      s.comentario_revision
    FROM solicitudes s
    JOIN usuarios u ON s.id_usuario = u.id_usuario
    LEFT JOIN usuarios r ON s.revisado_por = r.id_usuario
    ORDER BY s.fecha_solicitud DESC
  `);

  return rows;
}

// Obtener por ID
async function getSolicitudById(id) {
  const [rows] = await pool.query(
    `SELECT * FROM solicitudes WHERE id_solicitud = ?`,
    [id]
  );

  if (rows.length === 0) {
    throw new Error('Solicitud no encontrada');
  }

  return rows[0];
}

// Crear solicitud
async function createSolicitud(data) {
  const { id_usuario, id_marcacion, motivo } = data;

  if (!id_usuario || !id_marcacion || !motivo) {
    throw new Error('Faltan datos obligatorios');
  }

  const [result] = await pool.query(
    `
    INSERT INTO solicitudes
    (id_usuario, id_marcacion, motivo, estado)
    VALUES (?, ?, ?, 'PENDIENTE')
    `,
    [id_usuario, id_marcacion, motivo]
  );

  return { id: result.insertId };
}

// Revisar solicitud
async function updateSolicitud(id, data) {
  const { estado, revisado_por, comentario_revision } = data;

  if (!estado || !revisado_por) {
    throw new Error('Faltan datos para revisión');
  }

  if (estado !== 'APROBADA' && estado !== 'RECHAZADA') {
    throw new Error('Estado inválido');
  }

  await pool.query(
    `
    UPDATE solicitudes
    SET 
      estado = ?,
      revisado_por = ?,
      comentario_revision = ?,
      fecha_revision = NOW()
    WHERE id_solicitud = ?
    `,
    [estado, revisado_por, comentario_revision || null, id]
  );
}

module.exports = {
  getSolicitudes,
  getSolicitudById,
  createSolicitud,
  updateSolicitud
};