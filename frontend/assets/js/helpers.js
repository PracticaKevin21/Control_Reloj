function formatearFecha(fecha) {
  if (!fecha) return "-";

  const fechaObj = new Date(fecha);

  if (isNaN(fechaObj.getTime())) {
    return fecha;
  }

  return fechaObj.toLocaleDateString("es-CL");
}

function formatearHora(hora) {
  if (!hora) return "-";
  return String(hora).slice(0, 8);
}

function obtenerUsuarioLocal() {
  const usuario = localStorage.getItem("usuario");
  return usuario ? JSON.parse(usuario) : null;
}

function obtenerToken() {
  return localStorage.getItem("token");
}

function limpiarSesion() {
  localStorage.removeItem("token");
  localStorage.removeItem("usuario");
}

function cerrarSesion() {
  limpiarSesion();
  window.location.href = "../login/login.html";
}

function mostrarTextoSeguro(valor, textoDefault = "-") {
  return valor ? valor : textoDefault;
}