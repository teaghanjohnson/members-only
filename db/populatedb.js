const { Client } = require("pg");
require("dotenv").config();

const SQL = `
  CREATE TABLE IF NOT EXISTS users (
    id         SERIAL PRIMARY KEY,
    first_name VARCHAR(100),
    last_name  VARCHAR(100),
    username   VARCHAR(255) UNIQUE NOT NULL,
    password   TEXT NOT NULL,
    role       VARCHAR(16) NOT NULL DEFAULT 'guest'
               CHECK (role IN ('guest', 'member', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS messages (
    id         SERIAL PRIMARY KEY,
    title      VARCHAR(200) NOT NULL,
    body       TEXT NOT NULL,
    user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

async function main() {
  console.log("seeding...");
  const client = new Client({
    host: process.env.PGHOST,
    user: process.env.PGUSER,
    database: process.env.PGDATABASE,
    password: process.env.PGPASSWORD,
    port: process.env.PGPORT,
  });
  await client.connect();
  await client.query(SQL);
  await client.end();
  console.log("done");
}

main();
