/*
  salida-qr.js
  Genera un QR de SALIDA con el formato exacto que espera registrarSalida.php
  y el endpoint Node.js /api/v2/qr/salida.

  Formato del QR (JSON):
  {
    "id_usuario": 31,
    "tipo": "SALIDA",
    "token": "QR-31-1748736000000",
    "fecha": "2026-06-01T17:00:00.000Z"
  }
*/

// ── Elementos DOM ─────────────────────────────────────────────
const pasoId    = document.getElementById('paso-id');
const pasoQR    = document.getElementById('paso-qr');
const pasoExito = document.getElementById('paso-exito');

const inputIdUsuario   = document.getElementById('inputIdUsuario');
const btnGenerarQR     = document.getElementById('btnGenerarQR');
const errorId          = document.getElementById('errorId');

const displayIdUsuario = document.getElementById('displayIdUsuario');
const displayHora      = document.getElementById('displayHora');
const countdownBar     = document.getElementById('countdownBar');
const segsLeft         = document.getElementById('segsLeft');
const qrStatus         = document.getElementById('qrStatus');
const qrStatusText     = document.getElementById('qrStatusText');

const btnRenovar  = document.getElementById('btnRenovar');
const btnVolver   = document.getElementById('btnVolver');
const btnNuevoQR  = document.getElementById('btnNuevoQR');

// ── Estado ────────────────────────────────────────────────────
let qrInstance      = null;
let countdownInt    = null;
let pollingInt      = null;
let idUsuarioActual = null;
const QR_DURACION   = 30;

// ── Helpers ───────────────────────────────────────────────────
function mostrarPaso(paso) {
  [pasoId, pasoQR, pasoExito].forEach(p => p.classList.add('hidden'));
  paso.classList.remove('hidden');
}

function mostrarError(msg) {
  errorId.textContent = msg;
  errorId.classList.remove('hidden');
}

function ocultarError() {
  errorId.textContent = '';
  errorId.classList.add('hidden');
}

function formatHora(fecha) {
  return fecha.toLocaleTimeString('es-CL', {
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
}

// ── Payload del QR ────────────────────────────────────────────
function generarPayload(idUsuario) {
  const ahora = new Date();
  return JSON.stringify({
    id_usuario: idUsuario,
    tipo:       'SALIDA',
    token:      `QR-${idUsuario}-${ahora.getTime()}`,
    fecha:      ahora.toISOString()
  });
}

// ── Renderizar QR ─────────────────────────────────────────────
function renderizarQR(payload) {
  const contenedor = document.getElementById('qrcode');
  contenedor.innerHTML = '';
  qrInstance = new QRCode(contenedor, {
    text:         payload,
    width:        240,
    height:       240,
    colorDark:    '#1a1a2e',
    colorLight:   '#ffffff',
    correctLevel: QRCode.CorrectLevel.M
  });
}

// ── Countdown ─────────────────────────────────────────────────
function iniciarCountdown() {
  clearInterval(countdownInt);
  let segs = QR_DURACION;
  countdownBar.style.width = '100%';
  countdownBar.classList.remove('urgente');
  segsLeft.textContent = segs;
  qrStatus.className = 'qr-status activo';
  qrStatusText.textContent = 'QR activo — escanea ahora';

  countdownInt = setInterval(() => {
    segs--;
    countdownBar.style.width = `${(segs / QR_DURACION) * 100}%`;
    segsLeft.textContent = segs;

    if (segs <= 10) countdownBar.classList.add('urgente');

    if (segs <= 0) {
      clearInterval(countdownInt);
      qrStatus.className = 'qr-status expirado';
      qrStatusText.textContent = '⚠️ QR expirado — presiona Renovar';
      document.getElementById('qrcode').innerHTML = `
        <div class="qr-expired-msg">
          <span>⏱️</span>
          <p>QR expirado</p>
        </div>`;
    }
  }, 1000);
}

// ── Polling al backend para detectar si la APK registró ───────
function iniciarPolling(idUsuario) {
  clearInterval(pollingInt);
  pollingInt = setInterval(async () => {
    try {
      const hoy = new Date().toISOString().slice(0, 10);
      const res = await fetch(
        `${API_URL}/v2/qr/verificar-salida?id_usuario=${idUsuario}&fecha=${hoy}`
      );
      if (!res.ok) return;
      const data = await res.json();
      if (data.registrada) {
        clearInterval(pollingInt);
        clearInterval(countdownInt);
        mostrarPaso(pasoExito);
      }
    } catch (_) { /* ignorar errores de red */ }
  }, 3000);
}

// ── Generar QR completo ───────────────────────────────────────
function generarQR() {
  const id = parseInt(inputIdUsuario.value, 10);
  if (!id || id <= 0) {
    mostrarError('Ingresa un ID de usuario válido.');
    return;
  }
  ocultarError();
  idUsuarioActual = id;
  displayIdUsuario.textContent = id;
  displayHora.textContent = formatHora(new Date());
  renderizarQR(generarPayload(id));
  iniciarCountdown();
  iniciarPolling(id);
  mostrarPaso(pasoQR);
}

// ── Renovar QR ────────────────────────────────────────────────
function renovarQR() {
  if (!idUsuarioActual) return;
  displayHora.textContent = formatHora(new Date());
  renderizarQR(generarPayload(idUsuarioActual));
  iniciarCountdown();
}

// ── Volver al inicio ──────────────────────────────────────────
function volverAlInicio() {
  clearInterval(countdownInt);
  clearInterval(pollingInt);
  idUsuarioActual = null;
  inputIdUsuario.value = '';
  document.getElementById('qrcode').innerHTML = '';
  mostrarPaso(pasoId);
}

// ── Eventos ───────────────────────────────────────────────────
btnGenerarQR.addEventListener('click', generarQR);
inputIdUsuario.addEventListener('keydown', e => { if (e.key === 'Enter') generarQR(); });
btnRenovar.addEventListener('click', renovarQR);
btnVolver.addEventListener('click', volverAlInicio);
btnNuevoQR.addEventListener('click', volverAlInicio);