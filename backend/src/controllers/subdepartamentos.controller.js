const subdepartamentosService = require('../services/subdepartamentos.service');

async function getSubdepartamentos(req, res) {
  try {
    const subdepartamentos = await subdepartamentosService.getSubdepartamentos();

    return res.json({
      ok: true,
      subdepartamentos
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al obtener subdepartamentos',
      error: error.message
    });
  }
}

async function getSubdepartamentoById(req, res) {
  try {
    const { id } = req.params;
    const subdepartamento = await subdepartamentosService.getSubdepartamentoById(id);

    return res.json({
      ok: true,
      subdepartamento
    });
  } catch (error) {
    return res.status(404).json({
      ok: false,
      mensaje: error.message
    });
  }
}

async function createSubdepartamento(req, res) {
  try {
    const result = await subdepartamentosService.createSubdepartamento(req.body);

    return res.status(201).json({
      ok: true,
      mensaje: 'Subdepartamento creado correctamente',
      id_subdepartamento: result.id_subdepartamento
    });
  } catch (error) {
    return res.status(400).json({
      ok: false,
      mensaje: error.message
    });
  }
}

async function updateSubdepartamento(req, res) {
  try {
    const { id } = req.params;

    await subdepartamentosService.updateSubdepartamento(id, req.body);

    return res.json({
      ok: true,
      mensaje: 'Subdepartamento actualizado correctamente'
    });
  } catch (error) {
    return res.status(400).json({
      ok: false,
      mensaje: error.message
    });
  }
}

async function deleteSubdepartamento(req, res) {
  try {
    const { id } = req.params;

    await subdepartamentosService.deleteSubdepartamento(id);

    return res.json({
      ok: true,
      mensaje: 'Subdepartamento eliminado correctamente'
    });
  } catch (error) {
    return res.status(400).json({
      ok: false,
      mensaje: error.message
    });
  }
}

module.exports = {
  getSubdepartamentos,
  getSubdepartamentoById,
  createSubdepartamento,
  updateSubdepartamento,
  deleteSubdepartamento
};