const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

const regexCorreoDEM = /^[a-zA-Z0-9._%+-]+@demovalle\.cl$/;

function selectUsuariosBase() {
  return `
    SELECT 
      u.id_usuario,
      u.rut,
      u.nombres,
      u.apellidos,
      u.correo,
      u.telefono,
      r.nombre AS rol,
      d.nombre AS departamento,
      sd.nombre AS subdepartamento,
      da.nombre AS departamento_asignado,
      u.id_rol,
      u.id_subdepartamento,
      u.id_departamento_asignado,
      u.estado,
      u.fecha_inicio,
      u.fecha_termino
    FROM usuarios u
    JOIN roles r ON u.id_rol = r.id_rol
    LEFT JOIN subdepartamentos sd ON u.id_subdepartamento = sd.id_subdepartamento
    LEFT JOIN departamentos d ON sd.id_departamento = d.id_departamento
    LEFT JOIN departamentos da ON u.id_departamento_asignado = da.id_departamento
  `;
}

function aplicarFiltroScope(scope) {
  if (!scope || scope.tipo === 'global') {
    return {
      where: '',
      params: []
    };
  }

  if (scope.tipo === 'departamento') {
    return {
      where: `
        WHERE 
          sd.id_departamento = ?
          OR u.id_departamento_asignado = ?
      `,
      params: [scope.id_departamento, scope.id_departamento]
    };
  }

  if (scope.tipo === 'subdepartamento') {
    return {
      where: 'WHERE u.id_subdepartamento = ?',
      params: [scope.id_subdepartamento]
    };
  }

  if (scope.tipo === 'propio') {
    return {
      where: 'WHERE u.id_usuario = ?',
      params: [scope.id_usuario]
    };
  }

  throw new Error('Scope inválido');
}

async function getRolById(id_rol) {
  const [rows] = await pool.query(
    'SELECT id_rol, nombre FROM roles WHERE id_rol = ?',
    [id_rol]
  );

  if (rows.length === 0) {
    throw new Error('El rol indicado no existe');
  }

  return rows[0];
}

async function validarSubdepartamento(id_subdepartamento) {
  const [rows] = await pool.query(
    `
    SELECT 
      sd.id_subdepartamento,
      sd.id_departamento
    FROM subdepartamentos sd
    WHERE sd.id_subdepartamento = ?
    `,
    [id_subdepartamento]
  );

  if (rows.length === 0) {
    throw new Error('El subdepartamento indicado no existe');
  }

  return rows[0];
}

async function validarDepartamento(id_departamento) {
  const [rows] = await pool.query(
    'SELECT id_departamento FROM departamentos WHERE id_departamento = ?',
    [id_departamento]
  );

  if (rows.length === 0) {
    throw new Error('El departamento indicado no existe');
  }

  return rows[0];
}

async function getUsuarioInterno(id_usuario) {
  const [rows] = await pool.query(
    `
    SELECT 
      u.*,
      r.nombre AS rol,
      sd.id_departamento
    FROM usuarios u
    JOIN roles r ON u.id_rol = r.id_rol
    LEFT JOIN subdepartamentos sd ON u.id_subdepartamento = sd.id_subdepartamento
    WHERE u.id_usuario = ?
    `,
    [id_usuario]
  );

  if (rows.length === 0) {
    throw new Error('Usuario no encontrado');
  }

  return rows[0];
}

function validarPermisoSobreUsuario(usuarioObjetivo, scope) {
  if (scope.tipo === 'global') return true;

  if (scope.tipo === 'departamento') {
    return (
      usuarioObjetivo.id_departamento === scope.id_departamento ||
      usuarioObjetivo.id_departamento_asignado === scope.id_departamento
    );
  }

  if (scope.tipo === 'subdepartamento') {
    return usuarioObjetivo.id_subdepartamento === scope.id_subdepartamento;
  }

  if (scope.tipo === 'propio') {
    return usuarioObjetivo.id_usuario === scope.id_usuario;
  }

  return false;
}

async function validarPermisoCrearOActualizar(data, usuarioActual, scope, esUpdate = false) {
  const rolDestino = await getRolById(data.id_rol);
  const rolActual = usuarioActual.rol;

  if (rolActual === 'SuperAdmin') {
    if (rolDestino.nombre === 'Administrador') {
      if (!data.id_departamento_asignado) {
        throw new Error('El Administrador requiere id_departamento_asignado');
      }

      await validarDepartamento(data.id_departamento_asignado);
    }

    if (rolDestino.nombre === 'Jefatura' || rolDestino.nombre === 'Funcionario') {
      if (!data.id_subdepartamento) {
        throw new Error('Este rol requiere id_subdepartamento');
      }

      await validarSubdepartamento(data.id_subdepartamento);
    }

    return;
  }

  if (rolActual === 'Administrador') {
    if (rolDestino.nombre === 'SuperAdmin' || rolDestino.nombre === 'Administrador') {
      throw new Error('Un Administrador no puede crear ni modificar usuarios Administrador o SuperAdmin');
    }

    if (!data.id_subdepartamento) {
      throw new Error('Debe indicar un subdepartamento del departamento asignado');
    }

    const subdepartamento = await validarSubdepartamento(data.id_subdepartamento);

    if (subdepartamento.id_departamento !== scope.id_departamento) {
      throw new Error('No puedes gestionar usuarios fuera de tu departamento');
    }

    data.id_departamento_asignado = null;
    return;
  }

  if (rolActual === 'Jefatura') {
    if (rolDestino.nombre !== 'Funcionario') {
      throw new Error('Jefatura solo puede gestionar Funcionarios');
    }

    if (!data.id_subdepartamento) {
      throw new Error('Debe indicar subdepartamento');
    }

    if (data.id_subdepartamento !== scope.id_subdepartamento) {
      throw new Error('No puedes gestionar usuarios fuera de tu subdepartamento');
    }

    data.id_departamento_asignado = null;
    return;
  }

  throw new Error('No tienes permisos para gestionar usuarios');
}

async function getUsuarios(scope) {
  const filtro = aplicarFiltroScope(scope);

  const [rows] = await pool.query(
    `
    ${selectUsuariosBase()}
    ${filtro.where}
    ORDER BY u.id_usuario ASC
    `,
    filtro.params
  );

  return rows;
}

async function getUsuarioById(id, scope) {
  const usuarioObjetivo = await getUsuarioInterno(id);

  if (!validarPermisoSobreUsuario(usuarioObjetivo, scope)) {
    throw new Error('No tienes permisos para ver este usuario');
  }

  const [rows] = await pool.query(
    `
    ${selectUsuariosBase()}
    WHERE u.id_usuario = ?
    `,
    [id]
  );

  return rows[0];
}

async function createUsuario(data, usuarioActual, scope) {
  const {
    rut,
    nombres,
    apellidos,
    correo,
    telefono,
    password,
    id_rol,
    id_subdepartamento,
    id_departamento_asignado,
    estado
  } = data;

  if (!rut || !nombres || !apellidos || !correo || !password || !id_rol) {
    throw new Error('Faltan campos obligatorios');
  }

  if (!regexCorreoDEM.test(correo)) {
    throw new Error('Correo inválido. Debe pertenecer al dominio @demovalle.cl');
  }

  const estadoFinal = estado || 'ACTIVO';

  if (estadoFinal !== 'ACTIVO' && estadoFinal !== 'INACTIVO') {
    throw new Error('Estado inválido. Debe ser ACTIVO o INACTIVO');
  }

  const [duplicado] = await pool.query(
    'SELECT id_usuario FROM usuarios WHERE correo = ? OR rut = ?',
    [correo, rut]
  );

  if (duplicado.length > 0) {
    throw new Error('Ya existe un usuario con ese correo o RUT');
  }

  const usuarioNuevo = {
    id_rol,
    id_subdepartamento: id_subdepartamento || null,
    id_departamento_asignado: id_departamento_asignado || null
  };

  await validarPermisoCrearOActualizar(usuarioNuevo, usuarioActual, scope);

  const passwordHash = await bcrypt.hash(password, 10);

  const [result] = await pool.query(
    `
    INSERT INTO usuarios
    (
      rut,
      nombres,
      apellidos,
      correo,
      telefono,
      password_hash,
      id_rol,
      id_subdepartamento,
      id_departamento_asignado,
      estado,
      fecha_inicio
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE())
    `,
    [
      rut,
      nombres,
      apellidos,
      correo,
      telefono || null,
      passwordHash,
      usuarioNuevo.id_rol,
      usuarioNuevo.id_subdepartamento,
      usuarioNuevo.id_departamento_asignado,
      estadoFinal
    ]
  );

  return {
    id_usuario: result.insertId
  };
}

async function updateUsuario(id, data, usuarioActual, scope) {
  const usuarioObjetivo = await getUsuarioInterno(id);

  if (!validarPermisoSobreUsuario(usuarioObjetivo, scope)) {
    throw new Error('No tienes permisos para modificar este usuario');
  }

  const {
    nombres,
    apellidos,
    correo,
    telefono,
    id_rol,
    id_subdepartamento,
    id_departamento_asignado,
    estado
  } = data;

  if (!nombres || !apellidos || !correo || !id_rol || !estado) {
    throw new Error('Faltan campos obligatorios');
  }

  if (!regexCorreoDEM.test(correo)) {
    throw new Error('Correo inválido. Debe pertenecer al dominio @demovalle.cl');
  }

  if (estado !== 'ACTIVO' && estado !== 'INACTIVO') {
    throw new Error('Estado inválido. Debe ser ACTIVO o INACTIVO');
  }

  const [correoDuplicado] = await pool.query(
    'SELECT id_usuario FROM usuarios WHERE correo = ? AND id_usuario <> ?',
    [correo, id]
  );

  if (correoDuplicado.length > 0) {
    throw new Error('Ya existe otro usuario con ese correo');
  }

  const usuarioActualizado = {
    id_rol,
    id_subdepartamento: id_subdepartamento || null,
    id_departamento_asignado: id_departamento_asignado || null
  };

  await validarPermisoCrearOActualizar(usuarioActualizado, usuarioActual, scope, true);

  await pool.query(
    `
    UPDATE usuarios
    SET 
      nombres = ?,
      apellidos = ?,
      correo = ?,
      telefono = ?,
      id_rol = ?,
      id_subdepartamento = ?,
      id_departamento_asignado = ?,
      estado = ?
    WHERE id_usuario = ?
    `,
    [
      nombres,
      apellidos,
      correo,
      telefono || null,
      usuarioActualizado.id_rol,
      usuarioActualizado.id_subdepartamento,
      usuarioActualizado.id_departamento_asignado,
      estado,
      id
    ]
  );
}

async function deleteUsuarioLogico(id, usuarioActual, scope) {
  const usuarioObjetivo = await getUsuarioInterno(id);

  if (!validarPermisoSobreUsuario(usuarioObjetivo, scope)) {
    throw new Error('No tienes permisos para desactivar este usuario');
  }

  if (usuarioActual.id_usuario === Number(id)) {
    throw new Error('No puedes desactivar tu propio usuario');
  }

  if (scope.tipo === 'departamento') {
    if (usuarioObjetivo.rol === 'SuperAdmin' || usuarioObjetivo.rol === 'Administrador') {
      throw new Error('Un Administrador no puede desactivar Administradores ni SuperAdmin');
    }
  }

  if (scope.tipo === 'subdepartamento') {
    if (usuarioObjetivo.rol !== 'Funcionario') {
      throw new Error('Jefatura solo puede desactivar Funcionarios');
    }
  }

  if (usuarioObjetivo.estado === 'INACTIVO') {
    throw new Error('El usuario ya está inactivo');
  }

  await pool.query(
    `
    UPDATE usuarios
    SET 
      estado = 'INACTIVO',
      fecha_termino = CURDATE()
    WHERE id_usuario = ?
    `,
    [id]
  );
}

module.exports = {
  getUsuarios,
  getUsuarioById,
  createUsuario,
  updateUsuario,
  deleteUsuarioLogico
};