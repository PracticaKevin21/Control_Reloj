const jwt = require('jsonwebtoken');
require('dotenv').config();

function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        ok: false,
        mensaje: 'Acceso denegado. No se proporcionó token.'
      });
    }

    const parts = authHeader.split(' ');

    if (parts.length !== 2) {
      return res.status(401).json({
        ok: false,
        mensaje: 'Formato de token inválido.'
      });
    }

    const [scheme, token] = parts;

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({
        ok: false,
        mensaje: 'Token inválido.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.usuario = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      ok: false,
      mensaje: 'Token expirado o inválido.',
      error: error.message
    });
  }
}

module.exports = verifyToken;