const bcrypt = require('bcryptjs');
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
      r.nombre AS rol,
      d.nombre AS departamento,
      s.nombre AS subdepartamento,
      u.estado,
      u.fecha_inicio,
      u.fecha_termino,
      u.id_rol,
      u.id_subdepartamento,
      u.id_departamento_asignado
    FROM usuarios u
    JOIN roles r ON u.id_rol = r.id_rol
    LEFT JOIN departamentos d
      ON u.id_departamento_asignado = d.id_departamento
    LEFT JOIN subdepartamentos s
      ON u.id_subdepartamento = s.id_subdepartamento
  `;

  const params = [];

  // GLOBAL
  if (scope.tipo === 'global') {
    query += `
      ORDER BY u.id_usuario ASC
    `;
  }

  // DEPARTAMENTO
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

  // SUBDEPARTAMENTO
  else if (scope.tipo === 'subdepartamento') {
    query += `
      WHERE u.id_subdepartamento = ?
      ORDER BY u.id_usuario ASC
    `;

    params.push(scope.id_subdepartamento);
  }

  // PROPIO
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
      r.nombre AS rol,
      d.nombre AS departamento,
      s.nombre AS subdepartamento,
      u.estado,
      u.fecha_inicio,
      u.fecha_termino,
      u.id_rol,
      u.id_subdepartamento,
      u.id_departamento_asignado
    FROM usuarios u
    JOIN roles r ON u.id_rol = r.id_rol
    LEFT JOIN departamentos d
      ON u.id_departamento_asignado = d.id_departamento
    LEFT JOIN subdepartamentos s
      ON u.id_subdepartamento = s.id_subdepartamento
    WHERE u.id_usuario = ?
  `;

  const params = [id];

  // DEPARTAMENTO
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

  // SUBDEPARTAMENTO
  else if (scope.tipo === 'subdepartamento') {
    query += `
      AND u.id_subdepartamento = ?
    `;

    params.push(scope.id_subdepartamento);
  }

  // PROPIO
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
  let {
    rut,
    nombres,
    apellidos,
    correo,
    telefono,
    password,
    password_hash,
    id_rol,
    id_subdepartamento,
    id_departamento_asignado,
    estado,
    fecha_inicio,
    fecha_termino
  } = data;

  /* =========================
     VALIDACIONES BÁSICAS
  ========================= */
  if (!rut || !nombres || !apellidos || !correo || !id_rol) {
    throw new Error('Faltan campos obligatorios');
  }

  if (!password && !password_hash) {
    throw new Error('La contraseña es obligatoria');
  }

  /* =========================
     GENERAR HASH
  ========================= */
  if (!password_hash) {
    password_hash = await bcrypt.hash(password, 10);
  }

  /* =========================
     VALORES POR DEFECTO
  ========================= */
  estado = estado || 'ACTIVO';
  fecha_inicio = fecha_inicio || new Date().toISOString().slice(0, 10);
  fecha_termino = fecha_termino || null;

  /* =========================
     VALIDAR DUPLICADOS
  ========================= */
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

  /* =========================
     OBTENER ROL
  ========================= */
  const [rolRows] = await pool.query(
    `
    SELECT nombre
    FROM roles
    WHERE id_rol = ?
    `,
    [id_rol]
  );

  if (rolRows.length === 0) {
    throw new Error('Rol no válido');
  }

  const rolNombre = rolRows[0].nombre;

  /* =========================
     REGLAS DE NEGOCIO
  ========================= */

  // Administrador requiere departamento
  if (rolNombre === 'Administrador') {
    if (!id_departamento_asignado) {
      throw new Error(
        'Para el rol Administrador es obligatorio asignar un departamento'
      );
    }

    // El subdepartamento es opcional para Administrador
    id_subdepartamento = id_subdepartamento || null;
  }

  // Funcionario y Jefatura requieren subdepartamento
  if (rolNombre === 'Funcionario' || rolNombre === 'Jefatura') {
    if (!id_subdepartamento) {
      throw new Error(
        `Para el rol ${rolNombre} es obligatorio asignar un subdepartamento`
      );
    }
  }

  /* =========================
     RESTRICCIONES POR ROL
  ========================= */

  // Administrador departamental
  if (usuarioAuth.rol === 'Administrador') {
    // No puede crear roles superiores ni otros administradores
    if (
      rolNombre === 'SuperAdmin' ||
      rolNombre === 'AdminRRHH' ||
      rolNombre === 'Administrador'
    ) {
      throw new Error('No tienes permisos para crear ese rol');
    }

    // Solo puede asignar usuarios a su departamento
    if (
      id_departamento_asignado &&
      Number(id_departamento_asignado) !==
        Number(usuarioAuth.id_departamento_asignado)
    ) {
      throw new Error('Solo puedes gestionar tu departamento');
    }
  }

  // Jefatura y Funcionario no pueden crear usuarios
  if (usuarioAuth.rol === 'Jefatura') {
    throw new Error('Jefatura no puede crear usuarios');
  }

  if (usuarioAuth.rol === 'Funcionario') {
    throw new Error('Funcionario no puede crear usuarios');
  }

  /* =========================
     INSERT
  ========================= */
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
      fecha_inicio,
      fecha_termino
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      id_departamento_asignado || null,
      estado,
      fecha_inicio,
      fecha_termino
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
      id_subdepartamento || null,
      id_departamento_asignado || null,
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