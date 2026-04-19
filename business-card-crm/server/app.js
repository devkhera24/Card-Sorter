const path = require('path');
const dotenv = require('dotenv');

// Local/dev convenience: load env files relative to this server folder.
// In Vercel, environment variables are provided by the platform.
dotenv.config({ path: path.join(__dirname, '.env'), quiet: true });
dotenv.config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const express = require('express');
const cors = require('cors');
const { initDb } = require('./db');

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

try {
  app.use('/api/cards', require('./routes/cards'));
  console.log('✅ Routes loaded');
} catch (err) {
  console.error('❌ Failed to load routes:', err);
}

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

let dbReadyPromise;
function ensureDbReady() {
  if (!dbReadyPromise) {
    dbReadyPromise = initDb().catch((err) => {
      dbReadyPromise = undefined;
      throw err;
    });
  }
  return dbReadyPromise;
}

module.exports = { app, ensureDbReady };
