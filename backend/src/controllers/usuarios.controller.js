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
      mensaje: 'Error al obtener usuarios',
      error: error.message
    });
  }
}

module.exports = {
  getUsuarios
};