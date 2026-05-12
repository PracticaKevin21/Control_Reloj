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

/* ==========================================
   CONFIGURAR MES ACTUAL
========================================== */
function configurarMesActual() {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");

  mesInput.value = `${anio}-${mes}`;
}

/* ==========================================
   CONVERTIR YYYY-MM A FECHAS DEL MES
========================================== */
function obtenerRangoMes(valorMes) {
  const [anio, mes] = valorMes.split("-").map(Number);

  const fechaDesde = `${anio}-${String(mes).padStart(2, "0")}-01`;

  const ultimoDia = new Date(anio, mes, 0).getDate();

  const fechaHasta =
    `${anio}-${String(mes).padStart(2, "0")}-${String(ultimoDia).padStart(2, "0")}`;

  return {
    fecha_desde: fechaDesde,
    fecha_hasta: fechaHasta
  };
}

/* ==========================================
   CARGAR SOLO FUNCIONARIOS ACTIVOS
========================================== */
async function cargarUsuarios() {
  try {
    const response = await fetch(`${API_URL}/usuarios`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      mensajeEstado.textContent =
        "No se pudieron cargar los funcionarios.";
      return;
    }

    const todos = data.data || data.usuarios || [];

    usuarios = todos.filter(
      (u) =>
        u.rol &&
        u.rol.toLowerCase() === "funcionario" &&
        u.estado === "ACTIVO"
    );

    usuarioSelect.innerHTML =
      '<option value="">Seleccione un funcionario</option>';

    usuarios.forEach((u) => {
      const option = document.createElement("option");
      option.value = u.id_usuario;
      option.textContent = `${u.nombres} ${u.apellidos}`;
      usuarioSelect.appendChild(option);
    });

    if (usuarios.length > 0) {
      usuarioSelect.value = usuarios[0].id_usuario;
    }
  } catch (error) {
    console.error(error);
    mensajeEstado.textContent =
      "Error al cargar los funcionarios.";
  }
}

/* ==========================================
   CARGAR REPORTES
========================================== */
async function cargarReportes() {
  try {
    tablaMensaje.textContent = "Cargando reportes...";

    const response = await fetch(`${API_URL}/reportes`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      reportes = [];
      renderizarReportes([]);
      return;
    }

    reportes = data.data || [];

    renderizarReportes(reportes);

    totalReportes.textContent = reportes.length;

    if (reportes.length > 0) {
      ultimoMes.textContent = formatearMes(
        reportes[0].fecha_desde
      );
    } else {
      ultimoMes.textContent = "-";
    }

    tablaMensaje.textContent =
      `Reportes encontrados: ${reportes.length}`;
  } catch (error) {
    reportes = [];
    renderizarReportes([]);
    tablaMensaje.textContent = "Error de conexión.";
  }
}

/* ==========================================
   RENDER TABLA
========================================== */
function renderizarReportes(lista) {
  tablaReportes.innerHTML = "";

  if (!lista || lista.length === 0) {
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
      <td>${formatearMes(r.fecha_desde)}</td>
      <td>${formatearFecha(r.fecha_generacion)}</td>
      <td>
        <span class="badge">GENERADO</span>
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

/* ==========================================
   GENERAR REPORTE
========================================== */
async function generarReporte(e) {
  e.preventDefault();

  const id_usuario = usuarioSelect.value;
  const mes = mesInput.value;

  if (!id_usuario || !mes) {
    mensajeEstado.textContent =
      "Debe seleccionar un funcionario y un mes.";
    return;
  }

  const { fecha_desde, fecha_hasta } =
    obtenerRangoMes(mes);

  try {
    mensajeEstado.textContent =
      "Generando reporte PDF...";

    const response = await fetch(`${API_URL}/reportes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        id_usuario: Number(id_usuario),
        tipo: "MENSUAL",
        fecha_desde,
        fecha_hasta,
        observacion: `Reporte mensual ${mes}`
      })
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      mensajeEstado.textContent =
        data.mensaje || "No se pudo generar el reporte.";
      return;
    }

    mensajeEstado.textContent =
      "Reporte generado correctamente.";

    await cargarReportes();

    const idReporte = data.data?.id_reporte;

    if (idReporte) {
      descargarPDF(idReporte);
    }
  } catch (error) {
    console.error(error);
    mensajeEstado.textContent =
      "Error de conexión con el servidor.";
  }
}

/* ==========================================
   DESCARGAR PDF
========================================== */
function descargarPDF(idReporte) {
  if (!idReporte) return;

  const url =
    `${API_URL}/reportes/${idReporte}/pdf`;

  window.open(url, "_blank");
}

/* ==========================================
   UTILIDADES
========================================== */
function formatearFecha(fecha) {
  if (!fecha) return "-";

  const fechaObj = new Date(fecha);

  if (isNaN(fechaObj.getTime())) {
    return fecha;
  }

  return fechaObj.toLocaleDateString("es-CL");
}

function formatearMes(fecha) {
  if (!fecha) return "-";

  const fechaObj = new Date(fecha);

  return fechaObj.toLocaleDateString("es-CL", {
    year: "numeric",
    month: "long"
  });
}

/* ==========================================
   LOGOUT
========================================== */
btnLogout.addEventListener("click", () => {
  localStorage.removeItem("token");
  localStorage.removeItem("usuario");
  window.location.href = "../login/login.html";
});

/* ==========================================
   EVENTOS
========================================== */
formReporte.addEventListener("submit", generarReporte);

/* ==========================================
   INICIALIZACIÓN
========================================== */
configurarMesActual();
cargarUsuarios();
cargarReportes();