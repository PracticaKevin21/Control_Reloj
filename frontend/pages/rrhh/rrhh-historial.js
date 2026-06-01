const token = localStorage.getItem("token");
const usuario = JSON.parse(localStorage.getItem("usuario"));

const nombreUsuario = document.getElementById("nombreUsuario");
const rolUsuario = document.getElementById("rolUsuario");
const tablaMarcaciones = document.getElementById("tablaMarcaciones");
const mensajeEstado = document.getElementById("mensajeEstado");

const buscarInput = document.getElementById("buscarInput");
const estadoFiltro = document.getElementById("estadoFiltro");
const btnRecargar = document.getElementById("btnRecargar");
const btnLogout = document.getElementById("btnLogout");

const totalMarcaciones = document.getElementById("totalMarcaciones");
const totalPendientes = document.getElementById("totalPendientes");
const totalTardanzas = document.getElementById("totalTardanzas");

let marcacionesOriginales = [];

if (!token || !usuario) {
  window.location.href = "../login/login.html";
}

if (usuario.rol !== "AdminRRHH") {
  window.location.href = "../login/login.html";
}

nombreUsuario.textContent = `${usuario.nombres} ${usuario.apellidos}`;
rolUsuario.textContent = usuario.rol;

async function cargarMarcaciones() {
  try {
    mensajeEstado.textContent = "Cargando información...";

    const response = await fetch(`${API_URL}/marcaciones`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      mensajeEstado.textContent = data.mensaje || "No se pudo cargar la información.";
      return;
    }

    marcacionesOriginales = data.data || data.marcaciones || [];

    renderizarMarcaciones(marcacionesOriginales);
    actualizarResumen(marcacionesOriginales);

    mensajeEstado.textContent = `Registros encontrados: ${marcacionesOriginales.length}`;

  } catch (error) {
    mensajeEstado.textContent = "Error de conexión con el servidor.";
  }
}

function renderizarMarcaciones(lista) {
  tablaMarcaciones.innerHTML = "";

  if (lista.length === 0) {
    tablaMarcaciones.innerHTML = `
      <tr>
        <td colspan="8">No se encontraron registros.</td>
      </tr>
    `;
    return;
  }

  lista.forEach((m) => {
    const fila = document.createElement("tr");

    fila.innerHTML = `
      <td>${m.usuario || "Sin nombre"}</td>
      <td>${m.departamento || "Sin departamento"}</td>
      <td>${m.subdepartamento || "Sin subdepartamento"}</td>
      <td>${formatearFecha(m.fecha)}</td>
      <td>${m.hora || "-"}</td>
      <td>${m.tipo || "-"}</td>
      <td>${m.origen || "-"}</td>
      <td>
        <span class="estado ${m.estado}">
          ${m.estado || "SIN ESTADO"}
        </span>
      </td>
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
  const texto = buscarInput.value.toLowerCase().trim();
  const estado = estadoFiltro.value;

  let filtradas = marcacionesOriginales.filter((m) => {
    const contenido = `
      ${m.usuario || ""}
      ${m.departamento || ""}
      ${m.subdepartamento || ""}
      ${m.estado || ""}
      ${m.tipo || ""}
    `.toLowerCase();

    const coincideTexto = contenido.includes(texto);
    const coincideEstado = estado ? m.estado === estado : true;

    return coincideTexto && coincideEstado;
  });

  renderizarMarcaciones(filtradas);
  actualizarResumen(filtradas);

  mensajeEstado.textContent = `Registros mostrados: ${filtradas.length}`;
}

function formatearFecha(fecha) {
  if (!fecha) return "-";

  const fechaObj = new Date(fecha);

  if (isNaN(fechaObj.getTime())) {
    return fecha;
  }

  return fechaObj.toLocaleDateString("es-CL");
}

buscarInput.addEventListener("input", filtrarMarcaciones);
estadoFiltro.addEventListener("change", filtrarMarcaciones);
btnRecargar.addEventListener("click", cargarMarcaciones);

btnLogout.addEventListener("click", () => {
  localStorage.removeItem("token");
  localStorage.removeItem("usuario");
  window.location.href = "../login/login.html";
});

cargarMarcaciones();
setInterval(cargarMarcaciones, 5000);