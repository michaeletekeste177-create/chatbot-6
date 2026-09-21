// server/routes/products.js
//
// Public, read-only catalog endpoints. Anyone can browse; nothing
// here touches money — Hibretfamily is an affiliate storefront with
// no inventory or price of its own.
//
// Deliberately NOT selected: affiliate_url. The real external link
// only ever gets read server-side, inside routes/track.js, right
// before it logs the click and redirects — so a click can't reach the
// external store without first being counted for commission
// reconciliation, and the raw links aren't sitting in a public API
// response for anyone to scrape and reuse untracked.

const express = require('express');
const { supabase } = require('../config/supabase');

const router = express.Router();

const VALID_CATEGORIES = ['apparel', 'shoes', 'electronics', 'books', 'cosmetics'];
const VALID_AUDIENCES = ['women', 'men', 'kids', 'unisex'];

// GET /api/products?category=shoes&audience=women&limit=24&offset=0
router.get('/', async (req, res) => {
  const { category, audience, limit = 24, offset = 0 } = req.query;

  if (category && !VALID_CATEGORIES.includes(category)) {
    return res.status(400).json({
      error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`,
    });
  }
  if (audience && !VALID_AUDIENCES.includes(audience)) {
    return res.status(400).json({
      error: `Invalid audience. Must be one of: ${VALID_AUDIENCES.join(', ')}`,
    });
  }

  let query = supabase
    .from('products')
    .select('id, name, category, audience, image_url')
    .order('created_at', { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1);

  if (category) {
    query = query.eq('category', category);
  }
  if (audience) {
    query = query.in('audience', [audience, 'unisex']);
  }

  const { data, error } = await query;

  if (error) {
    console.error('products list error:', error.message);
    return res.status(500).json({ error: 'Could not load products.' });
  }

  res.json({ products: data });
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('products')
    .select('id, name, category, audience, image_url')
    .eq('id', id)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: 'Product not found.' });
  }

  res.json({ product: data });
});

module.exports = router;
