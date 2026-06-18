const express = require('express');
const router = express.Router();
const db = require('../db');
const { v4: uuidv4 } = require('uuid');

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// Greedy debt settlement algorithm — returns minimum number of transfers
function settleDebts(balances) {
  const eps = 0.01;
  const creditors = balances.filter(b => b.balance > eps).map(b => ({ ...b }));
  const debtors = balances.filter(b => b.balance < -eps).map(b => ({ ...b }));
  const transfers = [];

  creditors.sort((a, b) => b.balance - a.balance);
  debtors.sort((a, b) => a.balance - b.balance);

  let i = 0, j = 0;
  while (i < creditors.length && j < debtors.length) {
    const amount = Math.min(creditors[i].balance, -debtors[j].balance);
    transfers.push({
      from: debtors[j].userId,
      fromName: debtors[j].nickname,
      fromColor: debtors[j].cat_color,
      to: creditors[i].userId,
      toName: creditors[i].nickname,
      toColor: creditors[i].cat_color,
      amount: Math.round(amount * 100) / 100
    });
    creditors[i].balance -= amount;
    debtors[j].balance += amount;
    if (Math.abs(creditors[i].balance) < eps) i++;
    if (Math.abs(debtors[j].balance) < eps) j++;
  }

  return transfers;
}

// POST /api/groups — create group
router.post('/', (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'name required' });

  let code;
  let attempts = 0;
  do {
    code = generateCode();
    attempts++;
    if (attempts > 20) return res.status(500).json({ error: 'could not generate unique code' });
  } while (db.prepare('SELECT id FROM groups WHERE code = ?').get(code));

  const id = uuidv4();
  db.prepare('INSERT INTO groups (id, name, code) VALUES (?, ?, ?)').run(id, name.trim(), code);
  res.json(db.prepare('SELECT * FROM groups WHERE id = ?').get(id));
});

// GET /api/groups/code/:code — find group by invite code
router.get('/code/:code', (req, res) => {
  const group = db.prepare('SELECT * FROM groups WHERE code = ?').get(req.params.code.toUpperCase());
  if (!group) return res.status(404).json({ error: 'group not found' });
  res.json(group);
});

// GET /api/groups/:id/members — list members
router.get('/:id/members', (req, res) => {
  const members = db.prepare(`
    SELECT u.* FROM users u
    JOIN user_groups ug ON u.id = ug.user_id
    WHERE ug.group_id = ?
    ORDER BY ug.joined_at ASC
  `).all(req.params.id);
  res.json(members);
});

// GET /api/groups/:id/summary — balances + settlement plan
router.get('/:id/summary', (req, res) => {
  const groupId = req.params.id;
  const members = db.prepare(`
    SELECT u.* FROM users u
    JOIN user_groups ug ON u.id = ug.user_id
    WHERE ug.group_id = ?
  `).all(groupId);
  if (!members.length) return res.json({ members: [], transfers: [], totalSpent: 0 });

  const memberMap = Object.fromEntries(members.map(m => [m.id, m]));

  const expenses = db.prepare(`
    SELECT e.*, em.user_id as member_id
    FROM expenses e
    JOIN expense_members em ON e.id = em.expense_id
    WHERE e.group_id = ?
  `).all(groupId);

  const totalSpent = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE group_id = ?').get(groupId).total;

  // Calculate net balance per user (positive = owed money, negative = owes money)
  const balanceMap = Object.fromEntries(members.map(m => [m.id, 0]));

  // Group expense members per expense
  const expenseGroups = {};
  for (const row of expenses) {
    if (!expenseGroups[row.id]) expenseGroups[row.id] = { ...row, members: [] };
    expenseGroups[row.id].members.push(row.member_id);
  }

  for (const exp of Object.values(expenseGroups)) {
    const totalParticipants = exp.members.length + (exp.external_count || 0);
    const share = exp.amount / totalParticipants;
    balanceMap[exp.payer_id] += exp.amount;
    for (const uid of exp.members) balanceMap[uid] -= share;
  }

  // Subtract already-confirmed payments (both parties in this group) so the feed
  // balance matches the real outstanding debts — mirrors recalculatePayments.
  const confirmedPayments = db.prepare(`
    SELECT * FROM payments
    WHERE status = 'confirmed'
      AND from_user IN (SELECT user_id FROM user_groups WHERE group_id = ?)
      AND to_user   IN (SELECT user_id FROM user_groups WHERE group_id = ?)
  `).all(groupId, groupId);
  for (const pay of confirmedPayments) {
    if (balanceMap[pay.from_user] !== undefined) balanceMap[pay.from_user] += pay.amount;
    if (balanceMap[pay.to_user]   !== undefined) balanceMap[pay.to_user]   -= pay.amount;
  }

  const balances = members.map(m => ({
    userId: m.id,
    nickname: m.nickname,
    cat_color: m.cat_color,
    balance: Math.round(balanceMap[m.id] * 100) / 100,
    credits: m.credits
  }));

  const transfers = settleDebts(balances);

  res.json({ members: balances, transfers, totalSpent });
});

// POST /api/groups/:id/regenerate-code — replace invite code (old code stops working)
router.post('/:id/regenerate-code', (req, res) => {
  const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(req.params.id);
  if (!group) return res.status(404).json({ error: 'group not found' });

  let code;
  let attempts = 0;
  do {
    code = generateCode();
    if (++attempts > 20) return res.status(500).json({ error: 'could not generate unique code' });
  } while (db.prepare('SELECT id FROM groups WHERE code = ? AND id != ?').get(code, req.params.id));

  db.prepare('UPDATE groups SET code = ? WHERE id = ?').run(code, req.params.id);
  res.json(db.prepare('SELECT * FROM groups WHERE id = ?').get(req.params.id));
});

module.exports = router;
