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

const tablaSuperAdmin = document.getElementById("tablaSuperAdmin");
const tablaMensaje = document.getElementById("tablaMensaje");

const buscarInput = document.getElementById("buscarInput");
const estadoFiltro = document.getElementById("estadoFiltro");

const totalSuperAdmin = document.getElementById("totalSuperAdmin");
const totalActivos = document.getElementById("totalActivos");

const btnRecargar = document.getElementById("btnRecargar");
const btnLogout = document.getElementById("btnLogout");

const modalEditar = document.getElementById("modalEditar");
const btnCerrarModal = document.getElementById("btnCerrarModal");

const formEditar = document.getElementById("formEditar");

const editIdUsuario = document.getElementById("editIdUsuario");
const editNombres = document.getElementById("editNombres");
const editApellidos = document.getElementById("editApellidos");
const editCorreo = document.getElementById("editCorreo");
const editTelefono = document.getElementById("editTelefono");
const editEstado = document.getElementById("editEstado");

let superAdmins = [];
let usuarioSeleccionado = null;

nombreUsuario.textContent = `${usuario.nombres} ${usuario.apellidos}`;
rolUsuario.textContent = usuario.rol;

async function cargarSuperAdmin() {
  try {
    tablaMensaje.textContent = "Cargando información...";

    const response = await fetch(`${API_URL}/usuarios`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      tablaMensaje.textContent = "No se pudo cargar la información.";
      return;
    }

    const usuarios = data.data || data.usuarios || [];

    superAdmins = usuarios.filter(
      (u) => u.rol === "SuperAdmin"
    );

    renderizarSuperAdmin(superAdmins);

    totalSuperAdmin.textContent = superAdmins.length;

    totalActivos.textContent = superAdmins.filter(
      (u) => u.estado === "ACTIVO"
    ).length;

    tablaMensaje.textContent = `SuperAdmin encontrados: ${superAdmins.length}`;

  } catch (error) {
    tablaMensaje.textContent = "Error de conexión.";
  }
}

function renderizarSuperAdmin(lista) {
  tablaSuperAdmin.innerHTML = "";

  if (lista.length === 0) {
    tablaSuperAdmin.innerHTML = `
      <tr>
        <td colspan="5">No existen usuarios SuperAdmin.</td>
      </tr>
    `;
    return;
  }

  lista.forEach((u) => {
    const fila = document.createElement("tr");

    fila.innerHTML = `
      <td>
        <strong>${u.nombres} ${u.apellidos}</strong>
      </td>

      <td>${u.correo}</td>

      <td>${u.telefono || "-"}</td>

      <td>
        <span class="badge ${u.estado}">
          ${u.estado}
        </span>
      </td>

      <td>
        <div class="acciones">

          <button class="btnEditar" data-id="${u.id_usuario}">
            Editar
          </button>

          ${
            u.estado === "ACTIVO"
              ? `
                <button class="btnDesactivar" data-id="${u.id_usuario}">
                  Desactivar
                </button>
              `
              : `
                <button class="btnActivar" data-id="${u.id_usuario}">
                  Activar
                </button>
              `
          }

        </div>
      </td>
    `;

    tablaSuperAdmin.appendChild(fila);
  });

  document.querySelectorAll(".btnEditar").forEach((btn) => {
    btn.addEventListener("click", () => {
      abrirModal(btn.dataset.id);
    });
  });

  document.querySelectorAll(".btnDesactivar").forEach((btn) => {
    btn.addEventListener("click", () => {
      cambiarEstado(btn.dataset.id, "INACTIVO");
    });
  });

  document.querySelectorAll(".btnActivar").forEach((btn) => {
    btn.addEventListener("click", () => {
      cambiarEstado(btn.dataset.id, "ACTIVO");
    });
  });
}

function filtrarSuperAdmin() {
  const texto = buscarInput.value.toLowerCase().trim();
  const estado = estadoFiltro.value;

  const filtrados = superAdmins.filter((u) => {
    const contenido = `
      ${u.nombres}
      ${u.apellidos}
      ${u.correo}
    `.toLowerCase();

    const coincideTexto = contenido.includes(texto);
    const coincideEstado = estado ? u.estado === estado : true;

    return coincideTexto && coincideEstado;
  });

  renderizarSuperAdmin(filtrados);
}

function abrirModal(idUsuario) {
  usuarioSeleccionado = superAdmins.find(
    (u) => Number(u.id_usuario) === Number(idUsuario)
  );

  if (!usuarioSeleccionado) return;

  editIdUsuario.value = usuarioSeleccionado.id_usuario;
  editNombres.value = usuarioSeleccionado.nombres;
  editApellidos.value = usuarioSeleccionado.apellidos;
  editCorreo.value = usuarioSeleccionado.correo;
  editTelefono.value = usuarioSeleccionado.telefono || "";
  editEstado.value = usuarioSeleccionado.estado;

  modalEditar.classList.add("show");
}

function cerrarModal() {
  modalEditar.classList.remove("show");
  usuarioSeleccionado = null;
}

async function guardarCambios(e) {
  e.preventDefault();

  if (!usuarioSeleccionado) return;

  const payload = {
    nombres: editNombres.value.trim(),
    apellidos: editApellidos.value.trim(),
    correo: editCorreo.value.trim(),
    telefono: editTelefono.value.trim(),
    id_rol: 4,
    estado: editEstado.value,
    id_subdepartamento: usuarioSeleccionado.id_subdepartamento || null,
    id_departamento_asignado: usuarioSeleccionado.id_departamento_asignado || null
  };

  try {
    const response = await fetch(
      `${API_URL}/usuarios/${usuarioSeleccionado.id_usuario}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      }
    );

    const data = await response.json();

    if (!response.ok || !data.ok) {
      alert(data.mensaje || "No se pudo actualizar.");
      return;
    }

    cerrarModal();
    await cargarSuperAdmin();

  } catch (error) {
    alert("Error de conexión.");
  }
}

async function cambiarEstado(idUsuario, nuevoEstado) {
  const usuarioObjetivo = superAdmins.find(
    (u) => Number(u.id_usuario) === Number(idUsuario)
  );

  if (!usuarioObjetivo) return;

  const confirmar = confirm(
    `¿Desea cambiar el estado del SuperAdmin a ${nuevoEstado}?`
  );

  if (!confirmar) return;

  const payload = {
    nombres: usuarioObjetivo.nombres,
    apellidos: usuarioObjetivo.apellidos,
    correo: usuarioObjetivo.correo,
    telefono: usuarioObjetivo.telefono,
    id_rol: 4,
    estado: nuevoEstado,
    id_subdepartamento: usuarioObjetivo.id_subdepartamento || null,
    id_departamento_asignado: usuarioObjetivo.id_departamento_asignado || null
  };

  try {
    const response = await fetch(
      `${API_URL}/usuarios/${idUsuario}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      }
    );

    const data = await response.json();

    if (!response.ok || !data.ok) {
      alert(data.mensaje || "No se pudo actualizar.");
      return;
    }

    await cargarSuperAdmin();

  } catch (error) {
    alert("Error de conexión.");
  }
}

btnCerrarModal.addEventListener("click", cerrarModal);

formEditar.addEventListener("submit", guardarCambios);

buscarInput.addEventListener("input", filtrarSuperAdmin);

estadoFiltro.addEventListener("change", filtrarSuperAdmin);

btnRecargar.addEventListener("click", cargarSuperAdmin);

btnLogout.addEventListener("click", () => {
  localStorage.removeItem("token");
  localStorage.removeItem("usuario");

  window.location.href = "../login/login.html";
});

cargarSuperAdmin();