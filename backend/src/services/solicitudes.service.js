const { pool } = require('../config/db');

const estadosValidos = ['PENDIENTE', 'APROBADA', 'RECHAZADA'];

/* =========================
   SELECT BASE
========================= */
function selectSolicitudesBase() {
  return `
    SELECT
      s.id_solicitud,
      s.id_usuario,
      CONCAT(u.nombres, ' ', u.apellidos) AS usuario,
      u.correo,
      d.nombre AS departamento,
      sd.nombre AS subdepartamento,
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

/* =========================
   FILTRO POR SCOPE
========================= */
function aplicarFiltroScope(scope, usarWhere = true) {
  const inicio = usarWhere ? 'WHERE' : 'AND';

  if (!scope || scope.tipo === 'global') {
    return {
      sql: '',
      params: []
    };
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

/* =========================
   OBTENER USUARIO + DEPTO
========================= */
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

/* =========================
   VALIDAR PERMISO SOBRE USUARIO
========================= */
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

/* =========================
   LISTAR SOLICITUDES
========================= */
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

/* =========================
   OBTENER SOLICITUD POR ID
========================= */
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

/* =========================
   CREAR SOLICITUD
========================= */
async function createSolicitud(data, usuarioActual, scope) {
  const {
    id_usuario,
    id_marcacion,
    motivo
  } = data;

  if (!id_marcacion || !motivo) {
    throw new Error('Debe indicar id_marcacion y motivo');
  }

  let idUsuarioSolicitud = id_usuario;

  // Funcionario siempre crea solicitud propia
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

  // Validar que la marcación exista y pertenezca al usuario
  const [marcacionRows] = await pool.query(
    `
    SELECT id_marcacion, id_usuario
    FROM marcaciones
    WHERE id_marcacion = ?
    `,
    [id_marcacion]
  );

  if (marcacionRows.length === 0) {
    throw new Error('La marcación indicada no existe');
  }

  if (Number(marcacionRows[0].id_usuario) !== Number(idUsuarioSolicitud)) {
    throw new Error('La marcación no corresponde al usuario indicado');
  }

  // Evitar solicitudes duplicadas pendientes para la misma marcación
  const [duplicada] = await pool.query(
    `
    SELECT id_solicitud
    FROM solicitudes
    WHERE id_marcacion = ?
      AND estado = 'PENDIENTE'
    `,
    [id_marcacion]
  );

  if (duplicada.length > 0) {
    throw new Error('Ya existe una solicitud pendiente para esta marcación');
  }

  const [result] = await pool.query(
    `
    INSERT INTO solicitudes (
      id_usuario,
      id_marcacion,
      motivo,
      estado,
      fecha_solicitud
    )
    VALUES (?, ?, ?, 'PENDIENTE', NOW())
    `,
    [
      idUsuarioSolicitud,
      id_marcacion,
      motivo
    ]
  );

  return {
    id: result.insertId
  };
}

/* =========================
   REVISAR / ACTUALIZAR SOLICITUD
========================= */
async function updateSolicitud(id, data, usuarioActual, scope) {
  const {
    estado,
    comentario_revision
  } = data;

  if (!estado) {
    throw new Error('Debe indicar el estado de la solicitud');
  }

  if (!estadosValidos.includes(estado)) {
    throw new Error('Estado inválido');
  }

  if (estado === 'PENDIENTE') {
    throw new Error('No se puede revisar una solicitud dejándola como PENDIENTE');
  }

  const solicitud = await getSolicitudById(id, scope);

  if (!solicitud) {
    throw new Error('Solicitud no encontrada o sin permisos');
  }

  if (solicitud.estado !== 'PENDIENTE') {
    throw new Error('La solicitud ya fue revisada');
  }

  if (Number(solicitud.id_usuario) === Number(usuarioActual.id_usuario)) {
    throw new Error('No puedes revisar tu propia solicitud');
  }

  // Solo SuperAdmin y AdminRRHH revisan solicitudes globales.
  if (usuarioActual.rol !== 'SuperAdmin' && usuarioActual.rol !== 'AdminRRHH') {
    throw new Error('Solo SuperAdmin o AdminRRHH pueden revisar solicitudes');
  }

  await pool.query(
    `
    UPDATE solicitudes
    SET 
      estado = ?,
      revisado_por = ?,
      fecha_revision = NOW(),
      comentario_revision = ?
    WHERE id_solicitud = ?
    `,
    [
      estado,
      usuarioActual.id_usuario,
      comentario_revision || null,
      id
    ]
  );

  // Si la solicitud fue aprobada, actualizar la marcación relacionada como NORMAL.
  // Esto deja trazabilidad y marca la corrección como validada.
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
      [
        usuarioActual.id_usuario,
        solicitud.id_marcacion
      ]
    );
  }
}

module.exports = {
  getSolicitudes,
  getSolicitudById,
  createSolicitud,
  updateSolicitud
};