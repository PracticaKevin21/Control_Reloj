const turnosService = require('../services/turnos.service');

async function getTurnos(req, res) {
  try {
    const turnos = await turnosService.getTurnos();

    return res.status(200).json({
      ok: true,
      turnos
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al obtener turnos',
      error: error.message
    });
  }
}

async function getTurnoById(req, res) {
  try {
    const { id } = req.params;

    const turno = await turnosService.getTurnoById(id);

    return res.status(200).json({
      ok: true,
      turno
    });
  } catch (error) {
    return res.status(404).json({
      ok: false,
      mensaje: error.message
    });
  }
}

async function createTurno(req, res) {
  try {
    const result = await turnosService.createTurno(req.body);

    return res.status(201).json({
      ok: true,
      mensaje: 'Turno creado correctamente',
      id_turno: result.id_turno
    });
  } catch (error) {
    return res.status(400).json({
      ok: false,
      mensaje: error.message
    });
  }
}

async function updateTurno(req, res) {
  try {
    const { id } = req.params;

    await turnosService.updateTurno(id, req.body);

    return res.status(200).json({
      ok: true,
      mensaje: 'Turno actualizado correctamente'
    });
  } catch (error) {
    return res.status(400).json({
      ok: false,
      mensaje: error.message
    });
  }
}

async function deleteTurno(req, res) {
  try {
    const { id } = req.params;

    await turnosService.deleteTurno(id);

    return res.status(200).json({
      ok: true,
      mensaje: 'Turno eliminado correctamente'
    });
  } catch (error) {
    return res.status(400).json({
      ok: false,
      mensaje: error.message
    });
  }
}

module.exports = {
  getTurnos,
  getTurnoById,
  createTurno,
  updateTurno,
  deleteTurno
};