const { pool } = require('../config/db');

async function getDepartamentos() {
  const [rows] = await pool.query(`
    SELECT id_departamento, nombre
    FROM departamentos
    ORDER BY id_departamento ASC
  `);

  return rows;
}

async function getDepartamentoById(id) {
  const [rows] = await pool.query(
    `
    SELECT id_departamento, nombre
    FROM departamentos
    WHERE id_departamento = ?
    `,
    [id]
  );

  if (rows.length === 0) {
    throw new Error('Departamento no encontrado');
  }

  return rows[0];
}

async function createDepartamento(data) {
  const { nombre } = data;

  if (!nombre) {
    throw new Error('El nombre del departamento es obligatorio');
  }

  const [existe] = await pool.query(
    'SELECT id_departamento FROM departamentos WHERE nombre = ?',
    [nombre]
  );

  if (existe.length > 0) {
    throw new Error('Ya existe un departamento con ese nombre');
  }

  const [result] = await pool.query(
    'INSERT INTO departamentos (nombre) VALUES (?)',
    [nombre]
  );

  return {
    id_departamento: result.insertId
  };
}

async function updateDepartamento(id, data) {
  const { nombre } = data;

  await getDepartamentoById(id);

  if (!nombre) {
    throw new Error('El nombre del departamento es obligatorio');
  }

  const [duplicado] = await pool.query(
    'SELECT id_departamento FROM departamentos WHERE nombre = ? AND id_departamento <> ?',
    [nombre, id]
  );

  if (duplicado.length > 0) {
    throw new Error('Ya existe otro departamento con ese nombre');
  }

  await pool.query(
    'UPDATE departamentos SET nombre = ? WHERE id_departamento = ?',
    [nombre, id]
  );
}

async function deleteDepartamento(id) {
  await getDepartamentoById(id);

  const [subdepartamentos] = await pool.query(
    'SELECT id_subdepartamento FROM subdepartamentos WHERE id_departamento = ? LIMIT 1',
    [id]
  );

  if (subdepartamentos.length > 0) {
    throw new Error('No se puede eliminar el departamento porque tiene subdepartamentos asociados');
  }

  await pool.query(
    'DELETE FROM departamentos WHERE id_departamento = ?',
    [id]
  );
}

module.exports = {
  getDepartamentos,
  getDepartamentoById,
  createDepartamento,
  updateDepartamento,
  deleteDepartamento
};