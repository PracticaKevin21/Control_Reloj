const qrcodeContainer = document.getElementById("qrcode");
const tokenQR = document.getElementById("tokenQR");
const horaActualizacion = document.getElementById("horaActualizacion");
const btnGenerarQR = document.getElementById("btnGenerarQR");
const btnCopiarToken = document.getElementById("btnCopiarToken");

let qrTokenActual = "";

function generarTokenQR() {
  return `SALIDA-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
}

function generarQRCode() {
  qrTokenActual = generarTokenQR();
  tokenQR.textContent = qrTokenActual;
  horaActualizacion.textContent = new Date().toLocaleString("es-CL");

  qrcodeContainer.innerHTML = "";

  new QRCode(qrcodeContainer, {
    text: JSON.stringify({
      tipo: "SALIDA",
      token: qrTokenActual,
      fecha: new Date().toISOString()
    }),
    width: 260,
    height: 260
  });
}

btnGenerarQR.addEventListener("click", generarQRCode);

btnCopiarToken.addEventListener("click", async () => {
  if (!qrTokenActual) return;

  try {
    await navigator.clipboard.writeText(qrTokenActual);
    alert("Token copiado al portapapeles.");
  } catch (error) {
    alert("No se pudo copiar el token. Usa el QR directamente.");
  }
});

generarQRCode();
