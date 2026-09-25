// server/routes/seller-products.js
//
// Lets a seller manage their own product listings after registration.
// There is no password login anywhere in this project yet, so the
// `access_token` a seller was shown once at registration (see
// routes/sellers.js) IS their credential — every write here requires
// it, checked against the matching `sellers.id`. Treat this the same
// way you'd treat a password: it must never appear in a public GET
// /api/products response (it doesn't — see routes/products.js) and a
// seller who loses it has no self-serve recovery yet (see README).

const express = require('express');
const { supabase } = require('../config/supabase');

const router = express.Router();

const VALID_CATEGORIES = ['apparel', 'shoes', 'electronics', 'books', 'cosmetics'];
const VALID_AUDIENCES = ['women', 'men', 'kids', 'unisex'];

async function verifySeller(sellerId, token) {
  if (!sellerId || !token) return null;
  const { data: seller, error } = await supabase
    .from('sellers')
    .select('id, business_name, access_token, charges_enabled, mnakfa_number')
    .eq('id', sellerId)
    .single();
  if (error || !seller || seller.access_token !== token) return null;
  return seller;
}

// A seller needs some real way to actually get paid before they can
// list anything — either Stripe (charges_enabled, for sellers with a
// Stripe-supported bank account) or the manual mNakfa contact (for
// sellers who don't — see the mnakfa_number comment in schema.sql).
// Shown in both languages since it blocks the seller's own action.
const NO_PAYMENT_METHOD_ERROR =
  'You need a payment method before listing a product — finish Stripe onboarding or add your mNakfa number in Payment Settings. / ' +
  'ንብረት ቅድሚ ምስቃልካ፡ ናይ ክፍሊት መገዲ ከድልየካ እዩ — ናይ Stripe ምዝገባ ወድእ ወይ ኣብ "Payment Settings" ናይ mNakfa ቁጽርኻ ኣእቱ።';

function hasPaymentMethod(seller) {
  return Boolean(seller.charges_enabled || seller.mnakfa_number);
}

function validateProductFields(body, { partial = false } = {}) {
  const errors = [];
  const fields = {};

  if (!partial || body.name !== undefined) {
    if (!body.name || typeof body.name !== 'string') errors.push('name is required.');
    else fields.name = body.name;
  }
  if (!partial || body.category !== undefined) {
    if (!VALID_CATEGORIES.includes(body.category)) errors.push(`category must be one of: ${VALID_CATEGORIES.join(', ')}`);
    else fields.category = body.category;
  }
  if (!partial || body.audience !== undefined) {
    const audience = body.audience || 'unisex';
    if (!VALID_AUDIENCES.includes(audience)) errors.push(`audience must be one of: ${VALID_AUDIENCES.join(', ')}`);
    else fields.audience = audience;
  }
  if (!partial || body.price_cents !== undefined) {
    const price = Number(body.price_cents);
    if (!Number.isInteger(price) || price < 0) errors.push('price_cents must be a non-negative integer.');
    else fields.price_cents = price;
  }
  if (!partial || body.stock !== undefined) {
    const stock = Number(body.stock);
    if (!Number.isInteger(stock) || stock < 0) errors.push('stock must be a non-negative integer.');
    else fields.stock = stock;
  }
  if (body.image_url !== undefined) fields.image_url = body.image_url || null;
  if (body.is_active !== undefined) fields.is_active = !!body.is_active;

  return { errors, fields };
}

// GET /api/seller-products?sellerId=&token=
// Lists every product this seller owns, active or not — the
// dashboard, not the public storefront (which only ever sees active
// products via GET /api/products).
router.get('/', async (req, res) => {
  const seller = await verifySeller(req.query.sellerId, req.query.token);
  if (!seller) return res.status(401).json({ error: 'Invalid seller credentials.' });

  const { data, error } = await supabase
    .from('products')
    .select('id, name, category, audience, price_cents, currency, stock, image_url, is_active, created_at')
    .eq('seller_id', seller.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('seller-products list error:', error.message);
    return res.status(500).json({ error: 'Could not load your products.' });
  }
  res.json({ products: data });
});

// POST /api/seller-products
// body: { sellerId, token, name, category, audience, price_cents, stock, image_url }
router.post('/', async (req, res) => {
  const { sellerId, token } = req.body;
  const seller = await verifySeller(sellerId, token);
  if (!seller) return res.status(401).json({ error: 'Invalid seller credentials.' });
  if (!hasPaymentMethod(seller)) return res.status(403).json({ error: NO_PAYMENT_METHOD_ERROR });

  const { errors, fields } = validateProductFields(req.body);
  if (errors.length) return res.status(400).json({ error: errors.join(' ') });

  const { data, error } = await supabase
    .from('products')
    .insert({ ...fields, seller_id: seller.id })
    .select()
    .single();

  if (error) {
    console.error('seller-products create error:', error.message);
    return res.status(500).json({ error: 'Could not create the product.' });
  }
  res.status(201).json({ product: data });
});

// PATCH /api/seller-products/:id
// body: { sellerId, token, ...any subset of the product fields }
router.patch('/:id', async (req, res) => {
  const { sellerId, token } = req.body;
  const seller = await verifySeller(sellerId, token);
  if (!seller) return res.status(401).json({ error: 'Invalid seller credentials.' });

  const { errors, fields } = validateProductFields(req.body, { partial: true });
  if (errors.length) return res.status(400).json({ error: errors.join(' ') });
  if (Object.keys(fields).length === 0) return res.status(400).json({ error: 'No valid fields to update.' });

  const { data, error } = await supabase
    .from('products')
    .update(fields)
    .eq('id', req.params.id)
    .eq('seller_id', seller.id) // scoped: can't touch another seller's product by guessing an id
    .select()
    .single();

  if (error || !data) {
    return res.status(404).json({ error: 'Product not found.' });
  }
  res.json({ product: data });
});

// DELETE /api/seller-products/:id?sellerId=&token=
// Soft-delete: flips is_active to false rather than removing the row,
// since order_items may still reference it (see schema.sql).
router.delete('/:id', async (req, res) => {
  const seller = await verifySeller(req.query.sellerId, req.query.token);
  if (!seller) return res.status(401).json({ error: 'Invalid seller credentials.' });

  const { data, error } = await supabase
    .from('products')
    .update({ is_active: false })
    .eq('id', req.params.id)
    .eq('seller_id', seller.id)
    .select()
    .single();

  if (error || !data) {
    return res.status(404).json({ error: 'Product not found.' });
  }
  res.json({ product: data });
});

module.exports = router;
