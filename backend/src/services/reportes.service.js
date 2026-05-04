const { pool } = require('../config/db');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const tiposValidos = ['DIARIO', 'SEMANAL', 'MENSUAL', 'PERSONALIZADO'];

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
      sql: `${inicio} r.id_usuario = ?`,
      params: [scope.id_usuario]
    };
  }

  throw new Error('Scope inválido');
}

async function validarUsuarioEnScope(id_usuario, scope) {
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
    throw new Error('Usuario no existe');
  }

  const usuario = rows[0];

  if (usuario.estado !== 'ACTIVO') {
    throw new Error('El usuario está inactivo');
  }

  if (!scope || scope.tipo === 'global') {
    return usuario;
  }

  if (scope.tipo === 'departamento') {
    if (usuario.id_departamento !== scope.id_departamento) {
      throw new Error('No puedes generar reportes fuera de tu departamento');
    }
  }

  if (scope.tipo === 'subdepartamento') {
    if (usuario.id_subdepartamento !== scope.id_subdepartamento) {
      throw new Error('No puedes generar reportes fuera de tu subdepartamento');
    }
  }

  if (scope.tipo === 'propio') {
    if (usuario.id_usuario !== scope.id_usuario) {
      throw new Error('No puedes generar reportes de otros usuarios');
    }
  }

  return usuario;
}

async function getReportes(scope) {
  const filtro = aplicarFiltroScope(scope);

  const [rows] = await pool.query(
    `
    SELECT 
      r.id_reporte,
      r.id_usuario,
      CONCAT(u.nombres, ' ', u.apellidos) AS usuario,
      CONCAT(g.nombres, ' ', g.apellidos) AS generado_por,
      r.tipo,
      r.fecha_desde,
      r.fecha_hasta,
      r.total_marcaciones,
      r.total_atrasos,
      r.total_horas_extra_minutos,
      r.total_inasistencias,
      r.total_solicitudes,
      r.observacion,
      r.archivo_pdf,
      r.fecha_generacion,
      sd.id_departamento,
      u.id_subdepartamento
    FROM reportes r
    JOIN usuarios u ON r.id_usuario = u.id_usuario
    LEFT JOIN subdepartamentos sd ON u.id_subdepartamento = sd.id_subdepartamento
    JOIN usuarios g ON r.generado_por = g.id_usuario
    ${filtro.sql}
    ORDER BY r.fecha_generacion DESC
    `,
    filtro.params
  );

  return rows;
}

async function getReporteById(id, scope) {
  const filtro = aplicarFiltroScope(scope, false);

  const [rows] = await pool.query(
    `
    SELECT 
      r.*,
      CONCAT(u.nombres, ' ', u.apellidos) AS usuario,
      CONCAT(g.nombres, ' ', g.apellidos) AS generado_por_nombre,
      sd.id_departamento,
      u.id_subdepartamento
    FROM reportes r
    JOIN usuarios u ON r.id_usuario = u.id_usuario
    LEFT JOIN subdepartamentos sd ON u.id_subdepartamento = sd.id_subdepartamento
    JOIN usuarios g ON r.generado_por = g.id_usuario
    WHERE r.id_reporte = ?
    ${filtro.sql}
    `,
    [id, ...filtro.params]
  );

  if (rows.length === 0) {
    throw new Error('Reporte no encontrado o sin permisos');
  }

  return rows[0];
}

async function crearPdfReporte(data, archivoPdf) {
  const rutaCompleta = path.join(__dirname, '../../', archivoPdf);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(rutaCompleta);

    doc.pipe(stream);

    doc.fontSize(20).text('REPORTE DE ASISTENCIA', { align: 'center' });

    doc.moveDown(1);

    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();

    doc.moveDown(1.5);

    doc.fontSize(12);
    doc.text(`Usuario: ${data.usuario}`);
    doc.text(`Generado por: ${data.generado_por}`);
    doc.text(`Tipo: ${data.tipo}`);
    doc.text(`Periodo: ${data.fecha_desde} al ${data.fecha_hasta}`);

    doc.moveDown(1.5);

    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();

    doc.moveDown(1.5);

    doc.fontSize(14).text('RESUMEN', { underline: true });
    doc.moveDown(0.5);

    doc.fontSize(12);
    doc.text(`Total marcaciones: ${data.total_marcaciones}`);
    doc.text(`Total atrasos: ${data.total_atrasos}`);
    doc.text(`Total horas extra: ${data.total_horas_extra_minutos}`);
    doc.text(`Total inasistencias: ${data.total_inasistencias}`);
    doc.text(`Total solicitudes: ${data.total_solicitudes}`);

    doc.moveDown(1.5);

    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();

    doc.moveDown(1.5);

    doc.fontSize(14).text('OBSERVACIÓN', { underline: true });
    doc.moveDown(0.5);

    doc.fontSize(12).text(data.observacion || 'Sin observación', {
      align: 'justify'
    });

    doc.moveDown(2);

    const fechaActual = new Date().toLocaleString();

    doc.fontSize(10).text(`Generado el: ${fechaActual}`, {
      align: 'right'
    });

    doc.end();

    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

async function createReporte(data, usuarioActual, scope) {
  const {
    id_usuario,
    tipo,
    fecha_desde,
    fecha_hasta,
    observacion
  } = data;

  if (!id_usuario || !tipo || !fecha_desde || !fecha_hasta) {
    throw new Error('Faltan campos obligatorios');
  }

  if (!tiposValidos.includes(tipo)) {
    throw new Error('Tipo de reporte inválido');
  }

  await validarUsuarioEnScope(Number(id_usuario), scope);

  const [usuarioRows] = await pool.query(
    `
    SELECT nombres, apellidos
    FROM usuarios
    WHERE id_usuario = ?
    `,
    [id_usuario]
  );

  const [generadorRows] = await pool.query(
    `
    SELECT nombres, apellidos
    FROM usuarios
    WHERE id_usuario = ?
    `,
    [usuarioActual.id_usuario]
  );

  if (usuarioRows.length === 0) {
    throw new Error('Usuario no encontrado');
  }

  if (generadorRows.length === 0) {
    throw new Error('Usuario generador no encontrado');
  }

  const usuarioNombre = `${usuarioRows[0].nombres} ${usuarioRows[0].apellidos}`;
  const generadoPorNombre = `${generadorRows[0].nombres} ${generadorRows[0].apellidos}`;

  const [[marcaciones]] = await pool.query(
    `
    SELECT COUNT(*) AS total
    FROM marcaciones
    WHERE id_usuario = ?
    AND fecha BETWEEN ? AND ?
    `,
    [id_usuario, fecha_desde, fecha_hasta]
  );

  const [[atrasos]] = await pool.query(
    `
    SELECT COUNT(*) AS total
    FROM marcaciones
    WHERE id_usuario = ?
    AND estado = 'TARDANZA'
    AND fecha BETWEEN ? AND ?
    `,
    [id_usuario, fecha_desde, fecha_hasta]
  );

  const [[horasExtra]] = await pool.query(
    `
    SELECT COUNT(*) AS total
    FROM marcaciones
    WHERE id_usuario = ?
    AND estado = 'HORA_EXTRA'
    AND fecha BETWEEN ? AND ?
    `,
    [id_usuario, fecha_desde, fecha_hasta]
  );

  const [[inasistencias]] = await pool.query(
    `
    SELECT COUNT(*) AS total
    FROM marcaciones
    WHERE id_usuario = ?
    AND estado = 'INASISTENCIA'
    AND fecha BETWEEN ? AND ?
    `,
    [id_usuario, fecha_desde, fecha_hasta]
  );

  const [[solicitudes]] = await pool.query(
    `
    SELECT COUNT(*) AS total
    FROM solicitudes
    WHERE id_usuario = ?
    AND DATE(fecha_solicitud) BETWEEN ? AND ?
    `,
    [id_usuario, fecha_desde, fecha_hasta]
  );

  const archivoPdf = `reportes/reporte_usuario_${id_usuario}_${Date.now()}.pdf`;

  await crearPdfReporte(
    {
      usuario: usuarioNombre,
      generado_por: generadoPorNombre,
      tipo,
      fecha_desde,
      fecha_hasta,
      total_marcaciones: marcaciones.total,
      total_atrasos: atrasos.total,
      total_horas_extra_minutos: horasExtra.total,
      total_inasistencias: inasistencias.total,
      total_solicitudes: solicitudes.total,
      observacion
    },
    archivoPdf
  );

  const [result] = await pool.query(
    `
    INSERT INTO reportes (
      id_usuario,
      generado_por,
      tipo,
      fecha_desde,
      fecha_hasta,
      total_marcaciones,
      total_atrasos,
      total_horas_extra_minutos,
      total_inasistencias,
      total_solicitudes,
      observacion,
      archivo_pdf
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      id_usuario,
      usuarioActual.id_usuario,
      tipo,
      fecha_desde,
      fecha_hasta,
      marcaciones.total,
      atrasos.total,
      horasExtra.total,
      inasistencias.total,
      solicitudes.total,
      observacion || null,
      archivoPdf
    ]
  );

  return {
    id_reporte: result.insertId,
    archivo_pdf: archivoPdf
  };
}

async function updateReporte(id, data, scope) {
  await getReporteById(id, scope);

  const { observacion } = data;

  await pool.query(
    `
    UPDATE reportes
    SET observacion = ?
    WHERE id_reporte = ?
    `,
    [observacion || null, id]
  );
}

async function getReportePdfPath(id, scope) {
  const reporte = await getReporteById(id, scope);
  return path.join(__dirname, '../../', reporte.archivo_pdf);
}

module.exports = {
  getReportes,
  getReporteById,
  createReporte,
  updateReporte,
  getReportePdfPath
};