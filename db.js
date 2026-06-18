'use strict';
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || '/app/data/catpawl.db';

let _db = null;

function saveDb() {
  if (!_db) return;
  const buf = Buffer.from(_db.export());
  fs.writeFileSync(DB_PATH, buf);
  console.log('[db] saved —', buf.length, 'bytes');
}

// Shim: same .prepare().get/all/run API as better-sqlite3.
// Each .get/.all/.run creates a fresh sql.js statement (correct for reuse in loops).
const db = {
  async init() {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log('[db] created dir:', dir);
    }

    console.log('[db] DB_PATH:', DB_PATH);
    console.log('[db] file exists:', fs.existsSync(DB_PATH));
    if (fs.existsSync(DB_PATH)) {
      console.log('[db] file size:', fs.statSync(DB_PATH).size, 'bytes');
    }

    const SQL = await initSqlJs();

    if (fs.existsSync(DB_PATH)) {
      _db = new SQL.Database(new Uint8Array(fs.readFileSync(DB_PATH)));
      console.log('[db] loaded existing DB from disk');
    } else {
      _db = new SQL.Database();
      console.log('[db] created new in-memory DB');
    }

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
        cbu TEXT,
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
        external_count INTEGER NOT NULL DEFAULT 0,
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

    // Migrate: add users.cbu if the column is missing (older DBs)
    try {
      _db.run('ALTER TABLE users ADD COLUMN cbu TEXT');
      console.log('[db] migrated: added users.cbu');
    } catch (e) {
      // column already exists — ignore
    }

    // Migrate: add expenses.external_count if the column is missing (older DBs)
    try {
      _db.run('ALTER TABLE expenses ADD COLUMN external_count INTEGER NOT NULL DEFAULT 0');
      console.log('[db] migrated: added expenses.external_count');
    } catch (e) {
      // column already exists — ignore
    }

    // Migrate: create expense_externals table for storing external participant names
    _db.run(`
      CREATE TABLE IF NOT EXISTS expense_externals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        expense_id TEXT NOT NULL,
        name TEXT NOT NULL,
        FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE
      )
    `);

    // Migrate: create external_payments table for tracking external participant payments
    _db.run(`
      CREATE TABLE IF NOT EXISTS external_payments (
        id TEXT PRIMARY KEY,
        expense_id TEXT NOT NULL,
        external_name TEXT NOT NULL,
        amount REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE
      )
    `);

    saveDb();
    console.log('[db] ready');
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
        saveDb();
      },
    };
  },
};

module.exports = db;
