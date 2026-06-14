const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

async function start() {
  await db.init();

  // Confirm loaded data (not a fresh DB)
  const groupCount = db.prepare('SELECT COUNT(*) as c FROM groups').get().c;
  const userCount  = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  console.log(`[startup] DB loaded: ${groupCount} group(s), ${userCount} user(s)`);

  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(cors());
  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'public')));

  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/groups', require('./routes/groups'));
  app.use('/api/users', require('./routes/users'));
  app.use('/api/expenses', require('./routes/expenses'));

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
