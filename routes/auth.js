const express = require('express');
const router = express.Router();
const db = require('../db');
const { v4: uuidv4 } = require('uuid');

function makeToken() {
  return uuidv4().replace(/-/g, '') + uuidv4().replace(/-/g, ''); // 64-char hex
}

function userWithGroups(userId) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) return null;
  const groups = db.prepare(`
    SELECT g.* FROM groups g
    JOIN user_groups ug ON g.id = ug.group_id
    WHERE ug.user_id = ?
    ORDER BY ug.joined_at ASC
  `).all(userId);
  return { user, groups };
}

// GET /api/auth/me?token=xxx — validate token, return user + groups
router.get('/me', (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'token required' });

  const session = db.prepare('SELECT * FROM sessions WHERE token = ?').get(token);
  if (!session) return res.status(401).json({ error: 'invalid token' });

  const result = userWithGroups(session.user_id);
  if (!result) return res.status(401).json({ error: 'user not found' });

  const { user, groups } = result;
  res.json({
    userId: user.id,
    userName: user.nickname,
    userColor: user.cat_color,
    alias: user.alias,
    groups
  });
});

// POST /api/auth/recover — recover session by alias
router.post('/recover', (req, res) => {
  const alias = (req.body.alias || '').trim();
  if (!alias) return res.status(400).json({ error: 'alias required' });

  const user = db.prepare(
    'SELECT * FROM users WHERE LOWER(alias) = LOWER(?)'
  ).get(alias);
  if (!user) return res.status(404).json({ error: 'alias not found' });

  const token = makeToken();
  db.prepare(
    'INSERT INTO sessions (id, user_id, token) VALUES (?, ?, ?)'
  ).run(uuidv4(), user.id, token);

  const groups = db.prepare(`
    SELECT g.* FROM groups g
    JOIN user_groups ug ON g.id = ug.group_id
    WHERE ug.user_id = ?
    ORDER BY ug.joined_at ASC
  `).all(user.id);

  res.json({
    token,
    userId: user.id,
    userName: user.nickname,
    userColor: user.cat_color,
    alias: user.alias,
    groups
  });
});

module.exports = router;
