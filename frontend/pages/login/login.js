const loginForm = document.getElementById("loginForm");
const correoInput = document.getElementById("correo");
const passwordInput = document.getElementById("password");
const mensaje = document.getElementById("mensaje");
const btnLogin = document.getElementById("btnLogin");

function mostrarMensaje(texto, tipo) {
  mensaje.textContent = texto;
  mensaje.className = `mensaje ${tipo}`;
}

function redirigirPorRol(rol) {
  const rutas = {
    Funcionario: "../funcionario/funcionario-salida-qr.html",
    Jefatura: "../jefatura/jefatura-historial.html",
    Administrador: "../admin/admin-usuarios.html",
    AdminRRHH: "../rrhh/rrhh-historial.html",
    SuperAdmin: "../superadmin/superadmin-admins.html"
  };

  window.location.href = rutas[rol] || "./login.html";
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const correo = correoInput.value.trim();
  const password = passwordInput.value.trim();

  if (!correo || !password) {
    mostrarMensaje("Debe ingresar correo y contraseña.", "error");
    return;
  }

  try {
    btnLogin.disabled = true;
    btnLogin.textContent = "Validando...";
    mostrarMensaje("", "");

    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        correo,
        password
      })
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      mostrarMensaje(data.mensaje || "No se pudo iniciar sesión.", "error");
      return;
    }

    localStorage.setItem("token", data.token);
    localStorage.setItem("usuario", JSON.stringify(data.usuario));

    mostrarMensaje("Inicio de sesión correcto.", "ok");

    setTimeout(() => {
      redirigirPorRol(data.usuario.rol);
    }, 600);

  } catch (error) {
    mostrarMensaje("Error de conexión con el servidor.", "error");
  } finally {
    btnLogin.disabled = false;
    btnLogin.textContent = "Iniciar sesión";
  }
});