const pool = require("./pool");

async function getUserByUsername(username) {
  const { rows } = await pool.query("SELECT * FROM users WHERE username = $1", [
    username,
  ]);
  return rows[0];
}
async function getUserById(id) {
  const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
  return rows;
}
async function createUser(firstName, lastName, username, password) {
  await pool.query(
    "INSERT INTO users(firstName, lastName, username, password) VALUES ($1, $2, $3, $4)",
    [firstName, lastName, username, password],
  );
}

module.exports = { getUserByUsername, getUserById, createUser };
