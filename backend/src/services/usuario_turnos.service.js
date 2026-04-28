const { pool } = require('../config/db');

// Obtener todos los activos
async function getUsuarioTurnos() {
  const [rows] = await pool.query(`
    SELECT 
      ut.id_usuario_turno,
      u.nombres,
      u.apellidos,
      t.nombre AS turno,
      ut.fecha_inicio,
      ut.fecha_termino,
      ut.estado
    FROM usuario_turnos ut
    JOIN usuarios u ON ut.id_usuario = u.id_usuario
    JOIN turnos t ON ut.id_turno = t.id_turno
    WHERE ut.estado = 'ACTIVO'
    ORDER BY ut.id_usuario_turno ASC
  `);

  return rows;
}

// Obtener por ID
async function getUsuarioTurnoById(id) {
  const [rows] = await pool.query(
    `
    SELECT 
      ut.id_usuario_turno,
      ut.id_usuario,
      ut.id_turno,
      u.nombres,
      u.apellidos,
      t.nombre AS turno,
      ut.fecha_inicio,
      ut.fecha_termino,
      ut.estado
    FROM usuario_turnos ut
    JOIN usuarios u ON ut.id_usuario = u.id_usuario
    JOIN turnos t ON ut.id_turno = t.id_turno
    WHERE ut.id_usuario_turno = ?
    `,
    [id]
  );

  if (rows.length === 0) {
    throw new Error('Asignación no encontrada');
  }

  return rows[0];
}

// Crear asignación
async function createUsuarioTurno(data) {
  const { id_usuario, id_turno, fecha_inicio, fecha_termino } = data;

  if (!id_usuario || !id_turno || !fecha_inicio) {
    throw new Error('Faltan datos obligatorios');
  }

  const [usuarioExiste] = await pool.query(
    `SELECT id_usuario FROM usuarios WHERE id_usuario = ? AND estado = 'ACTIVO'`,
    [id_usuario]
  );

  if (usuarioExiste.length === 0) {
    throw new Error('El usuario no existe o está inactivo');
  }

  const [turnoExiste] = await pool.query(
    `SELECT id_turno FROM turnos WHERE id_turno = ? AND estado = 'ACTIVO'`,
    [id_turno]
  );

  if (turnoExiste.length === 0) {
    throw new Error('El turno no existe o está inactivo');
  }

  const [asignacionActiva] = await pool.query(
    `
    SELECT id_usuario_turno 
    FROM usuario_turnos 
    WHERE id_usuario = ? AND estado = 'ACTIVO'
    `,
    [id_usuario]
  );

  if (asignacionActiva.length > 0) {
    throw new Error('El usuario ya tiene un turno activo asignado');
  }

  const [result] = await pool.query(
    `
    INSERT INTO usuario_turnos
    (id_usuario, id_turno, fecha_inicio, fecha_termino, estado)
    VALUES (?, ?, ?, ?, 'ACTIVO')
    `,
    [id_usuario, id_turno, fecha_inicio, fecha_termino || null]
  );

  return { id: result.insertId };
}

// Actualizar asignación
async function updateUsuarioTurno(id, data) {
  const { fecha_termino, estado } = data;

  await getUsuarioTurnoById(id);

  if (estado && estado !== 'ACTIVO' && estado !== 'FINALIZADO') {
    throw new Error('Estado inválido. Debe ser ACTIVO o FINALIZADO');
  }

  await pool.query(
    `
    UPDATE usuario_turnos
    SET 
      fecha_termino = ?,
      estado = ?
    WHERE id_usuario_turno = ?
    `,
    [fecha_termino || null, estado || 'ACTIVO', id]
  );
}

// Finalizar asignación, no eliminar
async function deleteUsuarioTurno(id) {
  await getUsuarioTurnoById(id);

  await pool.query(
    `
    UPDATE usuario_turnos
    SET 
      estado = 'FINALIZADO',
      fecha_termino = CURDATE()
    WHERE id_usuario_turno = ?
    `,
    [id]
  );
}

module.exports = {
  getUsuarioTurnos,
  getUsuarioTurnoById,
  createUsuarioTurno,
  updateUsuarioTurno,
  deleteUsuarioTurno
};