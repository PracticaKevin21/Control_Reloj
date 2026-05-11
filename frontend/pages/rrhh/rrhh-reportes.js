const token = localStorage.getItem("token");
const usuario = JSON.parse(localStorage.getItem("usuario"));

if (!token || !usuario) {
  window.location.href = "../login/login.html";
}

if (usuario.rol !== "AdminRRHH") {
  window.location.href = "../login/login.html";
}

const nombreUsuario = document.getElementById("nombreUsuario");
const rolUsuario = document.getElementById("rolUsuario");

const usuarioSelect = document.getElementById("usuarioSelect");
const mesInput = document.getElementById("mesInput");

const formReporte = document.getElementById("formReporte");
const mensajeEstado = document.getElementById("mensajeEstado");

const tablaReportes = document.getElementById("tablaReportes");
const tablaMensaje = document.getElementById("tablaMensaje");

const totalReportes = document.getElementById("totalReportes");
const ultimoMes = document.getElementById("ultimoMes");

const btnLogout = document.getElementById("btnLogout");

let usuarios = [];
let reportes = [];

nombreUsuario.textContent = `${usuario.nombres} ${usuario.apellidos}`;
rolUsuario.textContent = usuario.rol;

async function cargarUsuarios() {
  try {
    const response = await fetch(`${API_URL}/usuarios`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      return;
    }

    usuarios = data.data || data.usuarios || [];

    usuarioSelect.innerHTML = `
      <option value="">Seleccione un funcionario</option>
    `;

    usuarios.forEach((u) => {
      usuarioSelect.innerHTML += `
        <option value="${u.id_usuario}">
          ${u.nombres} ${u.apellidos} - ${u.rol}
        </option>
      `;
    });

  } catch (error) {
    console.error(error);
  }
}

async function cargarReportes() {
  try {
    tablaMensaje.textContent = "Cargando reportes...";

    const response = await fetch(`${API_URL}/reportes`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      tablaMensaje.textContent = "No se pudieron cargar los reportes.";
      return;
    }

    reportes = data.data || data.reportes || [];

    renderizarReportes(reportes);

    totalReportes.textContent = reportes.length;

    if (reportes.length > 0) {
      ultimoMes.textContent = reportes[0].mes || "-";
    }

    tablaMensaje.textContent = `Reportes encontrados: ${reportes.length}`;

  } catch (error) {
    tablaMensaje.textContent = "Error de conexión.";
  }
}

function renderizarReportes(lista) {
  tablaReportes.innerHTML = "";

  if (lista.length === 0) {
    tablaReportes.innerHTML = `
      <tr>
        <td colspan="5">No existen reportes generados.</td>
      </tr>
    `;
    return;
  }

  lista.forEach((r) => {
    const fila = document.createElement("tr");

    fila.innerHTML = `
      <td>${r.usuario || "Funcionario"}</td>
      <td>${r.mes || "-"}</td>
      <td>${formatearFecha(r.fecha_generacion)}</td>
      <td>
        <span class="badge">
          GENERADO
        </span>
      </td>
      <td>
        <button class="btnDescargar" data-id="${r.id_reporte}">
          Descargar PDF
        </button>
      </td>
    `;

    tablaReportes.appendChild(fila);
  });

  document.querySelectorAll(".btnDescargar").forEach((btn) => {
    btn.addEventListener("click", () => {
      descargarPDF(btn.dataset.id);
    });
  });
}

async function generarReporte(e) {
  e.preventDefault();

  const id_usuario = usuarioSelect.value;
  const mes = mesInput.value;

  if (!id_usuario || !mes) {
    mensajeEstado.textContent = "Debe completar todos los campos.";
    return;
  }

  try {
    mensajeEstado.textContent = "Generando reporte PDF...";

    const response = await fetch(`${API_URL}/reportes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        id_usuario,
        mes
      })
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      mensajeEstado.textContent = data.mensaje || "No se pudo generar el reporte.";
      return;
    }

    mensajeEstado.textContent = "Reporte generado correctamente.";

    await cargarReportes();

  } catch (error) {
    mensajeEstado.textContent = "Error de conexión con el servidor.";
  }
}

function descargarPDF(idReporte) {
  window.open(
    `${API_URL}/reportes/${idReporte}/pdf?token=${token}`,
    "_blank"
  );
}

function formatearFecha(fecha) {
  if (!fecha) return "-";

  const fechaObj = new Date(fecha);

  if (isNaN(fechaObj.getTime())) {
    return fecha;
  }

  return fechaObj.toLocaleDateString("es-CL");
}

btnLogout.addEventListener("click", () => {
  localStorage.removeItem("token");
  localStorage.removeItem("usuario");

  window.location.href = "../login/login.html";
});

formReporte.addEventListener("submit", generarReporte);

cargarUsuarios();
cargarReportes();