const { pool } = require('../config/db');

/* =========================
   OBTENER USUARIOS
========================= */
async function getUsuarios(scope) {

  let query = `
    SELECT 
      u.id_usuario,
      u.rut,
      u.nombres,
      u.apellidos,
      u.correo,
      u.telefono,
      u.id_rol,
      u.id_subdepartamento,
      u.id_departamento_asignado,
      r.nombre AS rol,
      d.nombre AS departamento,
      s.nombre AS subdepartamento,
      u.estado,
      u.fecha_inicio
    FROM usuarios u
    JOIN roles r ON u.id_rol = r.id_rol
    LEFT JOIN departamentos d
      ON u.id_departamento_asignado = d.id_departamento
    LEFT JOIN subdepartamentos s
      ON u.id_subdepartamento = s.id_subdepartamento
  `;

  const params = [];

  if (scope.tipo === 'global') {
    query += ` ORDER BY u.id_usuario ASC`;
  }

  else if (scope.tipo === 'departamento') {
    query += `
      WHERE
        u.id_departamento_asignado = ?
        OR s.id_departamento = ?
      ORDER BY u.id_usuario ASC
    `;

    params.push(scope.id_departamento);
    params.push(scope.id_departamento);
  }

  else if (scope.tipo === 'subdepartamento') {
    query += `
      WHERE u.id_subdepartamento = ?
      ORDER BY u.id_usuario ASC
    `;

    params.push(scope.id_subdepartamento);
  }

  else if (scope.tipo === 'propio') {
    query += `
      WHERE u.id_usuario = ?
      ORDER BY u.id_usuario ASC
    `;

    params.push(scope.id_usuario);
  }

  const [rows] = await pool.query(query, params);

  return rows;
}

/* =========================
   OBTENER USUARIO POR ID
========================= */
async function getUsuarioById(id, scope) {

  let query = `
    SELECT
      u.id_usuario,
      u.rut,
      u.nombres,
      u.apellidos,
      u.correo,
      u.telefono,
      u.id_rol,
      u.id_subdepartamento,
      u.id_departamento_asignado,
      r.nombre AS rol,
      d.nombre AS departamento,
      s.nombre AS subdepartamento,
      u.estado,
      u.fecha_inicio
    FROM usuarios u
    JOIN roles r ON u.id_rol = r.id_rol
    LEFT JOIN departamentos d
      ON u.id_departamento_asignado = d.id_departamento
    LEFT JOIN subdepartamentos s
      ON u.id_subdepartamento = s.id_subdepartamento
    WHERE u.id_usuario = ?
  `;

  const params = [id];

  if (scope.tipo === 'departamento') {
    query += `
      AND (
        u.id_departamento_asignado = ?
        OR s.id_departamento = ?
      )
    `;

    params.push(scope.id_departamento);
    params.push(scope.id_departamento);
  }

  else if (scope.tipo === 'subdepartamento') {
    query += `
      AND u.id_subdepartamento = ?
    `;

    params.push(scope.id_subdepartamento);
  }

  else if (scope.tipo === 'propio') {
    query += `
      AND u.id_usuario = ?
    `;

    params.push(scope.id_usuario);
  }

  const [rows] = await pool.query(query, params);

  return rows[0];
}

/* =========================
   CREAR USUARIO
========================= */
async function createUsuario(data, usuarioAuth) {

  const {
    rut,
    nombres,
    apellidos,
    correo,
    telefono,
    password_hash,
    id_rol,
    id_subdepartamento,
    id_departamento_asignado
  } = data;

  const [exists] = await pool.query(
    `
    SELECT id_usuario
    FROM usuarios
    WHERE rut = ? OR correo = ?
    `,
    [rut, correo]
  );

  if (exists.length > 0) {
    throw new Error('Ya existe un usuario con ese rut o correo');
  }

  const [rolRows] = await pool.query(
    `SELECT nombre FROM roles WHERE id_rol = ?`,
    [id_rol]
  );

  if (rolRows.length === 0) {
    throw new Error('Rol no válido');
  }

  const rolNombre = rolRows[0].nombre;

  if (usuarioAuth.rol === 'Administrador') {

    if (
      rolNombre === 'SuperAdmin' ||
      rolNombre === 'AdminRRHH' ||
      rolNombre === 'Administrador'
    ) {
      throw new Error('No tienes permisos para crear ese rol');
    }

    if (id_departamento_asignado) {
      if (
        Number(id_departamento_asignado) !==
        Number(usuarioAuth.id_departamento_asignado)
      ) {
        throw new Error('Solo puedes gestionar tu departamento');
      }
    }
  }

  if (usuarioAuth.rol === 'Jefatura') {
    throw new Error('Jefatura no puede crear usuarios');
  }

  if (usuarioAuth.rol === 'Funcionario') {
    throw new Error('Funcionario no puede crear usuarios');
  }

  const [result] = await pool.query(
    `
    INSERT INTO usuarios (
      rut,
      nombres,
      apellidos,
      correo,
      telefono,
      password_hash,
      id_rol,
      id_subdepartamento,
      id_departamento_asignado,
      estado,
      fecha_inicio
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVO', CURDATE())
    `,
    [
      rut,
      nombres,
      apellidos,
      correo,
      telefono || null,
      password_hash,
      id_rol,
      id_subdepartamento || null,
      id_departamento_asignado || null
    ]
  );

  return {
    ok: true,
    mensaje: 'Usuario creado correctamente',
    id_usuario: result.insertId
  };
}

/* =========================
   ACTUALIZAR USUARIO
========================= */
async function updateUsuario(id, data) {

  const [rows] = await pool.query(
    `
    SELECT
      id_subdepartamento,
      id_departamento_asignado
    FROM usuarios
    WHERE id_usuario = ?
    `,
    [id]
  );

  if (rows.length === 0) {
    throw new Error('Usuario no encontrado');
  }

  const usuarioActual = rows[0];

  const {
    nombres,
    apellidos,
    correo,
    telefono,
    id_rol,
    id_subdepartamento,
    id_departamento_asignado,
    estado
  } = data;

  const subdepartamentoFinal =
    id_subdepartamento !== undefined
      ? id_subdepartamento
      : usuarioActual.id_subdepartamento;

  const departamentoFinal =
    id_departamento_asignado !== undefined
      ? id_departamento_asignado
      : usuarioActual.id_departamento_asignado;

  await pool.query(
    `
    UPDATE usuarios
    SET
      nombres = ?,
      apellidos = ?,
      correo = ?,
      telefono = ?,
      id_rol = ?,
      id_subdepartamento = ?,
      id_departamento_asignado = ?,
      estado = ?
    WHERE id_usuario = ?
    `,
    [
      nombres,
      apellidos,
      correo,
      telefono,
      id_rol,
      subdepartamentoFinal,
      departamentoFinal,
      estado,
      id
    ]
  );

  return {
    ok: true,
    mensaje: 'Usuario actualizado correctamente'
  };
}

/* =========================
   ELIMINACIÓN LÓGICA
========================= */
async function deleteUsuarioLogico(id) {

  await pool.query(
    `
    UPDATE usuarios
    SET estado = 'INACTIVO'
    WHERE id_usuario = ?
    `,
    [id]
  );

  return {
    ok: true,
    mensaje: 'Usuario desactivado correctamente'
  };
}

module.exports = {
  getUsuarios,
  getUsuarioById,
  createUsuario,
  updateUsuario,
  deleteUsuarioLogico
};