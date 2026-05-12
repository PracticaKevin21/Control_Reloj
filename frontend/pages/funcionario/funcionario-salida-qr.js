const token = localStorage.getItem("token");
const usuario = JSON.parse(localStorage.getItem("usuario"));

if (!token || !usuario) {
  window.location.href = "../login/login.html";
}

if (usuario.rol !== "Funcionario") {
  window.location.href = "../login/login.html";
}

const nombreUsuario = document.getElementById("nombreUsuario");
const rolUsuario = document.getElementById("rolUsuario");

const estadoActual = document.getElementById("estadoActual");
const ultimaSalida = document.getElementById("ultimaSalida");
const horaActualizacion = document.getElementById("horaActualizacion");

const usuarioQR = document.getElementById("usuarioQR");
const tokenQR = document.getElementById("tokenQR");

const tablaMarcaciones = document.getElementById("tablaMarcaciones");
const mensajeEstado = document.getElementById("mensajeEstado");

const btnActualizarQR = document.getElementById("btnActualizarQR");
const btnSimularEscaneo = document.getElementById("btnSimularEscaneo");
const btnLogout = document.getElementById("btnLogout");

let qrInstance = null;
let qrTokenActual = "";

nombreUsuario.textContent = `${usuario.nombres} ${usuario.apellidos}`;
rolUsuario.textContent = usuario.rol;

usuarioQR.textContent = `${usuario.nombres} ${usuario.apellidos}`;

function generarTokenQR() {
  return `
    QR-${usuario.id_usuario}-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 10)}
  `.replace(/\s+/g, "");
}

function generarQRCode() {

  qrTokenActual = generarTokenQR();

  tokenQR.textContent = qrTokenActual;

  horaActualizacion.textContent = new Date().toLocaleTimeString("es-CL");

  const qrContainer = document.getElementById("qrcode");

  qrContainer.innerHTML = "";

  qrInstance = new QRCode(qrContainer, {
    text: JSON.stringify({
      id_usuario: usuario.id_usuario,
      token: qrTokenActual,
      fecha: new Date().toISOString()
    }),
    width: 260,
    height: 260
  });
}

async function cargarMarcaciones() {

  try {

    mensajeEstado.textContent = "Cargando historial...";

    const response = await fetch(`${API_URL}/marcaciones`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      mensajeEstado.textContent = "No se pudo cargar historial.";
      return;
    }

    const marcaciones = data.data || data.marcaciones || [];

    const propias = marcaciones.filter(
      (m) => Number(m.id_usuario) === Number(usuario.id_usuario)
    );

    renderizarMarcaciones(propias);

    mensajeEstado.textContent = `Marcaciones encontradas: ${propias.length}`;

    if (propias.length > 0) {

      ultimaSalida.textContent = `
        ${formatearFecha(propias[0].fecha)}
        ${propias[0].hora || ""}
      `;
    }

  } catch (error) {

    mensajeEstado.textContent = "Error de conexión.";

  }

}

function renderizarMarcaciones(lista) {

  tablaMarcaciones.innerHTML = "";

  if (lista.length === 0) {

    tablaMarcaciones.innerHTML = `
      <tr>
        <td colspan="5">No existen marcaciones.</td>
      </tr>
    `;

    return;
  }

  lista.forEach((m) => {

    const fila = document.createElement("tr");

    fila.innerHTML = `
      <td>${formatearFecha(m.fecha)}</td>
      <td>${m.hora || "-"}</td>
      <td>${m.tipo || "-"}</td>
      <td>
        <span class="badge ${m.estado}">
          ${m.estado || "-"}
        </span>
      </td>
      <td>${m.origen || "-"}</td>
    `;

    tablaMarcaciones.appendChild(fila);

  });

}

async function simularEscaneoQR() {

  try {

    const response = await fetch(`${API_URL}/marcaciones`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        tipo: "SALIDA",
        origen: "QR",
        estado: "NORMAL",
        observacion: "Marcación mediante QR dinámico",
        token_qr: qrTokenActual
      })
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      alert(data.mensaje || "No se pudo registrar la salida.");
      return;
    }

    estadoActual.textContent = "SALIDA REGISTRADA";

    generarQRCode();

    await cargarMarcaciones();

    alert("Salida registrada correctamente.");

  } catch (error) {

    alert("Error de conexión con el servidor.");

  }

}

function formatearFecha(fecha) {

  if (!fecha) return "-";

  const fechaObj = new Date(fecha);

  if (isNaN(fechaObj.getTime())) {
    return fecha;
  }

  return fechaObj.toLocaleDateString("es-CL");

}

btnActualizarQR.addEventListener("click", generarQRCode);

btnSimularEscaneo.addEventListener("click", simularEscaneoQR);

btnLogout.addEventListener("click", () => {

  localStorage.removeItem("token");
  localStorage.removeItem("usuario");

  window.location.href = "../login/login.html";

});

generarQRCode();

cargarMarcaciones();