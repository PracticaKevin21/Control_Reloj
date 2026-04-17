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
        a.nombre AS area,
        u.estado,
        u.fecha_inicio
      FROM usuarios u
      JOIN roles r ON u.id_rol = r.id_rol
      JOIN areas a ON u.id_area = a.id_area
      ORDER BY u.id_usuario ASC
    `);

    return res.status(200).json({
      ok: true,
      usuarios: rows
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al obtener usuarios'
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
        a.nombre AS area,
        u.estado,
        u.fecha_inicio
      FROM usuarios u
      JOIN roles r ON u.id_rol = r.id_rol
      JOIN areas a ON u.id_area = a.id_area
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
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al obtener usuario'
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
      id_area,
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

    if (!nombres || !apellidos || !correo || !id_rol || !id_area || !estado) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Faltan campos obligatorios para actualizar'
      });
    }

    if (!regexCorreoDEM.test(correo)) {
      return res.status(400).json({
        ok: false,
        mensaje: 'El correo debe pertenecer al dominio @demovalle.cl'
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
      `UPDATE usuarios
       SET nombres = ?, apellidos = ?, correo = ?, telefono = ?, id_rol = ?, id_area = ?, estado = ?
       WHERE id_usuario = ?`,
      [
        nombres,
        apellidos,
        correo,
        telefono || null,
        id_rol,
        id_area,
        estado,
        id
      ]
    );

    return res.status(200).json({
      ok: true,
      mensaje: 'Usuario actualizado correctamente'
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al actualizar usuario'
    });
  }
}

module.exports = {
  getUsuarios,
  getUsuarioById,
  updateUsuario
};