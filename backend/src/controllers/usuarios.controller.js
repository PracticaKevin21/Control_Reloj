const usuariosService = require('../services/usuarios.service');

/* =========================
   GET TODOS
========================= */
async function getUsuarios(req, res) {
  try {
    const usuarios = await usuariosService.getUsuarios(req.scope);

    return res.status(200).json({
      ok: true,
      total: usuarios.length,
      data: usuarios
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al obtener usuarios',
      error: error.message
    });
  }
}

/* =========================
   GET POR ID
========================= */
async function getUsuarioById(req, res) {
  try {
    const { id } = req.params;

    const usuario = await usuariosService.getUsuarioById(id, req.scope);

    if (!usuario) {
      return res.status(404).json({
        ok: false,
        mensaje: 'Usuario no encontrado o sin permisos'
      });
    }

    return res.status(200).json({
      ok: true,
      data: usuario
    });
  } catch (error) {
    return res.status(404).json({
      ok: false,
      mensaje: error.message
    });
  }
}

/* =========================
   CREATE
========================= */
async function createUsuario(req, res) {
  try {
    const result = await usuariosService.createUsuario(
      req.body,
      req.usuario,
      req.scope
    );

    return res.status(201).json(result);
  } catch (error) {
    return res.status(400).json({
      ok: false,
      mensaje: error.message
    });
  }
}

/* =========================
   UPDATE
========================= */
async function updateUsuario(req, res) {
  try {
    const { id } = req.params;

    const result = await usuariosService.updateUsuario(
      id,
      req.body,
      req.usuario,
      req.scope
    );

    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({
      ok: false,
      mensaje: error.message
    });
  }
}

/* =========================
   DELETE LÓGICO
========================= */
async function deleteUsuarioLogico(req, res) {
  try {
    const { id } = req.params;

    const result = await usuariosService.deleteUsuarioLogico(
      id,
      req.usuario,
      req.scope
    );

    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({
      ok: false,
      mensaje: error.message
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