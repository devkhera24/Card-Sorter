require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const { initDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.CLIENT_URL || '*'
}));
app.use(express.json());

app.use('/api/cards', require('./routes/cards'));
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to init DB:', err);
  process.exit(1);
});