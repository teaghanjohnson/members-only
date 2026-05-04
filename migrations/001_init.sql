-- Users table with a single role column instead of multiple booleans.
-- CHECK constraint prevents illegal values at the DB level.

CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  first_name  VARCHAR(100) NOT NULL,
  last_name   VARCHAR(100),
  username    VARCHAR(255) UNIQUE NOT NULL,
  password    TEXT NOT NULL,
  role        VARCHAR(16) NOT NULL DEFAULT 'guest'
              CHECK (role IN ('guest', 'member', 'admin')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Messages: every message belongs to a user. ON DELETE SET NULL keeps
-- the message visible if a user is removed (you can change to CASCADE
-- if you'd rather drop their messages too — defend your choice in the README).
CREATE TABLE IF NOT EXISTS messages (
  id         SERIAL PRIMARY KEY,
  title      VARCHAR(200) NOT NULL,
  body       TEXT NOT NULL,
  user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS messages_created_at_idx ON messages (created_at DESC);