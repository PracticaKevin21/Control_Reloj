const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

const regexCorreoDEM = /^[a-zA-Z0-9._%+-]+@demovalle\.cl$/;

// Obtener todos los usuarios
async function getUsuarios(req, res) {
  try {
    const [rows] = await pool.query(`
      SELECT 
        u.id_usuario,
        u.rut,
        u.nombres,
        u.apellidos,
        u.correo,
        u.telefono,
        r.nombre AS rol,
        d.nombre AS departamento,
        sd.nombre AS subdepartamento,
        u.estado,
        u.fecha_inicio
      FROM usuarios u
      JOIN roles r ON u.id_rol = r.id_rol
      JOIN subdepartamentos sd ON u.id_subdepartamento = sd.id_subdepartamento
      JOIN departamentos d ON sd.id_departamento = d.id_departamento
      ORDER BY u.id_usuario ASC
    `);

    return res.status(200).json({
      ok: true,
      usuarios: rows
    });
  } catch (error) {
    console.error('ERROR GET USUARIOS:', error);

    return res.status(500).json({
      ok: false,
      mensaje: 'Error al obtener usuarios',
      error: error.message
    });
  }
}

// Obtener usuario por ID
async function getUsuarioById(req, res) {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      `
      SELECT 
        u.id_usuario,
        u.rut,
        u.nombres,
        u.apellidos,
        u.correo,
        u.telefono,
        r.nombre AS rol,
        d.nombre AS departamento,
        sd.nombre AS subdepartamento,
        u.estado,
        u.fecha_inicio
      FROM usuarios u
      JOIN roles r ON u.id_rol = r.id_rol
      JOIN subdepartamentos sd ON u.id_subdepartamento = sd.id_subdepartamento
      JOIN departamentos d ON sd.id_departamento = d.id_departamento
      WHERE u.id_usuario = ?
      `,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        ok: false,
        mensaje: 'Usuario no encontrado'
      });
    }

    return res.status(200).json({
      ok: true,
      usuario: rows[0]
    });
  } catch (error) {
    console.error('ERROR GET USUARIO BY ID:', error);

    return res.status(500).json({
      ok: false,
      mensaje: 'Error al obtener usuario',
      error: error.message
    });
  }
}

// Crear usuario
async function createUsuario(req, res) {
  try {
    const {
      rut,
      nombres,
      apellidos,
      correo,
      telefono,
      password,
      id_rol,
      id_subdepartamento,
      estado
    } = req.body;

    if (!rut || !nombres || !apellidos || !correo || !password || !id_rol || !id_subdepartamento) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Faltan campos obligatorios'
      });
    }

    if (!regexCorreoDEM.test(correo)) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Correo inválido. Debe pertenecer al dominio @demovalle.cl'
      });
    }

    const estadoFinal = estado || 'ACTIVO';

    if (estadoFinal !== 'ACTIVO' && estadoFinal !== 'INACTIVO') {
      return res.status(400).json({
        ok: false,
        mensaje: 'Estado inválido. Debe ser ACTIVO o INACTIVO'
      });
    }

    const [correoExiste] = await pool.query(
      'SELECT id_usuario FROM usuarios WHERE correo = ?',
      [correo]
    );

    if (correoExiste.length > 0) {
      return res.status(400).json({
        ok: false,
        mensaje: 'El correo ya está en uso'
      });
    }

    const [rutExiste] = await pool.query(
      'SELECT id_usuario FROM usuarios WHERE rut = ?',
      [rut]
    );

    if (rutExiste.length > 0) {
      return res.status(400).json({
        ok: false,
        mensaje: 'El RUT ya está registrado'
      });
    }

    const [rolExiste] = await pool.query(
      'SELECT id_rol FROM roles WHERE id_rol = ?',
      [id_rol]
    );

    if (rolExiste.length === 0) {
      return res.status(400).json({
        ok: false,
        mensaje: 'El rol indicado no existe'
      });
    }

    const [subdepartamentoExiste] = await pool.query(
      'SELECT id_subdepartamento FROM subdepartamentos WHERE id_subdepartamento = ?',
      [id_subdepartamento]
    );

    if (subdepartamentoExiste.length === 0) {
      return res.status(400).json({
        ok: false,
        mensaje: 'El subdepartamento indicado no existe'
      });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      `
      INSERT INTO usuarios
      (rut, nombres, apellidos, correo, telefono, password_hash, id_rol, id_subdepartamento, estado, fecha_inicio)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE())
      `,
      [
        rut,
        nombres,
        apellidos,
        correo,
        telefono || null,
        password_hash,
        id_rol,
        id_subdepartamento,
        estadoFinal
      ]
    );

    return res.status(201).json({
      ok: true,
      mensaje: 'Usuario creado correctamente',
      id_usuario: result.insertId
    });
  } catch (error) {
    console.error('ERROR CREATE USUARIO:', error);

    return res.status(500).json({
      ok: false,
      mensaje: 'Error al crear usuario',
      error: error.message
    });
  }
}

// Actualizar usuario
async function updateUsuario(req, res) {
  try {
    const { id } = req.params;

    const {
      nombres,
      apellidos,
      correo,
      telefono,
      id_rol,
      id_subdepartamento,
      estado
    } = req.body;

    const [usuarioExiste] = await pool.query(
      'SELECT id_usuario FROM usuarios WHERE id_usuario = ?',
      [id]
    );

    if (usuarioExiste.length === 0) {
      return res.status(404).json({
        ok: false,
        mensaje: 'Usuario no encontrado'
      });
    }

    if (!nombres || !apellidos || !correo || !id_rol || !id_subdepartamento || !estado) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Faltan campos obligatorios'
      });
    }

    if (!regexCorreoDEM.test(correo)) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Correo inválido. Debe pertenecer al dominio @demovalle.cl'
      });
    }

    if (estado !== 'ACTIVO' && estado !== 'INACTIVO') {
      return res.status(400).json({
        ok: false,
        mensaje: 'Estado inválido. Debe ser ACTIVO o INACTIVO'
      });
    }

    const [rolExiste] = await pool.query(
      'SELECT id_rol FROM roles WHERE id_rol = ?',
      [id_rol]
    );

    if (rolExiste.length === 0) {
      return res.status(400).json({
        ok: false,
        mensaje: 'El rol indicado no existe'
      });
    }

    const [subdepartamentoExiste] = await pool.query(
      'SELECT id_subdepartamento FROM subdepartamentos WHERE id_subdepartamento = ?',
      [id_subdepartamento]
    );

    if (subdepartamentoExiste.length === 0) {
      return res.status(400).json({
        ok: false,
        mensaje: 'El subdepartamento indicado no existe'
      });
    }

    const [correoDuplicado] = await pool.query(
      'SELECT id_usuario FROM usuarios WHERE correo = ? AND id_usuario <> ?',
      [correo, id]
    );

    if (correoDuplicado.length > 0) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Ya existe otro usuario con ese correo'
      });
    }

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
        estado = ?
      WHERE id_usuario = ?
      `,
      [
        nombres,
        apellidos,
        correo,
        telefono || null,
        id_rol,
        id_subdepartamento,
        estado,
        id
      ]
    );

    return res.status(200).json({
      ok: true,
      mensaje: 'Usuario actualizado correctamente'
    });
  } catch (error) {
    console.error('ERROR UPDATE USUARIO:', error);

    return res.status(500).json({
      ok: false,
      mensaje: 'Error al actualizar usuario',
      error: error.message
    });
  }
}

// Desactivación lógica
async function deleteUsuarioLogico(req, res) {
  try {
    const { id } = req.params;

    const [usuarioExiste] = await pool.query(
      'SELECT id_usuario, estado FROM usuarios WHERE id_usuario = ?',
      [id]
    );

    if (usuarioExiste.length === 0) {
      return res.status(404).json({
        ok: false,
        mensaje: 'Usuario no encontrado'
      });
    }

    if (usuarioExiste[0].estado === 'INACTIVO') {
      return res.status(400).json({
        ok: false,
        mensaje: 'El usuario ya está inactivo'
      });
    }

    await pool.query(
      `
      UPDATE usuarios
      SET 
        estado = 'INACTIVO',
        fecha_termino = CURDATE()
      WHERE id_usuario = ?
      `,
      [id]
    );

    return res.status(200).json({
      ok: true,
      mensaje: 'Usuario desactivado correctamente'
    });
  } catch (error) {
    console.error('ERROR DELETE USUARIO LOGICO:', error);

    return res.status(500).json({
      ok: false,
      mensaje: 'Error al desactivar usuario',
      error: error.message
    });
  }
}

module.exports = {
  getUsuarios,
  getUsuarioById,
  createUsuario,
  updateUsuario,
  deleteUsuarioLogico
};