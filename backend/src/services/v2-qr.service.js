const { pool } = require('../config/db');

const QR_MAX_EDAD_SEG    = 30;
const HORA_MINIMA_SALIDA = '10:00:00';

// ── Registrar salida vía QR ───────────────────────────────────
async function registrarSalidaQR(idUsuario, qrContenido) {

  // 1. Verificar horario permitido
  const horaActual = obtenerHoraActual();
  if (horaActual < HORA_MINIMA_SALIDA) {
    throw new Error(
      `Las salidas solo se registran a partir de las 14:00. Hora actual: ${horaActual}.`
    );
  }

  // 2. Parsear el JSON del QR
  let dataQR;
  try {
    dataQR = JSON.parse(qrContenido);
  } catch (_) {
    throw new Error('El QR escaneado tiene un formato incorrecto.');
  }

  // 3. Validar campos del QR
  if (!dataQR.id_usuario || !dataQR.fecha || !dataQR.tipo || !dataQR.token) {
    throw new Error('El QR está incompleto. Faltan campos requeridos.');
  }

  if (dataQR.tipo !== 'SALIDA') {
    throw new Error('El QR escaneado no corresponde a una marcación de SALIDA.');
  }

  // 4. Verificar que el QR pertenece al usuario logueado en la APK
  if (parseInt(dataQR.id_usuario, 10) !== idUsuario) {
    throw new Error('El QR fue generado por otro funcionario. No puedes usar el QR de otra persona.');
  }

  // 5. Verificar expiración (30 segundos)
  const fechaQR       = new Date(dataQR.fecha);
  const ahora         = new Date();
  const diferenciaSeg = (ahora.getTime() - fechaQR.getTime()) / 1000;

  if (diferenciaSeg > QR_MAX_EDAD_SEG || diferenciaSeg < -10) {
    throw new Error('El QR ha expirado. Solicita al funcionario que genere uno nuevo.');
  }

  // 6. Verificar que el usuario existe y está activo
  const [usuarioRows] = await pool.query(
    'SELECT id_usuario, estado FROM usuarios WHERE id_usuario = ?',
    [idUsuario]
  );

  if (usuarioRows.length === 0) {
    throw new Error(`No existe ningún funcionario con ID ${idUsuario}.`);
  }

  if (usuarioRows[0].estado !== 'ACTIVO') {
    throw new Error(`El funcionario ID ${idUsuario} no está activo en el sistema.`);
  }

  // 7. Verificar que no haya salida registrada hoy
  const fechaHoy = obtenerFechaHoy();
  const [salidaRows] = await pool.query(
    `SELECT id_marcacion
     FROM v2_marcaciones
     WHERE id_usuario = ?
       AND tipo = 'SALIDA'
       AND DATE(fecha_hora) = ?`,
    [idUsuario, fechaHoy]
  );

  if (salidaRows.length > 0) {
    throw new Error(`El funcionario ID ${idUsuario} ya tiene registrada una salida para hoy.`);
  }

  // 8. Insertar en v2_marcaciones
  const [result] = await pool.query(
    `INSERT INTO v2_marcaciones
       (id_usuario, tipo, metodo_validacion, fecha_hora, latitud, longitud, estado, observacion)
     VALUES (?, 'SALIDA', 'QR', NOW(), 0.0, 0.0, 'VALIDA', 'Registrada vía QR web + APK Android')`,
    [idUsuario]
  );

  return {
    id_marcacion: result.insertId,
    id_usuario:   idUsuario,
    tipo:         'SALIDA',
    metodo:       'QR',
    fecha_hora:   new Date().toISOString()
  };
}

// ── Verificar si ya existe salida hoy ────────────────────────
async function verificarSalidaHoy(idUsuario, fecha) {
  const fechaConsulta = fecha || obtenerFechaHoy();

  const [rows] = await pool.query(
    `SELECT id_marcacion
     FROM v2_marcaciones
     WHERE id_usuario = ?
       AND tipo = 'SALIDA'
       AND DATE(fecha_hora) = ?
     LIMIT 1`,
    [idUsuario, fechaConsulta]
  );

  return rows.length > 0;
}

// ── Obtener turno del usuario ─────────────────────────────────
async function getTurnoUsuario(idUsuario) {
  const [rows] = await pool.query(
    `SELECT
       t.id_turno,
       t.nombre,
       t.hora_entrada,
       t.hora_salida,
       t.tolerancia_minutos,
       t.estado AS estado_turno,
       ut.created_at AS asignado_el
     FROM v2_usuario_turnos ut
     JOIN v2_turnos t ON ut.id_turno = t.id_turno
     WHERE ut.id_usuario = ?
       AND t.estado = 'ACTIVO'
     ORDER BY ut.created_at DESC
     LIMIT 1`,
    [idUsuario]
  );

  if (rows.length === 0) {
    throw new Error(`El funcionario ID ${idUsuario} no tiene un turno asignado.`);
  }

  return rows[0];
}

// ── Estado completo del día ───────────────────────────────────
async function getEstadoMarcacionHoy(idUsuario) {
  const fechaHoy = obtenerFechaHoy();

  const [marcaciones] = await pool.query(
    `SELECT id_marcacion, tipo, metodo_validacion, fecha_hora, estado, observacion
     FROM v2_marcaciones
     WHERE id_usuario = ?
       AND DATE(fecha_hora) = ?
     ORDER BY fecha_hora ASC`,
    [idUsuario, fechaHoy]
  );

  const entrada = marcaciones.find(m => m.tipo === 'ENTRADA') || null;
  const salida  = marcaciones.find(m => m.tipo === 'SALIDA')  || null;

  let turno = null;
  try { turno = await getTurnoUsuario(idUsuario); } catch (_) {}

  const [excepciones] = await pool.query(
    `SELECT id, estado, hora_inicio, hora_fin, observacion
     FROM v2_asistencia_excepciones
     WHERE id_usuario = ? AND fecha = ?
     LIMIT 1`,
    [idUsuario, fechaHoy]
  );

  return {
    id_usuario: idUsuario,
    fecha:      fechaHoy,
    turno,
    entrada,
    salida,
    excepcion:  excepciones[0] || null,
    resumen: {
      tiene_entrada:   !!entrada,
      tiene_salida:    !!salida,
      tiene_excepcion: excepciones.length > 0
    }
  };
}

// ── Helpers internos ──────────────────────────────────────────
function obtenerFechaHoy() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });
}

function obtenerHoraActual() {
  return new Date().toLocaleTimeString('es-CL', {
    timeZone: 'America/Santiago',
    hour12:   false,
    hour:     '2-digit',
    minute:   '2-digit',
    second:   '2-digit'
  });
}

module.exports = {
  registrarSalidaQR,
  verificarSalidaHoy,
  getTurnoUsuario,
  getEstadoMarcacionHoy
};