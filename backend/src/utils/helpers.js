function calcularDV(rut) {
  let M = 0;
  let S = 1;
  let T = parseInt(rut, 10);

  while (T > 0) {
    S = (S + (T % 10) * (9 - (M % 6))) % 11;
    M++;
    T = Math.floor(T / 10);
  }

  return S ? String(S - 1) : 'k';
}

function limpiarRut(rutCompleto) {
  if (!rutCompleto) return '';
  return String(rutCompleto).replace(/\./g, '').trim();
}

function validarFormatoRut(rutCompleto) {
  return /^[0-9]+-[0-9kK]{1}$/.test(rutCompleto);
}

function validarRut(rutCompleto) {
  if (!rutCompleto) return false;

  const rutLimpio = limpiarRut(rutCompleto);

  if (!validarFormatoRut(rutLimpio)) {
    return false;
  }

  const partes = rutLimpio.split('-');
  const rut = partes[0];
  const dvIngresado = partes[1].toLowerCase();
  const dvCalculado = calcularDV(rut);

  return dvCalculado === dvIngresado;
}

module.exports = {
  calcularDV,
  limpiarRut,
  validarFormatoRut,
  validarRut
};