const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// LOGIN
async function login(email, password) {
  try {
    const [rows] = await db.query(
      'SELECT * FROM usuarios WHERE email = ? AND activo = 1',
      [email]
    );

    if (rows.length === 0) {
      throw new Error('Usuario no encontrado');
    }

    const usuario = rows[0];

    const passwordValida = await bcrypt.compare(password, usuario.password);

    if (!passwordValida) {
      throw new Error('Contraseña incorrecta');
    }

    const payload = {
      id: usuario.id_usuario,
      email: usuario.email,
      rol: usuario.rol || 'Usuario'
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: '8h'
    });

    return {
      ok: true,
      token,
      usuario: {
        id: usuario.id_usuario,
        email: usuario.email,
        rol: usuario.rol
      }
    };
  } catch (error) {
    throw error;
  }
}

// REGISTRO (básico)
async function register(data) {
  try {
    const { nombre, email, password, rol } = data;

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      'INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)',
      [nombre, email, hashedPassword, rol || 'Usuario']
    );

    return {
      ok: true,
      id: result.insertId
    };
  } catch (error) {
    throw error;
  }
}

module.exports = {
  login,
  register
};