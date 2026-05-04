const { pool } = require('../config/db');

const origenesValidos = ['ANDROID', 'WEB', 'RELOJ', 'QR'];

const estadosValidos = [
  'NORMAL',
  'TARDANZA',
  'HORA_EXTRA',
  'FUERA_HORARIO',
  'INASISTENCIA',
  'PENDIENTE'
];

function selectMarcacionesBase() {
  return `
    SELECT 
      m.id_marcacion,
      m.id_usuario,
      CONCAT(u.nombres, ' ', u.apellidos) AS usuario,
      d.nombre AS departamento,
      sd.nombre AS subdepartamento,
      m.fecha,
      m.hora,
      m.tipo,
      m.origen,
      m.estado,
      m.observacion,
      m.ubicacion,
      m.requiere_aprobacion,
      m.aprobado_por,
      CONCAT(a.nombres, ' ', a.apellidos) AS aprobado_por_nombre,
      m.fecha_aprobacion
    FROM marcaciones m
    JOIN usuarios u ON m.id_usuario = u.id_usuario
    LEFT JOIN subdepartamentos sd ON u.id_subdepartamento = sd.id_subdepartamento
    LEFT JOIN departamentos d ON sd.id_departamento = d.id_departamento
    LEFT JOIN usuarios a ON m.aprobado_por = a.id_usuario
  `;
}

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
      sql: `${inicio} m.id_usuario = ?`,
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

// Obtener todas según alcance
async function getMarcaciones(scope) {
  const filtro = aplicarFiltroScope(scope);

  const [rows] = await pool.query(
    `
    ${selectMarcacionesBase()}
    ${filtro.sql}
    ORDER BY m.fecha DESC, m.hora DESC
    `,
    filtro.params
  );

  return rows;
}

// Obtener por ID según alcance
async function getMarcacionById(id, scope) {
  const filtro = aplicarFiltroScope(scope, false);

  const [rows] = await pool.query(
    `
    ${selectMarcacionesBase()}
    WHERE m.id_marcacion = ?
    ${filtro.sql}
    `,
    [id, ...filtro.params]
  );

  if (rows.length === 0) {
    throw new Error('Marcación no encontrada o sin permisos');
  }

  return rows[0];
}

// Crear marcación
async function createMarcacion(data, usuarioActual, scope) {
  const {
    id_usuario,
    tipo,
    origen,
    estado,
    observacion,
    ubicacion,
    requiere_aprobacion
  } = data;

  if (!tipo) {
    throw new Error('El tipo de marcación es obligatorio');
  }

  if (tipo !== 'ENTRADA' && tipo !== 'SALIDA') {
    throw new Error('Tipo inválido. Debe ser ENTRADA o SALIDA');
  }

  const origenFinal = origen || 'WEB';
  const estadoFinal = estado || 'NORMAL';

  if (!origenesValidos.includes(origenFinal)) {
    throw new Error('Origen inválido');
  }

  if (!estadosValidos.includes(estadoFinal)) {
    throw new Error('Estado inválido');
  }

  let idUsuarioMarcacion = id_usuario;

  // Funcionario siempre marca para sí mismo
  if (scope.tipo === 'propio') {
    idUsuarioMarcacion = usuarioActual.id_usuario;
  }

  if (!idUsuarioMarcacion) {
    throw new Error('Debe indicar el usuario de la marcación');
  }

  const usuarioMarcacion = await getUsuarioConDepartamento(idUsuarioMarcacion);

  if (usuarioMarcacion.estado !== 'ACTIVO') {
    throw new Error('El usuario no está activo');
  }

  if (!validarPermisoSobreUsuario(usuarioMarcacion, scope)) {
    throw new Error('No tienes permisos para registrar marcaciones de este usuario');
  }

  const [result] = await pool.query(
    `
    INSERT INTO marcaciones
    (
      id_usuario,
      fecha,
      hora,
      tipo,
      origen,
      estado,
      observacion,
      ubicacion,
      requiere_aprobacion
    )
    VALUES (?, CURDATE(), CURTIME(), ?, ?, ?, ?, ?, ?)
    `,
    [
      idUsuarioMarcacion,
      tipo,
      origenFinal,
      estadoFinal,
      observacion || null,
      ubicacion || null,
      requiere_aprobacion ? 1 : 0
    ]
  );

  return {
    id_marcacion: result.insertId
  };
}

// Actualizar marcación según alcance
async function updateMarcacion(id, data, scope) {
  await getMarcacionById(id, scope);

  const {
    estado,
    observacion,
    ubicacion,
    requiere_aprobacion,
    aprobado_por
  } = data;

  if (estado && !estadosValidos.includes(estado)) {
    throw new Error('Estado inválido');
  }

  if (aprobado_por) {
    const aprobador = await getUsuarioConDepartamento(aprobado_por);

    if (aprobador.estado !== 'ACTIVO') {
      throw new Error('El usuario aprobador no está activo');
    }
  }

  await pool.query(
    `
    UPDATE marcaciones
    SET
      estado = COALESCE(?, estado),
      observacion = COALESCE(?, observacion),
      ubicacion = COALESCE(?, ubicacion),
      requiere_aprobacion = COALESCE(?, requiere_aprobacion),
      aprobado_por = COALESCE(?, aprobado_por),
      fecha_aprobacion = CASE 
        WHEN ? IS NOT NULL THEN NOW()
        ELSE fecha_aprobacion
      END
    WHERE id_marcacion = ?
    `,
    [
      estado || null,
      observacion || null,
      ubicacion || null,
      requiere_aprobacion === undefined ? null : requiere_aprobacion ? 1 : 0,
      aprobado_por || null,
      aprobado_por || null,
      id
    ]
  );
}

module.exports = {
  getMarcaciones,
  getMarcacionById,
  createMarcacion,
  updateMarcacion
};