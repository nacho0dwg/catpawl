const express = require('express');
const router = express.Router();
const db = require('../db');
const { v4: uuidv4 } = require('uuid');

function getCreditsForPayment(createdAt) {
  const ageMs = Date.now() - new Date(createdAt).getTime();
  const ageHours = ageMs / 3600000;
  if (ageHours <= 24)  return 15;
  if (ageHours <= 72)  return 5;
  if (ageHours <= 336) return 0;   // up to 14 days: no reward, no penalty
  return -10;                       // after 14 days: penalty
}

// Recalculate and upsert payments for an entire group after adding/removing an expense
function recalculatePayments(groupId) {
  const members = db.prepare(`
    SELECT u.* FROM users u
    JOIN user_groups ug ON u.id = ug.user_id
    WHERE ug.group_id = ?
  `).all(groupId);
  if (members.length < 2) return;

  const expenses = db.prepare(`
    SELECT e.*, em.user_id as member_id
    FROM expenses e
    JOIN expense_members em ON e.id = em.expense_id
    WHERE e.group_id = ?
  `).all(groupId);

  const balanceMap = Object.fromEntries(members.map(m => [m.id, 0]));

  const expenseGroups = {};
  for (const row of expenses) {
    if (!expenseGroups[row.id]) expenseGroups[row.id] = { ...row, members: [] };
    expenseGroups[row.id].members.push(row.member_id);
  }

  for (const exp of Object.values(expenseGroups)) {
    // External participants share the cost but aren't tracked in the DB;
    // they only enlarge the divisor so each member pays a smaller slice.
    const totalParticipants = exp.members.length + (exp.external_count || 0);
    const share = exp.amount / totalParticipants;
    balanceMap[exp.payer_id] += exp.amount;
    for (const uid of exp.members) balanceMap[uid] -= share;
  }

  // Subtract already-confirmed payments (both parties must be in this group) so
  // settled debts don't reappear when a new expense triggers a recalculation.
  //   payer (from_user) already paid    → debt shrinks → balance += amount
  //   payee (to_user)   already got paid → owed shrinks → balance -= amount
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

  const eps = 0.01;
  const creditors = members.filter(m => balanceMap[m.id] > eps).map(m => ({ id: m.id, bal: balanceMap[m.id] }));
  const debtors = members.filter(m => balanceMap[m.id] < -eps).map(m => ({ id: m.id, bal: balanceMap[m.id] }));

  creditors.sort((a, b) => b.bal - a.bal);
  debtors.sort((a, b) => a.bal - b.bal);

  // Delete only pending payments for this group (preserve confirmed history)
  db.prepare(`
    DELETE FROM payments WHERE status = 'pending'
    AND (from_user IN (SELECT user_id FROM user_groups WHERE group_id = ?)
      OR to_user IN (SELECT user_id FROM user_groups WHERE group_id = ?))
  `).run(groupId, groupId);

  let i = 0, j = 0;
  while (i < creditors.length && j < debtors.length) {
    const amount = Math.min(creditors[i].bal, -debtors[j].bal);
    if (amount > eps) {
      db.prepare(`
        INSERT INTO payments (id, from_user, to_user, amount, status)
        VALUES (?, ?, ?, ?, 'pending')
      `).run(uuidv4(), debtors[j].id, creditors[i].id, Math.round(amount * 100) / 100);
    }
    creditors[i].bal -= amount;
    debtors[j].bal += amount;
    if (Math.abs(creditors[i].bal) < eps) i++;
    if (Math.abs(debtors[j].bal) < eps) j++;
  }
}

// POST /api/expenses — add expense
router.post('/', (req, res) => {
  const { group_id, payer_id, amount, concept, category, expense_date, member_ids, external_count, external_names } = req.body;

  if (!group_id || !payer_id || !amount || !concept || !member_ids?.length) {
    return res.status(400).json({ error: 'group_id, payer_id, amount, concept and member_ids required' });
  }

  const id = uuidv4();
  const date = expense_date || new Date().toISOString().slice(0, 10);
  const externalCount = Math.max(0, parseInt(external_count, 10) || 0);

  db.prepare(`
    INSERT INTO expenses (id, group_id, payer_id, amount, concept, category, expense_date, external_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, group_id, payer_id, parseFloat(amount), concept.trim(), category || 'otro', date, externalCount);

  const insertMember = db.prepare('INSERT INTO expense_members (expense_id, user_id) VALUES (?, ?)');
  for (const uid of member_ids) insertMember.run(id, uid);

  // Save external participant names
  if (external_names && Array.isArray(external_names)) {
    const insertExternal = db.prepare('INSERT INTO expense_externals (expense_id, name) VALUES (?, ?)');
    for (const name of external_names) {
      if (name && typeof name === 'string' && name.trim()) {
        insertExternal.run(id, name.trim());
      }
    }
  }

  recalculatePayments(group_id);

  const expense = db.prepare(`
    SELECT e.*, u.nickname as payer_name, u.cat_color as payer_color
    FROM expenses e JOIN users u ON e.payer_id = u.id
    WHERE e.id = ?
  `).get(id);
  const members = db.prepare('SELECT user_id FROM expense_members WHERE expense_id = ?').all(id).map(r => r.user_id);

  res.json({ ...expense, member_ids: members });
});

// GET /api/expenses/group/:groupId — feed
router.get('/group/:groupId', (req, res) => {
  const expenses = db.prepare(`
    SELECT e.*, u.nickname as payer_name, u.cat_color as payer_color
    FROM expenses e
    JOIN users u ON e.payer_id = u.id
    WHERE e.group_id = ?
    ORDER BY e.expense_date DESC, e.created_at DESC
  `).all(req.params.groupId);

  const getMembersStmt = db.prepare(`
    SELECT em.user_id, u.nickname, u.cat_color
    FROM expense_members em JOIN users u ON em.user_id = u.id
    WHERE em.expense_id = ?
  `);

  const result = expenses.map(e => ({ ...e, members: getMembersStmt.all(e.id) }));
  res.json(result);
});

// DELETE /api/expenses/:id — delete expense (payer only)
router.delete('/:id', (req, res) => {
  const { user_id } = req.body;
  const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id);
  if (!expense) return res.status(404).json({ error: 'expense not found' });
  if (expense.payer_id !== user_id) return res.status(403).json({ error: 'only the payer can delete this expense' });

  const groupId = expense.group_id;
  db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id);
  recalculatePayments(groupId);

  res.json({ ok: true });
});

// POST /api/expenses/payments/:id/confirm — confirm payment, award credits
router.post('/payments/:id/confirm', (req, res) => {
  const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(req.params.id);
  if (!payment) return res.status(404).json({ error: 'payment not found' });
  if (payment.status !== 'pending') return res.status(400).json({ error: 'payment already confirmed' });

  const earned = getCreditsForPayment(payment.created_at);

  db.prepare("UPDATE payments SET status = 'confirmed' WHERE id = ?").run(payment.id);

  if (earned > 0) {
    db.prepare('UPDATE users SET credits = credits + ? WHERE id = ?').run(earned, payment.from_user);
  } else if (earned < 0) {
    db.prepare('UPDATE users SET credits = MAX(0, credits + ?) WHERE id = ?').run(earned, payment.from_user);
  }

  // Award 5 credits to the payee (to_user) for receiving a confirmed payment
  db.prepare('UPDATE users SET credits = credits + 5 WHERE id = ?').run(payment.to_user);

  const user = db.prepare('SELECT credits FROM users WHERE id = ?').get(payment.from_user);
  res.json({ ok: true, credits_earned: earned, total_credits: user.credits });
});

// GET /api/expenses/group/:groupId/with-externals — expenses with external participants
router.get('/group/:groupId/with-externals', (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId query param required' });

  const expenses = db.prepare(`
    SELECT e.*, u.nickname as payer_name, u.cat_color as payer_color
    FROM expenses e
    JOIN users u ON e.payer_id = u.id
    WHERE e.group_id = ? AND e.payer_id = ? AND e.external_count > 0
    ORDER BY e.expense_date DESC, e.created_at DESC
  `).all(req.params.groupId, userId);

  const getMembersStmt = db.prepare(`
    SELECT em.user_id FROM expense_members em WHERE em.expense_id = ?
  `);
  const getExternalsStmt = db.prepare(`
    SELECT name FROM expense_externals WHERE expense_id = ?
  `);
  const getExternalPaymentStmt = db.prepare(`
    SELECT id FROM external_payments WHERE expense_id = ? AND external_name = ? AND status = 'confirmed'
  `);

  const result = [];
  for (const e of expenses) {
    const memberCount = getMembersStmt.all(e.id).length;
    const totalParticipants = memberCount + e.external_count;
    const externalShare = Math.round((e.amount / totalParticipants) * 100) / 100;
    const externalNames = getExternalsStmt.all(e.id).map(r => r.name);

    // Return one item per external person
    for (let i = 0; i < e.external_count; i++) {
      const extName = externalNames[i] || `Externo ${i + 1}`;
      const paid = !!getExternalPaymentStmt.get(e.id, extName);
      result.push({
        expense_id: e.id,
        concept: e.concept,
        expense_date: e.expense_date,
        external_name: extName,
        external_share: externalShare,
        paid
      });
    }
  }

  res.json(result);
});

// POST /api/expenses/:expenseId/external-payment — confirm external payment
router.post('/:expenseId/external-payment', (req, res) => {
  const { external_name, amount } = req.body;
  const { expenseId } = req.params;

  if (!external_name || amount === undefined) {
    return res.status(400).json({ error: 'external_name and amount required' });
  }

  const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(expenseId);
  if (!expense) return res.status(404).json({ error: 'expense not found' });

  // Check if already confirmed
  const existing = db.prepare(`
    SELECT id FROM external_payments WHERE expense_id = ? AND external_name = ?
  `).get(expenseId, external_name);

  if (existing) {
    db.prepare(`UPDATE external_payments SET status = 'confirmed', amount = ? WHERE id = ?`)
      .run(parseFloat(amount), existing.id);
  } else {
    const id = require('uuid').v4();
    db.prepare(`
      INSERT INTO external_payments (id, expense_id, external_name, amount, status)
      VALUES (?, ?, ?, ?, 'confirmed')
    `).run(id, expenseId, external_name, parseFloat(amount));
  }

  res.json({ ok: true });
});

router.recalculatePayments = recalculatePayments;
module.exports = router;
