function verificarSesion() {
  const token = localStorage.getItem("token");
  const usuario = localStorage.getItem("usuario");

  if (!token || !usuario) {
    window.location.href = "../login/login.html";
    return null;
  }

  return {
    token,
    usuario: JSON.parse(usuario)
  };
}

function protegerRuta(rolPermitido) {
  const sesion = verificarSesion();

  if (!sesion) return null;

  if (sesion.usuario.rol !== rolPermitido) {
    window.location.href = "../login/login.html";
    return null;
  }

  return sesion;
}

function redirigirPorRol(rol) {
  const rutas = {
    Funcionario: "../funcionario/funcionario-salida-qr.html",
    Jefatura: "../jefatura/jefatura-historial.html",
    Administrador: "../admin/admin-usuarios.html",
    AdminRRHH: "../rrhh/rrhh-historial.html",
    SuperAdmin: "../superadmin/superadmin-admins.html"
  };

  window.location.href = rutas[rol] || "../login/login.html";
}