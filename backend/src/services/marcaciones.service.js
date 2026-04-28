const { pool } = require('../config/db');

// Obtener todas
async function getMarcaciones() {
  const [rows] = await pool.query(`
    SELECT 
      m.id_marcacion,
      CONCAT(u.nombres, ' ', u.apellidos) AS usuario,
      m.fecha,
      m.hora,
      m.tipo,
      m.origen,
      m.estado,
      m.observacion,
      m.ubicacion,
      m.requiere_aprobacion,
      CONCAT(a.nombres, ' ', a.apellidos) AS aprobado_por,
      m.fecha_aprobacion
    FROM marcaciones m
    JOIN usuarios u ON m.id_usuario = u.id_usuario
    LEFT JOIN usuarios a ON m.aprobado_por = a.id_usuario
    ORDER BY m.fecha DESC, m.hora DESC
  `);

  return rows;
}

// Obtener por ID
async function getMarcacionById(id) {
  const [rows] = await pool.query(
    `
    SELECT 
      m.id_marcacion,
      m.id_usuario,
      CONCAT(u.nombres, ' ', u.apellidos) AS usuario,
      m.fecha,
      m.hora,
      m.tipo,
      m.origen,
      m.estado,
      m.observacion,
      m.ubicacion,
      m.requiere_aprobacion,
      m.aprobado_por,
      m.fecha_aprobacion
    FROM marcaciones m
    JOIN usuarios u ON m.id_usuario = u.id_usuario
    WHERE m.id_marcacion = ?
    `,
    [id]
  );

  if (rows.length === 0) {
    throw new Error('Marcación no encontrada');
  }

  return rows[0];
}

// Crear marcación
async function createMarcacion(data) {
  const {
    id_usuario,
    tipo,
    origen,
    estado,
    observacion,
    ubicacion,
    requiere_aprobacion
  } = data;

  if (!id_usuario || !tipo) {
    throw new Error('Faltan datos obligatorios');
  }

  if (tipo !== 'ENTRADA' && tipo !== 'SALIDA') {
    throw new Error('Tipo inválido. Debe ser ENTRADA o SALIDA');
  }

  const origenFinal = origen || 'WEB';
  const estadoFinal = estado || 'NORMAL';

  const origenesValidos = ['ANDROID', 'WEB', 'RELOJ', 'QR'];
  const estadosValidos = [
    'NORMAL',
    'TARDANZA',
    'HORA_EXTRA',
    'FUERA_HORARIO',
    'INASISTENCIA',
    'PENDIENTE'
  ];

  if (!origenesValidos.includes(origenFinal)) {
    throw new Error('Origen inválido');
  }

  if (!estadosValidos.includes(estadoFinal)) {
    throw new Error('Estado inválido');
  }

  const [usuario] = await pool.query(
    `SELECT id_usuario FROM usuarios WHERE id_usuario = ? AND estado = 'ACTIVO'`,
    [id_usuario]
  );

  if (usuario.length === 0) {
    throw new Error('Usuario no válido');
  }

  const [result] = await pool.query(
    `
    INSERT INTO marcaciones
    (id_usuario, fecha, hora, tipo, origen, estado, observacion, ubicacion, requiere_aprobacion)
    VALUES (?, CURDATE(), CURTIME(), ?, ?, ?, ?, ?, ?)
    `,
    [
      id_usuario,
      tipo,
      origenFinal,
      estadoFinal,
      observacion || null,
      ubicacion || null,
      requiere_aprobacion ? 1 : 0
    ]
  );

  return {
    id_marcacion: result.insertId
  };
}

// Actualizar marcación
async function updateMarcacion(id, data) {
  const {
    estado,
    observacion,
    ubicacion,
    requiere_aprobacion,
    aprobado_por
  } = data;

  await getMarcacionById(id);

  const estadosValidos = [
    'NORMAL',
    'TARDANZA',
    'HORA_EXTRA',
    'FUERA_HORARIO',
    'INASISTENCIA',
    'PENDIENTE'
  ];

  if (estado && !estadosValidos.includes(estado)) {
    throw new Error('Estado inválido');
  }

  if (aprobado_por) {
    const [aprobadorExiste] = await pool.query(
      `SELECT id_usuario FROM usuarios WHERE id_usuario = ? AND estado = 'ACTIVO'`,
      [aprobado_por]
    );

    if (aprobadorExiste.length === 0) {
      throw new Error('El usuario aprobador no existe o está inactivo');
    }
  }

  await pool.query(
    `
    UPDATE marcaciones
    SET
      estado = COALESCE(?, estado),
      observacion = COALESCE(?, observacion),
      ubicacion = COALESCE(?, ubicacion),
      requiere_aprobacion = COALESCE(?, requiere_aprobacion),
      aprobado_por = COALESCE(?, aprobado_por),
      fecha_aprobacion = CASE 
        WHEN ? IS NOT NULL THEN NOW()
        ELSE fecha_aprobacion
      END
    WHERE id_marcacion = ?
    `,
    [
      estado || null,
      observacion || null,
      ubicacion || null,
      requiere_aprobacion === undefined ? null : requiere_aprobacion ? 1 : 0,
      aprobado_por || null,
      aprobado_por || null,
      id
    ]
  );
}

module.exports = {
  getMarcaciones,
  getMarcacionById,
  createMarcacion,
  updateMarcacion
};