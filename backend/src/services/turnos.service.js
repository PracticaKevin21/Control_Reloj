const { pool } = require('../config/db');

// Obtener todos (solo activos)
async function getTurnos() {
  const [rows] = await pool.query(`
    SELECT 
      id_turno,
      nombre,
      hora_entrada,
      hora_salida,
      tolerancia_minutos,
      minutos_colacion,
      estado
    FROM turnos
    WHERE estado = 'ACTIVO'
    ORDER BY id_turno ASC
  `);

  return rows;
}

// Obtener por ID
async function getTurnoById(id) {
  const [rows] = await pool.query(
    `
    SELECT 
      id_turno,
      nombre,
      hora_entrada,
      hora_salida,
      tolerancia_minutos,
      minutos_colacion,
      estado
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

// Crear
async function createTurno(data) {
  const {
    nombre,
    hora_entrada,
    hora_salida,
    tolerancia_minutos,
    minutos_colacion
  } = data;

  if (!nombre || !hora_entrada || !hora_salida) {
    throw new Error('Nombre, hora de entrada y salida son obligatorios');
  }

  const [result] = await pool.query(
    `
    INSERT INTO turnos
    (nombre, hora_entrada, hora_salida, tolerancia_minutos, minutos_colacion, estado)
    VALUES (?, ?, ?, ?, ?, 'ACTIVO')
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

// Actualizar
async function updateTurno(id, data) {
  const {
    nombre,
    hora_entrada,
    hora_salida,
    tolerancia_minutos,
    minutos_colacion
  } = data;

  await getTurnoById(id);

  if (!nombre || !hora_entrada || !hora_salida) {
    throw new Error('Nombre, hora de entrada y salida son obligatorios');
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

// Borrado lógico
async function deleteTurno(id) {
  await getTurnoById(id);

  const [asignaciones] = await pool.query(
    `SELECT id_usuario_turno FROM usuario_turnos WHERE id_turno = ? LIMIT 1`,
    [id]
  );

  if (asignaciones.length > 0) {
    throw new Error('No se puede desactivar porque está asignado a usuarios');
  }

  await pool.query(
    `
    UPDATE turnos
    SET estado = 'INACTIVO'
    WHERE id_turno = ?
    `,
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