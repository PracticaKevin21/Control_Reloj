const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

/* =========================
   LOGIN
========================= */
async function login(correo, password) {
  const [rows] = await pool.query(
    `SELECT 
        u.id_usuario,
        u.nombres,
        u.apellidos,
        u.correo,
        u.password_hash,
        u.id_departamento_asignado,
        u.id_subdepartamento,
        r.nombre AS rol
     FROM usuarios u
     JOIN roles r ON u.id_rol = r.id_rol
     WHERE u.correo = ? AND u.estado = 'ACTIVO'`,
    [correo]
  );

  if (rows.length === 0) {
    throw new Error('Usuario no encontrado o inactivo');
  }

  const usuario = rows[0];

  const passwordValida = await bcrypt.compare(
    password,
    usuario.password_hash
  );

  if (!passwordValida) {
    throw new Error('Contraseña incorrecta');
  }

  // 🔥 PAYLOAD COMPLETO (CLAVE PARA PERMISOS)
  const payload = {
    id_usuario: usuario.id_usuario,
    correo: usuario.correo,
    rol: usuario.rol,
    id_departamento_asignado: usuario.id_departamento_asignado,
    id_subdepartamento: usuario.id_subdepartamento
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '8h'
  });

  return {
    ok: true,
    token,
    usuario: {
      id_usuario: usuario.id_usuario,
      nombres: usuario.nombres,
      apellidos: usuario.apellidos,
      correo: usuario.correo,
      rol: usuario.rol,
      id_departamento_asignado: usuario.id_departamento_asignado,
      id_subdepartamento: usuario.id_subdepartamento
    }
  };
}

/* =========================
   REGISTER
========================= */
async function register(data) {
  const {
    rut,
    nombres,
    apellidos,
    correo,
    password,
    id_rol,
    id_subdepartamento,
    id_departamento_asignado,
    telefono
  } = data;

  // Verificar duplicados
  const [existe] = await pool.query(
    'SELECT id_usuario FROM usuarios WHERE correo = ? OR rut = ?',
    [correo, rut]
  );

  if (existe.length > 0) {
    throw new Error('Ya existe un usuario con ese correo o rut');
  }

  // Verificar rol
  const [rolRows] = await pool.query(
    'SELECT nombre FROM roles WHERE id_rol = ?',
    [id_rol]
  );

  if (rolRows.length === 0) {
    throw new Error('El rol indicado no existe');
  }

  const rolNombre = rolRows[0].nombre;

  // 🔥 VALIDACIONES SEGÚN ROL

  // ADMIN → requiere departamento
  if (rolNombre === 'Administrador') {
    if (!id_departamento_asignado) {
      throw new Error('Administrador requiere id_departamento_asignado');
    }
  }

  // JEFATURA / FUNCIONARIO → requieren subdepartamento
  if (rolNombre === 'Jefatura' || rolNombre === 'Funcionario') {
    if (!id_subdepartamento) {
      throw new Error('Este rol requiere id_subdepartamento');
    }

    const [subExists] = await pool.query(
      'SELECT id_subdepartamento FROM subdepartamentos WHERE id_subdepartamento = ?',
      [id_subdepartamento]
    );

    if (subExists.length === 0) {
      throw new Error('El subdepartamento indicado no existe');
    }
  }

  // SUPERADMIN → no necesita nada
  if (rolNombre === 'SuperAdmin') {
    // sin validaciones adicionales
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  const [result] = await pool.query(
    `INSERT INTO usuarios 
     (rut, nombres, apellidos, correo, telefono, password_hash, id_rol, id_subdepartamento, id_departamento_asignado, estado, fecha_inicio)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVO', CURDATE())`,
    [
      rut,
      nombres,
      apellidos,
      correo,
      telefono || null,
      passwordHash,
      id_rol,
      id_subdepartamento || null,
      id_departamento_asignado || null
    ]
  );

  return {
    ok: true,
    mensaje: 'Usuario registrado correctamente',
    id_usuario: result.insertId
  };
}

module.exports = {
  login,
  register
};