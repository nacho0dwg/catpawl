const express = require('express');
const router = express.Router();
const db = require('../db');
const { v4: uuidv4 } = require('uuid');
const { recalculatePayments } = require('./expenses');

function makeToken() {
  return uuidv4().replace(/-/g, '') + uuidv4().replace(/-/g, '');
}

// POST /api/users — create user in a group
router.post('/', (req, res) => {
  const { group_id, nickname, alias, cat_color, cat_accessory, hat } = req.body;
  if (!group_id || !nickname) return res.status(400).json({ error: 'group_id and nickname required' });

  const group = db.prepare('SELECT id FROM groups WHERE id = ?').get(group_id);
  if (!group) return res.status(404).json({ error: 'group not found' });

  const cleanAlias = alias ? alias.trim().toLowerCase() : null;
  const id = uuidv4();

  try {
    db.prepare(`
      INSERT INTO users (id, group_id, nickname, alias, cat_color, cat_accessory, hat)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, group_id, nickname.trim(), cleanAlias, cat_color || 'orange', cat_accessory || null, hat || null);
  } catch (e) {
    if (e.message && e.message.includes('UNIQUE') && e.message.includes('alias')) {
      return res.status(409).json({ error: 'alias already taken' });
    }
    throw e;
  }

  db.prepare('INSERT OR IGNORE INTO user_groups (user_id, group_id) VALUES (?, ?)').run(id, group_id);

  // Create session token
  const token = makeToken();
  db.prepare('INSERT INTO sessions (id, user_id, token) VALUES (?, ?, ?)').run(uuidv4(), id, token);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  res.json({ ...user, token });
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

  const { cat_color, cat_accessory, hat, credits, alias, cbu } = req.body;

  // Resolve alias: if provided, normalize and check it's not taken by another user
  let newAlias = user.alias;
  if (alias !== undefined) {
    newAlias = alias ? alias.trim().toLowerCase() : null;
    if (newAlias) {
      const taken = db.prepare('SELECT id FROM users WHERE alias = ? AND id != ?').get(newAlias, req.params.id);
      if (taken) return res.status(409).json({ error: 'alias already taken' });
    }
  }

  const updated = {
    cat_color: cat_color ?? user.cat_color,
    cat_accessory: cat_accessory !== undefined ? cat_accessory : user.cat_accessory,
    hat: hat !== undefined ? hat : user.hat,
    credits: credits !== undefined ? credits : user.credits,
    alias: newAlias,
    cbu: cbu !== undefined ? (cbu ? cbu.trim() : null) : user.cbu
  };

  try {
    db.prepare(`
      UPDATE users SET cat_color = ?, cat_accessory = ?, hat = ?, credits = ?, alias = ?, cbu = ?
      WHERE id = ?
    `).run(updated.cat_color, updated.cat_accessory, updated.hat, updated.credits, updated.alias, updated.cbu, req.params.id);
  } catch (e) {
    if (e.message && e.message.includes('UNIQUE') && e.message.includes('alias')) {
      return res.status(409).json({ error: 'alias already taken' });
    }
    throw e;
  }

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

// DELETE /api/users/:id/groups/:groupId — leave a group and wipe the user's data in it
router.delete('/:id/groups/:groupId', (req, res) => {
  const userId = req.params.id;
  const groupId = req.params.groupId;

  // 1. Delete the user's own expenses in this group (and their expense_members)
  const ownExpenses = db.prepare(
    'SELECT id FROM expenses WHERE group_id = ? AND payer_id = ?'
  ).all(groupId, userId).map(r => r.id);
  for (const eid of ownExpenses) {
    db.prepare('DELETE FROM expense_members WHERE expense_id = ?').run(eid);
    db.prepare('DELETE FROM expenses WHERE id = ?').run(eid);
  }

  // 2. Remove the user from any remaining expense splits in this group
  db.prepare(`
    DELETE FROM expense_members
    WHERE user_id = ?
      AND expense_id IN (SELECT id FROM expenses WHERE group_id = ?)
  `).run(userId, groupId);

  // 3. Delete pending payments involving this user within this group
  db.prepare(`
    DELETE FROM payments
    WHERE status = 'pending'
      AND (from_user = ? OR to_user = ?)
      AND (from_user IN (SELECT user_id FROM user_groups WHERE group_id = ?)
        OR to_user IN (SELECT user_id FROM user_groups WHERE group_id = ?))
  `).run(userId, userId, groupId, groupId);

  // 4. Remove the membership
  db.prepare('DELETE FROM user_groups WHERE user_id = ? AND group_id = ?').run(userId, groupId);

  // 5. Recalculate the group's payments with the remaining members/expenses
  recalculatePayments(groupId);

  res.json({ ok: true });
});

// GET /api/users/:id/debts — pending payments involving this user
router.get('/:id/debts', (req, res) => {
  const userId = req.params.id;

  const owes = db.prepare(`
    SELECT p.*, u.nickname as to_name, u.cat_color as to_color, u.cbu as to_cbu
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
