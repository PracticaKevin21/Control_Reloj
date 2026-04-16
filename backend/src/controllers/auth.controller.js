const authService = require('../services/auth.service');

const regexCorreoDEM = /^[a-zA-Z0-9._%+-]+@demovalle\.cl$/;

// LOGIN
async function login(req, res) {
  try {
    const { correo, password } = req.body;

    if (!correo || !password) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Correo y contraseña son obligatorios'
      });
    }

    if (!regexCorreoDEM.test(correo)) {
      return res.status(400).json({
        ok: false,
        mensaje: 'El correo debe tener un formato válido y pertenecer al dominio @demovalle.cl'
      });
    }

    const result = await authService.login(correo, password);

    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({
      ok: false,
      mensaje: error.message
    });
  }
}

// REGISTER
async function register(req, res) {
  try {
    const {
      rut,
      nombres,
      apellidos,
      correo,
      password,
      id_rol,
      id_area,
      telefono
    } = req.body;

    if (!rut || !nombres || !apellidos || !correo || !password || !id_rol || !id_area) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Faltan campos obligatorios'
      });
    }

    if (!regexCorreoDEM.test(correo)) {
      return res.status(400).json({
        ok: false,
        mensaje: 'El correo debe tener un formato válido y pertenecer al dominio @demovalle.cl'
      });
    }

    const result = await authService.register({
      rut,
      nombres,
      apellidos,
      correo,
      password,
      id_rol,
      id_area,
      telefono
    });

    return res.status(201).json(result);
  } catch (error) {
    return res.status(400).json({
      ok: false,
      mensaje: error.message
    });
  }
}

module.exports = {
  login,
  register
};