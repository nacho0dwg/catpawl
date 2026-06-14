const express = require('express');
const router = express.Router();
const db = require('../db');
const { v4: uuidv4 } = require('uuid');

// POST /api/users — create user in a group
router.post('/', (req, res) => {
  const { group_id, nickname, alias, cat_color, cat_accessory, hat } = req.body;
  if (!group_id || !nickname) return res.status(400).json({ error: 'group_id and nickname required' });

  const group = db.prepare('SELECT id FROM groups WHERE id = ?').get(group_id);
  if (!group) return res.status(404).json({ error: 'group not found' });

  const id = uuidv4();
  db.prepare(`
    INSERT INTO users (id, group_id, nickname, alias, cat_color, cat_accessory, hat)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, group_id, nickname.trim(), alias || null, cat_color || 'orange', cat_accessory || null, hat || null);

  db.prepare('INSERT OR IGNORE INTO user_groups (user_id, group_id) VALUES (?, ?)').run(id, group_id);

  res.json(db.prepare('SELECT * FROM users WHERE id = ?').get(id));
});

// GET /api/users/:id — get user
router.get('/:id', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'user not found' });
  res.json(user);
});

// PATCH /api/users/:id — update avatar/accessories/credits
router.patch('/:id', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'user not found' });

  const { cat_color, cat_accessory, hat, credits } = req.body;
  const updated = {
    cat_color: cat_color ?? user.cat_color,
    cat_accessory: cat_accessory !== undefined ? cat_accessory : user.cat_accessory,
    hat: hat !== undefined ? hat : user.hat,
    credits: credits !== undefined ? credits : user.credits
  };

  db.prepare(`
    UPDATE users SET cat_color = ?, cat_accessory = ?, hat = ?, credits = ?
    WHERE id = ?
  `).run(updated.cat_color, updated.cat_accessory, updated.hat, updated.credits, req.params.id);

  res.json(db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id));
});

// GET /api/users/:id/groups — list all groups the user belongs to
router.get('/:id/groups', (req, res) => {
  const groups = db.prepare(`
    SELECT g.*,
      (SELECT COUNT(*) FROM user_groups ug2 WHERE ug2.group_id = g.id) as member_count
    FROM groups g
    JOIN user_groups ug ON g.id = ug.group_id
    WHERE ug.user_id = ?
    ORDER BY ug.joined_at ASC
  `).all(req.params.id);
  res.json(groups);
});

// POST /api/users/:id/join — join a group by invite code (idempotent)
router.post('/:id/join', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'user not found' });

  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'code required' });

  const group = db.prepare('SELECT * FROM groups WHERE code = ?').get(code.toUpperCase());
  if (!group) return res.status(404).json({ error: 'group not found' });

  db.prepare('INSERT OR IGNORE INTO user_groups (user_id, group_id) VALUES (?, ?)').run(req.params.id, group.id);

  const member_count = db.prepare('SELECT COUNT(*) as c FROM user_groups WHERE group_id = ?').get(group.id).c;
  res.json({ ...group, member_count });
});

// DELETE /api/users/:id/groups/:groupId — leave a group
router.delete('/:id/groups/:groupId', (req, res) => {
  db.prepare('DELETE FROM user_groups WHERE user_id = ? AND group_id = ?').run(req.params.id, req.params.groupId);
  res.json({ ok: true });
});

// GET /api/users/:id/debts — pending payments involving this user
router.get('/:id/debts', (req, res) => {
  const userId = req.params.id;

  const owes = db.prepare(`
    SELECT p.*, u.nickname as to_name, u.cat_color as to_color
    FROM payments p
    JOIN users u ON p.to_user = u.id
    WHERE p.from_user = ? AND p.status = 'pending'
    ORDER BY p.created_at ASC
  `).all(userId);

  const owed = db.prepare(`
    SELECT p.*, u.nickname as from_name, u.cat_color as from_color
    FROM payments p
    JOIN users u ON p.from_user = u.id
    WHERE p.to_user = ? AND p.status = 'pending'
    ORDER BY p.created_at ASC
  `).all(userId);

  res.json({ owes, owed });
});

module.exports = router;
