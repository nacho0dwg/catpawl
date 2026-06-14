const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

async function start() {
  await db.init();

  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(cors());
  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'public')));

  app.use('/api/groups', require('./routes/groups'));
  app.use('/api/users', require('./routes/users'));
  app.use('/api/expenses', require('./routes/expenses'));

  // ── TEMPORARY DIAGNOSTIC ENDPOINTS ── remove after use ──────────
  app.get('/api/debug/group/:code', (req, res) => {
    const code = req.params.code.toUpperCase();
    const group = db.prepare('SELECT * FROM groups WHERE code = ?').get(code);
    if (!group) return res.json({ found: false, code });
    const members = db.prepare(`
      SELECT u.id, u.nickname, u.cat_color, u.credits, u.group_id, ug.joined_at
      FROM users u
      JOIN user_groups ug ON u.id = ug.user_id
      WHERE ug.group_id = ?
      ORDER BY ug.joined_at ASC
    `).all(group.id);
    res.json({ found: true, group, members });
  });

  app.get('/api/debug/users', (req, res) => {
    const users = db.prepare(
      'SELECT id, nickname, cat_color, group_id, credits, created_at FROM users ORDER BY created_at ASC'
    ).all();
    const groups = db.prepare('SELECT id, name, code FROM groups ORDER BY created_at ASC').all();
    res.json({ users, groups, userCount: users.length, groupCount: groups.length });
  });

  app.post('/api/debug/restore-session', (req, res) => {
    const code = (req.body.code || '').toUpperCase();
    const group = db.prepare('SELECT * FROM groups WHERE code = ?').get(code);
    if (!group) return res.json({ found: false, code, hint: 'group does not exist in DB' });
    const members = db.prepare(`
      SELECT u.id, u.nickname, u.cat_color, u.credits
      FROM users u
      JOIN user_groups ug ON u.id = ug.user_id
      WHERE ug.group_id = ?
      ORDER BY ug.joined_at ASC
    `).all(group.id);
    res.json({ found: true, group, members, hint: 'paste your userId into localStorage key catpawl_session' });
  });
  // ── END TEMPORARY ────────────────────────────────────────────────

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CatPawl running on http://0.0.0.0:${PORT}`);
  });
}

start().catch(err => {
  console.error('[startup] fatal:', err);
  process.exit(1);
});
