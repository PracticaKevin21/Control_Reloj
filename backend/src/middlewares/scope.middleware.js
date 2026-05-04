function applyScope(req, res, next) {
  try {
    const usuario = req.usuario;

    if (!usuario) {
      return res.status(401).json({
        ok: false,
        mensaje: 'Usuario no autenticado'
      });
    }

    const { rol, id_usuario, id_departamento_asignado, id_subdepartamento } = usuario;

    // 🔥 SuperAdmin → sin restricciones
    if (rol === 'SuperAdmin') {
      req.scope = { tipo: 'global' };
      return next();
    }

    // 🔵 Admin → por departamento
    if (rol === 'Administrador') {
      req.scope = {
        tipo: 'departamento',
        id_departamento: id_departamento_asignado
      };
      return next();
    }

    // 🟡 Jefatura → por subdepartamento
    if (rol === 'Jefatura') {
      req.scope = {
        tipo: 'subdepartamento',
        id_subdepartamento
      };
      return next();
    }

    // 🟣 Funcionario → solo él mismo
    if (rol === 'Funcionario') {
      req.scope = {
        tipo: 'propio',
        id_usuario
      };
      return next();
    }

    return res.status(403).json({
      ok: false,
      mensaje: 'Rol no reconocido'
    });

  } catch (error) {
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al aplicar scope'
    });
  }
}

module.exports = applyScope;