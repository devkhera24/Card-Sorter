const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const router = express.Router();
const { db } = require('../db');
const { extractCardData } = require('../services/extractCard');
const { enrichCardData } = require('../services/enrichCard');
const { uploadToCloudinary, deleteFromCloudinary } = require('../services/cloudinary');

// Store uploads in system temp dir (works on all platforms including Render)
const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif/;
    const valid = allowed.test(path.extname(file.originalname).toLowerCase());
    cb(null, valid);
  }
});

// POST /api/cards/upload
router.post('/upload', upload.single('card'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image file provided' });
  const tempPath = req.file.path;

  try {
    console.log('☁️ Uploading to Cloudinary...');
    const imageUrl = await uploadToCloudinary(tempPath);
    console.log('✅ Cloudinary upload complete:', imageUrl);

    console.log('🔍 Extracting card data with GPT-4o Vision...');
    const extracted = await extractCardData(tempPath);
    console.log('✅ Extraction complete:', extracted);

    console.log('🌐 Enriching with OpenAI web search...');
    const enriched = await enrichCardData(extracted);
    console.log('✅ Enrichment complete:', enriched);

    // Clean up temp file
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

    const contact = { ...extracted, ...enriched, image_url: imageUrl };

    const result = await db.execute({
      sql: `INSERT INTO contacts 
        (name, email, phone, company, designation, website, address, social_handles,
         category, description, linkedin_url, founded_year, company_size, keywords, raw_card_text, image_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        contact.name ?? null,
        contact.email ?? null,
        contact.phone ?? null,
        contact.company ?? null,
        contact.designation ?? null,
        contact.website ?? null,
        contact.address ?? null,
        contact.social_handles ?? null,
        contact.category ?? null,
        contact.description ?? null,
        contact.linkedin_url ?? null,
        contact.founded_year ?? null,
        contact.company_size ?? null,
        contact.keywords ?? null,
        contact.raw_card_text ?? null,
        contact.image_url ?? null,
      ]
    });

    const newContact = await db.execute({
      sql: 'SELECT * FROM contacts WHERE id = ?',
      args: [result.lastInsertRowid]
    });

    res.json({ success: true, contact: newContact.rows[0] });

  } catch (err) {
    console.error('Error processing card:', err);
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/cards
router.get('/', async (req, res) => {
  const { category, sort = 'created_at', order = 'DESC' } = req.query;

  const allowedSorts = ['created_at', 'name', 'company', 'category'];
  const safeSort = allowedSorts.includes(sort) ? sort : 'created_at';
  const safeOrder = order === 'ASC' ? 'ASC' : 'DESC';

  let sql = `SELECT * FROM contacts`;
  const args = [];

  if (category && category !== 'All') {
    sql += ` WHERE category = ?`;
    args.push(category);
  }

  sql += ` ORDER BY ${safeSort} ${safeOrder}`;

  const result = await db.execute({ sql, args });
  res.json(result.rows);
});

// GET /api/cards/search
router.get('/search', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.json([]);

  const term = `%${q}%`;
  const result = await db.execute({
    sql: `SELECT * FROM contacts WHERE
      name LIKE ? OR email LIKE ? OR phone LIKE ? OR
      company LIKE ? OR designation LIKE ? OR category LIKE ? OR
      description LIKE ? OR address LIKE ? OR raw_card_text LIKE ? OR keywords LIKE ?
      ORDER BY created_at DESC`,
    args: [term, term, term, term, term, term, term, term, term, term]
  });

  res.json(result.rows);
});

// GET /api/cards/categories
router.get('/categories', async (req, res) => {
  const result = await db.execute(
    'SELECT DISTINCT category FROM contacts WHERE category IS NOT NULL ORDER BY category'
  );
  res.json(['All', ...result.rows.map(r => r.category)]);
});

// POST /api/cards/reenrich-all
router.post('/reenrich-all', async (req, res) => {
  const result = await db.execute(
    'SELECT * FROM contacts WHERE keywords IS NULL OR keywords = ""'
  );
  const contacts = result.rows;
  const results = [];

  for (const contact of contacts) {
    try {
      const enriched = await enrichCardData(contact);
      await db.execute({
        sql: `UPDATE contacts SET category=?, description=?, linkedin_url=?, founded_year=?, company_size=?, keywords=? WHERE id=?`,
        args: [
          enriched.category ?? null,
          enriched.description ?? null,
          enriched.linkedin_url ?? null,
          enriched.founded_year ?? null,
          enriched.company_size ?? null,
          enriched.keywords ?? null,
          contact.id
        ]
      });
      results.push({ id: contact.id, company: contact.company, status: 'ok' });
    } catch (err) {
      results.push({ id: contact.id, company: contact.company, status: 'failed', error: err.message });
    }
  }

  res.json({ success: true, results });
});

// DELETE /api/cards/:id
router.delete('/:id', async (req, res) => {
  const result = await db.execute({
    sql: 'SELECT * FROM contacts WHERE id = ?',
    args: [req.params.id]
  });
  const contact = result.rows[0];
  if (!contact) return res.status(404).json({ error: 'Contact not found' });

  if (contact.image_url) {
    await deleteFromCloudinary(contact.image_url);
  }

  await db.execute({ sql: 'DELETE FROM contacts WHERE id = ?', args: [req.params.id] });
  res.json({ success: true });
});

// GET /api/cards/:id
router.get('/:id', async (req, res) => {
  const result = await db.execute({
    sql: 'SELECT * FROM contacts WHERE id = ?',
    args: [req.params.id]
  });
  const contact = result.rows[0];
  if (!contact) return res.status(404).json({ error: 'Not found' });
  res.json(contact);
});

module.exports = router;