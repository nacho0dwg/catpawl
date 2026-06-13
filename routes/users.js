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
