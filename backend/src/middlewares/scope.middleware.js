function applyScope(req, res, next) {
  try {
    const usuario = req.usuario;

    if (!usuario) {
      return res.status(401).json({
        ok: false,
        mensaje: 'Usuario no autenticado'
      });
    }

    const {
      rol,
      id_usuario,
      id_departamento_asignado,
      id_subdepartamento
    } = usuario;

    // SuperAdmin y AdminRRHH: acceso global al sistema.
    if (rol === 'SuperAdmin' || rol === 'AdminRRHH') {
      req.scope = { tipo: 'global' };
      return next();
    }

    // Administrador: solo su departamento asignado.
    if (rol === 'Administrador') {
      if (!id_departamento_asignado) {
        return res.status(403).json({
          ok: false,
          mensaje: 'Administrador sin departamento asignado'
        });
      }

      req.scope = {
        tipo: 'departamento',
        id_departamento: id_departamento_asignado
      };
      return next();
    }

    // Jefatura: solo su subdepartamento asignado.
    if (rol === 'Jefatura') {
      if (!id_subdepartamento) {
        return res.status(403).json({
          ok: false,
          mensaje: 'Jefatura sin subdepartamento asignado'
        });
      }

      req.scope = {
        tipo: 'subdepartamento',
        id_subdepartamento
      };
      return next();
    }

    // Funcionario: solo su información propia.
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