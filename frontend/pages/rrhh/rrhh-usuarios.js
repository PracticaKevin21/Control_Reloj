// ======================================================
// GESTIÓN GLOBAL DE USUARIOS - ADMIN RRHH
// frontend/pages/rrhh/rrhh-usuarios.js
// ======================================================

const token = localStorage.getItem("token");
const usuario = JSON.parse(localStorage.getItem("usuario"));

// ======================================================
// ELEMENTOS DEL DOM
// ======================================================

const nombreUsuario = document.getElementById("nombreUsuario");
const rolUsuario = document.getElementById("rolUsuario");

const tablaUsuarios = document.getElementById("tablaUsuarios");
const mensajeEstado = document.getElementById("mensajeEstado");

const buscarInput = document.getElementById("buscarInput");
const rolFiltro = document.getElementById("rolFiltro");
const estadoFiltro = document.getElementById("estadoFiltro");
const btnRecargar = document.getElementById("btnRecargar");
const btnLogout = document.getElementById("btnLogout");

// Resumen
const totalUsuarios = document.getElementById("totalUsuarios");
const totalActivos = document.getElementById("totalActivos");
const totalInactivos = document.getElementById("totalInactivos");

// Modal editar
const modalEditar = document.getElementById("modalEditar");
const btnCerrarModal = document.getElementById("btnCerrarModal");
const formEditar = document.getElementById("formEditar");

const editIdUsuario = document.getElementById("editIdUsuario");
const editNombres = document.getElementById("editNombres");
const editApellidos = document.getElementById("editApellidos");
const editCorreo = document.getElementById("editCorreo");
const editTelefono = document.getElementById("editTelefono");
const editRol = document.getElementById("editRol");
const editEstado = document.getElementById("editEstado");

// Modal nuevo usuario
const btnNuevoUsuario = document.getElementById("btnNuevoUsuario");
const modalNuevoUsuario = document.getElementById("modalNuevoUsuario");
const btnCerrarModalNuevo = document.getElementById("btnCerrarModalNuevo");
const formNuevoUsuario = document.getElementById("formNuevoUsuario");

const nuevoRut = document.getElementById("nuevoRut");
const nuevoNombres = document.getElementById("nuevoNombres");
const nuevoApellidos = document.getElementById("nuevoApellidos");
const nuevoCorreo = document.getElementById("nuevoCorreo");
const nuevoTelefono = document.getElementById("nuevoTelefono");
const nuevoPassword = document.getElementById("nuevoPassword");
const nuevoRol = document.getElementById("nuevoRol");
const nuevoDepartamento = document.getElementById("nuevoDepartamento");
const nuevoSubdepartamento = document.getElementById("nuevoSubdepartamento");
const nuevoEstado = document.getElementById("nuevoEstado");
const nuevoFechaInicio = document.getElementById("nuevoFechaInicio");
const nuevoFechaTermino = document.getElementById("nuevoFechaTermino");

// ======================================================
// VARIABLES GLOBALES
// ======================================================

let usuariosOriginales = [];
let usuarioSeleccionado = null;
let departamentos = [];
let subdepartamentos = [];

// ======================================================
// ROLES
// ======================================================

const rolesPorNombre = {
  Administrador: 1,
  Jefatura: 2,
  Funcionario: 3,
  SuperAdmin: 4,
  AdminRRHH: 5
};

// Roles por ID
const ROLES = {
  ADMINISTRADOR: 1,
  JEFATURA: 2,
  FUNCIONARIO: 3,
  SUPERADMIN: 4,
  ADMIN_RRHH: 5
};

// ======================================================
// VALIDACIÓN DE ACCESO
// ======================================================

if (!token || !usuario) {
  window.location.href = "../login/login.html";
}

if (usuario.rol !== "AdminRRHH") {
  window.location.href = "../login/login.html";
}

nombreUsuario.textContent = `${usuario.nombres} ${usuario.apellidos}`;
rolUsuario.textContent = usuario.rol;

// ======================================================
// UTILIDADES
// ======================================================

function obtenerHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  };
}

function mostrarError(mensaje) {
  alert(mensaje || "Ha ocurrido un error.");
}

function obtenerValorNumerico(valor) {
  if (valor === "" || valor === null || valor === undefined) {
    return null;
  }

  const numero = Number(valor);
  return Number.isNaN(numero) ? null : numero;
}

function formatearFechaHoy() {
  return new Date().toISOString().split("T")[0];
}

// ======================================================
// CARGAR DATOS AUXILIARES
// ======================================================

async function cargarDepartamentos() {
  try {
    const response = await fetch(`${API_URL}/departamentos`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      return;
    }

    departamentos = data.data || [];

    nuevoDepartamento.innerHTML =
      '<option value="">Seleccione un departamento</option>';

    departamentos.forEach((d) => {
      const option = document.createElement("option");
      option.value = d.id_departamento;
      option.textContent = d.nombre;
      nuevoDepartamento.appendChild(option);
    });
  } catch (error) {
    console.error("Error al cargar departamentos:", error);
  }
}

async function cargarSubdepartamentos() {
  try {
    const response = await fetch(`${API_URL}/subdepartamentos`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      return;
    }

    subdepartamentos = data.data || [];
  } catch (error) {
    console.error("Error al cargar subdepartamentos:", error);
  }
}

function actualizarSubdepartamentos() {
  const idDepartamento = obtenerValorNumerico(nuevoDepartamento.value);

  nuevoSubdepartamento.innerHTML =
    '<option value="">Seleccione un subdepartamento</option>';

  let lista = subdepartamentos;

  if (idDepartamento) {
    lista = subdepartamentos.filter(
      (s) => Number(s.id_departamento) === idDepartamento
    );
  }

  lista.forEach((s) => {
    const option = document.createElement("option");
    option.value = s.id_subdepartamento;
    option.textContent = s.nombre;
    nuevoSubdepartamento.appendChild(option);
  });
}

function actualizarReglasFormulario() {
  const idRol = obtenerValorNumerico(nuevoRol.value);

  // Reiniciar estados
  nuevoDepartamento.required = false;
  nuevoSubdepartamento.required = false;
  nuevoDepartamento.disabled = false;
  nuevoSubdepartamento.disabled = false;

  // Administrador → departamento obligatorio
  if (idRol === ROLES.ADMINISTRADOR) {
    nuevoDepartamento.required = true;
    nuevoSubdepartamento.required = false;
  }

  // Jefatura / Funcionario → subdepartamento obligatorio
  else if (
    idRol === ROLES.JEFATURA ||
    idRol === ROLES.FUNCIONARIO
  ) {
    nuevoDepartamento.required = false;
    nuevoSubdepartamento.required = true;
  }

  // AdminRRHH / SuperAdmin → ambos opcionales
}

function abrirModalNuevoUsuario() {
  formNuevoUsuario.reset();
  nuevoFechaInicio.value = formatearFechaHoy();
  actualizarSubdepartamentos();
  actualizarReglasFormulario();
  modalNuevoUsuario.classList.add("show");
}

function cerrarModalNuevoUsuario() {
  modalNuevoUsuario.classList.remove("show");
  formNuevoUsuario.reset();
}

// ======================================================
// CARGAR USUARIOS
// ======================================================

async function cargarUsuarios() {
  try {
    mensajeEstado.textContent = "Cargando usuarios...";

    const response = await fetch(`${API_URL}/usuarios`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      mensajeEstado.textContent =
        data.mensaje || "No se pudo cargar usuarios.";
      return;
    }

    usuariosOriginales = data.data || data.usuarios || [];

    renderizarUsuarios(usuariosOriginales);
    actualizarResumen(usuariosOriginales);

    mensajeEstado.textContent =
      `Usuarios encontrados: ${usuariosOriginales.length}`;
  } catch (error) {
    mensajeEstado.textContent = "Error de conexión con el servidor.";
  }
}

// ======================================================
// RENDER TABLA
// ======================================================

function renderizarUsuarios(lista) {
  tablaUsuarios.innerHTML = "";

  if (lista.length === 0) {
    tablaUsuarios.innerHTML = `
      <tr>
        <td colspan="8">No se encontraron usuarios.</td>
      </tr>
    `;
    return;
  }

  lista.forEach((u) => {
    const fila = document.createElement("tr");
    const puedeEditar = puedeGestionarUsuario(u);

    fila.innerHTML = `
      <td>
        <strong>${u.nombres || ""} ${u.apellidos || ""}</strong><br>
        <small>RUT: ${u.rut || "-"}</small>
      </td>
      <td>${u.correo || "-"}</td>
      <td>${u.telefono || "-"}</td>
      <td><span class="rol">${u.rol || "-"}</span></td>
      <td>${u.departamento || "Sin departamento"}</td>
      <td>${u.subdepartamento || "Sin subdepartamento"}</td>
      <td>
        <span class="badge ${u.estado}">
          ${u.estado || "SIN ESTADO"}
        </span>
      </td>
      <td>
        <div class="acciones">
          ${
            puedeEditar
              ? `
                <button class="btnEditar" data-id="${u.id_usuario}">
                  Editar
                </button>
                ${
                  u.estado === "ACTIVO"
                    ? `
                      <button
                        class="btnDesactivar"
                        data-id="${u.id_usuario}">
                        Desactivar
                      </button>
                    `
                    : `
                      <button
                        class="btnActivar"
                        data-id="${u.id_usuario}">
                        Activar
                      </button>
                    `
                }
              `
              : `<small>Sin permisos</small>`
          }
        </div>
      </td>
    `;

    tablaUsuarios.appendChild(fila);
  });

  // Eventos
  document.querySelectorAll(".btnEditar").forEach((btn) => {
    btn.addEventListener("click", () =>
      abrirModalEditar(btn.dataset.id)
    );
  });

  document.querySelectorAll(".btnDesactivar").forEach((btn) => {
    btn.addEventListener("click", () =>
      cambiarEstadoUsuario(btn.dataset.id, "INACTIVO")
    );
  });

  document.querySelectorAll(".btnActivar").forEach((btn) => {
    btn.addEventListener("click", () =>
      cambiarEstadoUsuario(btn.dataset.id, "ACTIVO")
    );
  });
}

function puedeGestionarUsuario(u) {
  if (!u.rol) return false;

  // No puede editarse a sí mismo
  if (Number(u.id_usuario) === Number(usuario.id_usuario)) {
    return false;
  }

  return true;
}

// ======================================================
// RESUMEN
// ======================================================

function actualizarResumen(lista) {
  totalUsuarios.textContent = lista.length;
  totalActivos.textContent =
    lista.filter((u) => u.estado === "ACTIVO").length;
  totalInactivos.textContent =
    lista.filter((u) => u.estado === "INACTIVO").length;
}

// ======================================================
// FILTROS
// ======================================================

function filtrarUsuarios() {
  const texto = buscarInput.value.toLowerCase().trim();
  const rol = rolFiltro.value;
  const estado = estadoFiltro.value;

  const filtrados = usuariosOriginales.filter((u) => {
    const contenido = `
      ${u.nombres || ""}
      ${u.apellidos || ""}
      ${u.correo || ""}
      ${u.rol || ""}
      ${u.departamento || ""}
      ${u.subdepartamento || ""}
      ${u.estado || ""}
    `.toLowerCase();

    const coincideTexto = contenido.includes(texto);
    const coincideRol = rol ? u.rol === rol : true;
    const coincideEstado = estado ? u.estado === estado : true;

    return coincideTexto && coincideRol && coincideEstado;
  });

  renderizarUsuarios(filtrados);
  actualizarResumen(filtrados);

  mensajeEstado.textContent =
    `Usuarios mostrados: ${filtrados.length}`;
}

// ======================================================
// MODAL EDITAR
// ======================================================

function abrirModalEditar(idUsuario) {
  usuarioSeleccionado = usuariosOriginales.find(
    (u) => Number(u.id_usuario) === Number(idUsuario)
  );

  if (!usuarioSeleccionado) return;

  editIdUsuario.value = usuarioSeleccionado.id_usuario;
  editNombres.value = usuarioSeleccionado.nombres || "";
  editApellidos.value = usuarioSeleccionado.apellidos || "";
  editCorreo.value = usuarioSeleccionado.correo || "";
  editTelefono.value = usuarioSeleccionado.telefono || "";
  editEstado.value = usuarioSeleccionado.estado || "ACTIVO";

  const idRol =
    rolesPorNombre[usuarioSeleccionado.rol] || ROLES.FUNCIONARIO;

  editRol.value = idRol;

  modalEditar.classList.add("show");
}

function cerrarModal() {
  modalEditar.classList.remove("show");
  usuarioSeleccionado = null;
  formEditar.reset();
}

async function guardarCambiosUsuario(e) {
  e.preventDefault();

  if (!usuarioSeleccionado) return;

  const payload = {
    nombres: editNombres.value.trim(),
    apellidos: editApellidos.value.trim(),
    correo: editCorreo.value.trim(),
    telefono: editTelefono.value.trim(),
    id_rol: Number(editRol.value),
    id_subdepartamento:
      usuarioSeleccionado.id_subdepartamento || null,
    id_departamento_asignado:
      usuarioSeleccionado.id_departamento_asignado || null,
    estado: editEstado.value
  };

  try {
    const response = await fetch(
      `${API_URL}/usuarios/${usuarioSeleccionado.id_usuario}`,
      {
        method: "PUT",
        headers: obtenerHeaders(),
        body: JSON.stringify(payload)
      }
    );

    const data = await response.json();

    if (!response.ok || !data.ok) {
      mostrarError(
        data.mensaje || "No se pudo actualizar el usuario."
      );
      return;
    }

    cerrarModal();
    await cargarUsuarios();
  } catch (error) {
    mostrarError("Error de conexión con el servidor.");
  }
}

// ======================================================
// CREAR USUARIO
// ======================================================

async function crearUsuario(e) {
  e.preventDefault();

  const idRol = obtenerValorNumerico(nuevoRol.value);
  const idDepartamento = obtenerValorNumerico(
    nuevoDepartamento.value
  );
  const idSubdepartamento = obtenerValorNumerico(
    nuevoSubdepartamento.value
  );

  // Validaciones de negocio
  if (idRol === ROLES.ADMINISTRADOR && !idDepartamento) {
    mostrarError(
      "Para el rol Administrador debe seleccionar un departamento."
    );
    return;
  }

  if (
    (idRol === ROLES.JEFATURA ||
      idRol === ROLES.FUNCIONARIO) &&
    !idSubdepartamento
  ) {
    mostrarError(
      "Para Funcionario o Jefatura debe seleccionar un subdepartamento."
    );
    return;
  }

  const payload = {
    rut: nuevoRut.value.trim(),
    nombres: nuevoNombres.value.trim(),
    apellidos: nuevoApellidos.value.trim(),
    correo: nuevoCorreo.value.trim(),
    telefono: nuevoTelefono.value.trim(),
    password_hash: nuevoPassword.value,
    id_rol: idRol,
    id_subdepartamento: idSubdepartamento,
    id_departamento_asignado: idDepartamento,
    estado: nuevoEstado.value,
    fecha_inicio: nuevoFechaInicio.value || null,
    fecha_termino: nuevoFechaTermino.value || null
  };

  try {
    const response = await fetch(`${API_URL}/usuarios`, {
      method: "POST",
      headers: obtenerHeaders(),
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      mostrarError(
        data.mensaje || "No se pudo crear el usuario."
      );
      return;
    }

    alert("Usuario creado correctamente.");

    cerrarModalNuevoUsuario();
    await cargarUsuarios();
  } catch (error) {
    mostrarError("Error de conexión con el servidor.");
  }
}

// ======================================================
// ACTIVAR / DESACTIVAR
// ======================================================

async function cambiarEstadoUsuario(idUsuario, nuevoEstado) {
  const usuarioObjetivo = usuariosOriginales.find(
    (u) => Number(u.id_usuario) === Number(idUsuario)
  );

  if (!usuarioObjetivo) return;

  const confirmar = confirm(
    `¿Seguro que deseas dejar este usuario como ${nuevoEstado}?`
  );

  if (!confirmar) return;

  const payload = {
    nombres: usuarioObjetivo.nombres,
    apellidos: usuarioObjetivo.apellidos,
    correo: usuarioObjetivo.correo,
    telefono: usuarioObjetivo.telefono,
    id_rol: rolesPorNombre[usuarioObjetivo.rol],
    id_subdepartamento:
      usuarioObjetivo.id_subdepartamento || null,
    id_departamento_asignado:
      usuarioObjetivo.id_departamento_asignado || null,
    estado: nuevoEstado
  };

  try {
    const response = await fetch(
      `${API_URL}/usuarios/${idUsuario}`,
      {
        method: "PUT",
        headers: obtenerHeaders(),
        body: JSON.stringify(payload)
      }
    );

    const data = await response.json();

    if (!response.ok || !data.ok) {
      mostrarError(
        data.mensaje || "No se pudo cambiar el estado."
      );
      return;
    }

    await cargarUsuarios();
  } catch (error) {
    mostrarError("Error de conexión con el servidor.");
  }
}

// ======================================================
// EVENTOS
// ======================================================

buscarInput.addEventListener("input", filtrarUsuarios);
rolFiltro.addEventListener("change", filtrarUsuarios);
estadoFiltro.addEventListener("change", filtrarUsuarios);

btnRecargar.addEventListener("click", cargarUsuarios);

btnCerrarModal.addEventListener("click", cerrarModal);
formEditar.addEventListener("submit", guardarCambiosUsuario);

// Nuevo usuario
if (btnNuevoUsuario) {
  btnNuevoUsuario.addEventListener(
    "click",
    abrirModalNuevoUsuario
  );
}

if (btnCerrarModalNuevo) {
  btnCerrarModalNuevo.addEventListener(
    "click",
    cerrarModalNuevoUsuario
  );
}

if (formNuevoUsuario) {
  formNuevoUsuario.addEventListener("submit", crearUsuario);
}

if (nuevoRol) {
  nuevoRol.addEventListener("change", actualizarReglasFormulario);
}

if (nuevoDepartamento) {
  nuevoDepartamento.addEventListener(
    "change",
    actualizarSubdepartamentos
  );
}

// Logout
btnLogout.addEventListener("click", () => {
  localStorage.removeItem("token");
  localStorage.removeItem("usuario");
  window.location.href = "../login/login.html";
});

// ======================================================
// INICIALIZACIÓN
// ======================================================

(async function init() {
  await cargarDepartamentos();
  await cargarSubdepartamentos();
  await cargarUsuarios();
})();