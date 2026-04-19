const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const router = express.Router();
const { supabase } = require('../db');
const { extractCardData } = require('../services/extractCard');
const { enrichCardData } = require('../services/enrichCard');
const { uploadToCloudinary, deleteFromCloudinary } = require('../services/cloudinary');

const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif/;
    const valid = allowed.test(path.extname(file.originalname).toLowerCase());
    if (valid) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  }
});

// POST /api/cards/upload
router.post('/upload', upload.single('card'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image file provided' });
  const tempPath = req.file.path;

  try {
    console.log('☁️ Uploading to Cloudinary...');
    const imageUrl = await uploadToCloudinary(tempPath);

    console.log('🔍 Extracting card data...');
    const extracted = await extractCardData(tempPath);

    console.log('🌐 Enriching data...');
    const enriched = await enrichCardData(extracted);

    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

    const contact = { ...extracted, ...enriched, image_url: imageUrl };

    const { data, error } = await supabase
      .from('contacts')
      .insert([{
        name: contact.name ?? null,
        email: contact.email ?? null,
        phone: contact.phone ?? null,
        company: contact.company ?? null,
        designation: contact.designation ?? null,
        website: contact.website ?? null,
        address: contact.address ?? null,
        social_handles: contact.social_handles ?? null,
        category: contact.category ?? null,
        description: contact.description ?? null,
        linkedin_url: contact.linkedin_url ?? null,
        founded_year: contact.founded_year ?? null,
        company_size: contact.company_size ?? null,
        keywords: contact.keywords ?? null,
        raw_card_text: contact.raw_card_text ?? null,
        image_url: contact.image_url ?? null,
      }])
      .select()
      .single();

    if (error) throw new Error(error.message);
    res.json({ success: true, contact: data });

  } catch (err) {
    console.error('Error processing card:', err);
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/cards
router.get('/', async (req, res) => {
  try {
    const { category, sort = 'created_at', order = 'DESC' } = req.query;

    const allowedSorts = ['created_at', 'name', 'company', 'category'];
    const safeSort = allowedSorts.includes(sort) ? sort : 'created_at';

    let query = supabase
      .from('contacts')
      .select('*')
      .order(safeSort, { ascending: order === 'ASC' });

    if (category && category !== 'All') {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/cards/search
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);

    // Supabase full-text search across multiple columns using ilike
    const term = `%${q}%`;
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .or(
        `name.ilike.${term},email.ilike.${term},phone.ilike.${term},` +
        `company.ilike.${term},designation.ilike.${term},category.ilike.${term},` +
        `description.ilike.${term},address.ilike.${term},raw_card_text.ilike.${term},` +
        `keywords.ilike.${term}`
      )
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/cards/categories
router.get('/categories', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('contacts')
      .select('category')
      .not('category', 'is', null)
      .order('category');

    if (error) throw new Error(error.message);

    const unique = [...new Set(data.map(r => r.category))].sort();
    res.json(['All', ...unique]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/cards/reenrich-all
router.post('/reenrich-all', async (req, res) => {
  try {
    const { data: contacts, error } = await supabase
      .from('contacts')
      .select('*')
      .or('keywords.is.null,keywords.eq.');

    if (error) throw new Error(error.message);

    const results = [];
    for (const contact of contacts) {
      try {
        const enriched = await enrichCardData(contact);
        const { error: updateError } = await supabase
          .from('contacts')
          .update({
            category: enriched.category ?? null,
            description: enriched.description ?? null,
            linkedin_url: enriched.linkedin_url ?? null,
            founded_year: enriched.founded_year ?? null,
            company_size: enriched.company_size ?? null,
            keywords: enriched.keywords ?? null,
          })
          .eq('id', contact.id);

        if (updateError) throw new Error(updateError.message);
        results.push({ id: contact.id, company: contact.company, status: 'ok' });
      } catch (err) {
        results.push({ id: contact.id, company: contact.company, status: 'failed', error: err.message });
      }
    }

    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/cards/:id
router.delete('/:id', async (req, res) => {
  try {
    const { data: contact, error: fetchError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !contact) return res.status(404).json({ error: 'Contact not found' });

    if (contact.image_url) {
      await deleteFromCloudinary(contact.image_url);
    }

    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', req.params.id);

    if (error) throw new Error(error.message);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/cards/:id
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Not found' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;