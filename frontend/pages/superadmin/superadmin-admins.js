const token = localStorage.getItem("token");
const usuario = JSON.parse(localStorage.getItem("usuario"));

const nombreUsuario = document.getElementById("nombreUsuario");
const rolUsuario = document.getElementById("rolUsuario");

const tablaAdmins = document.getElementById("tablaAdmins");
const mensajeEstado = document.getElementById("mensajeEstado");

const buscarInput = document.getElementById("buscarInput");
const rolFiltro = document.getElementById("rolFiltro");
const estadoFiltro = document.getElementById("estadoFiltro");
const btnRecargar = document.getElementById("btnRecargar");
const btnLogout = document.getElementById("btnLogout");

const totalAdmins = document.getElementById("totalAdmins");
const totalAdministradores = document.getElementById("totalAdministradores");
const totalRRHH = document.getElementById("totalRRHH");

const modalEditar = document.getElementById("modalEditar");
const btnCerrarModal = document.getElementById("btnCerrarModal");
const formEditar = document.getElementById("formEditar");

const editNombres = document.getElementById("editNombres");
const editApellidos = document.getElementById("editApellidos");
const editCorreo = document.getElementById("editCorreo");
const editTelefono = document.getElementById("editTelefono");
const editRol = document.getElementById("editRol");
const editEstado = document.getElementById("editEstado");

let adminsOriginales = [];
let usuarioSeleccionado = null;

const rolesPorNombre = {
  Administrador: 1,
  AdminRRHH: 5
};

if (!token || !usuario) {
  window.location.href = "../login/login.html";
}

if (usuario.rol !== "SuperAdmin") {
  window.location.href = "../login/login.html";
}

nombreUsuario.textContent = `${usuario.nombres} ${usuario.apellidos}`;
rolUsuario.textContent = usuario.rol;

async function cargarAdmins() {
  try {
    mensajeEstado.textContent = "Cargando administradores...";

    const response = await fetch(`${API_URL}/usuarios`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      mensajeEstado.textContent = data.mensaje || "No se pudo cargar usuarios.";
      return;
    }

    const usuarios = data.data || data.usuarios || [];

    adminsOriginales = usuarios.filter(
      (u) => u.rol === "Administrador" || u.rol === "AdminRRHH"
    );

    renderizarAdmins(adminsOriginales);
    actualizarResumen(adminsOriginales);

    mensajeEstado.textContent = `Administradores encontrados: ${adminsOriginales.length}`;

  } catch (error) {
    mensajeEstado.textContent = "Error de conexión con el servidor.";
  }
}

function renderizarAdmins(lista) {
  tablaAdmins.innerHTML = "";

  if (lista.length === 0) {
    tablaAdmins.innerHTML = `
      <tr>
        <td colspan="7">No se encontraron administradores.</td>
      </tr>
    `;
    return;
  }

  lista.forEach((u) => {
    const fila = document.createElement("tr");

    fila.innerHTML = `
      <td>
        <strong>${u.nombres || ""} ${u.apellidos || ""}</strong><br>
        <small>RUT: ${u.rut || "-"}</small>
      </td>
      <td>${u.correo || "-"}</td>
      <td>${u.telefono || "-"}</td>
      <td><span class="rol">${u.rol || "-"}</span></td>
      <td>${u.departamento || "Sin departamento"}</td>
      <td>
        <span class="badge ${u.estado}">
          ${u.estado || "SIN ESTADO"}
        </span>
      </td>
      <td>
        <div class="acciones">
          <button class="btnEditar" data-id="${u.id_usuario}">Editar</button>
          ${
            u.estado === "ACTIVO"
              ? `<button class="btnDesactivar" data-id="${u.id_usuario}">Desactivar</button>`
              : `<button class="btnActivar" data-id="${u.id_usuario}">Activar</button>`
          }
        </div>
      </td>
    `;

    tablaAdmins.appendChild(fila);
  });

  document.querySelectorAll(".btnEditar").forEach((btn) => {
    btn.addEventListener("click", () => abrirModalEditar(btn.dataset.id));
  });

  document.querySelectorAll(".btnDesactivar").forEach((btn) => {
    btn.addEventListener("click", () => cambiarEstadoUsuario(btn.dataset.id, "INACTIVO"));
  });

  document.querySelectorAll(".btnActivar").forEach((btn) => {
    btn.addEventListener("click", () => cambiarEstadoUsuario(btn.dataset.id, "ACTIVO"));
  });
}

function actualizarResumen(lista) {
  totalAdmins.textContent = lista.length;
  totalAdministradores.textContent = lista.filter((u) => u.rol === "Administrador").length;
  totalRRHH.textContent = lista.filter((u) => u.rol === "AdminRRHH").length;
}

function filtrarAdmins() {
  const texto = buscarInput.value.toLowerCase().trim();
  const rol = rolFiltro.value;
  const estado = estadoFiltro.value;

  const filtrados = adminsOriginales.filter((u) => {
    const contenido = `
      ${u.nombres || ""}
      ${u.apellidos || ""}
      ${u.correo || ""}
      ${u.rol || ""}
      ${u.departamento || ""}
      ${u.estado || ""}
    `.toLowerCase();

    const coincideTexto = contenido.includes(texto);
    const coincideRol = rol ? u.rol === rol : true;
    const coincideEstado = estado ? u.estado === estado : true;

    return coincideTexto && coincideRol && coincideEstado;
  });

  renderizarAdmins(filtrados);
  actualizarResumen(filtrados);
  mensajeEstado.textContent = `Administradores mostrados: ${filtrados.length}`;
}

function abrirModalEditar(idUsuario) {
  usuarioSeleccionado = adminsOriginales.find(
    (u) => Number(u.id_usuario) === Number(idUsuario)
  );

  if (!usuarioSeleccionado) return;

  editNombres.value = usuarioSeleccionado.nombres || "";
  editApellidos.value = usuarioSeleccionado.apellidos || "";
  editCorreo.value = usuarioSeleccionado.correo || "";
  editTelefono.value = usuarioSeleccionado.telefono || "";
  editEstado.value = usuarioSeleccionado.estado || "ACTIVO";

  editRol.value = rolesPorNombre[usuarioSeleccionado.rol] || 1;

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
    id_subdepartamento: usuarioSeleccionado.id_subdepartamento || null,
    id_departamento_asignado: usuarioSeleccionado.id_departamento_asignado || null,
    estado: editEstado.value
  };

  try {
    const response = await fetch(`${API_URL}/usuarios/${usuarioSeleccionado.id_usuario}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      alert(data.mensaje || "No se pudo actualizar el usuario.");
      return;
    }

    cerrarModal();
    await cargarAdmins();

  } catch (error) {
    alert("Error de conexión con el servidor.");
  }
}

async function cambiarEstadoUsuario(idUsuario, nuevoEstado) {
  const usuarioObjetivo = adminsOriginales.find(
    (u) => Number(u.id_usuario) === Number(idUsuario)
  );

  if (!usuarioObjetivo) return;

  const confirmar = confirm(`¿Seguro que deseas dejar este usuario como ${nuevoEstado}?`);

  if (!confirmar) return;

  const payload = {
    nombres: usuarioObjetivo.nombres,
    apellidos: usuarioObjetivo.apellidos,
    correo: usuarioObjetivo.correo,
    telefono: usuarioObjetivo.telefono,
    id_rol: rolesPorNombre[usuarioObjetivo.rol],
    id_subdepartamento: usuarioObjetivo.id_subdepartamento || null,
    id_departamento_asignado: usuarioObjetivo.id_departamento_asignado || null,
    estado: nuevoEstado
  };

  try {
    const response = await fetch(`${API_URL}/usuarios/${idUsuario}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      alert(data.mensaje || "No se pudo cambiar el estado.");
      return;
    }

    await cargarAdmins();

  } catch (error) {
    alert("Error de conexión con el servidor.");
  }
}

buscarInput.addEventListener("input", filtrarAdmins);
rolFiltro.addEventListener("change", filtrarAdmins);
estadoFiltro.addEventListener("change", filtrarAdmins);
btnRecargar.addEventListener("click", cargarAdmins);

btnCerrarModal.addEventListener("click", cerrarModal);
formEditar.addEventListener("submit", guardarCambiosUsuario);

btnLogout.addEventListener("click", () => {
  localStorage.removeItem("token");
  localStorage.removeItem("usuario");
  window.location.href = "../login/login.html";
});

cargarAdmins();