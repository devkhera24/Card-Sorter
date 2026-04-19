const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'contacts.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT,
    phone TEXT,
    company TEXT,
    designation TEXT,
    website TEXT,
    address TEXT,
    social_handles TEXT,
    category TEXT,
    description TEXT,
    linkedin_url TEXT,
    founded_year TEXT,
    company_size TEXT,
    raw_card_text TEXT,
    image_path TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

module.exports = db;