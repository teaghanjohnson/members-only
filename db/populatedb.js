const { Client } = require("pg");
require("dotenv").config();
const SQL = `
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    firstName VARCHAR(100) NOT NULL,
    lastName VARCHAR(100),
    username VARCHAR(255)  UNIQUE NOT NULL,
    password TEXT NOT NULL
    member BOOLEAN NOT NULL DEFAULT FALSE
  )
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
