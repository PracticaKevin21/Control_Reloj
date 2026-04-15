const authService = require('../services/auth.service');

// LOGIN
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Email y contraseña son obligatorios'
      });
    }

    const result = await authService.login(email, password);

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
    const { nombre, email, password, rol } = req.body;

    if (!nombre || !email || !password) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Nombre, email y contraseña son obligatorios'
      });
    }

    const result = await authService.register({
      nombre,
      email,
      password,
      rol
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