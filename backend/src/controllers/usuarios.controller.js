const usuariosService = require('../services/usuarios.service');

async function getUsuarios(req, res) {
  try {
    const usuarios = await usuariosService.getUsuarios(req.scope);

    return res.status(200).json({
      ok: true,
      usuarios
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al obtener usuarios',
      error: error.message
    });
  }
}

async function getUsuarioById(req, res) {
  try {
    const { id } = req.params;

    const usuario = await usuariosService.getUsuarioById(id, req.scope);

    return res.status(200).json({
      ok: true,
      usuario
    });
  } catch (error) {
    return res.status(404).json({
      ok: false,
      mensaje: error.message
    });
  }
}

async function createUsuario(req, res) {
  try {
    const result = await usuariosService.createUsuario(
      req.body,
      req.usuario,
      req.scope
    );

    return res.status(201).json({
      ok: true,
      mensaje: 'Usuario creado correctamente',
      id_usuario: result.id_usuario
    });
  } catch (error) {
    return res.status(400).json({
      ok: false,
      mensaje: error.message
    });
  }
}

async function updateUsuario(req, res) {
  try {
    const { id } = req.params;

    await usuariosService.updateUsuario(
      id,
      req.body,
      req.usuario,
      req.scope
    );

    return res.status(200).json({
      ok: true,
      mensaje: 'Usuario actualizado correctamente'
    });
  } catch (error) {
    return res.status(400).json({
      ok: false,
      mensaje: error.message
    });
  }
}

async function deleteUsuarioLogico(req, res) {
  try {
    const { id } = req.params;

    await usuariosService.deleteUsuarioLogico(id, req.usuario, req.scope);

    return res.status(200).json({
      ok: true,
      mensaje: 'Usuario desactivado correctamente'
    });
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