function checkRole(...rolesPermitidos) {
  return (req, res, next) => {
    try {
      if (!req.usuario) {
        return res.status(401).json({
          ok: false,
          mensaje: 'Usuario no autenticado'
        });
      }

      const rolUsuario = req.usuario.rol;

      if (!rolesPermitidos.includes(rolUsuario)) {
        return res.status(403).json({
          ok: false,
          mensaje: 'No tienes permisos para realizar esta acción'
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        ok: false,
        mensaje: 'Error al validar rol'
      });
    }
  };
}

module.exports = checkRole;