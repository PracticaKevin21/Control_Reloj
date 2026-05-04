const { pool } = require('../config/db');

function selectSolicitudesBase() {
  return `
    SELECT 
      s.id_solicitud,
      s.id_usuario,
      CONCAT(u.nombres, ' ', u.apellidos) AS usuario,
      d.nombre AS departamento,
      sd.nombre AS subdepartamento,
      sd.id_departamento,
      u.id_subdepartamento,
      s.id_marcacion,
      s.motivo,
      s.estado,
      s.fecha_solicitud,
      s.revisado_por,
      CONCAT(r.nombres, ' ', r.apellidos) AS revisado_por_nombre,
      s.fecha_revision,
      s.comentario_revision
    FROM solicitudes s
    JOIN usuarios u ON s.id_usuario = u.id_usuario
    LEFT JOIN subdepartamentos sd ON u.id_subdepartamento = sd.id_subdepartamento
    LEFT JOIN departamentos d ON sd.id_departamento = d.id_departamento
    LEFT JOIN usuarios r ON s.revisado_por = r.id_usuario
  `;
}

function aplicarFiltroScope(scope, usarWhere = true) {
  const inicio = usarWhere ? 'WHERE' : 'AND';

  if (!scope || scope.tipo === 'global') {
    return { sql: '', params: [] };
  }

  if (scope.tipo === 'departamento') {
    return {
      sql: `${inicio} sd.id_departamento = ?`,
      params: [scope.id_departamento]
    };
  }

  if (scope.tipo === 'subdepartamento') {
    return {
      sql: `${inicio} u.id_subdepartamento = ?`,
      params: [scope.id_subdepartamento]
    };
  }

  if (scope.tipo === 'propio') {
    return {
      sql: `${inicio} s.id_usuario = ?`,
      params: [scope.id_usuario]
    };
  }

  throw new Error('Scope inválido');
}

async function getUsuarioConDepartamento(id_usuario) {
  const [rows] = await pool.query(
    `
    SELECT 
      u.id_usuario,
      u.estado,
      u.id_subdepartamento,
      sd.id_departamento
    FROM usuarios u
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

function validarPermisoSobreUsuario(usuario, scope) {
  if (!scope || scope.tipo === 'global') return true;

  if (scope.tipo === 'departamento') {
    return usuario.id_departamento === scope.id_departamento;
  }

  if (scope.tipo === 'subdepartamento') {
    return usuario.id_subdepartamento === scope.id_subdepartamento;
  }

  if (scope.tipo === 'propio') {
    return usuario.id_usuario === scope.id_usuario;
  }

  return false;
}

function validarPermisoRevisionSolicitud(solicitud, usuarioActual, scope) {
  if (
    usuarioActual.rol !== 'SuperAdmin' &&
    usuarioActual.rol !== 'Administrador' &&
    usuarioActual.rol !== 'Jefatura'
  ) {
    throw new Error('No tienes permisos para revisar solicitudes');
  }

  if (usuarioActual.id_usuario === solicitud.id_usuario) {
    throw new Error('No puedes revisar tu propia solicitud');
  }

  if (usuarioActual.rol === 'SuperAdmin') return true;

  if (usuarioActual.rol === 'Administrador') {
    if (scope.tipo !== 'departamento') {
      throw new Error('Administrador sin departamento asignado');
    }

    if (solicitud.id_departamento !== scope.id_departamento) {
      throw new Error('No puedes revisar solicitudes fuera de tu departamento');
    }

    return true;
  }

  if (usuarioActual.rol === 'Jefatura') {
    if (scope.tipo !== 'subdepartamento') {
      throw new Error('Jefatura sin subdepartamento asignado');
    }

    if (solicitud.id_subdepartamento !== scope.id_subdepartamento) {
      throw new Error('No puedes revisar solicitudes fuera de tu subdepartamento');
    }

    return true;
  }

  throw new Error('No tienes permisos para revisar esta solicitud');
}

async function getSolicitudes(scope) {
  const filtro = aplicarFiltroScope(scope);

  const [rows] = await pool.query(
    `
    ${selectSolicitudesBase()}
    ${filtro.sql}
    ORDER BY s.fecha_solicitud DESC
    `,
    filtro.params
  );

  return rows;
}

async function getSolicitudById(id, scope) {
  const filtro = aplicarFiltroScope(scope, false);

  const [rows] = await pool.query(
    `
    ${selectSolicitudesBase()}
    WHERE s.id_solicitud = ?
    ${filtro.sql}
    `,
    [id, ...filtro.params]
  );

  if (rows.length === 0) {
    throw new Error('Solicitud no encontrada o sin permisos');
  }

  return rows[0];
}

async function createSolicitud(data, usuarioActual, scope) {
  const { id_usuario, id_marcacion, motivo } = data;

  if (!id_marcacion || !motivo) {
    throw new Error('Faltan datos obligatorios');
  }

  let idUsuarioSolicitud = id_usuario;

  if (scope.tipo === 'propio') {
    idUsuarioSolicitud = usuarioActual.id_usuario;
  }

  if (!idUsuarioSolicitud) {
    throw new Error('Debe indicar el usuario de la solicitud');
  }

  const usuarioSolicitud = await getUsuarioConDepartamento(idUsuarioSolicitud);

  if (usuarioSolicitud.estado !== 'ACTIVO') {
    throw new Error('El usuario no está activo');
  }

  if (!validarPermisoSobreUsuario(usuarioSolicitud, scope)) {
    throw new Error('No tienes permisos para crear solicitudes de este usuario');
  }

  const [marcacionRows] = await pool.query(
    `SELECT id_marcacion, id_usuario FROM marcaciones WHERE id_marcacion = ?`,
    [id_marcacion]
  );

  if (marcacionRows.length === 0) {
    throw new Error('La marcación indicada no existe');
  }

  if (marcacionRows[0].id_usuario !== Number(idUsuarioSolicitud)) {
    throw new Error('La marcación no pertenece al usuario indicado');
  }

  const [result] = await pool.query(
    `
    INSERT INTO solicitudes
    (id_usuario, id_marcacion, motivo, estado)
    VALUES (?, ?, ?, 'PENDIENTE')
    `,
    [idUsuarioSolicitud, id_marcacion, motivo]
  );

  return { id: result.insertId };
}

async function updateSolicitud(id, data, usuarioActual, scope) {
  const { estado, comentario_revision } = data;

  if (!estado) throw new Error('Debe indicar estado');

  if (estado !== 'APROBADA' && estado !== 'RECHAZADA') {
    throw new Error('Estado inválido');
  }

  const solicitud = await getSolicitudById(id, scope);

  if (solicitud.estado !== 'PENDIENTE') {
    throw new Error('La solicitud ya fue revisada');
  }

  validarPermisoRevisionSolicitud(solicitud, usuarioActual, scope);

  const revisadoPor = usuarioActual.id_usuario;

  // 🔹 Actualiza solicitud
  await pool.query(
    `
    UPDATE solicitudes
    SET 
      estado = ?,
      revisado_por = ?,
      comentario_revision = ?,
      fecha_revision = NOW()
    WHERE id_solicitud = ?
    `,
    [estado, revisadoPor, comentario_revision || null, id]
  );

  // 🔥 NUEVO: actualizar marcación automáticamente
  if (estado === 'APROBADA') {
    await pool.query(
      `
      UPDATE marcaciones
      SET
        estado = 'NORMAL',
        requiere_aprobacion = 0,
        aprobado_por = ?,
        fecha_aprobacion = NOW()
      WHERE id_marcacion = ?
      `,
      [revisadoPor, solicitud.id_marcacion]
    );
  }
}

module.exports = {
  getSolicitudes,
  getSolicitudById,
  createSolicitud,
  updateSolicitud
};