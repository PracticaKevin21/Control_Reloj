const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    ok: true,
    mensaje: 'Ruta solicitudes funcionando'
  });
});

module.exports = router;