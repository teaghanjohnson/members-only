const pool = require("./pool");

async function getUserByUsername(username) {
  const { rows } = await pool.query("SELECT * FROM users WHERE username = $1", [
    username,
  ]);
  return rows[0];
}
async function getUserById(id) {
  const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
  return rows[0];
}
async function createUser(firstName, lastName, username, password, member) {
  await pool.query(
    "INSERT INTO users(firstName, lastName, username, password, member) VALUES ($1, $2, $3, $4, $5)",
    [firstName, lastName, username, password, member],
  );
}

module.exports = { getUserByUsername, getUserById, createUser };
