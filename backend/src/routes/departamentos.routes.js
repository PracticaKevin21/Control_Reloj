const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    ok: true,
    mensaje: 'Ruta departamentos funcionando'
  });
});

module.exports = router;