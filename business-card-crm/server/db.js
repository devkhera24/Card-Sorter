const { createClient } = require('@libsql/client');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function initDb() {
  await db.execute(`
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
      keywords TEXT,
      raw_card_text TEXT,
      image_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Add keywords column if missing (existing DBs)
  try {
    await db.execute(`ALTER TABLE contacts ADD COLUMN keywords TEXT`);
  } catch (e) {}

  // Add image_url column if missing
  try {
    await db.execute(`ALTER TABLE contacts ADD COLUMN image_url TEXT`);
  } catch (e) {}

  console.log('✅ DB initialized');
}

module.exports = { db, initDb };