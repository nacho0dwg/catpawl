const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const db = require('./db');

async function start() {
  // Pre-DB startup check (visible in Railway logs)
  const DB_PATH = process.env.DB_PATH || '/app/data/catpawl.db';
  const dbDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log('[startup] created dir:', dbDir);
  }
  console.log('[startup] DB_PATH:', DB_PATH);
  console.log('[startup] DB file exists:', fs.existsSync(DB_PATH));
  if (fs.existsSync(DB_PATH)) {
    console.log('[startup] DB size:', fs.statSync(DB_PATH).size, 'bytes');
  }

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
