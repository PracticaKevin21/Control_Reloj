const express = require('express');
const router = express.Router();

const verifyToken = require('../middlewares/auth.middleware');
const checkRole = require('../middlewares/role.middleware');
const subdepartamentosController = require('../controllers/subdepartamentos.controller');

router.get('/', verifyToken, subdepartamentosController.getSubdepartamentos);

router.get('/:id', verifyToken, subdepartamentosController.getSubdepartamentoById);

router.post(
  '/',
  verifyToken,
  checkRole('SuperAdmin', 'Administrador'),
  subdepartamentosController.createSubdepartamento
);

router.put(
  '/:id',
  verifyToken,
  checkRole('SuperAdmin', 'Administrador'),
  subdepartamentosController.updateSubdepartamento
);

router.delete(
  '/:id',
  verifyToken,
  checkRole('SuperAdmin', 'Administrador'),
  subdepartamentosController.deleteSubdepartamento
);

module.exports = router;