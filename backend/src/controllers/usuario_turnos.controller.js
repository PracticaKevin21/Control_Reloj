const usuarioTurnosService = require('../services/usuario_turnos.service');

/* =========================
   GET TODOS
========================= */
async function getUsuarioTurnos(req, res) {

  try {

    const rows = await usuarioTurnosService.getUsuarioTurnos(
      req.scope
    );

    return res.status(200).json({
      ok: true,
      total: rows.length,
      data: rows
    });

  } catch (error) {

    return res.status(500).json({
      ok: false,
      mensaje: error.message
    });
  }
}

/* =========================
   GET POR ID
========================= */
async function getUsuarioTurnoById(req, res) {

  try {

    const { id } = req.params;

    const row = await usuarioTurnosService.getUsuarioTurnoById(
      id,
      req.scope
    );

    return res.status(200).json({
      ok: true,
      data: row
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
async function createUsuarioTurno(req, res) {

  try {

    const result = await usuarioTurnosService.createUsuarioTurno(
      req.body,
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
async function updateUsuarioTurno(req, res) {

  try {

    const { id } = req.params;

    const result = await usuarioTurnosService.updateUsuarioTurno(
      id,
      req.body,
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
async function deleteUsuarioTurno(req, res) {

  try {

    const { id } = req.params;

    const result = await usuarioTurnosService.deleteUsuarioTurno(
      id,
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
  getUsuarioTurnos,
  getUsuarioTurnoById,
  createUsuarioTurno,
  updateUsuarioTurno,
  deleteUsuarioTurno
};