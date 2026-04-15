const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// LOGIN
async function login(correo, password) {
  try {
    const [rows] = await pool.query(
      `SELECT u.*, r.nombre AS rol
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

    const payload = {
      id_usuario: usuario.id_usuario,
      correo: usuario.correo,
      rol: usuario.rol
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
        rol: usuario.rol
      }
    };
  } catch (error) {
    throw error;
  }
}

// REGISTER (adaptado a tu BD)
async function register(data) {
  try {
    const { nombres, apellidos, correo, password, id_rol, id_area } = data;

    const passwordHash = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      `INSERT INTO usuarios 
       (rut, nombres, apellidos, correo, telefono, password_hash, id_rol, id_area, estado, fecha_inicio)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVO', CURDATE())`,
      [
        '11111111-1', // placeholder (puedes mejorar después)
        nombres,
        apellidos,
        correo,
        null,
        passwordHash,
        id_rol,
        id_area
      ]
    );

    return {
      ok: true,
      id_usuario: result.insertId
    };
  } catch (error) {
    throw error;
  }
}

module.exports = {
  login,
  register
};