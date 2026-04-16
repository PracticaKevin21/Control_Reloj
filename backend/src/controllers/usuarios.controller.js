const { pool } = require('../config/db');

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

module.exports = {
  getUsuarios,
  getUsuarioById
};