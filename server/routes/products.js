// server/routes/products.js
//
// Public, read-only catalog endpoints. Anyone can browse; nothing
// here touches money, so it's safe to leave unauthenticated.

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
    .select('id, name, description, category, audience, price_cents, currency, stock, image_url')
    .eq('is_active', true)
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
    .select('id, name, description, category, audience, price_cents, currency, stock, image_url')
    .eq('id', id)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: 'Product not found.' });
  }

  res.json({ product: data });
});

module.exports = router;
