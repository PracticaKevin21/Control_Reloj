const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    ok: true,
    mensaje: 'Ruta turnos funcionando'
  });
});

module.exports = router;