const { pool } = require('../config/db');

async function getTurnos() {
  const [rows] = await pool.query(`
    SELECT 
      id_turno,
      nombre,
      hora_entrada,
      hora_salida,
      tolerancia_minutos,
      minutos_colacion
    FROM turnos
    ORDER BY id_turno ASC
  `);

  return rows;
}

async function getTurnoById(id) {
  const [rows] = await pool.query(
    `
    SELECT 
      id_turno,
      nombre,
      hora_entrada,
      hora_salida,
      tolerancia_minutos,
      minutos_colacion
    FROM turnos
    WHERE id_turno = ?
    `,
    [id]
  );

  if (rows.length === 0) {
    throw new Error('Turno no encontrado');
  }

  return rows[0];
}

async function createTurno(data) {
  const {
    nombre,
    hora_entrada,
    hora_salida,
    tolerancia_minutos,
    minutos_colacion
  } = data;

  if (!nombre || !hora_entrada || !hora_salida) {
    throw new Error('Nombre, hora de entrada y hora de salida son obligatorios');
  }

  const [result] = await pool.query(
    `
    INSERT INTO turnos
    (nombre, hora_entrada, hora_salida, tolerancia_minutos, minutos_colacion)
    VALUES (?, ?, ?, ?, ?)
    `,
    [
      nombre,
      hora_entrada,
      hora_salida,
      tolerancia_minutos || 0,
      minutos_colacion || 0
    ]
  );

  return {
    id_turno: result.insertId
  };
}

async function updateTurno(id, data) {
  const {
    nombre,
    hora_entrada,
    hora_salida,
    tolerancia_minutos,
    minutos_colacion
  } = data;

  const turnoActual = await getTurnoById(id);

  if (!turnoActual) {
    throw new Error('Turno no encontrado');
  }

  if (!nombre || !hora_entrada || !hora_salida) {
    throw new Error('Nombre, hora de entrada y hora de salida son obligatorios');
  }

  await pool.query(
    `
    UPDATE turnos
    SET 
      nombre = ?,
      hora_entrada = ?,
      hora_salida = ?,
      tolerancia_minutos = ?,
      minutos_colacion = ?
    WHERE id_turno = ?
    `,
    [
      nombre,
      hora_entrada,
      hora_salida,
      tolerancia_minutos || 0,
      minutos_colacion || 0,
      id
    ]
  );
}

async function deleteTurno(id) {
  await getTurnoById(id);

  const [asignaciones] = await pool.query(
    'SELECT id_usuario_turno FROM usuario_turnos WHERE id_turno = ? LIMIT 1',
    [id]
  );

  if (asignaciones.length > 0) {
    throw new Error('No se puede eliminar el turno porque está asignado a usuarios');
  }

  await pool.query(
    'DELETE FROM turnos WHERE id_turno = ?',
    [id]
  );
}

module.exports = {
  getTurnos,
  getTurnoById,
  createTurno,
  updateTurno,
  deleteTurno
};