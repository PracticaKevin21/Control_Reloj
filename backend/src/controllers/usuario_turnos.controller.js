const usuarioTurnosService = require('../services/usuario_turnos.service');

async function getUsuarioTurnos(req, res) {
  try {
    const data = await usuarioTurnosService.getUsuarioTurnos();

    return res.json({
      ok: true,
      usuario_turnos: data
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al obtener asignaciones'
    });
  }
}

async function getUsuarioTurnoById(req, res) {
  try {
    const { id } = req.params;

    const data = await usuarioTurnosService.getUsuarioTurnoById(id);

    return res.json({
      ok: true,
      usuario_turno: data
    });
  } catch (error) {
    return res.status(404).json({
      ok: false,
      mensaje: error.message
    });
  }
}

async function createUsuarioTurno(req, res) {
  try {
    const result = await usuarioTurnosService.createUsuarioTurno(req.body);

    return res.status(201).json({
      ok: true,
      mensaje: 'Turno asignado correctamente',
      id_usuario_turno: result.id
    });
  } catch (error) {
    return res.status(400).json({
      ok: false,
      mensaje: error.message
    });
  }
}

async function updateUsuarioTurno(req, res) {
  try {
    const { id } = req.params;

    await usuarioTurnosService.updateUsuarioTurno(id, req.body);

    return res.json({
      ok: true,
      mensaje: 'Asignación actualizada'
    });
  } catch (error) {
    return res.status(400).json({
      ok: false,
      mensaje: error.message
    });
  }
}

async function deleteUsuarioTurno(req, res) {
  try {
    const { id } = req.params;

    await usuarioTurnosService.deleteUsuarioTurno(id);

    return res.json({
      ok: true,
      mensaje: 'Asignación desactivada'
    });
  } catch (error) {
    return res.status(400).json({
      ok: false,
      mensaje: error.message
    });
  }
}

module.exports = {
  getUsuarioTurnos,
  getUsuarioTurnoById,
  createUsuarioTurno,
  updateUsuarioTurno,
  deleteUsuarioTurno
};