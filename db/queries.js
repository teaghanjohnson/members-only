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
async function createUser({ firstName, lastName, username, passwordHash }) {
  const { rows } = await pool.query(
    `INSERT INTO users (first_name, last_name, username, password)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [firstName, lastName, username, passwordHash],
  );
  return rows[0].id;
}
async function promoteToMember(userId) {
  await pool.query("UPDATE users SET role = 'member' WHERE id = $1", [userId]);
}
module.exports = {
  getUserByUsername,
  getUserById,
  createUser,
  promoteToMember,
};
