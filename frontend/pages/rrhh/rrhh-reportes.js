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

/* ==========================================
   DATOS DEL USUARIO
========================================== */
nombreUsuario.textContent = `${usuario.nombres} ${usuario.apellidos}`;
rolUsuario.textContent = usuario.rol;

/* ==========================================
   CONFIGURAR MES ACTUAL
========================================== */
function configurarMesActual() {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");

  // Formato requerido por <input type="month"> => YYYY-MM
  mesInput.value = `${anio}-${mes}`;
}

/* ==========================================
   CONVERTIR YYYY-MM A RANGO DE FECHAS
========================================== */
function obtenerRangoMes(valorMes) {
  const [anio, mes] = valorMes.split("-").map(Number);

  const fecha_desde =
    `${anio}-${String(mes).padStart(2, "0")}-01`;

  // new Date(anio, mes, 0) devuelve el último día del mes
  const ultimoDia = new Date(anio, mes, 0).getDate();

  const fecha_hasta =
    `${anio}-${String(mes).padStart(2, "0")}-${String(ultimoDia).padStart(2, "0")}`;

  return {
    fecha_desde,
    fecha_hasta
  };
}

/* ==========================================
   CARGAR TODOS LOS USUARIOS ACTIVOS
   (Funcionario, Jefatura, Administrador,
    AdminRRHH y SuperAdmin)
========================================== */
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
      mensajeEstado.textContent =
        "No se pudieron cargar los usuarios.";
      return;
    }

    const todos = data.data || data.usuarios || [];

    // Todos los usuarios activos del sistema
    usuarios = todos.filter((u) => u.estado === "ACTIVO");

    // Orden alfabético
    usuarios.sort((a, b) => {
      const nombreA = `${a.nombres} ${a.apellidos}`.toLowerCase();
      const nombreB = `${b.nombres} ${b.apellidos}`.toLowerCase();
      return nombreA.localeCompare(nombreB);
    });

    usuarioSelect.innerHTML =
      '<option value="">Seleccione un usuario</option>';

    if (usuarios.length === 0) {
      mensajeEstado.textContent =
        "No existen usuarios activos.";
      return;
    }

    usuarios.forEach((u) => {
      const option = document.createElement("option");
      option.value = u.id_usuario;
      option.textContent =
        `${u.nombres} ${u.apellidos} - ${u.rol}`;
      usuarioSelect.appendChild(option);
    });

    // Seleccionar automáticamente el primero
    usuarioSelect.value = usuarios[0].id_usuario;

    mensajeEstado.textContent = "";
  } catch (error) {
    console.error(error);
    mensajeEstado.textContent =
      "Error al cargar los usuarios.";
  }
}

/* ==========================================
   CARGAR HISTORIAL DE REPORTES
========================================== */
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
      reportes = [];
      renderizarReportes([]);
      totalReportes.textContent = "0";
      ultimoMes.textContent = "-";
      tablaMensaje.textContent = "No existen reportes aún.";
      return;
    }

    reportes = data.data || data.reportes || [];

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
    console.error(error);

    reportes = [];
    renderizarReportes([]);
    totalReportes.textContent = "0";
    ultimoMes.textContent = "-";
    tablaMensaje.textContent = "Error de conexión.";
  }
}

/* ==========================================
   RENDERIZAR TABLA
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
      <td>${r.usuario || "Usuario"}</td>
      <td>${formatearMes(r.fecha_desde)}</td>
      <td>${formatearFecha(r.fecha_generacion)}</td>
      <td>
        <span class="badge">GENERADO</span>
      </td>
      <td>
        <button
          class="btnDescargar"
          data-id="${r.id_reporte}"
        >
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

  const id_usuario = usuarioSelect.value.trim();
  const mes = mesInput.value.trim();

  if (!id_usuario) {
    mensajeEstado.textContent =
      "Debe seleccionar un usuario.";
    return;
  }

  if (!mes) {
    mensajeEstado.textContent =
      "Debe seleccionar un mes.";
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

    // Recargar historial
    await cargarReportes();

    // Descargar automáticamente el PDF recién generado
    const idReporte = data.data?.id_reporte;

    if (idReporte) {
      await descargarPDF(idReporte);
    }
  } catch (error) {
    console.error(error);
    mensajeEstado.textContent =
      "Error de conexión con el servidor.";
  }
}

/* ==========================================
   DESCARGAR PDF CON TOKEN
========================================== */
async function descargarPDF(idReporte) {
  try {
    const response = await fetch(
      `${API_URL}/reportes/${idReporte}/pdf`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      let mensaje = "No se pudo descargar el PDF.";

      try {
        const errorData = await response.json();
        mensaje = errorData.mensaje || mensaje;
      } catch (_) {
        // Si la respuesta no es JSON, mantener mensaje por defecto
      }

      alert(mensaje);
      return;
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);

    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = `reporte_${idReporte}.pdf`;

    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();

    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error(error);
    alert("Error al descargar el PDF.");
  }
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

  if (isNaN(fechaObj.getTime())) {
    return fecha;
  }

  return fechaObj.toLocaleDateString("es-CL", {
    year: "numeric",
    month: "long"
  });
}

/* ==========================================
   CERRAR SESIÓN
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