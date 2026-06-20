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
async function createUser(firstName, lastName, username, password) {
  await pool.query(
    "INSERT INTO users(first_name, last_name, username, password) VALUES ($1, $2, $3, $4)",
    [firstName, lastName, username, password],
  );
}

async function updateUserRole(id, role) {
  await pool.query("UPDATE users SET role = $1 WHERE id = $2", [role, id]);
}

async function getAllMessages() {
  const { rows } = await pool.query(`
    SELECT messages.*, users.first_name, users.last_name, users.username
    FROM messages
    LEFT JOIN users ON messages.user_id = users.id
    ORDER BY messages.created_at DESC
  `);
  return rows;
}

async function createMessage(title, body, userId) {
  await pool.query(
    "INSERT INTO messages(title, body, user_id) VALUES ($1, $2, $3)",
    [title, body, userId],
  );
}

async function deleteMessage(id) {
  await pool.query("DELETE FROM messages WHERE id = $1", [id]);
}

module.exports = {
  getUserByUsername,
  getUserById,
  createUser,
  updateUserRole,
  getAllMessages,
  createMessage,
  deleteMessage,
};
