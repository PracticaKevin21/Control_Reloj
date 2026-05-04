const express = require('express');
const router = express.Router();

const verifyToken = require('../middlewares/auth.middleware');
const checkRole = require('../middlewares/role.middleware');
const departamentosController = require('../controllers/departamentos.controller');

router.get('/', verifyToken, departamentosController.getDepartamentos);

router.get('/:id', verifyToken, departamentosController.getDepartamentoById);

router.post(
  '/',
  verifyToken,
  checkRole('SuperAdmin', 'Administrador'),
  departamentosController.createDepartamento
);

router.put(
  '/:id',
  verifyToken,
  checkRole('SuperAdmin', 'Administrador'),
  departamentosController.updateDepartamento
);

router.delete(
  '/:id',
  verifyToken,
  checkRole('SuperAdmin', 'Administrador'),
  departamentosController.deleteDepartamento
);

module.exports = router;