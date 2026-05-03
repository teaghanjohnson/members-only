# Internet 101 — Day 2 cleanup → end of Day 3

This is the full set of changes to get from where you are now to the end of Day 3 of the roadmap. Work top-to-bottom; each step assumes the previous one is done. Where I show code, type it yourself — the point of these projects is the muscle memory.

---

## 0. Where you are right now

You have a working Express + EJS + Passport-local app with `pg` Pool, bcrypt cost 12, and a `users` table with a `member` boolean. `.env` is gitignored. What's missing for Day 3:

- `package.json` still says `"name": "members-only"` and has no real description or dev scripts.
- No `.env.example`, no `README.md`.
- No `migrations/` folder — `db/populatedb.js` is a one-shot seed.
- The `users` table has `member BOOLEAN` and no admin path. No `messages` table.
- `connect-pg-simple` is installed but **not wired** — sessions are still in the default in-memory store.
- `app.js` has `secret: process.env.SESSION_SECRET || "cats"` — the fallback should be removed.
- No `helmet`, no rate limiting, no CSRF, no input validation, no auth middleware for admin.

The order below fixes those in dependency order.

---

## 1. Rename the package and add `.env.example`

### `package.json`
Replace the file with:

```json
{
  "name": "internet-101",
  "version": "0.1.0",
  "description": "Internet 101 — a members-only message board, built to practice the security primitives most tutorials skip.",
  "main": "app.js",
  "scripts": {
    "start": "node app.js",
    "dev": "node --watch app.js",
    "migrate": "node db/migrate.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "connect-pg-simple": "^9.0.0",
    "dotenv": "^16.0.0",
    "ejs": "^3.1.9",
    "express": "^4.18.2",
    "express-session": "^1.17.3",
    "passport": "^0.6.0",
    "passport-local": "^1.0.0",
    "pg": "^8.11.0"
  }
}
```

Note: leaving `passport`/`passport-local` for now since they're already wired. You can keep them or migrate to a hand-rolled login later — Passport adds a lot of indirection for one strategy.

### `.env.example` (new file at project root)

```
# Postgres connection
PGHOST=localhost
PGUSER=
PGPASSWORD=
PGDATABASE=internet101_dev
PGPORT=5432

# Session signing secret. Generate with:
#   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Required: app crashes on boot if unset.
SESSION_SECRET=

# Set to "production" in deployed environments.
NODE_ENV=development

# Port the app listens on. Defaults to 3000 if unset.
PORT=3000
```

Then update your real `.env` to add `NODE_ENV=development` if it's missing, and rename your local DB to `internet101_dev` (or just leave `PGDATABASE=members_only` — the rename is cosmetic and you can do it in the migration step below).

---

## 2. Migrations folder + runner

The point: replace `populatedb.js` with a system that tracks which migrations have been applied, so you can add `002_*.sql`, `003_*.sql` etc. without re-running everything.

### Step 2a — Create the folder and first migration

`migrations/001_init.sql`

```sql
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
```

A few things to notice and be ready to explain:
- Column naming switched from camelCase (`firstName`) to snake_case (`first_name`). Postgres lowercases unquoted identifiers, so `firstName` was secretly `firstname` anyway — snake_case is the convention.
- `role VARCHAR(16) ... CHECK (...)` instead of separate booleans. This is the design choice we discussed.
- `created_at TIMESTAMPTZ` on both tables — you'll want it for sorting messages and for the README's "consider audit trails" sentence.
- Index on `messages.created_at` because pagination on the message list will sort by it.

### Step 2b — Migration for the session store table

`migrations/002_sessions.sql`

```sql
-- This table is the schema connect-pg-simple uses by default.
-- See: https://github.com/voxpelli/node-connect-pg-simple/blob/main/table.sql
CREATE TABLE IF NOT EXISTS "session" (
  "sid"    VARCHAR NOT NULL COLLATE "default",
  "sess"   JSON NOT NULL,
  "expire" TIMESTAMP(6) NOT NULL
) WITH (OIDS=FALSE);

ALTER TABLE "session"
  ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;

CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
```

### Step 2c — Migrate runner

`db/migrate.js`

```js
const fs = require("node:fs");
const path = require("node:path");
const pool = require("./pool");

async function main() {
  // Track which migrations have run.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const dir = path.join(__dirname, "..", "migrations");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

  const applied = new Set(
    (await pool.query("SELECT filename FROM schema_migrations")).rows.map((r) => r.filename),
  );

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`skip  ${file}`);
      continue;
    }
    const sql = fs.readFileSync(path.join(dir, file), "utf8");
    console.log(`apply ${file}`);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations(filename) VALUES ($1)", [file]);
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(`failed ${file}:`, err.message);
      process.exit(1);
    } finally {
      client.release();
    }
  }

  await pool.end();
  console.log("done");
}

main();
```

Run with `npm run migrate`. You can leave `db/populatedb.js` for now or delete it — it's superseded.

### Step 2d — Update `db/queries.js` for the new schema

The columns are renamed and the role concept changed. Update `createUser` and add helpers you'll need on Day 4:

```js
const pool = require("./pool");

async function getUserByUsername(username) {
  const { rows } = await pool.query(
    "SELECT * FROM users WHERE username = $1",
    [username],
  );
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

module.exports = { getUserByUsername, getUserById, createUser, promoteToMember };
```

You'll add `createMessage`, `listMessages`, `deleteMessage` on Day 4.

### Step 2e — Update `routes/index.js` to match the new createUser signature

In the `POST /sign-up` handler, replace the `createUser` call. New users default to `role = 'guest'` from the schema; the join-the-club flow promotes them later. Drop the `member` form field for now.

```js
await db.createUser({
  firstName: req.body.firstName,
  lastName: req.body.lastName,
  username: req.body.username,
  passwordHash: hashedPassword,
});
```

Also in your views, `user.firstname` and `user.member` no longer exist. They become `user.first_name` and `user.role === 'member'` (or `'admin'`). Sweep `views/*.ejs` for those references.

---

## 3. Wire `connect-pg-simple` (Postgres-backed sessions)

This is the single biggest "I know what I'm doing" signal in the auth stack. In `app.js`:

```js
require("dotenv").config();

if (!process.env.SESSION_SECRET) {
  console.error("SESSION_SECRET is required. Generate one with:");
  console.error("  node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"");
  process.exit(1);
}

const path = require("node:path");
const express = require("express");
const session = require("express-session");
const PgSession = require("connect-pg-simple")(session);
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const pool = require("./db/pool");
const { validPassword } = require("./lib/passwordUtils");
const db = require("./db/queries");
const routes = require("./routes/index.js");

// ...passport.use(...) and serializeUser/deserializeUser unchanged...

const app = express();
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

const isProd = process.env.NODE_ENV === "production";

app.use(
  session({
    store: new PgSession({
      pool,                     // reuse the same pg Pool — don't open a second one
      tableName: "session",     // matches migration 002
      createTableIfMissing: false, // migration handles it; explicit > magic
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProd,           // requires HTTPS in prod
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    },
  }),
);
```

Three things being deliberate about:
- **Fail fast on missing SESSION_SECRET.** Better than silently using `"cats"`.
- **Reuse the existing `pool`.** Opening a second pool wastes connections.
- **`secure: isProd`.** In dev over plain HTTP the cookie has to be allowed; in prod it must require HTTPS or the cookie is never sent.

After this works, run the app, log in, then `psql` into your DB and `SELECT sid, expire FROM session;` — you should see your session row. That's the kind of thing worth taking a screenshot of for the README.

---

## 4. Helmet, rate limiting, CSRF, validation

Install:

```
npm install helmet express-rate-limit csrf-csrf express-validator
```

(`csrf-csrf` is the maintained replacement for `csurf`, which is deprecated.)

### 4a — Helmet
Right after `const app = express();` and before any routes:

```js
const helmet = require("helmet");
app.use(helmet());
```

Helmet's defaults set sensible headers (CSP, X-Frame-Options, etc.). For now the default CSP is fine; if you load any CDN scripts you'll need to allow them explicitly.

### 4b — Rate limit auth routes
In `routes/index.js`:

```js
const rateLimit = require("express-rate-limit");

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,                    // 5 attempts per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many attempts. Try again in 15 minutes.",
});

router.post("/sign-up", authLimiter, /* existing handler */);
router.post("/log-in", authLimiter, passport.authenticate("local", { /* ... */ }));
```

5 per 15 minutes is conservative; the value is in having any limit at all and being able to defend the choice.

### 4c — CSRF on state-changing routes
With `csrf-csrf`:

```js
// in app.js, after session middleware
const { doubleCsrf } = require("csrf-csrf");

const { doubleCsrfProtection, generateCsrfToken } = doubleCsrf({
  getSecret: () => process.env.SESSION_SECRET, // reuse, or set CSRF_SECRET separately
  cookieName: isProd ? "__Host-csrf" : "csrf",
  cookieOptions: { httpOnly: true, sameSite: "lax", secure: isProd },
  getSessionIdentifier: (req) => req.sessionID,
});

app.use(doubleCsrfProtection);

// expose token to all templates
app.use((req, res, next) => {
  res.locals.csrfToken = generateCsrfToken(req, res);
  next();
});
```

Then in every form template add:

```html
<input type="hidden" name="_csrf" value="<%= csrfToken %>" />
```

GET routes don't need it; only state-changing methods. If a POST starts 403-ing after this change, it's because the form is missing the hidden input.

### 4d — Input validation on signup
In `routes/index.js`:

```js
const { body, validationResult } = require("express-validator");

const signupValidators = [
  body("firstName").trim().notEmpty().isLength({ max: 100 }),
  body("username").trim().isLength({ min: 3, max: 32 }).isAlphanumeric(),
  body("password").isLength({ min: 8, max: 128 }),
  body("passwordConfirm").custom((value, { req }) => value === req.body.password)
    .withMessage("Passwords don't match"),
];

router.post("/sign-up", authLimiter, signupValidators, async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).render("signup", { errors: errors.array() });
  }
  // ...existing creation logic
});
```

Update `views/signup.ejs` to render `errors` if present, and add a `passwordConfirm` field.

---

## 5. Auth middleware refactor (sets you up for Day 4)

Replace `routes/authMiddleware.js` with composable middleware driven by the new `role` column:

```js
function requireAuth(req, res, next) {
  if (!req.isAuthenticated()) return res.redirect("/log-in");
  next();
}

function requireRole(minRole) {
  // Tier order: guest < member < admin
  const tiers = { guest: 0, member: 1, admin: 2 };
  return (req, res, next) => {
    if (!req.isAuthenticated()) return res.redirect("/log-in");
    if (tiers[req.user.role] >= tiers[minRole]) return next();
    return res.status(403).render("403"); // create a simple 403.ejs
  };
}

module.exports = {
  requireAuth,
  requireMember: requireRole("member"),
  requireAdmin: requireRole("admin"),
};
```

This is the shape Day 4 wants: `router.delete("/messages/:id", requireAdmin, handler)`.

---

## 6. README starter

Create `README.md` at the project root and fill in these sections (write the prose yourself — recruiters skim for genuine voice):

```
# Internet 101

One-sentence pitch.

## Why this exists
Two-three sentences on what you wanted to practice that the standard tutorial skips.

## Stack
Express, EJS, Postgres (via pg), Passport-local, bcryptjs, connect-pg-simple, helmet, csrf-csrf, express-rate-limit, express-validator.

## Schema
```
users(id, first_name, last_name, username, password, role, created_at)
  role: 'guest' | 'member' | 'admin' (CHECK constraint)
messages(id, title, body, user_id, created_at)
session(sid, sess, expire)  -- managed by connect-pg-simple
```

A short paragraph defending the single `role` column over a roles join table for this app.

## Routes

| Method | Path                | Auth     | Returns                          |
|--------|---------------------|----------|----------------------------------|
| GET    | /                   | any      | 200 home                         |
| GET    | /sign-up            | guest    | 200 form                         |
| POST   | /sign-up            | guest    | 302 to /log-in, or 400 on errors |
| GET    | /log-in             | guest    | 200 form                         |
| POST   | /log-in             | guest    | 302 home, or 401                 |
| POST   | /log-out            | auth     | 302 to /                         |
| GET    | /messages           | any      | 200 list (paginated)             |
| POST   | /messages           | member   | 302 to /messages, or 400         |
| DELETE | /messages/:id       | admin    | 204, or 403/404                  |
| POST   | /join               | auth     | 302 to /messages on correct passcode |

## Security
One line per measure, one line on why:
- Passwords hashed with bcrypt (cost 12) — slows offline brute force.
- Sessions stored in Postgres via connect-pg-simple — survives restarts; default MemoryStore leaks.
- SESSION_SECRET required at boot — no insecure fallback in dev or prod.
- Helmet for default security headers (CSP, X-Frame-Options, etc.).
- CSRF protection on all state-changing routes via csrf-csrf double-submit pattern.
- Rate limit on /sign-up and /log-in (5 attempts / 15 min / IP) — blunts credential stuffing.
- express-validator on signup — rejects malformed input before DB.
- Role checks enforced server-side in middleware — view-level hiding is UX only.

## Setup
1. `cp .env.example .env` and fill in values.
2. `createdb internet101_dev`
3. `npm install`
4. `npm run migrate`
5. `npm run dev`

## What I learned
The honest section. Two paragraphs. Things you considered and rejected (e.g., the roles table); things that surprised you; what you'd do differently if you started over. This section is what most projects skip and it's the one recruiters actually read.
```

---

## 7. Verification before you call it Day-3-done

Run through this checklist by hand:

- [ ] `npm run migrate` succeeds on a fresh DB. Run it twice — second run should print `skip` for every file.
- [ ] App refuses to start if `SESSION_SECRET` is unset. (Test by `unset SESSION_SECRET && npm start`.)
- [ ] Login persists across `npm start` restarts (because the session is in Postgres, not memory).
- [ ] `SELECT * FROM session;` shows your session row.
- [ ] Hitting `POST /log-in` 6 times in a row from the same IP returns 429.
- [ ] Submitting any POST without the CSRF token in dev tools returns 403.
- [ ] Submitting signup with `password !== passwordConfirm` returns 400 with a visible error.
- [ ] `curl -X DELETE http://localhost:3000/messages/1` while not logged in returns 401/redirect, not 200.
- [ ] `git status` shows no `.env` and no `node_modules`.

If all of those pass, you're at end-of-Day-3 and ready to actually build the messages feature on Day 4.
