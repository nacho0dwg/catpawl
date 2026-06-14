'use strict';
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || '/app/data/catpawl.db';

const _dir = path.dirname(DB_PATH);
if (!fs.existsSync(_dir)) fs.mkdirSync(_dir, { recursive: true });

let _db = null;

function save() {
  if (!_db) return;
  try {
    fs.writeFileSync(DB_PATH, Buffer.from(_db.export()));
  } catch (e) {
    console.error('[db] save error:', e.message);
  }
}

// Shim: same .prepare().get/all/run API as better-sqlite3 / node:sqlite.
// Each .get/.all/.run creates a fresh sql.js statement (correct for reuse in loops).
const db = {
  async init() {
    // Startup diagnostics — visible in Railway logs
    console.log('[db] DB_PATH:', DB_PATH);
    console.log('[db] dir exists:', fs.existsSync(path.dirname(DB_PATH)));
    console.log('[db] file exists:', fs.existsSync(DB_PATH));
    if (fs.existsSync(DB_PATH)) {
      console.log('[db] file size:', fs.statSync(DB_PATH).size, 'bytes');
    }

    const SQL = await initSqlJs();

    _db = fs.existsSync(DB_PATH)
      ? new SQL.Database(new Uint8Array(fs.readFileSync(DB_PATH)))
      : new SQL.Database();

    _db.run('PRAGMA foreign_keys = ON');

    _db.exec(`
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

      CREATE TABLE IF NOT EXISTS user_groups (
        user_id TEXT NOT NULL,
        group_id TEXT NOT NULL,
        joined_at TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (user_id, group_id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (group_id) REFERENCES groups(id)
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_alias
        ON users(alias) WHERE alias IS NOT NULL;
    `);

    // Migrate existing users into user_groups
    _db.run(`
      INSERT OR IGNORE INTO user_groups (user_id, group_id)
      SELECT id, group_id FROM users WHERE group_id IS NOT NULL
    `);

    save(); // persist initial schema if DB was just created
    console.log('[db] ready —', DB_PATH);
  },

  prepare(sql) {
    return {
      get(...args) {
        const stmt = _db.prepare(sql);
        try {
          if (args.length) stmt.bind(args);
          return stmt.step() ? stmt.getAsObject() : undefined;
        } finally {
          stmt.free();
        }
      },

      all(...args) {
        const stmt = _db.prepare(sql);
        const rows = [];
        try {
          if (args.length) stmt.bind(args);
          while (stmt.step()) rows.push(stmt.getAsObject());
        } finally {
          stmt.free();
        }
        return rows;
      },

      run(...args) {
        const stmt = _db.prepare(sql);
        try {
          if (args.length) stmt.bind(args);
          stmt.step();
        } finally {
          stmt.free();
        }
        save();
      },
    };
  },
};

module.exports = db;
