const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const db = require('../db');
const { extractCardData } = require('../services/extractCard');
const { enrichCardData } = require('../services/enrichCard');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif/;
    const valid = allowed.test(path.extname(file.originalname).toLowerCase());
    cb(null, valid);
  }
});

router.post('/upload', upload.single('card'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image file provided' });
  const imagePath = req.file.path;

  try {
    console.log('🔍 Extracting card data with GPT-4o Vision...');
    const extracted = await extractCardData(imagePath);
    console.log('✅ Extraction complete:', extracted);

    console.log('🌐 Enriching with OpenAI web search...');
    const enriched = await enrichCardData(extracted);
    console.log('✅ Enrichment complete:', enriched);

    const contact = { ...extracted, ...enriched, image_path: req.file.filename };

    const stmt = db.prepare(`
      INSERT INTO contacts 
        (name, email, phone, company, designation, website, address, social_handles,
         category, description, linkedin_url, founded_year, company_size, keywords, raw_card_text, image_path)
      VALUES 
        (@name, @email, @phone, @company, @designation, @website, @address, @social_handles,
         @category, @description, @linkedin_url, @founded_year, @company_size, @keywords, @raw_card_text, @image_path)
    `);

    const result = stmt.run(contact);
    const newContact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(result.lastInsertRowid);
    res.json({ success: true, contact: newContact });

  } catch (err) {
    console.error('Error processing card:', err);
    if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    res.status(500).json({ error: err.message });
  }
});

router.get('/', (req, res) => {
  const { category, sort = 'created_at', order = 'DESC' } = req.query;
  let query = 'SELECT * FROM contacts';
  const params = [];

  if (category && category !== 'All') {
    query += ' WHERE category = ?';
    params.push(category);
  }

  const allowedSorts = ['created_at', 'name', 'company', 'category'];
  const safeSort = allowedSorts.includes(sort) ? sort : 'created_at';
  const safeOrder = order === 'ASC' ? 'ASC' : 'DESC';
  query += ` ORDER BY ${safeSort} ${safeOrder}`;

  res.json(db.prepare(query).all(...params));
});

router.get('/search', (req, res) => {
  const { q } = req.query;
  if (!q) return res.json([]);

  const term = `%${q}%`;
  const contacts = db.prepare(`
    SELECT * FROM contacts WHERE
      name LIKE ? OR email LIKE ? OR phone LIKE ? OR
      company LIKE ? OR designation LIKE ? OR category LIKE ? OR
      description LIKE ? OR address LIKE ? OR raw_card_text LIKE ? OR keywords LIKE ?
    ORDER BY created_at DESC
  `).all(term, term, term, term, term, term, term, term, term, term);

  res.json(contacts);
});

router.get('/categories', (req, res) => {
  const rows = db.prepare('SELECT DISTINCT category FROM contacts WHERE category IS NOT NULL ORDER BY category').all();
  res.json(['All', ...rows.map(r => r.category)]);
});

router.delete('/:id', (req, res) => {
  const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(req.params.id);
  if (!contact) return res.status(404).json({ error: 'Contact not found' });

  if (contact.image_path) {
    const imgPath = path.join(__dirname, '../uploads', contact.image_path);
    if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
  }

  db.prepare('DELETE FROM contacts WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.get('/:id', (req, res) => {
  const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(req.params.id);
  if (!contact) return res.status(404).json({ error: 'Not found' });
  res.json(contact);
});

module.exports = router;