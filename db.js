const { DatabaseSync } = require('node:sqlite');

const db = new DatabaseSync('catpawl.db');

db.exec(`PRAGMA journal_mode = WAL`);
db.exec(`PRAGMA foreign_keys = ON`);

db.exec(`
  CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    nickname TEXT NOT NULL,
    alias TEXT,
    avatar_url TEXT,
    cat_color TEXT NOT NULL DEFAULT 'orange',
    cat_accessory TEXT,
    hat TEXT,
    credits INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (group_id) REFERENCES groups(id)
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    payer_id TEXT NOT NULL,
    amount REAL NOT NULL,
    concept TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'otro',
    expense_date TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (group_id) REFERENCES groups(id),
    FOREIGN KEY (payer_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS expense_members (
    expense_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    PRIMARY KEY (expense_id, user_id),
    FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    from_user TEXT NOT NULL,
    to_user TEXT NOT NULL,
    amount REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (from_user) REFERENCES users(id),
    FOREIGN KEY (to_user) REFERENCES users(id)
  );
`);

// Thin compatibility shim so routes can use the same .prepare().get/all/run API
// that better-sqlite3 provides — node:sqlite uses a slightly different interface.
const origPrepare = db.prepare.bind(db);

db.prepare = function (sql) {
  const stmt = origPrepare(sql);
  return {
    get(...params) {
      // node:sqlite returns undefined when no row; better-sqlite3 does too
      const rows = stmt.all(...params);
      return rows[0];
    },
    all(...params) {
      return stmt.all(...params);
    },
    run(...params) {
      return stmt.run(...params);
    }
  };
};

module.exports = db;
