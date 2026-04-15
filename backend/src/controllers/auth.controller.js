const authService = require('../services/auth.service');

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
    const { nombres, apellidos, correo, password, id_rol, id_area } = req.body;

    if (!nombres || !apellidos || !correo || !password || !id_rol || !id_area) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Nombres, apellidos, correo, contraseña, rol y área son obligatorios'
      });
    }

    const result = await authService.register({
      nombres,
      apellidos,
      correo,
      password,
      id_rol,
      id_area
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