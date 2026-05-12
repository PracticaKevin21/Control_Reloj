const token = localStorage.getItem("token");
const usuario = JSON.parse(localStorage.getItem("usuario"));

if (!token || !usuario) {
  window.location.href = "../login/login.html";
}

if (usuario.rol !== "SuperAdmin") {
  window.location.href = "../login/login.html";
}

const nombreUsuario = document.getElementById("nombreUsuario");
const rolUsuario = document.getElementById("rolUsuario");

const tablaMarcaciones = document.getElementById("tablaMarcaciones");
const mensajeEstado = document.getElementById("mensajeEstado");

const fechaFiltro = document.getElementById("fechaFiltro");
const estadoFiltro = document.getElementById("estadoFiltro");
const tipoFiltro = document.getElementById("tipoFiltro");

const totalMarcaciones = document.getElementById("totalMarcaciones");
const totalPendientes = document.getElementById("totalPendientes");
const totalTardanzas = document.getElementById("totalTardanzas");

const btnRecargar = document.getElementById("btnRecargar");
const btnLogout = document.getElementById("btnLogout");

let marcacionesOriginales = [];

nombreUsuario.textContent = `${usuario.nombres} ${usuario.apellidos}`;
rolUsuario.textContent = usuario.rol;

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
      mensajeEstado.textContent = data.mensaje || "No se pudo cargar información.";
      return;
    }

    const marcaciones = data.data || data.marcaciones || [];

    marcacionesOriginales = marcaciones.filter(
      (m) => Number(m.id_usuario) === Number(usuario.id_usuario)
    );

    renderizarMarcaciones(marcacionesOriginales);
    actualizarResumen(marcacionesOriginales);

    mensajeEstado.textContent = `Marcaciones encontradas: ${marcacionesOriginales.length}`;

  } catch (error) {
    mensajeEstado.textContent = "Error de conexión con el servidor.";
  }
}

function renderizarMarcaciones(lista) {
  tablaMarcaciones.innerHTML = "";

  if (lista.length === 0) {
    tablaMarcaciones.innerHTML = `
      <tr>
        <td colspan="6">No se encontraron registros.</td>
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
      <td>${m.origen || "-"}</td>
      <td>
        <span class="badge ${m.estado}">
          ${m.estado || "-"}
        </span>
      </td>
      <td>${m.observacion || "-"}</td>
    `;

    tablaMarcaciones.appendChild(fila);
  });
}

function actualizarResumen(lista) {
  totalMarcaciones.textContent = lista.length;

  totalPendientes.textContent = lista.filter(
    (m) => m.estado === "PENDIENTE"
  ).length;

  totalTardanzas.textContent = lista.filter(
    (m) => m.estado === "TARDANZA"
  ).length;
}

function filtrarMarcaciones() {
  const fecha = fechaFiltro.value;
  const estado = estadoFiltro.value;
  const tipo = tipoFiltro.value;

  const filtradas = marcacionesOriginales.filter((m) => {

    const coincideFecha = fecha ? m.fecha === fecha : true;
    const coincideEstado = estado ? m.estado === estado : true;
    const coincideTipo = tipo ? m.tipo === tipo : true;

    return coincideFecha && coincideEstado && coincideTipo;
  });

  renderizarMarcaciones(filtradas);
  actualizarResumen(filtradas);

  mensajeEstado.textContent = `Marcaciones mostradas: ${filtradas.length}`;
}

function formatearFecha(fecha) {
  if (!fecha) return "-";

  const fechaObj = new Date(fecha);

  if (isNaN(fechaObj.getTime())) {
    return fecha;
  }

  return fechaObj.toLocaleDateString("es-CL");
}

fechaFiltro.addEventListener("input", filtrarMarcaciones);

estadoFiltro.addEventListener("change", filtrarMarcaciones);

tipoFiltro.addEventListener("change", filtrarMarcaciones);

btnRecargar.addEventListener("click", cargarMarcaciones);

btnLogout.addEventListener("click", () => {
  localStorage.removeItem("token");
  localStorage.removeItem("usuario");

  window.location.href = "../login/login.html";
});

cargarMarcaciones();