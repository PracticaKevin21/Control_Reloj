const { pool } = require('../config/db');

async function getSubdepartamentos() {
  const [rows] = await pool.query(`
    SELECT 
      sd.id_subdepartamento,
      sd.nombre AS subdepartamento,
      d.nombre AS departamento
    FROM subdepartamentos sd
    JOIN departamentos d ON sd.id_departamento = d.id_departamento
    ORDER BY sd.id_subdepartamento ASC
  `);

  return rows;
}

async function getSubdepartamentoById(id) {
  const [rows] = await pool.query(
    `
    SELECT 
      sd.id_subdepartamento,
      sd.nombre AS subdepartamento,
      sd.id_departamento,
      d.nombre AS departamento
    FROM subdepartamentos sd
    JOIN departamentos d ON sd.id_departamento = d.id_departamento
    WHERE sd.id_subdepartamento = ?
    `,
    [id]
  );

  if (rows.length === 0) {
    throw new Error('Subdepartamento no encontrado');
  }

  return rows[0];
}

async function createSubdepartamento(data) {
  const { nombre, id_departamento } = data;

  if (!nombre || !id_departamento) {
    throw new Error('El nombre y el departamento son obligatorios');
  }

  const [departamentoExiste] = await pool.query(
    'SELECT id_departamento FROM departamentos WHERE id_departamento = ?',
    [id_departamento]
  );

  if (departamentoExiste.length === 0) {
    throw new Error('El departamento indicado no existe');
  }

  const [duplicado] = await pool.query(
    'SELECT id_subdepartamento FROM subdepartamentos WHERE nombre = ? AND id_departamento = ?',
    [nombre, id_departamento]
  );

  if (duplicado.length > 0) {
    throw new Error('Ya existe ese subdepartamento en el departamento indicado');
  }

  const [result] = await pool.query(
    'INSERT INTO subdepartamentos (nombre, id_departamento) VALUES (?, ?)',
    [nombre, id_departamento]
  );

  return {
    id_subdepartamento: result.insertId
  };
}

async function updateSubdepartamento(id, data) {
  const { nombre, id_departamento } = data;

  await getSubdepartamentoById(id);

  if (!nombre || !id_departamento) {
    throw new Error('El nombre y el departamento son obligatorios');
  }

  const [departamentoExiste] = await pool.query(
    'SELECT id_departamento FROM departamentos WHERE id_departamento = ?',
    [id_departamento]
  );

  if (departamentoExiste.length === 0) {
    throw new Error('El departamento indicado no existe');
  }

  const [duplicado] = await pool.query(
    `
    SELECT id_subdepartamento 
    FROM subdepartamentos 
    WHERE nombre = ? AND id_departamento = ? AND id_subdepartamento <> ?
    `,
    [nombre, id_departamento, id]
  );

  if (duplicado.length > 0) {
    throw new Error('Ya existe otro subdepartamento con ese nombre en el departamento indicado');
  }

  await pool.query(
    `
    UPDATE subdepartamentos
    SET nombre = ?, id_departamento = ?
    WHERE id_subdepartamento = ?
    `,
    [nombre, id_departamento, id]
  );
}

async function deleteSubdepartamento(id) {
  await getSubdepartamentoById(id);

  const [usuarios] = await pool.query(
    'SELECT id_usuario FROM usuarios WHERE id_subdepartamento = ? LIMIT 1',
    [id]
  );

  if (usuarios.length > 0) {
    throw new Error('No se puede eliminar el subdepartamento porque tiene usuarios asociados');
  }

  await pool.query(
    'DELETE FROM subdepartamentos WHERE id_subdepartamento = ?',
    [id]
  );
}

module.exports = {
  getSubdepartamentos,
  getSubdepartamentoById,
  createSubdepartamento,
  updateSubdepartamento,
  deleteSubdepartamento
};