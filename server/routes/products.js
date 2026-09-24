// server/routes/products.js
//
// Public, read-only catalog endpoints. Each product belongs to a
// seller (see supabase/schema.sql); the `sellers` table itself is
// never exposed publicly (it holds Stripe account IDs), so this route
// joins in just `business_name` server-side, using the service-role
// key, and flattens it onto each product as `sellerName`.

const express = require('express');
const { supabase } = require('../config/supabase');

const router = express.Router();

const VALID_CATEGORIES = ['apparel', 'shoes', 'electronics', 'books', 'cosmetics'];
const VALID_AUDIENCES = ['women', 'men', 'kids', 'unisex'];
const PRODUCT_SELECT = 'id, seller_id, name, category, audience, price_cents, currency, stock, image_url, sellers(business_name)';

function flatten(row) {
  if (!row) return row;
  const { sellers, ...rest } = row;
  return { ...rest, sellerName: sellers?.business_name || null };
}

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
    .select(PRODUCT_SELECT)
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

  res.json({ products: data.map(flatten) });
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('id', id)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: 'Product not found.' });
  }

  res.json({ product: flatten(data) });
});

module.exports = router;
