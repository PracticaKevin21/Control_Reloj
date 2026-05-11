const { pool } = require('../config/db');

/* =========================
   SELECT BASE
========================= */
function selectUsuarioTurnosBase() {
  return `
    SELECT
      ut.id_usuario_turno,
      ut.id_usuario,
      CONCAT(u.nombres, ' ', u.apellidos) AS usuario,
      r.nombre AS rol,
      d.nombre AS departamento,
      sd.nombre AS subdepartamento,
      ut.id_turno,
      t.nombre AS turno,
      t.hora_entrada,
      t.hora_salida,
      t.tolerancia_minutos,
      t.minutos_colacion,
      ut.fecha_inicio,
      ut.fecha_termino,
      ut.estado
    FROM usuario_turnos ut
    JOIN usuarios u ON ut.id_usuario = u.id_usuario
    JOIN roles r ON u.id_rol = r.id_rol
    JOIN turnos t ON ut.id_turno = t.id_turno
    LEFT JOIN subdepartamentos sd 
      ON u.id_subdepartamento = sd.id_subdepartamento
    LEFT JOIN departamentos d 
      ON sd.id_departamento = d.id_departamento
  `;
}

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
      sql: `${inicio} ut.id_usuario = ?`,
      params: [scope.id_usuario]
    };
  }

  throw new Error('Scope inválido');
}

/* =========================
   OBTENER USUARIO
========================= */
async function getUsuarioConDepartamento(id_usuario) {
  const [rows] = await pool.query(
    `
    SELECT
      u.id_usuario,
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
   GET TODOS
========================= */
async function getUsuarioTurnos(scope) {
  const filtro = aplicarFiltroScope(scope);

  const [rows] = await pool.query(
    `
    ${selectUsuarioTurnosBase()}
    ${filtro.sql}
    ORDER BY ut.id_usuario_turno DESC
    `,
    filtro.params
  );

  return rows;
}

/* =========================
   GET POR ID
========================= */
async function getUsuarioTurnoById(id, scope) {
  const filtro = aplicarFiltroScope(scope, false);

  const [rows] = await pool.query(
    `
    ${selectUsuarioTurnosBase()}
    WHERE ut.id_usuario_turno = ?
    ${filtro.sql}
    `,
    [id, ...filtro.params]
  );

  if (rows.length === 0) {
    throw new Error('Asignación no encontrada o sin permisos');
  }

  return rows[0];
}

/* =========================
   CREATE
========================= */
async function createUsuarioTurno(data, scope) {
  const {
    id_usuario,
    id_turno,
    fecha_inicio,
    fecha_termino
  } = data;

  if (!id_usuario || !id_turno || !fecha_inicio) {
    throw new Error('Faltan campos obligatorios');
  }

  const usuario = await getUsuarioConDepartamento(id_usuario);

  if (usuario.estado !== 'ACTIVO') {
    throw new Error('El usuario no está activo');
  }

  if (!validarPermisoSobreUsuario(usuario, scope)) {
    throw new Error('No tienes permisos sobre este usuario');
  }

  const [turnoRows] = await pool.query(
    `
    SELECT id_turno
    FROM turnos
    WHERE id_turno = ?
    `,
    [id_turno]
  );

  if (turnoRows.length === 0) {
    throw new Error('El turno indicado no existe');
  }

  const [duplicado] = await pool.query(
    `
    SELECT id_usuario_turno
    FROM usuario_turnos
    WHERE id_usuario = ?
      AND estado = 'ACTIVO'
    `,
    [id_usuario]
  );

  if (duplicado.length > 0) {
    throw new Error('El usuario ya posee un turno activo');
  }

  const [result] = await pool.query(
    `
    INSERT INTO usuario_turnos (
      id_usuario,
      id_turno,
      fecha_inicio,
      fecha_termino,
      estado
    )
    VALUES (?, ?, ?, ?, 'ACTIVO')
    `,
    [
      id_usuario,
      id_turno,
      fecha_inicio,
      fecha_termino || null
    ]
  );

  return {
    ok: true,
    mensaje: 'Turno asignado correctamente',
    id_usuario_turno: result.insertId
  };
}

/* =========================
   UPDATE
========================= */
async function updateUsuarioTurno(id, data, scope) {
  await getUsuarioTurnoById(id, scope);

  const {
    id_turno,
    fecha_inicio,
    fecha_termino,
    estado
  } = data;

  if (estado && estado !== 'ACTIVO' && estado !== 'FINALIZADO') {
    throw new Error('Estado inválido. Debe ser ACTIVO o FINALIZADO');
  }

  if (id_turno) {
    const [turnoRows] = await pool.query(
      `
      SELECT id_turno
      FROM turnos
      WHERE id_turno = ?
      `,
      [id_turno]
    );

    if (turnoRows.length === 0) {
      throw new Error('El turno indicado no existe');
    }
  }

  await pool.query(
    `
    UPDATE usuario_turnos
    SET
      id_turno = COALESCE(?, id_turno),
      fecha_inicio = COALESCE(?, fecha_inicio),
      fecha_termino = ?,
      estado = COALESCE(?, estado)
    WHERE id_usuario_turno = ?
    `,
    [
      id_turno || null,
      fecha_inicio || null,
      fecha_termino || null,
      estado || null,
      id
    ]
  );

  return {
    ok: true,
    mensaje: 'Asignación actualizada'
  };
}

/* =========================
   DELETE LÓGICO
========================= */
async function deleteUsuarioTurno(id, scope) {
  await getUsuarioTurnoById(id, scope);

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

  return {
    ok: true,
    mensaje: 'Asignación desactivada'
  };
}

module.exports = {
  getUsuarioTurnos,
  getUsuarioTurnoById,
  createUsuarioTurno,
  updateUsuarioTurno,
  deleteUsuarioTurno
};