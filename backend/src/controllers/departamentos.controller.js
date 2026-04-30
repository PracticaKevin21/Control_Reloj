const departamentosService = require('../services/departamentos.service');

async function getDepartamentos(req, res) {
  try {
    const departamentos = await departamentosService.getDepartamentos();

    return res.json({
      ok: true,
      departamentos
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al obtener departamentos',
      error: error.message
    });
  }
}

async function getDepartamentoById(req, res) {
  try {
    const { id } = req.params;
    const departamento = await departamentosService.getDepartamentoById(id);

    return res.json({
      ok: true,
      departamento
    });
  } catch (error) {
    return res.status(404).json({
      ok: false,
      mensaje: error.message
    });
  }
}

async function createDepartamento(req, res) {
  try {
    const result = await departamentosService.createDepartamento(req.body);

    return res.status(201).json({
      ok: true,
      mensaje: 'Departamento creado correctamente',
      id_departamento: result.id_departamento
    });
  } catch (error) {
    return res.status(400).json({
      ok: false,
      mensaje: error.message
    });
  }
}

async function updateDepartamento(req, res) {
  try {
    const { id } = req.params;

    await departamentosService.updateDepartamento(id, req.body);

    return res.json({
      ok: true,
      mensaje: 'Departamento actualizado correctamente'
    });
  } catch (error) {
    return res.status(400).json({
      ok: false,
      mensaje: error.message
    });
  }
}

async function deleteDepartamento(req, res) {
  try {
    const { id } = req.params;

    await departamentosService.deleteDepartamento(id);

    return res.json({
      ok: true,
      mensaje: 'Departamento eliminado correctamente'
    });
  } catch (error) {
    return res.status(400).json({
      ok: false,
      mensaje: error.message
    });
  }
}

module.exports = {
  getDepartamentos,
  getDepartamentoById,
  createDepartamento,
  updateDepartamento,
  deleteDepartamento
};